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
    get_wiki_graph,
    get_wiki_page_id,
    link_wiki_page_to_session,
    list_wiki_pages,
    upsert_wiki_edge,
    upsert_wiki_page,
)
from .gemma_client import gemma_client

logger = logging.getLogger(__name__)

# Base path for user wiki files on the persistent volume
_DATA_ROOT = Path(os.environ.get("DATA_ROOT", "/data"))

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

async def sync_graph_edges(user_id: str) -> None:
    """Parse all wiki pages and rebuild wiki_edges in SQLite."""
    pages = await list_wiki_pages(user_id)
    slug_to_id: dict[str, str] = {p["slug"]: p["id"] for p in pages}

    for page in pages:
        page_id = page["id"]
        content = read_page(user_id, page["slug"], page["category"])
        if not content:
            continue

        await delete_wiki_edges_for_page(page_id)
        linked_slugs = parse_wiki_links(content)
        for linked_slug in set(linked_slugs):
            target_id = slug_to_id.get(linked_slug)
            if target_id and target_id != page_id:
                await upsert_wiki_edge(page_id, target_id)


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

_SYNTHESIS_PROMPT_TEMPLATE = """\
Eres un sistema de síntesis de un wiki filosófico personal. El usuario acaba de completar una sesión de diálogo socrático.

## Extracción de la sesión
{extraction}

## Páginas wiki existentes del usuario (resumen)
{existing_pages_summary}

---
Tu tarea: generar o actualizar las páginas wiki en Markdown con front matter YAML.

Para cada tema y corriente filosófica identificados, produce una página con este formato exacto:
```markdown
---
title: Título de la página
slug: slug-del-tema
category: topic  # o "stream" para corrientes filosóficas
tags: [tag1, tag2]
sessions: [session_id]
created: {timestamp}
updated: {timestamp}
---

## Tu posición
[postura del usuario o preguntas planteadas]

## Ideas exploradas
[conceptos discutidos en esta sesión]

## Tensiones y preguntas abiertas
[contradicciones o preguntas sin resolver]

## Corrientes filosóficas relacionadas
[[slug-corriente-1]], [[slug-corriente-2]]

## Lecturas recomendadas
- *Título* — Autor: razón

## Conexiones
[[slug-tema-relacionado-1]], [[slug-tema-relacionado-2]]
```

También produce/actualiza `_profile`:
```markdown
---
slug: _profile
category: profile
updated: {timestamp}
---

## Estilo filosófico
[síntesis de 2-3 frases del perfil del usuario]

## Corrientes predominantes
[[corriente-1]], [[corriente-2]]

## Temas recurrentes
[lista de temas con enlaces]

## Puntos ciegos o tensiones
[contradicciones o áreas poco exploradas]

## Lecturas recomendadas
[top 3 recomendaciones]
```

Responde SOLO con JSON válido (sin texto adicional):
{{
  "pages": [
    {{
      "slug": "slug-del-tema",
      "title": "Título Legible",
      "category": "topic",
      "content": "contenido markdown completo"
    }}
  ],
  "profile_content": "contenido markdown completo del _profile.md"
}}
"""


