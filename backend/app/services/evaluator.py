"""Evaluator service for scoring Socratic dialogue responses."""

import json
import re
from typing import Optional

from ..config import settings
from ..models import EvalScores
from .gemma_client import gemma_client


EVALUATOR_PROMPT = """You are an expert evaluator of Socratic dialogue responses for children. Evaluate the following response and provide scores.

SCORING CRITERIA (all scores 1-5):

1. SOCRATISM (weight: 0.30): How well does the response follow Socratic method?
   - Does it ask questions instead of giving answers?
   - Does it avoid telling the child what to think?
   - Does it probe deeper into ideas?

2. AGE FIT (weight: 0.175): How appropriate is the language and concepts for the child's age?
   - Vocabulary appropriate?
   - Concepts explained at right level?
   - Examples relevant to age group?

3. BUILDS ON (weight: 0.175): How well does it connect to the child's previous response?
   - References child's actual words?
   - Advances the specific thread of conversation?
   - Shows listening and understanding?

4. OPENNESS (weight: 0.175): How open-ended is the question/prompt?
   - Multiple possible answers?
   - Doesn't lead to a "right answer"?
   - Invites genuine thinking?

5. ADVANCEMENT (weight: 0.175): How much does it advance philosophical inquiry?
   - Moves conversation to deeper level?
   - Raises new considerations?
   - Explores implications?

FORBIDDEN BEHAVIORS TO DETECT:
- overhelp: Giving answers, praising correctness, doing the thinking for the child
- lecture: Explaining concepts, giving information unprompted, teaching mode
- correct: Telling the child they are wrong, fact-checking, academic correction
- leading: Guiding toward a predetermined answer, steering the conversation
- close: Giving quick answers, closing down inquiry, not leaving room for thinking

CHILD'S INPUT: {child_input}

MODEL RESPONSE TO EVALUATE: {model_response}

AGE GROUP: {age_group}

Respond in this exact JSON format:
{{
    "socratism": <score 1-5>,
    "age_fit": <score 1-5>,
    "builds_on": <score 1-5>,
    "openness": <score 1-5>,
    "advancement": <score 1-5>,
    "overall": <score 1-5>,
    "forbidden_behaviors": ["list", "of", "behaviors", "detected"],
    "reasoning": "brief explanation of scores"
}}
"""


