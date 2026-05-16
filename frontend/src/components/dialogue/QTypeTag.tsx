'use client';

import { QuestionType, QUESTION_TYPE_LABELS } from '@/lib/types';
import { Tooltip } from '@/components/Tooltip';

interface QTypeTagProps {
  type: QuestionType;
  size?: 'sm' | 'md';
}

const NEO_COLORS: Record<QuestionType, string> = {
  conceptual:    'bg-violet-200 text-violet-900',
  assumption:    'bg-amber-200  text-amber-900',
  evidence:      'bg-sky-200    text-sky-900',
  perspective:   'bg-emerald-200 text-emerald-900',
  implication:   'bg-rose-200   text-rose-900',
  metacognitive: 'bg-indigo-200 text-indigo-900',
  opening:       'bg-teal-200   text-teal-900',
  statement:     'bg-gray-200   text-gray-900',
};

const DESCRIPTIONS: Record<QuestionType, string> = {
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
    <Tooltip content={DESCRIPTIONS[type]} side="top">
      <span className={`neo-tag ${NEO_COLORS[type]} ${sizeClasses}`}>
        {QUESTION_TYPE_LABELS[type]}
      </span>
    </Tooltip>
  );
}
