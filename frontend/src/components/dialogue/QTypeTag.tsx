'use client';

import { QuestionType, QUESTION_TYPE_LABELS, QUESTION_TYPE_COLORS } from '@/lib/types';

interface QTypeTagProps {
  type: QuestionType;
  size?: 'sm' | 'md';
}

export function QTypeTag({ type, size = 'sm' }: QTypeTagProps) {
  const sizeClasses = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-3 py-1';

  return (
    <span
      className={`
        inline-flex items-center rounded-full border font-medium
        ${QUESTION_TYPE_COLORS[type]}
        ${sizeClasses}
      `}
    >
      {QUESTION_TYPE_LABELS[type]}
    </span>
  );
}
