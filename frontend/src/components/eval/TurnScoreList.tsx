'use client';

import { Turn, QUESTION_TYPE_LABELS } from '@/lib/types';
import { ScoreMini } from '@/components/dialogue/ScoreMini';

interface TurnScoreListProps {
  turns: Turn[];
}

export function TurnScoreList({ turns }: TurnScoreListProps) {
  const assistantTurns = turns.filter((t) => t.role === 'assistant');

  return (
    <div className="space-y-4">
      {assistantTurns.map((turn, index) => (
        <div key={index} className="neo-card p-4 animate-fade-up">
          <div className="flex items-start justify-between gap-4 mb-3">
            <div className="flex items-center gap-2">
              <span className="text-base font-black text-[var(--text)]">Turno {index + 1}</span>
              {turn.question_type && (
                <span className="neo-tag bg-sky-200 text-sky-900 text-xs px-2 py-0.5">
                  {QUESTION_TYPE_LABELS[turn.question_type]}
                </span>
              )}
            </div>
          </div>

          <p className="text-sm text-[var(--muted)] mb-3 line-clamp-2">{turn.content}</p>

          {turn.eval_scores && (
            <div className="space-y-2">
              <ScoreMini scores={turn.eval_scores} />
              {turn.eval_scores.overall > 0 && (
                <div className="flex items-center justify-between text-sm border-t-2 border-[var(--border)] pt-2 mt-2">
                  <span className="font-bold text-[var(--text)]">Total:</span>
                  <span
                    className={`font-black text-lg ${
                      turn.eval_scores.overall >= 4
                        ? 'text-emerald-600'
                        : turn.eval_scores.overall >= 3
                        ? 'text-amber-600'
                        : 'text-rose-600'
                    }`}
                  >
                    {turn.eval_scores.overall.toFixed(1)}
                  </span>
                </div>
              )}
            </div>
          )}

          {turn.forbidden_behaviors_detected && turn.forbidden_behaviors_detected.length > 0 && (
            <div className="mt-3 pt-3 border-t-2 border-[var(--border)]">
              <p className="text-xs font-bold text-rose-700 dark:text-rose-400">
                ⚠️ {turn.forbidden_behaviors_detected.join(', ')}
              </p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
