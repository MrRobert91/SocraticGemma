"""Conversations endpoints backed by SQLite."""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import Response

from ..database import get_conversations_page, get_conversation_detail, delete_conversation
from ..dependencies import get_required_user

router = APIRouter(prefix="/conversations", tags=["conversations"])


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
