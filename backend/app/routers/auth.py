"""Authentication endpoints: register, login, logout, and current user."""

import re
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Response, status
from pydantic import BaseModel

from ..config import settings
from ..database import create_user, get_user_by_email
from ..dependencies import get_required_user
from ..services.auth import create_access_token, hash_password, verify_password

router = APIRouter(prefix="/auth", tags=["auth"])

_COOKIE_NAME = "access_token"
_COOKIE_MAX_AGE = settings.jwt_expire_hours * 3600  # seconds
_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def _set_auth_cookie(response: Response, token: str) -> None:
    """Set the httpOnly auth cookie on the response."""
    response.set_cookie(
        key=_COOKIE_NAME,
        value=token,
        httponly=True,
        secure=True,
        samesite="none",
        max_age=_COOKIE_MAX_AGE,
        path="/",
    )


class RegisterRequest(BaseModel):
    email: str
    password: str


class LoginRequest(BaseModel):
    email: str
    password: str


@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(body: RegisterRequest, response: Response) -> dict:
    """Register a new user. Sets auth cookie and returns user info."""
    email = body.email.strip().lower()

    if not _EMAIL_RE.match(email):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Invalid email address",
        )
    if len(body.password) < 8:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Password must be at least 8 characters",
        )

    existing = await get_user_by_email(email)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists",
        )

    password_hash = hash_password(body.password)
    user = await create_user(email=email, password_hash=password_hash)

    token = create_access_token(user["id"], user["email"])
    _set_auth_cookie(response, token)

    return {"id": user["id"], "email": user["email"]}


@router.post("/login")
async def login(body: LoginRequest, response: Response) -> dict:
    """Authenticate user. Sets auth cookie and returns user info."""
    email = body.email.strip().lower()
    user = await get_user_by_email(email)

    # Use constant-time comparison to avoid timing attacks
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )

    token = create_access_token(user["id"], user["email"])
    _set_auth_cookie(response, token)

    return {"id": user["id"], "email": user["email"]}


@router.post("/logout")
async def logout(response: Response) -> dict:
    """Log out by clearing the auth cookie."""
    response.delete_cookie(
        key=_COOKIE_NAME,
        path="/",
        samesite="none",
        secure=True,
    )
    return {"ok": True}


@router.get("/me")
async def me(user: Annotated[dict, Depends(get_required_user)]) -> dict:
    """Return the currently authenticated user, or 401 if not authenticated."""
    return {"id": user["id"], "email": user["email"]}