class Evaluator:
    """Async evaluator for Socratic dialogue responses.
    
    Uses a separate Gemma call to evaluate responses on multiple
    dimensions and detect forbidden behaviors.
    """

    def __init__(self, gemma_client=None):
        """Initialize the evaluator.
        
        Args:
            gemma_client: Optional Gemma client instance. Uses global if not provided.
        """
        self.gemma = gemma_client or gemma_client

    async def evaluate(
        self,
        child_input: str,
        model_response: str,
        age_group: str
    ) -> tuple[EvalScores, list[str]]:
        """Evaluate a model response to a child's input.
        
        Args:
            child_input: The child's input/question.
            model_response: The model's response to evaluate.
            age_group: The child's age group ("6-8", "9-12", or "13-16").
            
        Returns:
            Tuple of (EvalScores object, list of forbidden behaviors detected).
        """
        prompt = EVALUATOR_PROMPT.format(
            child_input=child_input,
            model_response=model_response,
            age_group=age_group
        )
        
        try:
            result, thinking = await self.gemma.generate_structured(
                prompt,
                settings.evaluator_model,
                max_tokens=800,
                thinking_mode=False
            )
            
            if result is None:
                # JSON parsing failed, return neutral scores with heuristic detection
                return self._heuristic_evaluation(child_input, model_response)
            
            # Extract scores and clamp to [1, 5]
            scores = EvalScores(
                socratism=self._clamp(result.get("socratism", 3.0)),
                age_fit=self._clamp(result.get("age_fit", 3.0)),
                builds_on=self._clamp(result.get("builds_on", 3.0)),
                openness=self._clamp(result.get("openness", 3.0)),
                advancement=self._clamp(result.get("advancement", 3.0)),
                overall=self._clamp(result.get("overall", 3.0))
            )
            
            forbidden = result.get("forbidden_behaviors", [])
            if not isinstance(forbidden, list):
                forbidden = []
            
            return scores, forbidden
            
        except Exception as e:
            # On any error, fall back to heuristic evaluation
            return self._heuristic_evaluation(child_input, model_response)

    def _clamp(self, value: float) -> float:
        """Clamp a value to the range [1, 5].
        
        Args:
            value: The value to clamp.
            
        Returns:
            Value clamped to [1, 5].
        """
        return max(1.0, min(5.0, float(value)))

    def _heuristic_evaluation(
        self,
        child_input: str,
        model_response: str
    ) -> tuple[EvalScores, list[str]]:
        """Perform heuristic evaluation when JSON parsing fails.
        
        Uses pattern matching to detect forbidden behaviors and
        estimate scores based on response characteristics.
        
        Args:
            child_input: The child's input.
            model_response: The model's response to evaluate.
            
        Returns:
            Tuple of (EvalScores with heuristic values, list of detected behaviors).
        """
        forbidden = []
        response_lower = model_response.lower()
        
        # Check for forbidden behavior patterns
        # Overhelp: "that's right", "exactly", "perfect", "you understood"
        if any(phrase in response_lower for phrase in [
            "that's right", "exactly", "perfectly", "you've understood",
            "excellent answer", "correct answer", "that's it!"
        ]):
            forbidden.append("overhelp")
        
        # Lecture: long explanations, "this is called", definitions
        sentences = model_response.split(".")
        if len(sentences) > 5 and any(phrase in response_lower for phrase in [
            "this is called", "the principle of", "in philosophy",
            "definition of", "according to"
        ]):
            forbidden.append("lecture")
        
        # Correct: "actually", "you're wrong", "the truth is"
        if any(phrase in response_lower for phrase in [
            "actually", "you're wrong", "the truth is", "that's not right",
            "mistake", "incorrect"
        ]):
            forbidden.append("correct")
        
        # Leading: "don't you think", "wouldn't you agree", "we can see that"
        if any(phrase in response_lower for phrase in [
            "don't you think", "wouldn't you agree", "as we can see",
            "obviously", "clearly this means"
        ]):
            forbidden.append("leading")
        
        # Close: single short answer, quick definitive statements
        if len(model_response) < 50 and "?" not in model_response:
            forbidden.append("close")
        
        # Calculate heuristic scores
        # Base score of 3.0
        socratism = 3.0
        if "?" in model_response:
            socratism += 0.5  # Questions are good
        if len(forbidden) > 0:
            socratism -= 0.5 * len(forbidden)  # Forbidden behaviors reduce socratic score
        
        # Age fit heuristic (simplified)
        age_fit = 3.0
        if len(model_response) > 200:
            age_fit -= 0.5  # May be too complex
        
        # Builds on heuristic
        builds_on = 3.0
        if any(word in response_lower for word in child_input.lower().split()[:5]):
            builds_on += 0.5  # References child's words
        
        # Openness heuristic
        openness = 3.0
        question_count = model_response.count("?")
        if question_count >= 2:
            openness += 0.5
        elif question_count == 0:
            openness -= 0.5
        
        # Advancement heuristic
        advancement = 3.0
        if len(model_response) > 100 and "?" in model_response:
            advancement += 0.25
        
        scores = EvalScores(
            socratism=self._clamp(socratism),
            age_fit=self._clamp(age_fit),
            builds_on=self._clamp(builds_on),
            openness=self._clamp(openness),
            advancement=self._clamp(advancement),
            overall=self._clamp((socratism + age_fit + builds_on + openness + advancement) / 5)
        )
        
        return scores, forbidden


# Global evaluator instance
evaluator = Evaluator()
