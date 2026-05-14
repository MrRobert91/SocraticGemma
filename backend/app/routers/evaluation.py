"""Evaluation summary endpoints."""

from collections import Counter

from fastapi import APIRouter, HTTPException, status

from ..schemas import EvalSummary, EvalScoresSummary
from ..services.session_store import session_store
from ..services.evaluator import Evaluator
from ..database import update_turn_eval as db_update_turn_eval

router = APIRouter(prefix="/sessions", tags=["evaluation"])
_evaluator = Evaluator()


@router.post(
    "/{session_id}/batch-evaluate",
    response_model=EvalSummary,
    summary="Run batch evaluation for a completed session",
    description="Evaluates all turns, updates scores in memory and SQLite, returns summary."
)
async def batch_evaluate(session_id: str) -> EvalSummary:
    """Evaluate all turns in a session and persist scores."""
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

    for turn in session.turns:
        try:
            scores, forbidden = await _evaluator.evaluate(
                child_input=turn.child_input,
                model_response=turn.content,
                age_group=session.age_group,
            )
            # Update in-memory turn
            turn.eval_scores = scores
            turn.forbidden_behaviors_detected = forbidden
            # Persist to SQLite (fire-and-forget pattern)
            try:
                await db_update_turn_eval(
                    session_id=session_id,
                    turn_index=turn.id,
                    eval_socratism=scores.socratism,
                    eval_age_fit=scores.age_fit,
                    eval_builds_on=scores.builds_on,
                    eval_openness=scores.openness,
                    eval_advancement=scores.advancement,
                    eval_overall=scores.overall,
                    eval_weighted=scores.weighted_overall(),
                    forbidden_behaviors=forbidden,
                )
            except Exception:
                pass  # non-fatal
        except Exception:
            pass  # keep going on per-turn failure

    # Return aggregated summary
    return _build_eval_summary(session_id, session.turns)



@router.get(
    "/{session_id}/eval",
    response_model=EvalSummary,
    summary="Get session evaluation summary",
    description="Returns aggregated evaluation scores and question type distribution."
)
async def get_evaluation_summary(session_id: str) -> EvalSummary:
    """Get evaluation summary for a session."""
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
    return _build_eval_summary(session_id, session.turns)


def _build_eval_summary(session_id: str, turns: list) -> EvalSummary:
    """Build an EvalSummary from a list of turns."""
    turn_count = len(turns)
    avg_scores = EvalScoresSummary(
        socratism=round(sum(t.eval_scores.socratism for t in turns) / turn_count, 2),
        age_fit=round(sum(t.eval_scores.age_fit for t in turns) / turn_count, 2),
        builds_on=round(sum(t.eval_scores.builds_on for t in turns) / turn_count, 2),
        openness=round(sum(t.eval_scores.openness for t in turns) / turn_count, 2),
        advancement=round(sum(t.eval_scores.advancement for t in turns) / turn_count, 2),
        overall=round(sum(t.eval_scores.overall for t in turns) / turn_count, 2),
        weighted_overall=round(
            sum(t.eval_scores.weighted_overall() for t in turns) / turn_count, 2
        ),
    )
    question_type_distribution = dict(Counter(t.question_type for t in turns))
    forbidden_behaviors_by_turn = [
        {"turn_id": t.id, "behaviors": t.forbidden_behaviors_detected}
        for t in turns
        if t.forbidden_behaviors_detected
    ]
    return EvalSummary(
        session_id=session_id,
        turn_count=turn_count,
        avg_scores=avg_scores,
        question_type_distribution=question_type_distribution,
        forbidden_behaviors_by_turn=forbidden_behaviors_by_turn,
    )
