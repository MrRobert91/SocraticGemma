"""Philosophical Wiki service — file I/O, LLM synthesis, graph sync."""

from __future__ import annotations

import json
import logging
import os
import re
import time
import uuid
import zipfile
import io
from pathlib import Path
from typing import Optional

from ..config import settings
from ..database import (
    delete_wiki_edges_for_page,
    get_full_session_for_wiki,
    get_new_reports_for_user,
    get_wiki_graph,
    get_wiki_page_id,
    get_wiki_page_meta,
    link_wiki_page_to_session,
    list_wiki_pages,
    upsert_wiki_edge,
    upsert_wiki_page,
)
from .gemma_client import gemma_client

logger = logging.getLogger(__name__)

# Base path for user wiki files on the persistent volume
_DATA_ROOT = Path(os.environ.get("DATA_ROOT", "/data"))

# In-flight synthesis dedup. The dialogue end-of-session hook and the report
# endpoint both trigger synthesis for the same session a few seconds apart;
# without this set, both calls run in parallel, double the LLM cost, and
# write half-baked pages over each other.
_SYNTHESIS_IN_PROGRESS: set[str] = set()

def _get_wiki_model() -> str:
    """Return the wiki LLM model name, falling back to gemma_model_fast."""
    return settings.wiki_model or settings.gemma_model_fast


# ─── File system helpers ──────────────────────────────────────────────────────

def _user_wiki_dir(user_id: str) -> Path:
    return _DATA_ROOT / "users" / user_id / "wiki"


def ensure_user_wiki_dir(user_id: str) -> Path:
    """Create wiki directory structure for a user if it doesn't exist."""
    base = _user_wiki_dir(user_id)
    (base / "topics").mkdir(parents=True, exist_ok=True)
    (base / "streams").mkdir(parents=True, exist_ok=True)
    return base


def _page_path(user_id: str, slug: str, category: str) -> Path:
    base = _user_wiki_dir(user_id)
    if slug == "_profile":
        return base / "_profile.md"
    if category == "stream":
        return base / "streams" / f"{slug}.md"
    return base / "topics" / f"{slug}.md"


def read_page(user_id: str, slug: str, category: str = "topic") -> Optional[str]:
    """Read wiki page markdown content, or None if not found."""
    path = _page_path(user_id, slug, category)
    if path.exists():
        return path.read_text(encoding="utf-8")
    return None


def write_page(user_id: str, slug: str, content: str, category: str = "topic") -> Path:
    """Write wiki page markdown and return the file path."""
    ensure_user_wiki_dir(user_id)
    path = _page_path(user_id, slug, category)
    path.write_text(content, encoding="utf-8")
    return path


def list_pages_on_disk(user_id: str) -> list[dict]:
    """List all .md files for a user with slug/category metadata."""
    base = _user_wiki_dir(user_id)
    pages: list[dict] = []
    if not base.exists():
        return pages
    for p in base.glob("**/*.md"):
        rel = p.relative_to(base)
        parts = rel.parts
        if len(parts) == 1:
            slug = p.stem
            category = "profile"
        elif parts[0] == "streams":
            slug = p.stem
            category = "stream"
        else:
            slug = p.stem
            category = "topic"
        pages.append({"slug": slug, "category": category, "path": str(p)})
    return pages


def parse_wiki_links(content: str) -> list[str]:
    """Extract [[slug]] references from markdown content."""
    return re.findall(r"\[\[([^\[\]]+)\]\]", content)


def get_profile_summary(user_id: str) -> Optional[str]:
    """Return the first ~200 tokens (~800 chars) of the user's wiki profile."""
    content = read_page(user_id, "_profile", "profile")
    if content is None:
        return None
    # Strip YAML front-matter
    stripped = re.sub(r"^---.*?---\s*", "", content, flags=re.DOTALL).strip()
    return stripped[:800] if len(stripped) > 800 else stripped


async def generate_stimulus_suggestions(user_id: str, language: str = "es") -> list[dict]:
    """Generate up to 3 personalised stimulus suggestions from the user's wiki profile."""
    profile_content = read_page(user_id, "_profile", "profile")
    if not profile_content:
        return []

    # Strip YAML front-matter and backlinks block
    profile_clean = re.sub(r"^---.*?---\s*", "", profile_content, flags=re.DOTALL).strip()
    profile_clean = re.sub(
        r"<!-- backlinks:start -->.*?<!-- backlinks:end -->",
        "",
        profile_clean,
        flags=re.DOTALL,
    ).strip()
    if len(profile_clean) > 2500:
        profile_clean = profile_clean[:2500] + "\n… [truncado]"

    pages = await list_wiki_pages(user_id)
    explored_titles = [
        p.get("title") or p["slug"]
        for p in pages
        if p["slug"] != "_profile"
    ]
    pages_list = ", ".join(explored_titles[:30]) or "(ninguna)"

    # Find nodes marked as pending exploration
    pending: list[str] = []
    for p in pages:
        if p["slug"] == "_profile":
            continue
        content = read_page(user_id, p["slug"], p["category"])
        if content and "Pendiente de exploración" in content:
            pending.append(p.get("title") or p["slug"])
    pending_nodes = ", ".join(pending[:10]) if pending else "(ninguno)"

    prompt = _STIMULUS_SUGGESTIONS_PROMPT.format(
        profile=profile_clean,
        pages_list=pages_list,
        pending_nodes=pending_nodes,
        language=language,
    )
    logger.info(
        "[WIKI]   suggest-stimuli prompt: %d chars, user=%s", len(prompt), user_id
    )
    result = await _llm_call_json(
        prompt,
        stage="suggest-stimuli",
        session_id="suggest",
        max_tokens=1024,
        max_attempts=2,
    )
    if result is None:
        return []

    stimuli = result.get("stimuli", [])
    if not isinstance(stimuli, list):
        return []

    valid_types = {"question", "scenario", "story"}
    valid: list[dict] = []
    for s in stimuli:
        if isinstance(s, dict) and s.get("title") and s.get("content"):
            valid.append({
                "title": str(s["title"])[:120],
                "content": str(s["content"])[:600],
                "type": s.get("type") if s.get("type") in valid_types else "question",
                "reason": str(s.get("reason", ""))[:250],
            })
    return valid[:3]


