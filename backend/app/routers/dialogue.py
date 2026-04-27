"""Dialogue endpoints with SSE streaming."""

import json
from typing import Annotated

from fastapi import APIRouter, HTTPException, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from sse_starlette.sse import EventSourceResponse

from ..services.session_store import session_store
from ..services.prompt_builder import prompt_builder
from ..services.gemma_client import gemma_client
from ..services.evaluator import evaluator
from ..services.socratic_engine import SocraticEngine

router = APIRouter(prefix="/sessions", tags=["dialogue"])


class TurnRequest(BaseModel):
    """Request body for processing a dialogue turn."""
    text: str = Field(..., description="The child's input/response")


@router.post(
    "/{session_id}/turns",
    summary="Process a dialogue turn with SSE streaming",
    description="Streams the model response as Server-Sent Events (SSE)."
)
async def process_turn(
    session_id: str,
    request: TurnRequest
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
    child_input = request.text
    
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
            elif event["type"] == "error":
                yield {
                    "event": "error",
                    "data": json.dumps({"message": event["message"]})
                }
    
    return EventSourceResponse(event_generator())
