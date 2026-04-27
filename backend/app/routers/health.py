"""Health check endpoint."""

from fastapi import APIRouter

from ..schemas import HealthResponse
from ..services.session_store import session_store

router = APIRouter(prefix="", tags=["health"])


@router.get(
    "/health",
    response_model=HealthResponse,
    summary="Health check",
    description="Returns service health status and session count."
)
async def health_check() -> HealthResponse:
    """Check service health.
    
    Returns:
        HealthResponse with status and active session count.
    """
    sessions = session_store.get_all_sessions()
    
    return HealthResponse(
        status="ok",
        sessions=len(sessions)
    )