def export_wiki_zip(user_id: str) -> bytes:
    """Return a ZIP archive (bytes) of all wiki .md files for the user."""
    base = _user_wiki_dir(user_id)
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        if base.exists():
            for path in base.rglob("*.md"):
                arcname = path.relative_to(base)
                zf.write(path, arcname)
    return buf.getvalue()


# ─── Graph sync ───────────────────────────────────────────────────────────────

_BACKLINK_BLOCK_RE = re.compile(
    r"<!-- backlinks:start -->.*?<!-- backlinks:end -->",
    re.DOTALL,
)


def _slugify(text: str) -> str:
    """Make a URL-safe slug. Accepts already-slugified input idempotently."""
    if not text:
        return ""
    text = text.strip().lower()
    # Strip accents
    accents = str.maketrans("áéíóúüñàèìòùâêîôûäëïöü", "aeiouunaeiouaeiouaeiou")
    text = text.translate(accents)
    text = re.sub(r"[^a-z0-9\s-]", "", text)
    text = re.sub(r"[\s-]+", "-", text).strip("-")
    return text


async def sync_graph_edges(user_id: str) -> int:
    """Parse all wiki pages and rebuild edges + backlinks blocks.

    Returns the number of pages whose backlinks block was rewritten.
    """
    pages = await list_wiki_pages(user_id)
    slug_to_id: dict[str, str] = {p["slug"]: p["id"] for p in pages}
    id_to_page: dict[str, dict] = {p["id"]: p for p in pages}

    # Forward edges: source → set of target_slugs
    out_links: dict[str, set[str]] = {}

    for page in pages:
        page_id = page["id"]
        content = read_page(user_id, page["slug"], page["category"])
        if not content:
            continue

        await delete_wiki_edges_for_page(page_id)
        # Parse [[refs]] but strip out the backlinks block first so its own
        # references don't feed back into the edge graph.
        without_backlinks = _BACKLINK_BLOCK_RE.sub("", content)
        linked_slugs = set(parse_wiki_links(without_backlinks))
        out_links[page["slug"]] = linked_slugs

        edges_created = 0
        unmatched: list[str] = []
        for linked_slug in linked_slugs:
            # Try exact match first; fall back to re-slugifying the ref in
            # case the LLM re-introduced accents or capital letters.
            target_id = slug_to_id.get(linked_slug) or slug_to_id.get(_slugify(linked_slug))
            if target_id and target_id != page_id:
                await upsert_wiki_edge(page_id, target_id)
                edges_created += 1
            elif linked_slug and linked_slug != page["slug"]:
                unmatched.append(linked_slug)

        if page["slug"] == "_profile" or unmatched:
            logger.info(
                "[WIKI/sync]   %s: refs=%d  edges=%d  unmatched=%d%s",
                page["slug"], len(linked_slugs), edges_created, len(unmatched),
                f" [{', '.join(unmatched[:5])}{'…' if len(unmatched) > 5 else ''}]"
                if unmatched else "",
            )

    # Build reverse map: target_slug → list of (source_slug, source_title)
    backlinks: dict[str, list[tuple[str, str]]] = {}
    for source_slug, targets in out_links.items():
        source_page = next((p for p in pages if p["slug"] == source_slug), None)
        if source_page is None:
            continue
        source_title = source_page.get("title") or source_slug
        for tgt in targets:
            if tgt == source_slug:
                continue
            backlinks.setdefault(tgt, []).append((source_slug, source_title))

    # Rewrite each page's backlinks block (between the HTML comment markers).
    rewritten = 0
    for page in pages:
        slug = page["slug"]
        content = read_page(user_id, slug, page["category"])
        if content is None or "<!-- backlinks:start -->" not in content:
            # Page predates this feature or LLM stripped the markers. Skip.
            continue

        bl = backlinks.get(slug, [])
        if bl:
            lines = [
                f"- [[{src_slug}]] — {src_title}"
                for src_slug, src_title in sorted(set(bl))
            ]
            block_body = "## Backlinks\n\n" + "\n".join(lines)
        else:
            block_body = "## Backlinks\n\n*(Ninguna otra página enlaza a esta todavía.)*"

        new_block = f"<!-- backlinks:start -->\n{block_body}\n<!-- backlinks:end -->"
        new_content = _BACKLINK_BLOCK_RE.sub(new_block, content)
        if new_content != content:
            write_page(user_id, slug, new_content, page["category"])
            rewritten += 1

    return rewritten


# ─── LLM synthesis ───────────────────────────────────────────────────────────

_EXTRACTION_PROMPT_TEMPLATE = """\
Analiza la siguiente transcripción de un diálogo filosófico socrático y extrae información estructurada.

## Sesión
- Grupo de edad: {age_group}
- Idioma: {language}
- Estímulo: {stimulus_title} — {stimulus_content}

## Transcripción del diálogo
{transcript}

## Informe filosófico generado
{report}

---
Responde SOLO con un objeto JSON válido con esta estructura (sin texto adicional fuera del JSON):
{{
  "topics": ["lista de temas filosóficos tratados, slugificados en el idioma del usuario (ej: libre-albedrio, justicia)"],
  "topic_titles": {{"slug": "Título Legible"}},
  "streams": ["corrientes filosóficas mencionadas o relevantes, slugificadas"],
  "stream_titles": {{"slug": "Título Legible"}},
  "user_positions": {{"slug-tema": "postura o pregunta del usuario en 1-2 frases"}},
  "open_questions": ["preguntas que quedaron sin respuesta"],
  "contradictions": ["tensiones o contradicciones detectadas en el razonamiento del usuario"],
  "book_recommendations": ["Título — Autor (1 frase de por qué)"],
  "profile_keywords": ["3-6 palabras clave que resumen el estilo filosófico del usuario"]
}}
"""

