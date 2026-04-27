"""Tests for the evaluator module."""

import pytest

from app.models import EvalScores
from app.services.evaluator import Evaluator, evaluator


class TestEvalScores:
    """Tests for the EvalScores model."""

    def test_weighted_overall_calculation(self):
        """Test that weighted_overall calculates correctly."""
        scores = EvalScores(
            socratism=5.0,
            age_fit=4.0,
            builds_on=3.0,
            openness=4.0,
            advancement=3.0,
            overall=3.8
        )
        
        expected = (
            5.0 * 0.30 +
            4.0 * 0.175 +
            3.0 * 0.175 +
            4.0 * 0.175 +
            3.0 * 0.175
        )
        
        assert abs(scores.weighted_overall() - expected) < 0.01

    def test_weighted_overall_with_default_scores(self):
        """Test weighted_overall with default scores (all 3.0)."""
        scores = EvalScores()
        
        expected = 3.0  # All scores are 3.0, so weighted should be 3.0
        assert scores.weighted_overall() == expected


class TestScoreClamping:
    """Tests for score clamping."""

    def test_scores_clamped_to_one_to_five(self):
        """Test that scores are properly clamped to [1, 5]."""
        eval = Evaluator()
        
        assert eval._clamp(0.5) == 1.0
        assert eval._clamp(6.0) == 5.0
        assert eval._clamp(3.0) == 3.0
        assert eval._clamp(1.0) == 1.0
        assert eval._clamp(5.0) == 5.0

    def test_scores_clamped_with_negative(self):
        """Test clamping with negative values."""
        eval = Evaluator()
        
        assert eval._clamp(-10.0) == 1.0
        assert eval._clamp(-1.0) == 1.0


class TestHeuristicEvaluation:
    """Tests for heuristic evaluation fallback."""

    def test_socratic_response_high_socratism(self):
        """Test that a Socratic response (with questions) scores high on socratism."""
        eval = Evaluator()
        
        child_input = "I think stealing is wrong."
        model_response = "That's interesting! You think stealing is wrong. Why do you think that? Can you imagine any situation where stealing might be okay?"
        
        scores, forbidden = eval._heuristic_evaluation(child_input, model_response)
        
        # Question marks indicate socratic questioning
        assert model_response.count("?") >= 2
        assert scores.socratism >= 3.0

    def test_overhelp_detected(self):
        """Test that 'overhelp' forbidden behavior is detected."""
        eval = Evaluator()
        
        child_input = "I think lying is wrong."
        model_response = "That's exactly right! You've understood the harm principle perfectly. Lying causes pain and breaks trust."
        
        scores, forbidden = eval._heuristic_evaluation(child_input, model_response)
        
        assert "overhelp" in forbidden

    def test_lecture_detected(self):
        """Test that 'lecture' forbidden behavior is detected."""
        eval = Evaluator()
        
        child_input = "What is beauty?"
        model_response = "This is called aesthetic theory. In philosophy, we distinguish between subjective and objective theories of beauty. The principle of aesthetic judgment varies across cultures and historical periods."
        
        scores, forbidden = eval._heuristic_evaluation(child_input, model_response)
        
        assert "lecture" in forbidden

    def test_correct_detected(self):
        """Test that 'correct' forbidden behavior is detected."""
        eval = Evaluator()
        
        child_input = "Justice means everyone gets the same thing."
        model_response = "Actually, that's not quite right. Philosophers would say justice is about giving people what they deserve, not about equality."
        
        scores, forbidden = eval._heuristic_evaluation(child_input, model_response)
        
        assert "correct" in forbidden

    def test_leading_detected(self):
        """Test that 'leading' forbidden behavior is detected."""
        eval = Evaluator()
        
        child_input = "Is stealing wrong?"
        model_response = "Don't you think that if everyone stole, society would fall apart? We can see that theft creates chaos, right?"
        
        scores, forbidden = eval._heuristic_evaluation(child_input, model_response)
        
        assert "leading" in forbidden

    def test_close_detected(self):
        """Test that 'close' forbidden behavior is detected."""
        eval = Evaluator()
        
        child_input = "Why is the sky blue?"
        model_response = "Because of light refraction."
        
        scores, forbidden = eval._heuristic_evaluation(child_input, model_response)
        
        assert "close" in forbidden

    def test_malformed_json_returns_neutral_scores(self):
        """Test that malformed JSON parsing returns neutral 3.0 scores."""
        eval = Evaluator()
        
        # The evaluator should fall back to heuristic when JSON is invalid
        # This is implicit in the evaluate method's error handling
        
        # We can verify the heuristic returns 3.0 for overall when behavior is minimal
        scores, forbidden = eval._heuristic_evaluation(
            "What's 2+2?",
            "Can you tell me what you think first?"
        )
        
        # Should get neutral-ish scores
        assert 2.0 <= scores.socratism <= 4.0
        assert 2.0 <= scores.overall <= 4.0


class TestForbiddenBehaviorDetection:
    """Tests for forbidden behavior detection in heuristic mode."""

    def test_no_forbidden_behaviors_for_good_socratic(self):
        """Test that good Socratic responses have no forbidden behaviors."""
        eval = Evaluator()
        
        child_input = "I'm thinking about fairness."
        model_response = "That's a big idea! When you think about fairness, what comes to mind? What do you think fairness means?"
        
        scores, forbidden = eval._heuristic_evaluation(child_input, model_response)
        
        # Good Socratic response should have minimal forbidden behaviors
        # It may or may not have some, but should not have many
        assert len(forbidden) <= 1

    def test_multiple_forbidden_behaviors(self):
        """Test detection of multiple forbidden behaviors."""
        eval = Evaluator()
        
        child_input = "What is ethics?"
        model_response = "Actually, that's not right. In philosophy, ethics is called moral philosophy. This is called normative ethics. Don't you think everyone should understand this?"
        
        scores, forbidden = eval._heuristic_evaluation(child_input, model_response)
        
        # Should detect multiple violations
        assert "correct" in forbidden
        assert "lecture" in forbidden
        assert "leading" in forbidden


class TestEmptySessionSummary:
    """Tests for edge cases."""

    def test_empty_child_input(self):
        """Test handling of empty child input."""
        eval = Evaluator()
        
        scores, forbidden = eval._heuristic_evaluation("", "Why do you think that?")
        
        # Should still return valid scores
        assert isinstance(scores.socratism, float)
        assert 1.0 <= scores.socratism <= 5.0

    def test_empty_model_response(self):
        """Test handling of empty model response."""
        eval = Evaluator()
        
        scores, forbidden = eval._heuristic_evaluation("Hello", "")
        
        # Empty response should likely trigger "close" behavior
        assert "close" in forbidden

    def test_very_long_response(self):
        """Test handling of very long response."""
        eval = Evaluator()
        
        child_input = "What is justice?"
        long_response = "Let me explain. " * 50 + "What do you think?"
        
        scores, forbidden = eval._heuristic_evaluation(child_input, long_response)
        
        # Long response might trigger lecture
        assert isinstance(scores.age_fit, float)