async def synthesize_wiki_update(user_id: str, session_id: str, preferred_language: str = "es") -> None:
    """Run the full LLM wiki synthesis pipeline for a completed session.

    Steps:
    1. Load session data (turns + report) from DB
    2. Run extraction LLM call → structured JSON
    3. Load existing wiki pages for context
    4. Run synthesis LLM call → page content
    5. Write pages to disk, upsert DB records, sync edges
    """
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

        # ── Step 1: Extraction LLM ────────────────────────────────────
        logger.info("[WIKI] STEP 1/4 — extraction LLM call")
        extraction_prompt = _EXTRACTION_PROMPT_TEMPLATE.format(
            age_group=session_data["age_group"],
            language=language,
            stimulus_title=stimulus.get("title", ""),
            stimulus_content=stimulus.get("content", ""),
            transcript=transcript,
            report=report[:2000],  # cap to avoid huge prompts
        )
        logger.info("[WIKI]   extraction prompt: %d chars", len(extraction_prompt))

        extraction_json = await _llm_call_non_streaming(extraction_prompt, max_tokens=2048)
        if not extraction_json.strip():
            logger.error("[WIKI] ABORT: extraction LLM returned empty response")
            _dump_failure(session_id, "extraction-empty", extraction_prompt, extraction_json)
            return

        extraction = _parse_json_response(extraction_json)
        if extraction is None:
            logger.error(
                "[WIKI] ABORT: extraction returned invalid JSON. Raw (first 800): %s",
                extraction_json[:800],
            )
            _dump_failure(session_id, "extraction-bad-json", extraction_prompt, extraction_json)
            return
        logger.info(
            "[WIKI]   extraction parsed OK — topics=%d, streams=%d, open_questions=%d, contradictions=%d",
            len(extraction.get("topics", [])),
            len(extraction.get("streams", [])),
            len(extraction.get("open_questions", [])),
            len(extraction.get("contradictions", [])),
        )

        # ── Step 2: Load existing pages ───────────────────────────────
        logger.info("[WIKI] STEP 2/4 — loading existing pages")
        existing_pages = await list_wiki_pages(user_id)
        existing_summary = _summarize_existing_pages(user_id, existing_pages)
        logger.info("[WIKI]   existing pages in DB: %d", len(existing_pages))

        # ── Step 3: Synthesis LLM ─────────────────────────────────────
        logger.info("[WIKI] STEP 3/4 — synthesis LLM call")
        ts = time.strftime("%Y-%m-%dT%H:%M:%S")
        synthesis_prompt = _SYNTHESIS_PROMPT_TEMPLATE.format(
            extraction=json.dumps(extraction, ensure_ascii=False, indent=2),
            existing_pages_summary=existing_summary,
            timestamp=ts,
        )
        logger.info("[WIKI]   synthesis prompt: %d chars", len(synthesis_prompt))

        synthesis_json = await _llm_call_non_streaming(synthesis_prompt, max_tokens=8192)
        if not synthesis_json.strip():
            logger.error("[WIKI] ABORT: synthesis LLM returned empty response")
            _dump_failure(session_id, "synthesis-empty", synthesis_prompt, synthesis_json)
            return

        synthesis = _parse_json_response(synthesis_json)
        if synthesis is None:
            logger.error(
                "[WIKI] ABORT: synthesis returned invalid JSON. Length=%d. Raw (first 1500): %s",
                len(synthesis_json), synthesis_json[:1500],
            )
            _dump_failure(session_id, "synthesis-bad-json", synthesis_prompt, synthesis_json)
            return
        logger.info(
            "[WIKI]   synthesis parsed OK — pages=%d, has_profile=%s",
            len(synthesis.get("pages", [])),
            bool(synthesis.get("profile_content")),
        )

        now = time.time()

        # ── Step 4: Write pages ──────────────────────────────────────
        logger.info("[WIKI] STEP 4/4 — writing pages to disk and DB")
        pages_written: list[str] = []
        for page_spec in synthesis.get("pages", []):
            slug = page_spec.get("slug", "").strip()
            title = page_spec.get("title", slug)
            category = page_spec.get("category", "topic")
            content = page_spec.get("content", "")
            if not slug or not content:
                logger.warning(
                    "[WIKI]   skipping page with empty slug or content: slug=%r content_len=%d",
                    slug, len(content),
                )
                continue

            write_page(user_id, slug, content, category)
            page_id = await get_wiki_page_id(user_id, slug)
            if page_id is None:
                page_id = str(uuid.uuid4())
            await upsert_wiki_page(page_id, user_id, slug, title, category, now)
            await link_wiki_page_to_session(page_id, session_id)
            pages_written.append(slug)
            logger.info(
                "[WIKI]   wrote page  slug=%-30s  category=%-8s  chars=%d",
                slug, category, len(content),
            )

        # ── Step 5: Write profile ─────────────────────────────────────
        profile_content = synthesis.get("profile_content", "")
        if profile_content:
            write_page(user_id, "_profile", profile_content, "profile")
            profile_id = await get_wiki_page_id(user_id, "_profile")
            if profile_id is None:
                profile_id = str(uuid.uuid4())
            await upsert_wiki_page(profile_id, user_id, "_profile", "Perfil filosófico", "profile", now)
            logger.info("[WIKI]   wrote _profile  chars=%d", len(profile_content))
        else:
            logger.warning("[WIKI]   no profile_content returned by LLM")

        # ── Step 6: Sync graph edges ──────────────────────────────────
        logger.info("[WIKI] syncing graph edges")
        await sync_graph_edges(user_id)

        elapsed = time.time() - start_ts
        logger.info(
            "[WIKI] DONE  user=%s  session=%s  pages_written=%d  elapsed=%.1fs",
            user_id, session_id, len(pages_written), elapsed,
        )
        logger.info("=" * 70)

    except Exception:
        logger.exception(
            "[WIKI] UNHANDLED EXCEPTION  user=%s  session=%s",
            user_id, session_id,
        )


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