_TOPIC_TEMPLATE = """\
## Tu posición
[Postura del usuario o preguntas que plantea sobre este tema, integrando esta sesión y previas si las hubiera. 3-6 frases.]

## Evolución del pensamiento
[Cómo ha cambiado la visión del usuario sobre este tema a través de las sesiones que lo tocan. Si es primera aparición, indícalo brevemente.]

## Ideas clave exploradas
[Conceptos centrales discutidos. Lista con guiones.]

## Tensiones y preguntas abiertas
[Contradicciones detectadas o preguntas que quedaron sin respuesta. Lista con guiones.]

## Corrientes relacionadas
[[stream-slug-1]], [[stream-slug-2]]

## Lecturas relevantes
[[reading-slug-1]], [[reading-slug-2]]

## Conexiones con otros temas
[[topic-slug-otro]]

<!-- backlinks:start -->
<!-- backlinks:end -->"""

_STREAM_TEMPLATE = """\
## Definición
[Qué es la corriente filosófica, neutral y objetivo. 3-5 líneas.]

## Ideas centrales
[3-6 tesis fundamentales. Lista con guiones.]

## Pensadores principales
[Lista breve sin enlaces externos.]

## Por qué te interesa
[Conexión específica con el pensamiento del usuario, basada en lo observado en sus conversaciones. 4-6 líneas máximo. Consolida, no acumules.]

## Temas del usuario que tocan esta corriente
[[topic-slug-1]], [[topic-slug-2]]

## Lecturas recomendadas
[[reading-slug-1]]

## Corrientes relacionadas u opuestas
[[stream-slug-otro]]

<!-- backlinks:start -->
<!-- backlinks:end -->"""

_READING_TEMPLATE = """\
## Autoría
[Autor], [año], [idioma original si es relevante]

## Resumen
[2-3 frases sobre el contenido del libro/ensayo.]

## Por qué leerlo
[Relación específica con lo que ha discutido el usuario en sus conversaciones.]

## Temas relacionados
[[topic-slug-1]], [[topic-slug-2]]

## Corrientes representadas
[[stream-slug-1]]

<!-- backlinks:start -->
<!-- backlinks:end -->"""


_SYNTHESIS_PROMPT_TEMPLATE = """\
Eres un sistema de síntesis de un wiki filosófico personal. El usuario acaba de completar una sesión de diálogo socrático.

## Datos de la nueva sesión (extracción JSON)
{extraction}

## Páginas a crear o actualizar en esta síntesis

A continuación se listan las páginas que debes generar. Algunas son NUEVAS (no existen aún), otras son ACTUALIZACIONES (existen y debes integrar el nuevo contexto sin descartar lo previo).

{pages_brief}

## Slugs existentes en la wiki del usuario (para enlazar)

Puedes usar `[[slug]]` para enlazar a cualquiera de los slugs listados aquí o a slugs que estés definiendo en esta misma respuesta. NO inventes slugs que no estén en una de estas dos listas.

{known_slugs}

## Reglas estrictas

1. Produce UNA entrada por cada página listada arriba (mismo slug y category).
2. Cada página debe tener contenido SUSTANCIAL siguiendo la plantilla de su categoría (topic, stream, reading). NO escribas placeholders como "(por completar)".
3. Para páginas marcadas `UPDATE`: PRESERVA el contenido existente que sigue siendo válido, INTEGRA el contexto nuevo de esta sesión, CONSOLIDA sin acumular párrafos redundantes.
4. Para páginas marcadas `NEW`: usa la plantilla de la categoría como guía.
5. NO modifiques las líneas `<!-- backlinks:start -->` ni `<!-- backlinks:end -->` — son gestionadas por el servidor automáticamente.
6. Toda referencia `[[slug]]` debe corresponder a un slug de las listas de arriba o a uno que estés definiendo. Si necesitas referenciar algo que no existe, NO lo hagas — usa otro slug existente.
7. Escribe en el idioma del usuario: {language}.

## Plantillas de referencia por categoría

### topic

{topic_template}

### stream

{stream_template}

### reading

{reading_template}

---

Responde SOLO con JSON válido, sin texto adicional, sin markdown alrededor:

{{
  "pages": [
    {{
      "slug": "slug-exacto",
      "title": "Título Legible",
      "category": "topic" | "stream" | "reading",
      "content": "markdown completo de la página, empezando por la primera sección ## (sin frontmatter YAML — eso lo añade el servidor)"
    }}
  ]
}}
"""

_GLOBAL_PROFILE_PROMPT_TEMPLATE = """\
Eres un sistema de síntesis del perfil filosófico GLOBAL de un usuario. Vas a producir el contenido completo de `_profile.md`, que sintetiza TODAS sus conversaciones filosóficas hasta hoy.

## Modo de síntesis

{mode_note}

## Informes filosóficos de las sesiones del usuario (orden cronológico)

{reports_block}

## Perfil global anterior (si existe — para integrar, no descartar)

{previous_profile}

## Slugs disponibles en la wiki del usuario para enlazar

{known_slugs}

## Reglas

1. Esta es una síntesis ACUMULATIVA: identifica recurrencias, evolución de creencias a lo largo del tiempo, contradicciones entre sesiones.
2. Usa `[[slug]]` SOLO con slugs de la lista de arriba. NO inventes.
3. Escribe en el idioma del usuario: {language}.
4. NO añadas frontmatter YAML al contenido (el servidor lo gestiona).
5. NO añadas las líneas `<!-- backlinks:start -->` ni `<!-- backlinks:end -->` — el servidor las añade.

## Estructura del perfil

## Estilo filosófico
[3-4 frases sobre cómo razona el usuario: concreto/abstracto, intuitivo/analítico, dialéctico/narrativo, busca certezas o tolera incertidumbre, etc.]

## Corrientes predominantes
[Lista de corrientes con `[[stream-slug]]` que más resuenan con el pensamiento del usuario, con 1 frase de justificación por cada una.]

## Temas recurrentes
[Lista de `[[topic-slug]]` que el usuario ha visitado en múltiples sesiones, con observación sobre su evolución.]

## Evolución temporal
[2-4 frases sobre cómo el pensamiento del usuario ha cambiado a lo largo de las sesiones.]

## Tensiones y contradicciones internas
[2-4 puntos donde el razonamiento del usuario presenta fricciones entre sesiones distintas.]

## Lecturas recomendadas prioritarias
[Top 3-5 `[[reading-slug]]` con 1 frase de por qué cada una es especialmente valiosa para este perfil.]

---

Responde SOLO con el contenido markdown del perfil (sin frontmatter, sin JSON, sin envolver en bloques de código). Empieza directamente por la primera `##`.
"""

