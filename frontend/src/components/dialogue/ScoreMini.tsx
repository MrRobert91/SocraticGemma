'use client';

import { EvalScores, getScoreColor, getScoreBgColor } from '@/lib/types';

interface ScoreMiniProps {
  scores: EvalScores;
  showLabels?: boolean;
}

export function ScoreMini({ scores, showLabels = false }: ScoreMiniProps) {
  const scoreKeys: (keyof EvalScores)[] = ['socratism', 'age_fit', 'builds_on', 'openness', 'advancement'];

  const labels: Record<keyof EvalScores, string> = {
    socratism: 'Socrat.',
    age_fit: 'Edad',
    builds_on: 'Continúa',
    openness: 'Abierto',
    advancement: 'Progreso',
    overall: 'Total',
  };

  return (
    <div className="flex flex-wrap gap-1">
      {scoreKeys.map((key) => (
        <div
          key={key}
          className={`
            inline-flex items-center gap-1 px-2 py-1 rounded
            ${getScoreBgColor(scores[key])}
          `}
          title={showLabels ? `${labels[key]}: ${scores[key].toFixed(1)}` : undefined}
        >
          {showLabels && (
            <span className="text-xs text-gray-600 dark:text-gray-400">
              {labels[key]}
            </span>
          )}
          <span className={`text-sm font-semibold ${getScoreColor(scores[key])}`}>
            {scores[key].toFixed(1)}
          </span>
        </div>
      ))}
    </div>
  );
}
