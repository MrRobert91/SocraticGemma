"""SocraticEngine - Orchestrates the full Socratic dialogue pipeline."""

import asyncio
import json
import re
import time
from typing import Any, AsyncGenerator, Optional

from ..models import EvalScores, Session, Turn
from .gemma_client import GemmaClient
from .prompt_builder import PromptBuilder
from .evaluator import Evaluator


class SocraticEngine:
    """Orchestrates the full Socratic dialogue pipeline.
    
    Handles:
    - Session retrieval and validation
    - Prompt building with optional RAG
    - Streaming response generation via Gemma
    - Parallel evaluation
    - Turn appending and session saving
    - Phase transitions based on turn count
    """

    def __init__(
        self,
        session_store,
        prompt_builder: Optional[PromptBuilder] = None,
        gemma_client: Optional[GemmaClient] = None,
        evaluator: Optional[Evaluator] = None
    ):
        """Initialize the SocraticEngine.
        
        Args:
            session_store: Session store instance for session management.
            prompt_builder: Optional PromptBuilder instance. Uses default if None.
            gemma_client: Optional GemmaClient instance. Uses default if None.
            evaluator: Optional Evaluator instance. Uses default if None.
        """
        self.session_store = session_store
        self.prompt_builder = prompt_builder or PromptBuilder()
        self.gemma_client = gemma_client or GemmaClient()
        self.evaluator = evaluator or Evaluator()

    def _get_phase(self, turn_count: int) -> str:
        """Determine the current phase based on turn count.
        
        Phase transitions:
        - turn 0 = stimulus (initial prompt/first turn)
        - turns 1-3 = questions (establishing the dialogue)
        - turns 4-5 = agenda (setting the inquiry direction)
        - turns 6-25 = inquiry (deep exploration)
        - turns 26+ = synthesis (wrapping up)
        
        Args:
            turn_count: Number of turns already in the session.
            
        Returns:
            Phase name string.
        """
        if turn_count == 0:
            return "stimulus"
        elif turn_count <= 3:
            return "questions"
        elif turn_count <= 5:
            return "agenda"
        elif turn_count <= 25:
            return "inquiry"
        else:
            return "synthesis"

    async def process_turn(
        self,
        session_id: str,
        child_input: str,
        session_store,
        prompt_builder,
        gemma_client,
        evaluator,
        rag_service: Optional[Any] = None
    ) -> AsyncGenerator[dict, None]:
        """Process a single turn in the Socratic dialogue.
        
        Yields SSE events: thinking, token, complete, error.
        """
        # Step 1: Get session
        session = session_store.get_session(session_id)
        if session is None:
            yield {"type": "error", "message": f"Session {session_id} not found"}
            return
        
        # Determine current phase
        current_phase = self._get_phase(len(session.turns))
        
        # Step 2: Build prompt with RAG if available
        rag_moves_used = []
        if rag_service is not None and rag_service.is_available():
            try:
                rag_results = rag_service.search(
                    query_text=child_input,
                    age_range=session.age_group,
                    top_k=3
                )
                if rag_results:
                    rag_moves_used = [move.move_text for move in rag_results]
            except Exception:
                rag_moves_used = []
        
        # Build the prompt - map to PromptBuilder.build_prompt signature
        last_question_type = None
        recent_types = []
        if session.turns:
            last_question_type = session.turns[-1].question_type
            recent_types = [t.question_type for t in session.turns[-7:]]
        
        prompt = prompt_builder.build_prompt(
            session_history=session.turns,
            child_input=child_input,
            age_group=session.age_group,
            last_question_type=last_question_type,
            recent_types=recent_types,
            rag_moves=rag_moves_used if rag_moves_used else None,
            stimulus=session.stimulus
        )
        
        # Get model name based on session settings
        model_name = (
            "google/gemma-4-27b-it" if session.model_size == "accurate"
            else "google/gemma-4-e2b-it"
        )
        
        # Step 3: Stream via GemmaClient
        thinking_buffer = ""
        content_buffer = ""
        in_thinking = False
        
        async for chunk in gemma_client.generate(
            prompt=prompt,
            model_name=model_name,
            max_tokens=500,
            streaming=True,
            thinking_mode=False  # thinking_mode handled by tag detection, not API
        ):
            if chunk:
                if "<|start_of_thought|>" in chunk or in_thinking:
                    in_thinking = True
                    thinking_buffer += chunk
                    if "<|end_of_thought|>" in chunk:
                        in_thinking = False
                        # Filter out the thinking tags from buffer
                        thinking_buffer = re.sub(
                            r'<\|start_of_thought\|>(.*?)<\|end_of_thought\|>',
                            r'\1',
                            thinking_buffer,
                            flags=re.DOTALL
                        )
                    yield {"type": "thinking", "trace": chunk}
                else:
                    content_buffer += chunk
                    yield {"type": "token", "text": chunk}
        
        # Clean the thinking trace (remove tags if still present)
        thinking_trace = re.sub(
            r'<\|start_of_thought\|>|<\|end_of_thought\|>',
            '',
            thinking_buffer
        ).strip()
        
        # Clean any remaining thought tags from content
        final_content = re.sub(
            r'<\|start_of_thought\|>.*?<\|end_of_thought\|>',
            '',
            content_buffer,
            flags=re.DOTALL
        ).strip()
        
        # Step 4: Evaluate in parallel
        eval_task = asyncio.create_task(
            evaluator.evaluate(
                child_input=child_input,
                model_response=final_content,
                age_group=session.age_group
            )
        )
        
        eval_scores, forbidden_behaviors = await eval_task
        
        # Step 5: Detect question type from content
        question_type = self._detect_question_type(final_content)
        
        # Create turn object
        turn = Turn(
            id=len(session.turns),
            content=final_content,
            question_type=question_type,
            thinking_trace=thinking_trace,
            eval_scores=eval_scores,
            forbidden_behaviors_detected=forbidden_behaviors,
            rag_moves_used=rag_moves_used,
            timestamp=time.time()
        )
        
        # Step 6: Append turn (only once!)
        session_store.append_turn(session_id, turn)
        
        # Update phase markers
        if current_phase in session.phases:
            session.phases[current_phase] = True
        
        # Step 7: Yield completion event
        yield {
            "type": "complete",
            "turn": {
                "id": turn.id,
                "content": turn.content,
                "question_type": turn.question_type,
                "thinking_trace": turn.thinking_trace,
                "eval_scores": {
                    "socratism": turn.eval_scores.socratism,
                    "age_fit": turn.eval_scores.age_fit,
                    "builds_on": turn.eval_scores.builds_on,
                    "openness": turn.eval_scores.openness,
                    "advancement": turn.eval_scores.advancement,
                    "overall": turn.eval_scores.overall,
                    "weighted_overall": turn.eval_scores.weighted_overall()
                },
                "forbidden_behaviors_detected": turn.forbidden_behaviors_detected,
                "rag_moves_used": turn.rag_moves_used,
                "timestamp": turn.timestamp
            },
            "scores": {
                "socratism": eval_scores.socratism,
                "age_fit": eval_scores.age_fit,
                "builds_on": eval_scores.builds_on,
                "openness": eval_scores.openness,
                "advancement": eval_scores.advancement,
                "overall": eval_scores.overall,
                "weighted_overall": eval_scores.weighted_overall()
            }
        }

    def _detect_question_type(self, content: str) -> str:
        """Detect the question type from response content using keywords."""
        content_lower = content.lower()
        
        type_keywords = {
            "conceptual": ["what does", "what is", "difference between", "concept of", "meaning of"],
            "assumption": ["assuming", "what if we assumed", "what must be true", "taking for granted"],
            "evidence": ["why do you think", "what evidence", "how do you know", "what makes you say"],
            "perspective": ["how might someone", "different view", "from another perspective", "disagree"],
            "implication": ["what if that were true", "what would happen", "implications", "consequences"],
            "metacognitive": ["what kind of question", "how are we thinking", "thinking about thinking"],
            "opening": ["what are you curious", "wonder about", "what questions does", "what if you"],
        }
        
        for qtype, keywords in type_keywords.items():
            if any(kw in content_lower for kw in keywords):
                return qtype
        
        # Default to statement if no question mark
        if "?" not in content:
            return "statement"
        
        return "conceptual"


# Note: Global engine instance is deferred to avoid circular imports.
# Create SocraticEngine(session_store=session_store, ...) at runtime.
