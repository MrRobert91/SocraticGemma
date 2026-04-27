'use client';

import { Turn, EvalScores, QUESTION_TYPE_LABELS } from '@/lib/types';
import { ScoreMini } from '@/components/dialogue/ScoreMini';

interface TurnScoreListProps {
  turns: Turn[];
}

export function TurnScoreList({ turns }: TurnScoreListProps) {
  const assistantTurns = turns.filter((t) => t.role === 'assistant');

  return (
    <div className="space-y-4">
      {assistantTurns.map((turn, index) => (
        <div
          key={index}
          className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800"
        >
          <div className="flex items-start justify-between gap-4 mb-2">
            <div className="flex items-center gap-2">
              <span className="text-lg font-semibold text-gray-700 dark:text-gray-300">
                Turno {index + 1}
              </span>
              {turn.question_type && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-sky-100 dark:bg-sky-900/50 text-sky-700 dark:text-sky-300">
                  {QUESTION_TYPE_LABELS[turn.question_type]}
                </span>
              )}
            </div>
          </div>

          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
            {turn.content}
          </p>

          {turn.eval_scores && (
            <div className="flex flex-col gap-2">
              <ScoreMini scores={turn.eval_scores} showLabels />
              {turn.eval_scores.overall > 0 && (
                <div className="flex items-center justify-between text-sm border-t border-gray-100 dark:border-gray-700 pt-2">
                  <span className="font-medium text-gray-700 dark:text-gray-300">
                    Puntuación total:
                  </span>
                  <span className={`font-bold text-lg ${turn.eval_scores.overall >= 4 ? 'text-emerald-600' : turn.eval_scores.overall >= 3 ? 'text-amber-600' : 'text-rose-600'}`}>
                    {turn.eval_scores.overall.toFixed(1)}
                  </span>
                </div>
              )}
            </div>
          )}

          {turn.forbidden_behaviors_detected && turn.forbidden_behaviors_detected.length > 0 && (
            <div className="mt-3 pt-3 border-t border-rose-200 dark:border-rose-800">
              <p className="text-xs text-rose-600 dark:text-rose-400">
                ⚠️ Comportamientos detectados: {turn.forbidden_behaviors_detected.join(', ')}
              </p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