_STIMULUS_SUGGESTIONS_PROMPT = """\
Eres un sistema de generación de estímulos filosóficos personalizados. Basándote en el perfil filosófico y el wiki del usuario, propón 3 estímulos originales para una nueva sesión de diálogo socrático.

## Perfil filosófico del usuario
{profile}

## Temas explorados en el wiki
{pages_list}

## Nodos pendientes de exploración
{pending_nodes}

---

Elige 3 estímulos que:
- Retomen tensiones o preguntas abiertas que quedaron sin resolver en el perfil
- Conecten con lecturas o corrientes relevantes que el usuario aún no ha explorado directamente
- Propongan abordar una idea conocida desde un ángulo completamente diferente
- Recuperen algún nodo pendiente de exploración si los hay
- NO repitan el mismo tema o pregunta de conversaciones ya realizadas

Responde SOLO con JSON válido, sin texto adicional:
{{
  "stimuli": [
    {{
      "title": "Título conciso (máximo 8 palabras)",
      "content": "Pregunta o escenario filosófico concreto y provocador. 2-3 frases.",
      "type": "question",
      "reason": "Una frase: por qué este estímulo es relevante para este usuario específicamente."
    }}
  ]
}}

Escribe en el idioma del usuario: {language}.
"""


# ─── Pipeline helpers ─────────────────────────────────────────────────────────

def _plan_pages_from_extraction(
    extraction: dict, existing_by_slug: dict[str, dict]
) -> dict:
    """Build the list of pages to create/update based on the extraction.

    Returns {"create": [...], "update": [...]} where each entry is
    {slug, title, category, kind}.
    Kind tags are used only for prompt context (no logic).
    """
    create: list[dict] = []
    update: list[dict] = []

    def add(slug: str, title: str, category: str) -> None:
        if not slug:
            return
        slug = _slugify(slug)
        entry = {"slug": slug, "title": title or slug, "category": category}
        target = update if slug in existing_by_slug else create
        # Avoid duplicates within same plan
        if not any(p["slug"] == slug for p in target):
            target.append(entry)

    # Topics
    topic_titles = extraction.get("topic_titles") or {}
    for slug in extraction.get("topics", []) or []:
        add(slug, topic_titles.get(slug, slug.replace("-", " ").title()), "topic")

    # Streams
    stream_titles = extraction.get("stream_titles") or {}
    for slug in extraction.get("streams", []) or []:
        add(slug, stream_titles.get(slug, slug.replace("-", " ").title()), "stream")

    # Readings — extraction returns strings like "Título — Autor (1 frase)";
    # we need to slugify the title portion.
    for rec in extraction.get("book_recommendations", []) or []:
        if not isinstance(rec, str):
            continue
        # Split on em-dash, en-dash, or hyphen
        parts = re.split(r"\s*[—–-]\s*", rec, maxsplit=1)
        title = parts[0].strip().strip("*\"'")
        if not title:
            continue
        slug = _slugify(title)
        add(slug, title, "reading")

    return {"create": create, "update": update}


def _build_pages_brief(user_id: str, plan: dict) -> str:
    """Build the per-page brief block of the synthesis prompt.

    For UPDATE pages, includes the current content so the LLM can preserve it.
    """
    lines: list[str] = []

    if plan["create"]:
        lines.append("### Páginas NUEVAS (a crear desde cero, usa la plantilla de su categoría):\n")
        for p in plan["create"]:
            lines.append(f"- NEW  category={p['category']}  slug={p['slug']}  title={p['title']!r}")
        lines.append("")

    if plan["update"]:
        lines.append("### Páginas EXISTENTES (a actualizar — preserva + integra, NO sobreescribas):\n")
        for p in plan["update"]:
            slug = p["slug"]
            existing = read_page(user_id, slug, p["category"]) or ""
            # Strip YAML frontmatter and backlinks block for the brief
            existing = re.sub(r"^---.*?---\s*", "", existing, flags=re.DOTALL).strip()
            existing = _BACKLINK_BLOCK_RE.sub("", existing).strip()
            # Cap to avoid prompt bloat
            if len(existing) > 1500:
                existing = existing[:1500] + "\n… [truncado]"
            lines.append(
                f"- UPDATE  category={p['category']}  slug={p['slug']}  title={p['title']!r}\n"
                f"  CONTENIDO ACTUAL:\n"
                f"  ```markdown\n  {existing.replace(chr(10), chr(10) + '  ')}\n  ```\n"
            )

    return "\n".join(lines) if lines else "(nada que generar)"


async def _write_and_register_page(
    *,
    user_id: str,
    session_id: str,
    slug: str,
    title: str,
    category: str,
    content: str,
    now: float,
) -> None:
    """Write a page to disk + upsert DB record + link to session.

    Ensures the backlinks marker block is present at the bottom so future
    syncs can rewrite it. The LLM is instructed to keep the markers
    untouched but we belt-and-braces it here.
    """
    if "<!-- backlinks:start -->" not in content:
        content = content.rstrip() + "\n\n<!-- backlinks:start -->\n<!-- backlinks:end -->"

    write_page(user_id, slug, content, category)
    page_id = await get_wiki_page_id(user_id, slug)
    if page_id is None:
        page_id = str(uuid.uuid4())
    await upsert_wiki_page(page_id, user_id, slug, title, category, now)
    await link_wiki_page_to_session(page_id, session_id)


