'use client';

import { EvalScores } from '@/lib/types';

interface ScoreDiffProps {
  base: EvalScores;
  p4c: EvalScores;
}

type RequiredScoreKey = 'socratism' | 'age_fit' | 'builds_on' | 'openness' | 'advancement' | 'overall';

export function ScoreDiff({ base, p4c }: ScoreDiffProps) {
  const scoreKeys: RequiredScoreKey[] = ['socratism', 'age_fit', 'builds_on', 'openness', 'advancement', 'overall'];

  const labels: Record<RequiredScoreKey, string> = {
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
            <div className="w-24 text-sm font-bold text-[var(--text)] shrink-0">
              {labels[key]}
            </div>
            <div className="flex-1 flex items-center gap-2">
              <div className="h-5 border-2 border-[var(--border)] overflow-hidden flex-1 relative" style={{ borderRadius: '2px' }}>
                <div
                  className="absolute inset-y-0 left-0 bg-[var(--bg)]"
                  style={{ width: `${(base[key] / 5) * 100}%` }}
                />
                <div
                  className="absolute inset-y-0 left-0 bg-[var(--accent)] opacity-80"
                  style={{ width: `${(p4c[key] / 5) * 100}%` }}
                />
              </div>
              <div className="w-20 text-right text-sm font-mono shrink-0">
                <span className="text-[var(--muted)]">{base[key].toFixed(1)}</span>
                <span className="text-[var(--muted)] mx-1">→</span>
                <span className="font-bold text-[var(--text)]">{p4c[key].toFixed(1)}</span>
              </div>
              <div
                className={`w-20 text-right text-sm font-black shrink-0 ${
                  isPositive ? 'text-emerald-600' : isNegative ? 'text-rose-600' : 'text-[var(--muted)]'
                }`}
              >
                {isPositive && '+'}{diff.toFixed(2)} ({diffPercent}%)
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
