"""Data models for SocraticGemma."""

from dataclasses import dataclass, field
from typing import Optional


@dataclass
class EvalScores:
    """Evaluation scores for a single turn."""
    socratism: float = 3.0  # How well the response follows Socratic method (1-5)
    age_fit: float = 3.0  # How appropriate for the child's age (1-5)
    builds_on: float = 3.0  # How well it builds on child's previous response (1-5)
    openness: float = 3.0  # How open-ended the question is (1-5)
    advancement: float = 3.0  # How much it advances philosophical inquiry (1-5)
    overall: float = 3.0  # Overall quality score (1-5)

    def weighted_overall(self) -> float:
        """Calculate weighted overall score.
        
        Weights: socratism=0.30, others=0.175 each (age_fit, builds_on, openness, advancement)
        """
        return (
            self.socratism * 0.30 +
            self.age_fit * 0.175 +
            self.builds_on * 0.175 +
            self.openness * 0.175 +
            self.advancement * 0.175
        )


@dataclass
class Turn:
    """A single turn in a Socratic dialogue."""
    id: int
    content: str
    question_type: str
    thinking_trace: str = ""
    eval_scores: EvalScores = field(default_factory=EvalScores)
    forbidden_behaviors_detected: list[str] = field(default_factory=list)
    rag_moves_used: list[str] = field(default_factory=list)
    timestamp: float = 0.0


@dataclass
class Session:
    """A complete Socratic dialogue session."""
    session_id: str
    age_group: str  # "6-8", "9-12", or "13-16"
    stimulus: dict = field(default_factory=dict)
    model_size: str = "fast"  # "fast" or "accurate"
    thinking_mode: bool = True  # Show/hide Gemma 4 thinking trace
    language: str = "en"
    turns: list[Turn] = field(default_factory=list)
    phases: dict = field(default_factory=lambda: {
        "stimulus": False,
        "questions": False,
        "agenda": False,
        "inquiry": False,
        "synthesis": False
    })
    created_at: float = 0.0


@dataclass
class P4CMove:
    """A P4C (Philosophy for Children) move or question type."""
    id: str
    question_type: str  # conceptual, assumption, evidence, perspective, implication, metacognitive, opening
    move_text: str
    example_context: str
    age_range: tuple[int, int]  # (min_age, max_age)
    source: str  # e.g., "Lipman", "Sharp", "Splitter"