async def _create_orphan_stubs(
    *,
    user_id: str,
    session_id: str,
    written_slugs: set[str],
    now: float,
) -> int:
    """Scan all user pages for [[refs]] that have no page; create stubs.

    Stubs are minimal but registered as real pages so the graph stays
    connected. Future syntheses will enrich them when the user revisits
    those topics.
    Returns the count of stubs created.
    """
    pages = await list_wiki_pages(user_id)
    all_slugs = {p["slug"] for p in pages}

    referenced: set[str] = set()
    for page in pages:
        content = read_page(user_id, page["slug"], page["category"])
        if not content:
            continue
        without_bl = _BACKLINK_BLOCK_RE.sub("", content)
        for ref in parse_wiki_links(without_bl):
            referenced.add(ref)

    orphans = {r for r in referenced if r and r not in all_slugs and r != "_profile"}
    created = 0
    for slug in orphans:
        # Heuristic category from slug shape — fallback to 'topic'.
        category = _guess_category_from_slug(slug)
        title = slug.replace("-", " ").capitalize()
        content = (
            f"## Pendiente de exploración\n\n"
            f"Este nodo apareció referenciado desde otra página pero todavía no se ha "
            f"profundizado en él en ninguna conversación. Cuando hables sobre este "
            f"tema, esta página se enriquecerá automáticamente.\n\n"
            f"<!-- backlinks:start -->\n<!-- backlinks:end -->"
        )
        await _write_and_register_page(
            user_id=user_id,
            session_id=session_id,
            slug=slug,
            title=title,
            category=category,
            content=content,
            now=now,
        )
        created += 1
        logger.info(
            "[WIKI]   stub created for orphan ref [[%s]] (category=%s)",
            slug, category,
        )
    return created


def _guess_category_from_slug(slug: str) -> str:
    """Best-effort categorisation when creating an orphan stub."""
    s = slug.lower()
    stream_hints = ("ismo", "ica", "logia", "fenomenologia", "estoicismo", "kantismo")
    reading_hints = ("libro-", "ensayo-", "tratado-", "republica", "etica-")
    if any(s.endswith(h) for h in ("ismo",)) or any(h in s for h in stream_hints):
        return "stream"
    if any(s.startswith(h) for h in reading_hints):
        return "reading"
    return "topic"


# ─── Global profile synthesis ─────────────────────────────────────────────────

async def synthesize_global_profile(user_id: str, language: str = "es") -> bool:
    """Re-synthesise the user's global philosophical profile (_profile.md).

    Uses an incremental strategy: if a profile already exists, only fetches
    reports created *after* the profile's last update timestamp and merges
    them with the existing profile. This keeps prompt size bounded and
    preserves all historical information through the previous profile text.

    If no profile exists yet (bootstrap), falls back to the 10 most recent
    reports to create the initial synthesis.

    Returns True on success.
    """
    # ── Determine mode: incremental vs bootstrap ──────────────────────
    profile_meta = await get_wiki_page_meta(user_id, "_profile")

    if profile_meta is not None:
        # Incremental: only reports newer than the last profile synthesis
        profile_updated_at: float = profile_meta["updated_at"]
        reports = await get_new_reports_for_user(user_id, since=profile_updated_at, limit=15)
        if not reports:
            age_days = (time.time() - profile_updated_at) / 86400
            logger.info(
                "[WIKI]   global-profile up-to-date (age=%.1fd) — no new reports since last synthesis, skipping LLM",
                age_days,
            )
            return True
        mode = "incremental"
        mode_note = (
            "Estas sesiones son NUEVAS (posteriores al perfil anterior mostrado abajo). "
            "INTEGRA su contenido en el perfil sin descartar ni reemplazar lo que ya estaba. "
            "El perfil anterior ya captura las sesiones más antiguas — no necesitas reescribirlo desde cero, "
            "solo enriquecerlo con los nuevos hallazgos."
        )
        age_days = (time.time() - profile_updated_at) / 86400
        logger.info(
            "[WIKI]   global-profile: mode=incremental  new_reports=%d  profile_age_days=%.1f",
            len(reports), age_days,
        )
    else:
        # Bootstrap: no profile yet — use the 10 most recent reports
        from ..database import get_all_reports_for_user  # local to avoid cycles
        reports = await get_all_reports_for_user(user_id, limit=10)
        if not reports:
            logger.info("[WIKI]   no reports for user — skipping global profile")
            return False
        mode = "bootstrap"
        mode_note = (
            "No existe perfil previo. Sintetiza el perfil del usuario desde cero "
            "a partir de estas sesiones."
        )
        logger.info(
            "[WIKI]   global-profile: mode=bootstrap  reports=%d  (no previous profile)",
            len(reports),
        )

    # ── Build reports block ───────────────────────────────────────────
    reports_block_parts: list[str] = []
    for r in reports:
        title = r["stimulus_title"] or r["stimulus_content"][:60] or "(sin título)"
        # Cap each report to avoid prompt explosion
        content = (r["content"] or "")[:2500]
        reports_block_parts.append(
            f"### Sesión: {title}\n(created_at={r['created_at']})\n\n{content}\n"
        )
    reports_block = "\n---\n".join(reports_block_parts)

    # ── Load previous profile ─────────────────────────────────────────
    previous_profile = read_page(user_id, "_profile", "profile") or "(ninguno todavía)"
    previous_profile = re.sub(r"^---.*?---\s*", "", previous_profile, flags=re.DOTALL).strip()
    previous_profile = _BACKLINK_BLOCK_RE.sub("", previous_profile).strip() or "(ninguno todavía)"

    existing_pages = await list_wiki_pages(user_id)
    known_slugs = ", ".join(
        f"[[{p['slug']}]]" for p in existing_pages if p["slug"] != "_profile"
    ) or "(ninguna página aún)"

    prompt = _GLOBAL_PROFILE_PROMPT_TEMPLATE.format(
        mode_note=mode_note,
        reports_block=reports_block,
        previous_profile=previous_profile,
        known_slugs=known_slugs,
        language=language,
    )
    logger.info(
        "[WIKI]   global-profile prompt: %d chars, %d reports, mode=%s",
        len(prompt), len(reports), mode,
    )

    # ── LLM call (plain markdown, not JSON) ───────────────────────────
    content = await _llm_call_non_streaming(prompt, max_tokens=4096)
    if not content.strip():
        logger.warning("[WIKI]   global-profile LLM returned empty content")
        return False

    # Strip any markdown fences the LLM might have wrapped around
    content = content.strip()
    m = re.match(r"^```(?:markdown)?\s*\n(.*)\n```\s*$", content, re.DOTALL)
    if m:
        content = m.group(1).strip()

    # Ensure backlinks marker block is at the end so sync_graph_edges can populate it
    if "<!-- backlinks:start -->" not in content:
        content = content.rstrip() + "\n\n<!-- backlinks:start -->\n<!-- backlinks:end -->"

    now = time.time()
    write_page(user_id, "_profile", content, "profile")
    page_id = await get_wiki_page_id(user_id, "_profile")
    if page_id is None:
        page_id = str(uuid.uuid4())
    await upsert_wiki_page(page_id, user_id, "_profile", "Perfil filosófico global", "profile", now)

    # Re-sync edges so _profile's [[refs]] become real edges and its backlinks block fills.
    await sync_graph_edges(user_id)

    logger.info(
        "[WIKI]   global profile written: %d chars, linked to %d slugs, mode=%s",
        len(content), len(parse_wiki_links(content)), mode,
    )
    return True


