"""Session management endpoints."""

import time
import uuid
from typing import Annotated

from fastapi import APIRouter, HTTPException, status

from ..models import Session, Turn
from ..schemas import CreateSessionRequest, SessionResponse, TurnResponse, EvalScoresResponse
from ..services.session_store import session_store

router = APIRouter(prefix="/sessions", tags=["sessions"])


@router.post(
    "",
    response_model=dict,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new Socratic dialogue session",
    description="Creates a new session with the specified age group and stimulus."
)
async def create_session(request: CreateSessionRequest) -> dict:
    """Create a new Socratic dialogue session.
    
    Args:
        request: CreateSessionRequest with age_group, stimulus, and options.
        
    Returns:
        dict with session_id of the created session.
    """
    session_id = str(uuid.uuid4())
    
    session = Session(
        session_id=session_id,
        age_group=request.age_group,
        stimulus=request.stimulus.model_dump(),
        model_size=request.model_size,
        language=request.language,
        turns=[],
        phases={
            "stimulus": False,
            "questions": False,
            "agenda": False,
            "inquiry": False,
            "synthesis": False
        },
        created_at=time.time()
    )
    
    # Add thinking_mode attribute dynamically (not in base model)
    session.thinking_mode = request.thinking_mode
    
    session_store.create_session(session)
    
    return {"session_id": session_id}


@router.get(
    "/{session_id}",
    response_model=SessionResponse,
    summary="Get session by ID",
    description="Retrieves a session with full turn history."
)
async def get_session(session_id: str) -> SessionResponse:
    """Get a session by ID with full turn history.
    
    Args:
        session_id: The unique session identifier.
        
    Returns:
        SessionResponse with all session details and turns.
        
    Raises:
        HTTPException: If session not found or expired.
    """
    session = session_store.get_session(session_id)
    
    if session is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session {session_id} not found or expired"
        )
    
    # Convert turns to response format
    turns_response = []
    for turn in session.turns:
        eval_scores = EvalScoresResponse(
            socratism=turn.eval_scores.socratism,
            age_fit=turn.eval_scores.age_fit,
            builds_on=turn.eval_scores.builds_on,
            openness=turn.eval_scores.openness,
            advancement=turn.eval_scores.advancement,
            overall=turn.eval_scores.overall,
            weighted_overall=turn.eval_scores.weighted_overall()
        )
        
        turn_response = TurnResponse(
            id=turn.id,
            content=turn.content,
            question_type=turn.question_type,
            thinking_trace=turn.thinking_trace,
            eval_scores=eval_scores,
            forbidden_behaviors_detected=turn.forbidden_behaviors_detected,
            rag_moves_used=turn.rag_moves_used,
            timestamp=turn.timestamp
        )
        turns_response.append(turn_response)
    
    return SessionResponse(
        session_id=session.session_id,
        age_group=session.age_group,
        stimulus=session.stimulus,
        model_size=session.model_size,
        language=session.language,
        turns=turns_response,
        phases=session.phases,
        created_at=session.created_at
    )


@router.get(
    "",
    response_model=list[SessionResponse],
    summary="List all sessions",
    description="Returns all non-expired sessions."
)
async def list_sessions() -> list[SessionResponse]:
    """List all non-expired sessions.
    
    Returns:
        List of SessionResponse objects.
    """
    sessions = session_store.get_all_sessions()
    
    result = []
    for session in sessions:
        turns_response = []
        for turn in session.turns:
            eval_scores = EvalScoresResponse(
                socratism=turn.eval_scores.socratism,
                age_fit=turn.eval_scores.age_fit,
                builds_on=turn.eval_scores.builds_on,
                openness=turn.eval_scores.openness,
                advancement=turn.eval_scores.advancement,
                overall=turn.eval_scores.overall,
                weighted_overall=turn.eval_scores.weighted_overall()
            )
            
            turn_response = TurnResponse(
                id=turn.id,
                content=turn.content,
                question_type=turn.question_type,
                thinking_trace=turn.thinking_trace,
                eval_scores=eval_scores,
                forbidden_behaviors_detected=turn.forbidden_behaviors_detected,
                rag_moves_used=turn.rag_moves_used,
                timestamp=turn.timestamp
            )
            turns_response.append(turn_response)
        
        result.append(SessionResponse(
            session_id=session.session_id,
            age_group=session.age_group,
            stimulus=session.stimulus,
            model_size=session.model_size,
            language=session.language,
            turns=turns_response,
            phases=session.phases,
            created_at=session.created_at
        ))
    
    return result
