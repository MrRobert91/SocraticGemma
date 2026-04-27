"""Pydantic schemas for SocraticGemma API."""

from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, Field


# --- Stimulus Schema ---

class Stimulus(BaseModel):
    """Stimulus that initiates a Socratic dialogue."""
    type: str = Field(description="Type of stimulus: text, image, or scenario")
    content: str = Field(description="The stimulus content (text, image URL, or scenario description)")
    title: Optional[str] = Field(default=None, description="Optional title for the stimulus")


# --- Create Session Request ---

class CreateSessionRequest(BaseModel):
    """Request to create a new Socratic dialogue session."""
    age_group: str = Field(
        description="Age group of the child: '6-8', '9-12', or '13-16'"
    )
    stimulus: Stimulus = Field(
        description="The stimulus to begin the dialogue with"
    )
    model_size: str = Field(
        default="fast",
        description="Model size: 'fast' for 2B model, 'accurate' for 27B model"
    )
    rag_enabled: bool = Field(
        default=False,
        description="Whether to enable RAG for context augmentation"
    )
    thinking_mode: bool = Field(
        default=True,
        description="Whether to enable thinking mode (provider ordering)"
    )
    language: str = Field(
        default="en",
        description="Language code for the dialogue"
    )


# --- Turn Response ---

class EvalScoresResponse(BaseModel):
    """Evaluation scores for a turn response."""
    socratism: float = Field(description="How well the response follows Socratic method (1-5)")
    age_fit: float = Field(description="How appropriate for the child's age (1-5)")
    builds_on: float = Field(description="How well it builds on child's previous response (1-5)")
    openness: float = Field(description="How open-ended the question is (1-5)")
    advancement: float = Field(description="How much it advances philosophical inquiry (1-5)")
    overall: float = Field(description="Overall quality score (1-5)")
    weighted_overall: float = Field(description="Weighted overall score")


class TurnResponse(BaseModel):
    """Response containing a completed turn."""
    id: int = Field(description="Turn ID within the session")
    content: str = Field(description="The model's response content")
    question_type: str = Field(description="Type of question: conceptual, assumption, evidence, perspective, implication, metacognitive, opening, or statement")
    thinking_trace: str = Field(description="The model's thinking trace (if enabled)")
    eval_scores: EvalScoresResponse = Field(description="Evaluation scores for this turn")
    forbidden_behaviors_detected: list[str] = Field(
        default_factory=list,
        description="List of forbidden behaviors detected (overhelp, lecture, correct, leading, close)"
    )
    rag_moves_used: list[str] = Field(
        default_factory=list,
        description="RAG moves used for context augmentation"
    )
    timestamp: float = Field(description="Unix timestamp when the turn was created")


# --- Session Response ---

class SessionResponse(BaseModel):
    """Full session response with history."""
    session_id: str = Field(description="Unique session identifier")
    age_group: str = Field(description="Age group of the child")
    stimulus: dict = Field(description="The stimulus used to start the session")
    model_size: str = Field(description="Model size used: 'fast' or 'accurate'")
    language: str = Field(description="Language code")
    turns: list[TurnResponse] = Field(
        default_factory=list,
        description="All turns in the session"
    )
    phases: dict = Field(
        description="Phase completion status"
    )
    created_at: float = Field(description="Unix timestamp when session was created")


# --- Evaluation Summary ---

class EvalScoresSummary(BaseModel):
    """Aggregated evaluation scores."""
    socratism: float = Field(description="Average socratism score")
    age_fit: float = Field(description="Average age fit score")
    builds_on: float = Field(description="Average builds on score")
    openness: float = Field(description="Average openness score")
    advancement: float = Field(description="Average advancement score")
    overall: float = Field(description="Average overall score")
    weighted_overall: float = Field(description="Average weighted overall score")


class EvalSummary(BaseModel):
    """Session evaluation summary with aggregated scores."""
    session_id: str = Field(description="Session identifier")
    turn_count: int = Field(description="Number of turns in the session")
    avg_scores: EvalScoresSummary = Field(description="Average scores across all turns")
    question_type_distribution: dict[str, int] = Field(
        description="Count of each question type used"
    )
    forbidden_behaviors_by_turn: list[dict[str, Any]] = Field(
        description="Forbidden behaviors detected per turn"
    )


# --- Compare Response ---

class CompareResponse(BaseModel):
    """Response comparing baseline vs P4C prompts."""
    base_response: dict[str, Any] = Field(
        description="Response from baseline prompt"
    )
    p4c_response: dict[str, Any] = Field(
        description="Response from P4C prompt"
    )
    improvement_pct: float = Field(
        description="Percentage improvement of P4C over baseline"
    )


# --- Prompt Info ---

class PromptInfo(BaseModel):
    """Information about a prompt template."""
    name: str = Field(description="Prompt name/identifier")
    description: str = Field(description="Brief description of the prompt")
    content: str = Field(description="Full prompt content")


# --- Health Response ---

class HealthResponse(BaseModel):
    """Health check response."""
    status: str = Field(description="Service status: 'ok' or 'error'")
    sessions: int = Field(description="Number of active sessions")


# --- Error Response ---

class ErrorResponse(BaseModel):
    """Error response."""
    error: str = Field(description="Error message")
    detail: Optional[str] = Field(default=None, description="Additional error details")