async def synthesize_wiki_update(user_id: str, session_id: str, preferred_language: str = "es") -> None:
    """Run the full wiki synthesis pipeline (3 LLM calls + server steps).

    6 phases:
      1. Extraction LLM — distil topics/streams/readings from session
      2. Prepare context (server) — slugify, classify create vs update,
         load current content for update pages
      3. Content synthesis LLM — produce/update full page markdown
      4. Validate + write — persist pages, auto-stub orphan [[refs]]
      5. Sync edges + regenerate backlinks blocks (server)
      6. Global profile synthesis LLM — re-synthesise _profile from ALL
         user reports
    """
    # Dedup: dialogue + report triggers race within seconds of each other.
    if session_id in _SYNTHESIS_IN_PROGRESS:
        logger.info(
            "[WIKI] SKIP — synthesis already running for session %s",
            session_id,
        )
        return
    _SYNTHESIS_IN_PROGRESS.add(session_id)

    start_ts = time.time()
    logger.info("=" * 70)
    logger.info(
        "[WIKI] START synthesis  user=%s  session=%s  lang=%s",
        user_id, session_id, preferred_language,
    )

    try:
        # ── Step 0: Load session data ─────────────────────────────────
        session_data = await get_full_session_for_wiki(session_id)
        if session_data is None:
            logger.error("[WIKI] ABORT: session %s not found in DB", session_id)
            return

        turns_count = len(session_data.get("turns", []))
        has_report = bool(session_data.get("report"))
        logger.info(
            "[WIKI] session loaded — turns=%d, has_report=%s, age=%s, stimulus=%r",
            turns_count, has_report, session_data["age_group"],
            (session_data["stimulus"].get("title") or session_data["stimulus"].get("content", ""))[:60],
        )

        if turns_count == 0:
            logger.error("[WIKI] ABORT: session has 0 turns")
            return

        transcript = _format_transcript(session_data["turns"])
        stimulus = session_data["stimulus"]
        report = session_data.get("report") or ""
        language = session_data.get("language", preferred_language)

        # ── STEP 1/6: Extraction LLM ──────────────────────────────────
        logger.info("[WIKI] STEP 1/6 — extraction LLM call (LLM #1)")
        extraction_prompt = _EXTRACTION_PROMPT_TEMPLATE.format(
            age_group=session_data["age_group"],
            language=language,
            stimulus_title=stimulus.get("title", ""),
            stimulus_content=stimulus.get("content", ""),
            transcript=transcript,
            report=report[:2000],
        )
        logger.info("[WIKI]   extraction prompt: %d chars", len(extraction_prompt))
        extraction = await _llm_call_json(
            extraction_prompt,
            stage="extraction",
            session_id=session_id,
            max_tokens=2048,
            max_attempts=2,
        )
        if extraction is None:
            logger.error("[WIKI] ABORT: extraction failed after retries")
            return
        logger.info(
            "[WIKI]   extraction OK — topics=%d, streams=%d, books=%d",
            len(extraction.get("topics", [])),
            len(extraction.get("streams", [])),
            len(extraction.get("book_recommendations", [])),
        )

        # ── STEP 2/6: Prepare context (SERVER, no LLM) ────────────────
        logger.info("[WIKI] STEP 2/6 — prepare context (server)")
        existing_pages = await list_wiki_pages(user_id)
        existing_by_slug = {p["slug"]: p for p in existing_pages}

        # Plan the pages this session should produce.
        plan = _plan_pages_from_extraction(extraction, existing_by_slug)
        logger.info(
            "[WIKI]   plan: create=%d (topic:%d, stream:%d, reading:%d)  "
            "update=%d (topic:%d, stream:%d, reading:%d)",
            len(plan["create"]),
            sum(1 for p in plan["create"] if p["category"] == "topic"),
            sum(1 for p in plan["create"] if p["category"] == "stream"),
            sum(1 for p in plan["create"] if p["category"] == "reading"),
            len(plan["update"]),
            sum(1 for p in plan["update"] if p["category"] == "topic"),
            sum(1 for p in plan["update"] if p["category"] == "stream"),
            sum(1 for p in plan["update"] if p["category"] == "reading"),
        )

        if not plan["create"] and not plan["update"]:
            logger.warning("[WIKI]   nothing to synthesise — extraction empty")
            return

        # Build per-page briefs (with existing content for UPDATE pages).
        pages_brief = _build_pages_brief(user_id, plan)
        known_slugs_list = sorted(
            set(existing_by_slug.keys())
            | {p["slug"] for p in plan["create"]}
            | {p["slug"] for p in plan["update"]}
        )

        # ── STEP 3/6: Content synthesis LLM ───────────────────────────
        logger.info("[WIKI] STEP 3/6 — content synthesis LLM call (LLM #2)")
        synthesis_prompt = _SYNTHESIS_PROMPT_TEMPLATE.format(
            extraction=json.dumps(extraction, ensure_ascii=False, indent=2),
            pages_brief=pages_brief,
            known_slugs=", ".join(f"[[{s}]]" for s in known_slugs_list) or "(ninguno aún)",
            language=language,
            topic_template=_TOPIC_TEMPLATE,
            stream_template=_STREAM_TEMPLATE,
            reading_template=_READING_TEMPLATE,
        )
        logger.info("[WIKI]   synthesis prompt: %d chars", len(synthesis_prompt))
        synthesis = await _llm_call_json(
            synthesis_prompt,
            stage="synthesis",
            session_id=session_id,
            max_tokens=8192,
            max_attempts=2,
        )
        if synthesis is None:
            logger.error("[WIKI] ABORT: synthesis failed after retries")
            return
        logger.info(
            "[WIKI]   synthesis OK — %d pages returned",
            len(synthesis.get("pages", [])),
        )

        now = time.time()
        plan_slugs = {p["slug"] for p in plan["create"]} | {p["slug"] for p in plan["update"]}

        # ── STEP 4/6: Validate + write pages ──────────────────────────
        logger.info("[WIKI] STEP 4/6 — validate + write pages")
        pages_created: list[str] = []
        pages_updated: list[str] = []

        for page_spec in synthesis.get("pages", []):
            slug = (page_spec.get("slug") or "").strip()
            title = page_spec.get("title", slug)
            category = page_spec.get("category", "topic")
            content = page_spec.get("content", "")
            if not slug or not content:
                logger.warning(
                    "[WIKI]   skip page (empty slug/content): slug=%r len=%d",
                    slug, len(content),
                )
                continue
            if category not in ("topic", "stream", "reading"):
                logger.warning(
                    "[WIKI]   skip page (invalid category=%r) slug=%s",
                    category, slug,
                )
                continue

            # Persist
            await _write_and_register_page(
                user_id=user_id,
                session_id=session_id,
                slug=slug,
                title=title,
                category=category,
                content=content,
                now=now,
            )
            if slug in existing_by_slug:
                pages_updated.append(slug)
            else:
                pages_created.append(slug)

        # Auto-stub orphan [[refs]] so the graph never has dangling edges.
        stubs_created = await _create_orphan_stubs(
            user_id=user_id,
            session_id=session_id,
            written_slugs=set(pages_created) | set(pages_updated) | set(existing_by_slug.keys()),
            now=now,
        )

        logger.info(
            "[WIKI]   pages_created=%d  pages_updated=%d  stubs_created=%d",
            len(pages_created), len(pages_updated), stubs_created,
        )

        # Check: did the LLM produce every page we asked for?
        produced = set(pages_created) | set(pages_updated)
        missed = plan_slugs - produced
        if missed:
            logger.warning(
                "[WIKI]   LLM missed %d planned pages: %s",
                len(missed), ", ".join(sorted(missed)),
            )

        # ── STEP 5/6: Sync edges + regenerate backlinks ───────────────
        logger.info("[WIKI] STEP 5/6 — sync edges + regenerate backlinks")
        backlinks_rewritten = await sync_graph_edges(user_id)
        logger.info("[WIKI]   backlinks_blocks_rewritten=%d", backlinks_rewritten)

        # ── STEP 6/6: Global profile synthesis (LLM #3) ───────────────
        logger.info("[WIKI] STEP 6/6 — global profile synthesis (LLM #3)")
        await synthesize_global_profile(user_id, language)

        # ── Final edge sync ────────────────────────────────────────────
        # Belt-and-suspenders: sync_graph_edges is also called inside
        # synthesize_global_profile, but a final pass here guarantees
        # _profile's outgoing edges are always current regardless of the
        # code path taken inside synthesize_global_profile (e.g. early
        # return in incremental-mode when profile was already up-to-date).
        final_edges = await sync_graph_edges(user_id)
        logger.info("[WIKI]   final edge sync: backlinks_rewritten=%d", final_edges)

        elapsed = time.time() - start_ts
        logger.info(
            "[WIKI] DONE  user=%s  session=%s  created=%d updated=%d stubs=%d  elapsed=%.1fs",
            user_id, session_id,
            len(pages_created), len(pages_updated), stubs_created, elapsed,
        )
        logger.info("=" * 70)

    except Exception:
        logger.exception(
            "[WIKI] UNHANDLED EXCEPTION  user=%s  session=%s",
            user_id, session_id,
        )
    finally:
        _SYNTHESIS_IN_PROGRESS.discard(session_id)


