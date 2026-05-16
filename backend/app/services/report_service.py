"""Report generation service — produces a philosophical profile of the participant."""

import asyncio
import logging
from pathlib import Path
from typing import AsyncGenerator, Optional

import yaml

from ..config import settings
from ..models import Session
from .gemma_client import GemmaClient, gemma_client as default_gemma_client

logger = logging.getLogger(__name__)

_PROMPTS_DIR = Path(__file__).parent.parent / "prompts"


def _load_report_prompt() -> tuple[str, str]:
    """Load system and report prompts from YAML."""
    filepath = _PROMPTS_DIR / "philosophical_report.yaml"
    with open(filepath, "r", encoding="utf-8") as f:
        data = yaml.safe_load(f)
    return data.get("system", ""), data.get("report_prompt", "")


def _build_conversation_text(session: Session) -> str:
    """Render the full session history as readable text for the prompt."""
    lines: list[str] = []
    for turn in session.turns:
        if turn.child_input:
            lines.append(f"PARTICIPANTE: {turn.child_input}")
        lines.append(f"SÓCRATES/GEMMA: {turn.content}")
    return "\n\n".join(lines)


async def generate_report(
    session: Session,
    gemma_client: Optional[GemmaClient] = None,
) -> AsyncGenerator[str, None]:
    """Stream a philosophical report and yield text chunks.

    The caller is responsible for accumulating chunks and persisting the
    full report to SQLite once the generator is exhausted.

    Yields:
        str: Markdown text chunks as they arrive from the model.
    """
    client = gemma_client or default_gemma_client

    system_text, report_template = _load_report_prompt()

    stimulus_text = session.stimulus.get("content", "")
    if session.stimulus.get("title"):
        stimulus_text = f"{session.stimulus['title']}: {stimulus_text}"

    lang = getattr(session, "language", "es") or "es"
    lang_name = "español" if lang == "es" else "English"
    age_group_text = "el participante" if lang == "es" else "the participant"
    no_turns_msg = (
        "*(La conversación no tiene turnos suficientes para generar un informe.)*"
        if lang == "es"
        else "*(The conversation does not have enough turns to generate a report.)*"
    )

    conversation_text = _build_conversation_text(session)
    if not conversation_text.strip():
        yield no_turns_msg
        return

    lang_instruction = (
        f"IMPORTANT: Write the ENTIRE report in {lang_name}. "
        f"All section headings, body text, and the closing note must be in {lang_name}. "
        f"Do not mix languages."
    )
    full_prompt = f"{system_text}\n\n{lang_instruction}\n\n" + report_template.format(
        conversation_text=conversation_text,
        stimulus=stimulus_text,
        age_group=age_group_text,
    )

    async for evt_type, chunk in client.generate(
        prompt=full_prompt,
        model_name=settings.gemma_model_accurate,
        max_tokens=3000,
        streaming=True,
        thinking_mode=False,
    ):
        if evt_type == "content" and chunk:
            yield chunk


async def regenerate_report_silent(session: Session) -> bool:
    """Generate the report and persist it to DB, no SSE / no streaming to caller.

    Used by the dialogue end-of-session hook so that finishing the (possibly
    resumed) conversation automatically refreshes the stored report — the user
    doesn't have to click "Generate report" again to see the updated profile.

    Does NOT trigger wiki synthesis: the dialogue hook already does that in
    parallel. Returns True on success.
    """
    try:
        if not session.turns:
            logger.warning(
                "[REPORT-SILENT] session %s has no turns — skipping",
                session.session_id,
            )
            return False

        chunks: list[str] = []
        async for chunk in generate_report(session):
            chunks.append(chunk)
        content = "".join(chunks).strip()

        if not content:
            logger.warning(
                "[REPORT-SILENT] empty content for session %s — skipping save",
                session.session_id,
            )
            return False

        from ..database import save_report  # local import to avoid cycle
        await save_report(session.session_id, content)
        logger.info(
            "[REPORT-SILENT] regenerated and saved session=%s chars=%d",
            session.session_id, len(content),
        )
        return True
    except Exception:
        logger.exception(
            "[REPORT-SILENT] failed for session=%s",
            session.session_id,
        )
        return False
