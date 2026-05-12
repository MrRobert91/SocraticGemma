// ─── Age Group ───────────────────────────────────────────────────────────────

export type AgeGroup = '6-8' | '9-12' | '13-16';

// ─── Stimulus ─────────────────────────────────────────────────────────────────

export interface Stimulus {
  type: string;
  content: string;
  title?: string;
}

// ─── Session request ──────────────────────────────────────────────────────────

export interface CreateSessionRequest {
  age_group: AgeGroup;
  stimulus: Stimulus;
  model_size?: 'fast' | 'accurate';
  rag_enabled?: boolean;
  thinking_mode?: boolean;
  language?: string;
}

// ─── Evaluation scores ────────────────────────────────────────────────────────

export interface EvalScores {
  socratism: number;
  age_fit: number;
  builds_on: number;
  openness: number;
  advancement: number;
  overall: number;
  weighted_overall?: number;
}

// ─── Question types ───────────────────────────────────────────────────────────

export type QuestionType =
  | 'conceptual'
  | 'assumption'
  | 'evidence'
  | 'perspective'
  | 'implication'
  | 'metacognitive'
  | 'opening'
  | 'statement';

export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  conceptual: 'Conceptual',
  assumption: 'Suposición',
  evidence: 'Evidencia',
  perspective: 'Perspectiva',
  implication: 'Implicación',
  metacognitive: 'Metacognitiva',
  opening: 'Apertura',
  statement: 'Afirmación',
};

export const QUESTION_TYPE_COLORS: Record<QuestionType, string> = {
  conceptual: 'bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300',
  assumption: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300',
  evidence: 'bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300',
  perspective: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300',
  implication: 'bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300',
  metacognitive: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300',
  opening: 'bg-teal-100 text-teal-700 dark:bg-teal-900/50 dark:text-teal-300',
  statement: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
};

// ─── Turn ─────────────────────────────────────────────────────────────────────

export interface Turn {
  id?: number;
  role: 'child' | 'assistant';
  content: string;
  question_type?: QuestionType;
  thinking_trace?: string;
  eval_scores?: EvalScores;
  forbidden_behaviors_detected?: string[];
  rag_moves_used?: string[];
  timestamp?: string | number;
}

// ─── Session response ─────────────────────────────────────────────────────────

export interface SessionResponse {
  session_id: string;
  age_group: AgeGroup;
  stimulus: Stimulus;
  model_size: string;
  language: string;
  turns: Turn[];
  phases: Record<string, boolean>;
  created_at: number;
}

// ─── Evaluation summary ───────────────────────────────────────────────────────

export interface EvalSummary {
  session_id: string;
  turn_count: number;
  avg_scores: EvalScores;
  question_type_distribution: Partial<Record<QuestionType, number>>;
  forbidden_behaviors_by_turn: Record<string, unknown>[];
}

// ─── Compare response ─────────────────────────────────────────────────────────

export interface CompareResponseItem {
  content: string;
  scores: EvalScores;
  prompt_used: string;
}

export interface CompareResponse {
  base_response: CompareResponseItem;
  p4c_response: CompareResponseItem;
  improvement_pct: number;
}

// ─── Presets ──────────────────────────────────────────────────────────────────

export interface Preset {
  id: string;
  title: string;
  ageGroup: AgeGroup;
  stimulus: Stimulus;
}

export const PRESETS: Preset[] = [
  {
    id: 'justice-6-8',
    title: '¿Qué es ser justo?',
    ageGroup: '6-8',
    stimulus: {
      type: 'question',
      content: '¿Qué es ser justo? ¿Es lo mismo para todos?',
      title: '¿Qué es ser justo?',
    },
  },
  {
    id: 'friendship-6-8',
    title: '¿Qué es un amigo?',
    ageGroup: '6-8',
    stimulus: {
      type: 'question',
      content: '¿Qué hace que alguien sea un buen amigo?',
      title: '¿Qué es un amigo?',
    },
  },
  {
    id: 'truth-9-12',
    title: '¿Siempre hay que decir la verdad?',
    ageGroup: '9-12',
    stimulus: {
      type: 'question',
      content: '¿Siempre es bueno decir la verdad, incluso cuando duele?',
      title: '¿Siempre hay que decir la verdad?',
    },
  },
  {
    id: 'happiness-9-12',
    title: '¿Qué es la felicidad?',
    ageGroup: '9-12',
    stimulus: {
      type: 'question',
      content: '¿Qué necesitas para ser feliz? ¿Es lo mismo para todos?',
      title: '¿Qué es la felicidad?',
    },
  },
  {
    id: 'freedom-13-16',
    title: '¿Somos realmente libres?',
    ageGroup: '13-16',
    stimulus: {
      type: 'question',
      content: '¿Hasta qué punto somos libres para tomar nuestras propias decisiones?',
      title: '¿Somos realmente libres?',
    },
  },
  {
    id: 'identity-13-16',
    title: '¿Qué te hace ser tú?',
    ageGroup: '13-16',
    stimulus: {
      type: 'question',
      content: '¿Qué es lo que te hace ser quien eres? ¿Cambiarías si cambiaran tus recuerdos?',
      title: '¿Qué te hace ser tú?',
    },
  },
];

// ─── Score colour helpers ─────────────────────────────────────────────────────

export function getScoreColor(score: number): string {
  if (score >= 4) return 'text-emerald-600 dark:text-emerald-400';
  if (score >= 3) return 'text-amber-600 dark:text-amber-400';
  return 'text-rose-600 dark:text-rose-400';
}

export function getScoreBgColor(score: number): string {
  if (score >= 4) return 'bg-emerald-50 dark:bg-emerald-900/30';
  if (score >= 3) return 'bg-amber-50 dark:bg-amber-900/30';
  return 'bg-rose-50 dark:bg-rose-900/30';
}
