"""Conversations endpoints backed by SQLite."""

import logging
import time
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import Response

from ..database import (
    delete_conversation,
    get_conversation_detail,
    get_conversations_page,
    load_session_full,
)
from ..dependencies import get_required_user
from ..services.session_store import session_store

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/conversations", tags=["conversations"])

# How many extra turns each click on "Continuar" adds to a resumed session.
RESUME_EXTRA_TURNS = 5


@router.get(
    "",
    summary="List saved conversations",
    description="Returns a paginated list of all saved conversations ordered by date descending.",
)
async def list_conversations(
    page: int = Query(1, ge=1, description="Page number (1-based)"),
    per_page: int = Query(24, ge=1, le=100, description="Results per page"),
    current_user: Annotated[dict, Depends(get_required_user)] = None,
) -> dict:
    return await get_conversations_page(page, per_page, user_id=current_user["id"])


@router.get(
    "/{session_id}",
    summary="Get a saved conversation",
    description="Returns the full conversation with all turns for the given session ID.",
)
async def get_conversation(
    session_id: str,
    current_user: Annotated[dict, Depends(get_required_user)] = None,
) -> dict:
    data = await get_conversation_detail(session_id, user_id=current_user["id"])
    if data is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Conversation {session_id} not found",
        )
    return data


@router.delete(
    "/{session_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a conversation",
    description="Permanently deletes the conversation, all its turns, and its report from the database.",
)
async def delete_conversation_endpoint(
    session_id: str,
    current_user: Annotated[dict, Depends(get_required_user)] = None,
) -> Response:
    deleted = await delete_conversation(session_id, user_id=current_user["id"])
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Conversation {session_id} not found",
        )
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post(
    "/{session_id}/resume",
    summary="Reanudate a past conversation, adding 5 more turns",
    description=(
        "Rehydrates the session into memory if it had expired and extends "
        "`total_turns` by 5. Idempotent within the same call but accumulates "
        "on repeated calls. After the user adds the new turns, the wiki "
        "synthesis and silent report regeneration fire automatically when "
        "`total_turns` is reached."
    ),
)
async def resume_conversation(
    session_id: str,
    current_user: Annotated[dict, Depends(get_required_user)],
) -> dict:
    user_id = current_user["id"]

    # Fast path: session still in memory and owned by this user — just bump.
    existing = session_store.get_session(session_id)
    if existing is not None:
        owner = getattr(existing, "user_id", None)
        if owner is not None and owner != user_id:
            # Defensive: shouldn't happen with UUIDs, but never leak another user's session.
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="This conversation does not belong to you.",
            )
        existing.total_turns = (existing.total_turns or len(existing.turns)) + RESUME_EXTRA_TURNS
        # Reset TTL window so the user has the full TTL to finish the continuation
        existing.created_at = time.time()
        logger.info(
            "[RESUME] in-memory bump user=%s session=%s turns=%d/%d",
            user_id, session_id, len(existing.turns), existing.total_turns,
        )
        return {"session_id": session_id, "total_turns": existing.total_turns}

    # Slow path: load from SQLite and rebuild.
    data = await load_session_full(session_id, user_id)
    if data is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Conversation {session_id} not found",
        )
    session = session_store.rebuild_and_register(data, extra_turns=RESUME_EXTRA_TURNS)
    logger.info(
        "[RESUME] rehydrated from DB user=%s session=%s turns=%d/%d",
        user_id, session_id, len(session.turns), session.total_turns,
    )
    return {"session_id": session_id, "total_turns": session.total_turns}
