'use client';

import { EvalScores } from '@/lib/types';
import { Tooltip } from '@/components/Tooltip';

interface ScoreMiniProps {
  scores: EvalScores;
  showLabels?: boolean;
}

type ScoreKey = 'socratism' | 'age_fit' | 'builds_on' | 'openness' | 'advancement';

const SCORE_KEYS: ScoreKey[] = ['socratism', 'age_fit', 'builds_on', 'openness', 'advancement'];

const LABELS: Record<ScoreKey, string> = {
  socratism:   'Socrático',
  age_fit:     'Edad',
  builds_on:   'Hilo',
  openness:    'Abierto',
  advancement: 'Avance',
};

const DESCRIPTIONS: Record<ScoreKey, string> = {
  socratism:   'Qué tan socrático es el enfoque',
  age_fit:     'Apropiado para la edad',
  builds_on:   'Se apoya en lo dicho',
  openness:    'Pregunta abierta',
  advancement: 'Avanza el diálogo',
};

function scoreBg(v: number) {
  return v >= 4
    ? 'bg-emerald-200 text-emerald-900'
    : v >= 3
    ? 'bg-amber-200 text-amber-900'
    : 'bg-rose-200 text-rose-900';
}

export function ScoreMini({ scores }: ScoreMiniProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {SCORE_KEYS.map((key) => (
        <Tooltip key={key} content={DESCRIPTIONS[key]} side="top">
          <div className={`neo-tag ${scoreBg(scores[key])} flex flex-col items-center px-2 py-1`}>
            <span className="text-sm font-black leading-tight">{scores[key].toFixed(1)}</span>
            <span className="text-[10px] leading-tight mt-0.5">{LABELS[key]}</span>
          </div>
        </Tooltip>
      ))}
    </div>
  );
}
