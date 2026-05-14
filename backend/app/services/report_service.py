"""Report generation service — produces a philosophical profile of the participant."""

import asyncio
from pathlib import Path
from typing import AsyncGenerator, Optional

import yaml

from ..config import settings
from ..models import Session
from .gemma_client import GemmaClient, gemma_client as default_gemma_client

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

    age_label = {
        "6-8": "niños de 6 a 8 años",
        "9-12": "niños de 9 a 12 años",
        "13-16": "adolescentes de 13 a 16 años",
        "adult": "adulto",
    }.get(session.age_group, session.age_group)

    stimulus_text = session.stimulus.get("content", "")
    if session.stimulus.get("title"):
        stimulus_text = f"{session.stimulus['title']}: {stimulus_text}"

    conversation_text = _build_conversation_text(session)
    if not conversation_text.strip():
        yield "*(La conversación no tiene turnos suficientes para generar un informe.)*"
        return

    full_prompt = f"{system_text}\n\n" + report_template.format(
        conversation_text=conversation_text,
        stimulus=stimulus_text,
        age_group=age_label,
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
