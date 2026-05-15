"""FastAPI dependency functions for authentication."""

from typing import Optional

from fastapi import HTTPException, Request, status

from .services.auth import decode_access_token
from .database import get_user_by_id


async def get_optional_user(request: Request) -> Optional[dict]:
    """Extract and validate the current user from the auth cookie.

    Returns the user dict if authenticated, None otherwise.
    Never raises — safe to use on public endpoints.
    """
    token = request.cookies.get("access_token")
    if not token:
        return None
    payload = decode_access_token(token)
    if not payload:
        return None
    return await get_user_by_id(payload["sub"])


async def get_required_user(request: Request) -> dict:
    """Like get_optional_user but raises HTTP 401 if not authenticated."""
    user = await get_optional_user(request)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user
