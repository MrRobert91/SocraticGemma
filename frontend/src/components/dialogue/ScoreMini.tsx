'use client';

import { EvalScores, getScoreColor, getScoreBgColor } from '@/lib/types';

interface ScoreMiniProps {
  scores: EvalScores;
  showLabels?: boolean;
}

type RequiredScoreKey = 'socratism' | 'age_fit' | 'builds_on' | 'openness' | 'advancement' | 'overall';

export function ScoreMini({ scores }: ScoreMiniProps) {
  const scoreKeys: RequiredScoreKey[] = ['socratism', 'age_fit', 'builds_on', 'openness', 'advancement'];

  const labels: Record<RequiredScoreKey, string> = {
    socratism: 'Socrático',
    age_fit: 'Adecuado a la edad',
    builds_on: 'Continúa el hilo',
    openness: 'Pregunta abierta',
    advancement: 'Avanza el diálogo',
    overall: 'Total',
  };

  const descriptions: Record<RequiredScoreKey, string> = {
    socratism: 'Qué tan socrático es el enfoque (evita dar respuestas directas)',
    age_fit: 'Qué tan apropiado es el lenguaje y la complejidad para la edad',
    builds_on: 'Qué tan bien se apoya en lo que dijo el niño',
    openness: 'Qué tan abierta es la pregunta (evita respuestas de sí/no)',
    advancement: 'Cuánto avanza la indagación filosófica',
    overall: 'Puntuación general',
  };

  return (
    <div className="flex flex-wrap gap-1.5">
      {scoreKeys.map((key) => (
        <div
          key={key}
          className={`
            inline-flex flex-col items-center px-2 py-1 rounded-lg
            ${getScoreBgColor(scores[key])}
          `}
          title={descriptions[key]}
        >
          <span className={`text-sm font-bold leading-tight ${getScoreColor(scores[key])}`}>
            {scores[key].toFixed(1)}
          </span>
          <span className="text-[10px] text-gray-500 dark:text-gray-400 leading-tight mt-0.5 text-center">
            {labels[key]}
          </span>
        </div>
      ))}
    </div>
  );
}
