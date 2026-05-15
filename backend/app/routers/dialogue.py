"""Dialogue endpoints with SSE streaming."""

import asyncio
import json
import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from sse_starlette.sse import EventSourceResponse

from ..dependencies import get_optional_user
from ..services.session_store import session_store
from ..services.prompt_builder import prompt_builder
from ..services.gemma_client import gemma_client
from ..services.evaluator import evaluator
from ..services.socratic_engine import SocraticEngine

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/sessions", tags=["dialogue"])


class TurnRequest(BaseModel):
    """Request body for processing a dialogue turn."""
    child_input: str = Field(..., description="The child's input/response")


@router.post(
    "/{session_id}/turns",
    summary="Process a dialogue turn with SSE streaming",
    description="Streams the model response as Server-Sent Events (SSE)."
)
async def process_turn(
    session_id: str,
    request: TurnRequest,
    current_user: Optional[dict] = Depends(get_optional_user),
) -> StreamingResponse:
    """Process a turn in the Socratic dialogue with SSE streaming.
    
    This endpoint streams the response using Server-Sent Events (SSE).
    
    Event types:
    - event:thinking - Thinking trace content chunks
    - event:token - Response token chunks
    - event:complete - Final turn with evaluation scores
    
    Args:
        session_id: The unique session identifier.
        request: TurnRequest containing the child's input text.
        
    Returns:
        StreamingResponse with SSE events.
        
    Raises:
        HTTPException: If session not found.
    """
    child_input = request.child_input
    
    # Verify session exists
    session = session_store.get_session(session_id)
    if session is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session {session_id} not found or expired"
        )
    
    # Create engine instance
    engine = SocraticEngine(
        session_store=session_store,
        prompt_builder=prompt_builder,
        gemma_client=gemma_client,
        evaluator=evaluator
    )
    
    async def event_generator():
        """Generate SSE events from the engine."""
        try:
            async for event in engine.process_turn(
                session_id=session_id,
                child_input=child_input,
                session_store=session_store,
                prompt_builder=prompt_builder,
                gemma_client=gemma_client,
                evaluator=evaluator,
                rag_service=None  # Could be enabled if RAG service is available
            ):
                if event["type"] == "thinking":
                    yield {
                        "event": "thinking",
                        "data": json.dumps({"trace": event["trace"]})
                    }
                elif event["type"] == "token":
                    yield {
                        "event": "token",
                        "data": json.dumps({"text": event["text"]})
                    }
                elif event["type"] == "complete":
                    yield {
                        "event": "complete",
                        "data": json.dumps({
                            "turn": event["turn"],
                            "scores": event["scores"]
                        })
                    }
                    # After last turn: trigger wiki synthesis automatically
                    if current_user:
                        session_now = session_store.get_session(session_id)
                        if session_now:
                            total = getattr(session_now, "total_turns", 20)
                            turns_done = len(session_now.turns)
                            logger.info(
                                "[WIKI-TRIGGER] dialogue: user=%s session=%s turns=%d/%d",
                                current_user["id"], session_id, turns_done, total,
                            )
                            if turns_done >= total:
                                try:
                                    from ..services.wiki_service import synthesize_wiki_update
                                    asyncio.ensure_future(
                                        synthesize_wiki_update(
                                            current_user["id"],
                                            session_id,
                                            current_user.get("preferred_language", "es"),
                                        )
                                    )
                                    logger.info(
                                        "[WIKI-TRIGGER] queued from dialogue end-of-session  session=%s",
                                        session_id,
                                    )
                                except Exception:
                                    logger.exception("[WIKI-TRIGGER] failed to queue wiki synthesis")
                            else:
                                logger.info(
                                    "[WIKI-TRIGGER] skipped — session not finished (%d/%d turns)",
                                    turns_done, total,
                                )
                        else:
                            logger.warning(
                                "[WIKI-TRIGGER] session_now is None  session=%s",
                                session_id,
                            )
                    else:
                        logger.info(
                            "[WIKI-TRIGGER] skipped — guest user (no auth)  session=%s",
                            session_id,
                        )
                elif event["type"] == "error":
                    yield {
                        "event": "error",
                        "data": json.dumps({"message": event["message"]})
                    }
        except Exception as exc:
            import logging
            logging.error("Unhandled SSE generator error: %s", exc)
            yield {
                "event": "error",
                "data": json.dumps({"message": str(exc)})
            }
    
    return EventSourceResponse(event_generator())
