'use client';

import { EvalScores } from '@/lib/types';

interface ScoreDiffProps {
  base: EvalScores;
  p4c: EvalScores;
}

export function ScoreDiff({ base, p4c }: ScoreDiffProps) {
  const scoreKeys: (keyof EvalScores)[] = ['socratism', 'age_fit', 'builds_on', 'openness', 'advancement', 'overall'];

  const labels: Record<keyof EvalScores, string> = {
    socratism: 'Socratismo',
    age_fit: 'Ajuste edad',
    builds_on: 'Construye',
    openness: 'Apertura',
    advancement: 'Avance',
    overall: 'Total',
  };

  return (
    <div className="space-y-3">
      {scoreKeys.map((key) => {
        const diff = p4c[key] - base[key];
        const diffPercent = ((diff / base[key]) * 100).toFixed(1);
        const isPositive = diff > 0;
        const isNegative = diff < 0;

        return (
          <div key={key} className="flex items-center gap-4">
            <div className="w-24 text-sm font-medium text-gray-700 dark:text-gray-300">
              {labels[key]}
            </div>
            <div className="flex-1 flex items-center gap-2">
              <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden flex-1 relative">
                <div
                  className="absolute inset-y-0 left-0 bg-sky-500 rounded-full"
                  style={{ width: `${(base[key] / 5) * 100}%` }}
                />
                <div
                  className="absolute inset-y-0 left-0 bg-amber-500 rounded-full opacity-70"
                  style={{ width: `${(p4c[key] / 5) * 100}%` }}
                />
              </div>
              <div className="w-16 text-right text-sm font-mono">
                <span className="text-gray-500">{base[key].toFixed(1)}</span>
                <span className="text-gray-400 mx-1">→</span>
                <span className="text-gray-700 dark:text-gray-300">{p4c[key].toFixed(1)}</span>
              </div>
              <div
                className={`
                  w-20 text-right text-sm font-medium
                  ${isPositive ? 'text-emerald-600' : ''}
                  ${isNegative ? 'text-rose-600' : ''}
                  ${!isPositive && !isNegative ? 'text-gray-400' : ''}
                `}
              >
                {isPositive && '+'}
                {diff.toFixed(2)} ({diffPercent}%)
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
