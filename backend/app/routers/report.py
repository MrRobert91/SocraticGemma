"""Philosophical report endpoints with SSE streaming."""

import asyncio
import json
import logging

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from typing import Optional

from ..dependencies import get_optional_user
from ..services.session_store import session_store
from ..services.report_service import generate_report
from ..database import save_report as db_save_report, get_report as db_get_report

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/sessions", tags=["report"])


@router.post(
    "/{session_id}/report",
    summary="Generate a philosophical profile report (SSE stream)",
    description="Streams a markdown report as Server-Sent Events. Persists to SQLite when complete."
)
async def create_report(
    session_id: str,
    background_tasks: BackgroundTasks,
    current_user: Optional[dict] = Depends(get_optional_user),
) -> StreamingResponse:
    """Generate and stream a philosophical report for the session."""
    session = session_store.get_session(session_id)
    if session is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session {session_id} not found or expired",
        )
    if not session.turns:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Session has no turns — cannot generate report",
        )

    async def event_generator():
        full_content: list[str] = []
        try:
            async for chunk in generate_report(session):
                full_content.append(chunk)
                yield f"event: token\ndata: {json.dumps({'text': chunk}, ensure_ascii=False)}\n\n"

            # Persist the full report
            try:
                await db_save_report(session_id, "".join(full_content))
            except Exception:
                pass  # non-fatal

            # Trigger wiki synthesis in background for authenticated users
            if current_user:
                from ..services.wiki_service import synthesize_wiki_update
                background_tasks.add_task(
                    synthesize_wiki_update,
                    current_user["id"],
                    session_id,
                    current_user.get("preferred_language", "es"),
                )

            yield f"event: complete\ndata: {json.dumps({'status': 'done'})}\n\n"
        except Exception as exc:
            yield f"event: error\ndata: {json.dumps({'message': str(exc)})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


@router.get(
    "/{session_id}/report",
    summary="Get a previously generated report",
    description="Returns the saved report content, or 404 if not yet generated."
)
async def get_report(session_id: str) -> dict:
    """Return a saved philosophical report."""
    content = await db_get_report(session_id)
    if content is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Report not generated yet for this session",
        )
    return {"session_id": session_id, "content": content}
