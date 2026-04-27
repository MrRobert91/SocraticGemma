"""SocraticEngine - Orchestrates the full Socratic dialogue pipeline."""

import asyncio
import json
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
        
        Steps:
        1. Get session from store
        2. Build prompt (with RAG if available)
        3. Stream via GemmaClient
        4. Evaluate in parallel
        5. Append turn to session
        6. Save session
        
        Args:
            session_id: The ID of the session to process the turn in.
            child_input: The child's input/response.
            session_store: Session store instance.
            prompt_builder: PromptBuilder instance.
            gemma_client: GemmaClient instance.
            evaluator: Evaluator instance.
            rag_service: Optional RAG service for context augmentation.
            
        Yields:
            SSE events as dicts:
            - {"type": "thinking", "trace": ...} - Thinking content chunks
            - {"type": "token", "text": ...} - Response token chunks
            - {"type": "complete", "turn": {...}, "scores": {...}} - Final turn with evaluation
        """
        # Step 1: Get session
        session = session_store.get_session(session_id)
        if session is None:
            yield {"type": "error", "message": f"Session {session_id} not found"}
            return
        
        # Determine current phase
        current_phase = self._get_phase(len(session.turns))
        
        # Step 2: Build prompt with RAG if available
        rag_context = ""
        rag_moves_used = []
        if rag_service is not None:
            try:
                rag_context, rag_moves_used = await rag_service.get_context(
                    child_input=child_input,
                    session=session,
                    phase=current_phase
                )
            except Exception:
                rag_context = ""
                rag_moves_used = []
        
        # Build the prompt
        prompt = prompt_builder.build_turn_prompt(
            session=session,
            child_input=child_input,
            phase=current_phase,
            rag_context=rag_context
        )
        
        # Get model name based on session settings
        model_name = (
            "google/gemma-4-27b-it" if session.model_size == "accurate"
            else "google/gemma-4-e2b-it"
        )
        
        # Step 3: Stream via GemmaClient
        thinking_buffer = ""
        content_buffer = ""
        
        async for chunk in gemma_client.generate(
            prompt=prompt,
            model_name=model_name,
            max_tokens=500,
            streaming=True,
            thinking_mode=session.thinking_mode if hasattr(session, 'thinking_mode') else True
        ):
            if chunk:
                # Check if this looks like thinking content (starts with <think> or similar)
                if "<think>" in chunk or thinking_buffer:
                    thinking_buffer += chunk
                    yield {"type": "thinking", "trace": chunk}
                else:
                    content_buffer += chunk
                    yield {"type": "token", "text": chunk}
        
        # Extract thinking trace from the full thinking buffer
        thinking_trace = ""
        # Extract thinking trace from <think> tags
        think_start = "<think>"
        think_end = "</think>"
        think_match = re.search(
            f"{think_start}(.*?){think_end}",
            thinking_buffer,
            re.DOTALL
        )
        if think_match:
            thinking_trace = think_match.group(1).strip()
        
        # Clean content - remove any <think> blocks from the content
        final_content = re.sub(
            f"{think_start}.*?{think_end}",
            "",
            content_buffer,
            flags=re.DOTALL
        )
        
        # Step 4: Evaluate in parallel (don't block the response)
        eval_task = asyncio.create_task(
            evaluator.evaluate(
                child_input=child_input,
                model_response=final_content,
                age_group=session.age_group
            )
        )
        
        # Wait for evaluation
        eval_scores, forbidden_behaviors = await eval_task
        
        # Step 5: Determine question type from content (simple heuristic)
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
        
        # Step 6: Append turn and save
        session.turns.append(turn)
        
        # Update phase markers
        if current_phase == "stimulus":
            session.phases["stimulus"] = True
        elif current_phase == "questions":
            session.phases["questions"] = True
        elif current_phase == "agenda":
            session.phases["agenda"] = True
        elif current_phase == "inquiry":
            session.phases["inquiry"] = True
        elif current_phase == "synthesis":
            session.phases["synthesis"] = True
        
        # Save session
        session_store.append_turn(session_id, turn)
        
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
        """Detect the question type from response content.
        
        Uses keyword and pattern matching to identify which of the
        7 P4C question types the response most aligns with.
        
        Args:
            content: The response content to analyze.
            
        Returns:
            Question type string (conceptual, assumption, evidence, 
            perspective, implication, metacognitive, opening, or statement).
        """
        content_lower = content.lower()
        
        # Conceptual: exploring meaning of concepts
        if any(phrase in content_lower for phrase in [
            "what does it mean", "what is", "difference between",
            "do you think", "concept of", "meaning of"
        ]):
            return "conceptual"
        
        # Assumption: examining presuppositions
        if any(phrase in content_lower for phrase in [
            "assuming", "what if we assumed", "what must be true",
            "what are we taking for granted", "presuppose"
        ]):
            return "assumption"
        
        # Evidence: asking about reasons and evidence
        if any(phrase in content_lower for phrase in [
            "why do you think", "what evidence", "how do you know",
            "what makes you say", "reason for", "prove"
        ]):
            return "evidence"
        
        # Perspective: exploring different viewpoints
        if any(phrase in content_lower for phrase in [
            "how might someone", "what would a", "different view",
            "what if you were", "from another perspective", "disagree"
        ]):
            return "perspective"
        
        # Implication: exploring consequences
        if any(phrase in content_lower for phrase in [
            "what if that were true", "what would happen if",
            "what follows", "implications", "consequences"
        ]):
            return "implication"
        
        # Metacognitive: thinking about thinking
        if any(phrase in content_lower for phrase in [
            "what kind of question", "how are we thinking",
            "is this answerable", "thinking about thinking"
        ]):
            return "metacognitive"
        
        # Opening: opening up new inquiry
        if any(phrase in content_lower for phrase in [
            "what are you curious", "what else does this", "wonder about",
            "what questions does this", "explore"
        ]):
            return "opening"
        
        # Default to statement if no clear question type
        if "?" not in content:
            return "statement"
        
        return "conceptual"  # Default fallback


# Global engine instance
socratic_engine = SocraticEngine(session_store=None)