# ─── LLM helpers ─────────────────────────────────────────────────────────────

async def _llm_call_non_streaming(prompt: str, max_tokens: int = 4096) -> str:
    """Call the wiki LLM and collect full text response."""
    model = _get_wiki_model()
    t0 = time.time()
    chunks: list[str] = []
    async for evt_type, text in gemma_client.generate(
        prompt=prompt,
        model_name=model,
        max_tokens=max_tokens,
        streaming=True,
        thinking_mode=False,
    ):
        if evt_type == "content":
            chunks.append(text)
    response = "".join(chunks)
    logger.info(
        "[WIKI]   LLM call: model=%s max_tokens=%d → %d chars in %.1fs",
        model, max_tokens, len(response), time.time() - t0,
    )
    return response


async def _llm_call_json(
    prompt: str,
    *,
    stage: str,
    session_id: str,
    max_tokens: int,
    max_attempts: int = 2,
) -> Optional[dict]:
    """Call the LLM and parse the response as JSON, retrying on failure.

    Gemma occasionally stops generating mid-array (no token-limit hit, the
    provider just terminates the stream early). Retrying once is cheaper and
    more reliable than trying to repair truncated JSON.

    Returns the parsed dict, or None if every attempt failed.
    """
    last_raw = ""
    for attempt in range(1, max_attempts + 1):
        raw = await _llm_call_non_streaming(prompt, max_tokens=max_tokens)
        last_raw = raw
        if not raw.strip():
            logger.warning(
                "[WIKI]   %s attempt %d/%d: empty response, retrying",
                stage, attempt, max_attempts,
            )
            continue
        parsed = _parse_json_response(raw)
        if parsed is not None:
            if attempt > 1:
                logger.info(
                    "[WIKI]   %s recovered on attempt %d/%d",
                    stage, attempt, max_attempts,
                )
            return parsed
        logger.warning(
            "[WIKI]   %s attempt %d/%d: JSON invalid (%d chars)%s",
            stage, attempt, max_attempts, len(raw),
            ", retrying" if attempt < max_attempts else " — giving up",
        )
    _dump_failure(session_id, f"{stage}-bad-json", prompt, last_raw)
    return None


