"""Philosophical Wiki endpoints."""

from __future__ import annotations

import json
import logging
from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from fastapi.responses import Response, StreamingResponse

from ..database import get_wiki_graph, list_wiki_pages, get_wiki_page_id, get_sessions_for_wiki_page, get_full_session_for_wiki
from ..dependencies import get_required_user
from ..services.wiki_service import (
    export_wiki_zip,
    get_profile_summary,
    read_page,
    synthesize_wiki_update,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/wiki", tags=["wiki"])

RequiredUser = Annotated[dict, Depends(get_required_user)]


@router.get(
    "/status",
    summary="Get wiki status for the current user",
    description=(
        "Returns whether the user has wiki pages and whether they have any "
        "saved sessions. Lets the frontend distinguish between 'never used' "
        "and 'synthesis pending or failed' states."
    ),
)
async def get_status(current_user: RequiredUser) -> dict:
    from ..database import get_conversations_page  # local to avoid circular

    user_id = current_user["id"]
    pages = await list_wiki_pages(user_id)
    convs = await get_conversations_page(1, 1, user_id)
    return {
        "page_count": len(pages),
        "session_count": convs.get("total", 0),
        "last_page_updated_at": max((p["updated_at"] for p in pages), default=None),
    }


@router.post(
    "/synthesize/{session_id}",
    status_code=status.HTTP_202_ACCEPTED,
    summary="Manually trigger wiki synthesis for one session",
    description=(
        "Useful for retrying a failed synthesis. Runs the LLM pipeline in "
        "the background; check backend logs (or call /wiki/status) afterwards."
    ),
)
async def synthesize_one(
    session_id: str,
    current_user: RequiredUser,
    background_tasks: BackgroundTasks,
) -> dict:
    logger.info(
        "[WIKI-TRIGGER] queued manually  user=%s  session=%s",
        current_user["id"], session_id,
    )
    background_tasks.add_task(
        synthesize_wiki_update,
        current_user["id"],
        session_id,
        current_user.get("preferred_language", "es"),
    )
    return {"status": "synthesizing", "session_id": session_id}


@router.get(
    "/profile",
    summary="Get the user's philosophical profile",
    description="Returns the _profile.md content and a short summary snippet.",
)
async def get_profile(current_user: RequiredUser) -> dict:
    user_id = current_user["id"]
    content = read_page(user_id, "_profile", "profile")
    if content is None:
        return {"content": None, "summary": None}
    summary = get_profile_summary(user_id)
    return {"content": content, "summary": summary}


@router.get(
    "/graph",
    summary="Get wiki knowledge graph (nodes + edges)",
    description="Returns nodes and edges suitable for React Flow.",
)
async def get_graph(current_user: RequiredUser) -> dict:
    user_id = current_user["id"]
    return await get_wiki_graph(user_id)


@router.get(
    "/pages",
    summary="List all wiki pages",
    description="Returns metadata for all wiki pages owned by the current user.",
)
async def list_pages(current_user: RequiredUser) -> list[dict]:
    user_id = current_user["id"]
    pages = await list_wiki_pages(user_id)
    # Attach session count
    result = []
    for p in pages:
        sessions = await get_sessions_for_wiki_page(p["id"])
        result.append({**p, "session_count": len(sessions)})
    return result


@router.get(
    "/pages/{slug}",
    summary="Get a single wiki page",
    description="Returns the full markdown content and session links for a page.",
)
async def get_page(slug: str, current_user: RequiredUser) -> dict:
    user_id = current_user["id"]
    # Determine category from DB
    pages = await list_wiki_pages(user_id)
    page_meta = next((p for p in pages if p["slug"] == slug), None)
    if page_meta is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Page not found")

    content = read_page(user_id, slug, page_meta["category"])
    if content is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Page file not found")

    sessions = await get_sessions_for_wiki_page(page_meta["id"])
    return {
        "slug": slug,
        "title": page_meta["title"],
        "category": page_meta["category"],
        "content": content,
        "sessions": sessions,
        "created_at": page_meta["created_at"],
        "updated_at": page_meta["updated_at"],
    }


@router.get(
    "/export",
    summary="Download all wiki pages as a ZIP",
    description="Returns a ZIP archive of all .md files (Obsidian-compatible).",
)
async def export_wiki(current_user: RequiredUser) -> Response:
    user_id = current_user["id"]
    zip_bytes = export_wiki_zip(user_id)
    return Response(
        content=zip_bytes,
        media_type="application/zip",
        headers={"Content-Disposition": "attachment; filename=\"wiki.zip\""},
    )


@router.post(
    "/rebuild",
    status_code=status.HTTP_202_ACCEPTED,
    summary="Rebuild wiki from all sessions",
    description="Reprocesses all user sessions to regenerate the wiki. Runs in background.",
)
async def rebuild_wiki(current_user: RequiredUser, background_tasks: BackgroundTasks) -> dict:
    user_id = current_user["id"]
    preferred_language = current_user.get("preferred_language", "es")

    from ..database import get_conversations_page  # local import to avoid circular

    # Collect all session IDs for the user
    all_sessions: list[str] = []
    page = 1
    while True:
        result = await get_conversations_page(page, 50, user_id)
        all_sessions.extend(item["id"] for item in result["items"])
        if page >= result["pages"]:
            break
        page += 1

    async def _rebuild():
        for session_id in all_sessions:
            await synthesize_wiki_update(user_id, session_id, preferred_language)

    background_tasks.add_task(_rebuild)
    return {"status": "rebuilding", "session_count": len(all_sessions)}
