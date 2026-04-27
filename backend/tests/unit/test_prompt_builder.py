"""Tests for the prompt builder module."""

import pytest
from pathlib import Path

from app.services.prompt_builder import PromptBuilder, PROMPTS_DIR
from app.models import Turn, EvalScores


@pytest.fixture
def prompt_builder():
    """Create a prompt builder instance for testing."""
    return PromptBuilder(prompts_dir=PROMPTS_DIR)


class TestYAMLLoading:
    """Tests for YAML file loading."""

    def test_yaml_files_load(self, prompt_builder):
        """Test that all YAML files load successfully."""
        assert "system_base" in prompt_builder.prompts
        assert "age_6_8" in prompt_builder.prompts
        assert "age_9_12" in prompt_builder.prompts
        assert "age_13_16" in prompt_builder.prompts
        assert "forbidden_rules" in prompt_builder.prompts
        assert "question_types" in prompt_builder.prompts
        assert "output_format" in prompt_builder.prompts
        assert "baseline" in prompt_builder.prompts

    def test_system_base_not_empty(self, prompt_builder):
        """Test that system_base prompt is not empty."""
        assert len(prompt_builder.prompts["system_base"]) > 0

    def test_age_prompts_not_empty(self, prompt_builder):
        """Test that age-specific prompts are not empty."""
        assert len(prompt_builder.prompts["age_6_8"]) > 0
        assert len(prompt_builder.prompts["age_9_12"]) > 0
        assert len(prompt_builder.prompts["age_13_16"]) > 0


class TestAgeGroupSelection:
    """Tests for age group prompt selection."""

    def test_age_group_changes_prompt(self, prompt_builder):
        """Test that different age groups produce different prompts."""
        # Get the actual prompt content for each age group
        age_6_8_content = prompt_builder.prompts["age_6_8"]
        age_9_12_content = prompt_builder.prompts["age_9_12"]
        age_13_16_content = prompt_builder.prompts["age_13_16"]
        
        # They should all be different
        assert age_6_8_content != age_9_12_content
        assert age_9_12_content != age_13_16_content
        assert age_6_8_content != age_13_16_content

    def test_age_group_key_mapping(self, prompt_builder):
        """Test that age group keys are correctly mapped."""
        assert prompt_builder._get_age_prompt_key("6-8") == "age_6_8"
        assert prompt_builder._get_age_prompt_key("9-12") == "age_9_12"
        assert prompt_builder._get_age_prompt_key("13-16") == "age_13_16"


class TestPromptBuilding:
    """Tests for the build_prompt method."""

    def test_child_input_in_layer_6(self, prompt_builder):
        """Test that child input appears in Layer 6 of the prompt."""
        child_input = "Why is the sky blue?"
        prompt = prompt_builder.build_prompt(
            session_history=[],
            child_input=child_input,
            age_group="9-12"
        )
        assert child_input in prompt
        assert "LAYER 6: SESSION CONTEXT" in prompt

    def test_rag_moves_in_layer_5(self, prompt_builder):
        """Test that RAG moves appear in Layer 5 of the prompt."""
        rag_moves = ["probing_question", "building_on"]
        prompt = prompt_builder.build_prompt(
            session_history=[],
            child_input="What is justice?",
            age_group="9-12",
            rag_moves=rag_moves
        )
        assert "LAYER 5: RAG MOVES" in prompt
        assert "probing_question" in prompt
        assert "building_on" in prompt

    def test_no_rag_moves_in_layer_5(self, prompt_builder):
        """Test that Layer 5 shows no RAG moves when none provided."""
        prompt = prompt_builder.build_prompt(
            session_history=[],
            child_input="What is justice?",
            age_group="9-12"
        )
        assert "LAYER 5: RAG MOVES" in prompt
        assert "(No RAG moves provided" in prompt


class TestBaselinePrompt:
    """Tests for the baseline prompt builder."""

    def test_baseline_shorter_than_p4c(self, prompt_builder):
        """Test that baseline prompt is shorter than P4C prompt."""
        child_input = "What is the meaning of life?"
        
        baseline = prompt_builder.build_baseline_prompt("9-12", child_input)
        p4c_prompt = prompt_builder.build_prompt(
            session_history=[],
            child_input=child_input,
            age_group="9-12"
        )
        
        # Baseline should be significantly shorter
        assert len(baseline) < len(p4c_prompt)
        assert len(baseline) < 500  # Baseline should be concise


class TestQuestionTypeRotation:
    """Tests for question type rotation logic."""

    def test_rotation_avoids_recent_types(self, prompt_builder):
        """Test that rotation avoids repeating the last question type."""
        # Simulate a sequence of question types
        last_type = "conceptual"
        recent_types = ["conceptual", "conceptual", "conceptual"]
        
        next_type, _ = prompt_builder._select_next_question_type(last_type, recent_types)
        
        # Should not be conceptual
        assert next_type != "conceptual"

    def test_all_seven_types_exist(self, prompt_builder):
        """Test that all 7 question types are defined."""
        types = prompt_builder.get_all_question_types()
        
        assert len(types) == 7
        assert "conceptual" in types
        assert "assumption" in types
        assert "evidence" in types
        assert "perspective" in types
        assert "implication" in types
        assert "metacognitive" in types
        assert "opening" in types

    def test_rotation_considers_usage_counts(self, prompt_builder):
        """Test that rotation prioritizes unused types."""
        # All types used equally except one
        last_type = "conceptual"
        recent_types = ["assumption", "evidence", "perspective", "implication", "metacognitive", "opening"]
        
        next_type, _ = prompt_builder._select_next_question_type(last_type, recent_types)
        
        # Should select conceptual (the unused one)
        assert next_type == "conceptual"


class TestOutputFormat:
    """Tests for output format inclusion."""

    def test_output_format_in_prompt(self, prompt_builder):
        """Test that output format is included in the prompt."""
        prompt = prompt_builder.build_prompt(
            session_history=[],
            child_input="What is justice?",
            age_group="9-12"
        )
        
        assert "LAYER 7: OUTPUT FORMAT" in prompt
        assert '"question":' in prompt or "question" in prompt

    def test_output_format_requires_json(self, prompt_builder):
        """Test that output format specifies JSON response."""
        output_format = prompt_builder.prompts["output_format"]
        
        assert "json" in output_format.lower() or "JSON" in output_format
        assert "question" in output_format


class TestSessionHistory:
    """Tests for session history handling."""

    def test_session_history_in_context(self, prompt_builder):
        """Test that session history appears in Layer 6."""
        turn1 = Turn(
            id=1,
            content="What is justice?",
            question_type="conceptual",
            thinking_trace="",
            eval_scores=EvalScores(),
            forbidden_behaviors_detected=[],
            rag_moves_used=[],
            timestamp=1000.0
        )
        turn2 = Turn(
            id=2,
            content="Why do you think that?",
            question_type="assumption",
            thinking_trace="",
            eval_scores=EvalScores(),
            forbidden_behaviors_detected=[],
            rag_moves_used=[],
            timestamp=2000.0
        )
        
        prompt = prompt_builder.build_prompt(
            session_history=[turn1, turn2],
            child_input="Can you explain more?",
            age_group="9-12"
        )
        
        assert "CONVERSATION HISTORY" in prompt
        assert "What is justice?" in prompt
        assert "Why do you think that?" in prompt
