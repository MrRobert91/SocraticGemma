"""Evaluation summary endpoints."""

from collections import Counter

from fastapi import APIRouter, HTTPException, status

from ..schemas import EvalSummary, EvalScoresSummary
from ..services.session_store import session_store

router = APIRouter(prefix="/sessions", tags=["evaluation"])


@router.get(
    "/{session_id}/eval",
    response_model=EvalSummary,
    summary="Get session evaluation summary",
    description="Returns aggregated evaluation scores and question type distribution."
)
async def get_evaluation_summary(session_id: str) -> EvalSummary:
    """Get evaluation summary for a session.
    
    Aggregates scores across all turns and provides question type
    distribution and forbidden behavior tracking.
    
    Args:
        session_id: The unique session identifier.
        
    Returns:
        EvalSummary with aggregated scores and statistics.
        
    Raises:
        HTTPException: If session not found or has no turns.
    """
    session = session_store.get_session(session_id)
    
    if session is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session {session_id} not found or expired"
        )
    
    if len(session.turns) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Session has no turns to evaluate"
        )
    
    # Calculate average scores
    total_socratism = sum(t.eval_scores.socratism for t in session.turns)
    total_age_fit = sum(t.eval_scores.age_fit for t in session.turns)
    total_builds_on = sum(t.eval_scores.builds_on for t in session.turns)
    total_openness = sum(t.eval_scores.openness for t in session.turns)
    total_advancement = sum(t.eval_scores.advancement for t in session.turns)
    total_overall = sum(t.eval_scores.overall for t in session.turns)
    
    turn_count = len(session.turns)
    
    avg_scores = EvalScoresSummary(
        socratism=round(total_socratism / turn_count, 2),
        age_fit=round(total_age_fit / turn_count, 2),
        builds_on=round(total_builds_on / turn_count, 2),
        openness=round(total_openness / turn_count, 2),
        advancement=round(total_advancement / turn_count, 2),
        overall=round(total_overall / turn_count, 2),
        weighted_overall=round(
            sum(t.eval_scores.weighted_overall() for t in session.turns) / turn_count,
            2
        )
    )
    
    # Question type distribution
    question_types = [t.question_type for t in session.turns]
    question_type_distribution = dict(Counter(question_types))
    
    # Forbidden behaviors by turn
    forbidden_behaviors_by_turn = [
        {
            "turn_id": t.id,
            "behaviors": t.forbidden_behaviors_detected
        }
        for t in session.turns
        if t.forbidden_behaviors_detected
    ]
    
    return EvalSummary(
        session_id=session_id,
        turn_count=turn_count,
        avg_scores=avg_scores,
        question_type_distribution=question_type_distribution,
        forbidden_behaviors_by_turn=forbidden_behaviors_by_turn
    )
