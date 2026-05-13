'use client';

import { QuestionType, QUESTION_TYPE_LABELS, QUESTION_TYPE_COLORS } from '@/lib/types';

interface QTypeTagProps {
  type: QuestionType;
  size?: 'sm' | 'md';
}

const QUESTION_TYPE_DESCRIPTIONS: Record<QuestionType, string> = {
  conceptual:    'Explora el significado de un concepto o idea',
  assumption:    'Cuestiona los supuestos implícitos en una afirmación',
  evidence:      'Pide justificación o evidencia para una idea',
  perspective:   'Invita a considerar otros puntos de vista',
  implication:   'Explora las consecuencias de una idea',
  metacognitive: 'Reflexiona sobre el propio proceso de pensar',
  opening:       'Abre la exploración de un tema nuevo',
  statement:     'Afirmación (no es una pregunta)',
};

export function QTypeTag({ type, size = 'sm' }: QTypeTagProps) {
  const sizeClasses = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-3 py-1';

  return (
    <span
      className={`
        inline-flex items-center rounded-full border font-medium cursor-help
        ${QUESTION_TYPE_COLORS[type]}
        ${sizeClasses}
      `}
      title={QUESTION_TYPE_DESCRIPTIONS[type]}
    >
      {QUESTION_TYPE_LABELS[type]}
    </span>
  );
}