def _parse_json_response(text: str) -> Optional[dict]:
    """Extract and parse a JSON object from LLM output.

    Handles common LLM output pathologies:
    - Response wrapped in outer markdown fences (```json ... ```)
    - Triple-backticks nested inside string values (the regex must NOT
      stop at the first internal fence)
    - Unescaped literal newlines/tabs inside string values (LLMs frequently
      produce these instead of the JSON-required `\\n`)
    """
    if not text or not text.strip():
        return None

    stripped = text.strip()

    # 1. Strip the OUTER markdown fence only — anchored at start/end.
    #    A non-anchored regex would chew into nested fences inside content.
    if stripped.startswith("```"):
        m = re.match(r"^```(?:json|markdown)?\s*\n(.*)\n```\s*$", stripped, re.DOTALL)
        if m:
            stripped = m.group(1).strip()

    # 2. Find the outermost { ... } span.
    start = stripped.find("{")
    end = stripped.rfind("}")
    if start == -1 or end == -1 or end < start:
        logger.warning(
            "[WIKI]   _parse_json_response: no JSON object boundaries (text_len=%d, head=%r)",
            len(text), text[:200],
        )
        return None
    candidate = stripped[start : end + 1]

    # 3. Strict parse.
    try:
        return json.loads(candidate)
    except json.JSONDecodeError as e:
        logger.info(
            "[WIKI]   strict JSON parse failed at pos=%d: %s → trying string-repair",
            getattr(e, "pos", -1), e.msg,
        )

    # 4. Heuristic repair: escape literal whitespace inside string values.
    repaired = _repair_json_strings(candidate)
    try:
        return json.loads(repaired)
    except json.JSONDecodeError as e:
        # Surface enough context to actually debug this in the logs.
        pos = getattr(e, "pos", 0) or 0
        snippet = repaired[max(0, pos - 120) : min(len(repaired), pos + 120)]
        logger.error(
            "[WIKI]   JSON repair also failed: %s at pos=%d\n"
            "          local context: %r\n"
            "          repaired length=%d  raw length=%d",
            e.msg, pos, snippet, len(repaired), len(text),
        )
        return None


def _repair_json_strings(text: str) -> str:
    """Escape literal newlines/tabs/CR inside JSON string values.

    LLMs often emit JSON where the `content` field contains real newlines
    instead of the required `\\n` escape — that violates RFC 8259. We walk
    the text tracking double-quote state and escape the offending chars
    only when inside a string. Backslash-escaped quotes are honoured.
    """
    out: list[str] = []
    in_string = False
    escape_next = False
    for ch in text:
        if escape_next:
            out.append(ch)
            escape_next = False
            continue
        if ch == "\\":
            out.append(ch)
            escape_next = True
            continue
        if ch == '"':
            in_string = not in_string
            out.append(ch)
            continue
        if in_string:
            if ch == "\n":
                out.append("\\n")
            elif ch == "\r":
                out.append("\\r")
            elif ch == "\t":
                out.append("\\t")
            else:
                out.append(ch)
        else:
            out.append(ch)
    return "".join(out)


def _dump_failure(session_id: str, stage: str, prompt: str, response: str) -> None:
    """Persist a failed synthesis call to disk for offline diagnosis."""
    try:
        dir_ = _DATA_ROOT / "wiki_synthesis_failures"
        dir_.mkdir(parents=True, exist_ok=True)
        path = dir_ / f"{int(time.time())}-{session_id}-{stage}.txt"
        path.write_text(
            f"=== STAGE: {stage} ===\n"
            f"=== SESSION: {session_id} ===\n"
            f"=== PROMPT (len={len(prompt)}) ===\n{prompt}\n\n"
            f"=== RESPONSE (len={len(response)}) ===\n{response}\n",
            encoding="utf-8",
        )
        logger.error("[WIKI]   failure dump saved to %s", path)
    except Exception:
        logger.exception("[WIKI]   could not save failure dump")


def _format_transcript(turns: list[dict]) -> str:
    lines: list[str] = []
    for i, t in enumerate(turns):
        if t.get("child_input"):
            lines.append(f"Usuario: {t['child_input']}")
        lines.append(f"Facilitador: {t['content']}")
    return "\n".join(lines)


def _summarize_existing_pages(user_id: str, pages: list[dict]) -> str:
    if not pages:
        return "(ninguna página wiki existente)"
    lines: list[str] = []
    for p in pages[:20]:  # cap to avoid huge context
        content = read_page(user_id, p["slug"], p["category"])
        title = p.get("title", p["slug"])
        if content:
            # First 150 chars of stripped content
            stripped = re.sub(r"^---.*?---\s*", "", content, flags=re.DOTALL).strip()
            preview = stripped[:150].replace("\n", " ")
            lines.append(f"- [{p['category']}] **{title}** (`{p['slug']}`): {preview}…")
        else:
            lines.append(f"- [{p['category']}] **{title}** (`{p['slug']}`)")
    return "\n".join(lines)
