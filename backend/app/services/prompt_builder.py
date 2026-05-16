"""Prompt builder service for assembling Socratic dialogue prompts."""

import os
from pathlib import Path
from typing import Optional



# Path to the prompts directory
PROMPTS_DIR = Path(__file__).parent.parent / "prompts"


class PromptBuilder:
    """Builds layered prompts for Socratic dialogue.
    
    Assembles 7 layers:
    1. System base identity
    2. Age-specific guidelines
    3. Forbidden behaviors
    4. Question types with rotation info
    5. RAG moves (if provided)
    6. Session context (stimulus + child's input)
    7. Output format
    """

    QUESTION_TYPES = [
        "conceptual",
        "assumption",
        "evidence",
        "perspective",
        "implication",
        "metacognitive",
        "opening"
    ]

    def __init__(self, prompts_dir: Optional[Path] = None):
        """Initialize the prompt builder.
        
        Args:
            prompts_dir: Path to the directory containing YAML prompt files.
        """
        self.prompts_dir = prompts_dir or PROMPTS_DIR
        self._load_prompts()

    def _load_prompts(self) -> None:
        """Load all YAML prompt files from the prompts directory."""
        self.prompts = {}
        
        prompt_files = [
            "system_base.yaml",
            "baseline.yaml",
            "adaptive.yaml",
            "age_6_8.yaml",
            "age_9_12.yaml",
            "age_13_16.yaml",
            "age_adult.yaml",
            "forbidden_rules.yaml",
            "question_types.yaml",
            "output_format.yaml"
        ]
        
        for filename in prompt_files:
            filepath = self.prompts_dir / filename
            if filepath.exists():
                with open(filepath, 'r', encoding='utf-8') as f:
                    key = filename.replace('.yaml', '')
                    self.prompts[key] = f.read()
            else:
                self.prompts[filename.replace('.yaml', '')] = ""

    def _get_age_prompt_key(self, age_group: str) -> str:
        """Get the prompt file key for a given age group.
        
        Args:
            age_group: Age group string like "6-8", "9-12", or "13-16"
            
        Returns:
            The prompt file key for the age group.
        """
        age_map = {
            "6-8": "age_6_8",
            "9-12": "age_9_12",
            "13-16": "age_13_16",
            "adult": "age_adult",
            "adaptive": "adaptive",
        }
        return age_map.get(age_group, "adaptive")

    def _select_next_question_type(
        self,
        last_type: Optional[str],
        recent_types: list[str]
    ) -> tuple[str, list[str]]:
        """Select the next question type using rotation logic.
        
        Args:
            last_type: The last question type used.
            recent_types: List of recent question types (last 5-7).
            
        Returns:
            Tuple of (selected_type, updated_recent_types).
        """
        if not recent_types:
            recent_types = []
        
        # Remove last_type from recent_types for selection purposes
        eligible = [t for t in self.QUESTION_TYPES if t != last_type]
        
        # Prioritize unused or least-used types
        type_counts = {t: recent_types.count(t) for t in self.QUESTION_TYPES}
        
        # Sort by usage count (ascending) and alphabetically for ties
        sorted_types = sorted(eligible, key=lambda t: (type_counts[t], t))
        
        if sorted_types:
            selected = sorted_types[0]
            updated_recent = (recent_types + [selected])[-7:]  # Keep last 7
            return selected, updated_recent
        
        # Fallback
        return self.QUESTION_TYPES[0], recent_types[-6:] + [self.QUESTION_TYPES[0]]

    def build_prompt(
        self,
        session_history: list,
        child_input: str,
        age_group: str,
        last_question_type: Optional[str] = None,
        recent_types: Optional[list[str]] = None,
        rag_moves: Optional[list[str]] = None,
        stimulus: Optional[dict] = None,
        turn_number: int = 1,
        total_turns: int = 20,
        wiki_profile: Optional[str] = None,
    ) -> str:
        """Build a complete Socratic prompt with all 7 layers.
        
        Args:
            session_history: List of previous turns in the session.
            child_input: The child's latest input/response.
            age_group: The child's age group ("6-8", "9-12", or "13-16").
            last_question_type: The last question type used.
            recent_types: List of recent question types for rotation.
            rag_moves: Optional list of RAG moves to include.
            stimulus: Optional stimulus context for the session.
            
        Returns:
            Complete assembled prompt string.
        """
        if recent_types is None:
            recent_types = []

        # Pre-calculate progress instruction (LLM must not do this math)
        remaining = max(total_turns - turn_number, 0)
        pct = remaining / total_turns if total_turns > 0 else 0.0
        if pct > 0.6:
            progress_instruction = "PROFUNDIZA en el concepto actual — todavía hay tiempo suficiente para ir al fondo."
        elif pct >= 0.2:
            progress_instruction = "INTRODUCE nuevos ángulos y perspectivas aún no explorados en esta conversación."
        else:
            progress_instruction = "BUSCA síntesis y cierre filosófico significativo — la conversación está llegando a su fin."
        progress_line = (
            f"PROGRESO DE SESIÓN: Turno {turn_number} de {total_turns}. "
            f"Quedan {remaining} turnos ({round(pct * 100)}%). "
            f"INSTRUCCIÓN: {progress_instruction}"
        )

        # Layer 1: System base
        layers = ["=" * 50 + "\nLAYER 1: SYSTEM IDENTITY\n" + "=" * 50]
        layers.append(self.prompts.get("system_base", ""))
        layers.append(progress_line)
        
        # Layer 2: Communication style (adaptive or legacy age-group)
        age_key = self._get_age_prompt_key(age_group)
        layers.append("=" * 50 + "\nLAYER 2: COMMUNICATION STYLE\n" + "=" * 50)
        layers.append(self.prompts.get(age_key, ""))
        
        # Layer 3: Forbidden behaviors
        layers.append("=" * 50 + "\nLAYER 3: FORBIDDEN BEHAVIORS (AVOID THESE)\n" + "=" * 50)
        layers.append(self.prompts.get("forbidden_rules", ""))
        
        # Layer 4: Question types with rotation info
        selected_type, updated_recent = self._select_next_question_type(
            last_question_type, recent_types
        )
        unused_types = [t for t in self.QUESTION_TYPES if t not in recent_types]
        
        layers.append("=" * 50 + "\nLAYER 4: QUESTION TYPES WITH ROTATION\n" + "=" * 50)
        question_types_text = self.prompts.get("question_types", "")
        
        rotation_info = f"""
CURRENT ROTATION STATUS:
- Last question type used: {last_question_type or 'None'}
- Recent question types (last 7): {recent_types}
- Recommended next type: {selected_type}
- Unused recent types: {unused_types if unused_types else 'All types have been used recently'}

{question_types_text}
"""
        layers.append(rotation_info)
        
        # Layer 5: RAG moves (if provided)
        layers.append("=" * 50 + "\nLAYER 5: RAG MOVES\n" + "=" * 50)
        if rag_moves:
            layers.append("Use these P4C moves in your response:")
            for move in rag_moves:
                layers.append(f"- {move}")
        else:
            layers.append("(No RAG moves provided for this turn)")
        
        # Layer 6: Session context with stimulus + child's input
        layers.append("=" * 50 + "\nLAYER 6: SESSION CONTEXT\n" + "=" * 50)
        
        if stimulus:
            title = stimulus.get('title') or stimulus.get('content', '')
            content = stimulus.get('content', '')
            stimulus_type = stimulus.get('type', 'question')
            stimulus_text = f"""STIMULUS FOR THIS SESSION:
Title: {title}
Type: {stimulus_type}
Content: {content}

This is the philosophical starting point for the entire dialogue. Base your questions on this stimulus.
"""
            layers.append(stimulus_text)
        
        if session_history:
            history_text = "\nCONVERSATION HISTORY:\n"
            for turn in session_history:
                history_text += f"\n[Turn {turn.id}] Question ({turn.question_type}): {turn.content}\n"
                if turn.thinking_trace:
                    history_text += f"  Thinking: {turn.thinking_trace[:100]}...\n"
            layers.append(history_text)
        
        layers.append(f"\nCHILD'S LATEST RESPONSE:\n{child_input}")
        
        # Layer 7: Output format
        layers.append("=" * 50 + "\nLAYER 7: OUTPUT FORMAT\n" + "=" * 50)
        layers.append(self.prompts.get("output_format", ""))

        # Layer 8: Wiki profile (optional — only for authenticated users with wiki)
        if wiki_profile:
            layers.append("=" * 50 + "\nLAYER 8: PERFIL FILOSÓFICO DEL USUARIO\n" + "=" * 50)
            layers.append(
                "El siguiente perfil resume el historial filosófico del usuario en sesiones anteriores. "
                "Úsalo para personalizar tus preguntas, hacer referencia a temas previos, y profundizar "
                "en áreas donde el usuario ha mostrado interés o dificultades recurrentes.\n\n"
                + wiki_profile
            )
        
        return "\n\n".join(layers)

    def build_baseline_prompt(
        self,
        age_group: str,
        child_input: str
    ) -> str:
        """Build a baseline (non-Socratic) prompt for comparison.
        
        Args:
            age_group: The child's age group.
            child_input: The child's input/question.
            
        Returns:
            Baseline prompt string.
        """
        # Map age group to approximate numeric age
        age_map = {"6-8": 7, "9-12": 10, "13-16": 14, "adult": 30}
        age = age_map.get(age_group, 10)
        
        baseline = self.prompts.get("baseline", "")
        baseline = baseline.format(age=age)
        
        return f"{baseline}\n\nThe child asks: {child_input}"

    def get_all_question_types(self) -> list[str]:
        """Get all available question types.
        
        Returns:
            List of all 7 question type strings.
        """
        return self.QUESTION_TYPES.copy()


# Global prompt builder instance
prompt_builder = PromptBuilder()
