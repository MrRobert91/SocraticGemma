'use client';

import { CompareResponse } from '@/lib/types';
import { ScoreMini } from '@/components/dialogue/ScoreMini';
import { PromptViewer } from './PromptViewer';

interface ComparePanelProps {
  result: CompareResponse;
}

export function ComparePanel({ result }: ComparePanelProps) {
  const { base_response, p4c_response, improvement_pct } = result;

  return (
    <div className="space-y-6">
      {/* Header with improvement */}
      <div className="text-center">
        <div className="inline-flex items-center gap-2 neo-tag bg-[var(--accent-bg)] text-emerald-900 dark:text-emerald-100 px-4 py-2 text-base">
          <span>📈</span>
          <span>Mejora del {improvement_pct.toFixed(1)}%</span>
        </div>
      </div>

      {/* Side by side comparison */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Baseline */}
        <div className="neo-card overflow-hidden">
          <div className="bg-[var(--bg)] px-4 py-2 border-b-2 border-[var(--border)]">
            <h3 className="font-black text-[var(--text)]">🅱️ Respuesta Base</h3>
          </div>
          <div className="p-4 space-y-4">
            <div className="neo-card bg-[var(--bg)] p-4">
              <p className="text-sm text-[var(--text)] whitespace-pre-wrap">
                {base_response.content}
              </p>
            </div>
            <ScoreMini scores={base_response.scores} showLabels />
            <PromptViewer prompt={base_response.prompt_used} label="Prompt usado" />
          </div>
        </div>

        {/* P4C */}
        <div className="neo-card overflow-hidden">
          <div className="bg-[var(--accent-bg)] px-4 py-2 border-b-2 border-[var(--border)]">
            <h3 className="font-black text-emerald-900 dark:text-emerald-100">✨ Respuesta SocraticGemma</h3>
          </div>
          <div className="p-4 space-y-4">
            <div className="neo-card bg-[var(--accent-bg)] p-4">
              <p className="text-sm text-emerald-900 dark:text-emerald-100 whitespace-pre-wrap">
                {p4c_response.content}
              </p>
            </div>
            <ScoreMini scores={p4c_response.scores} showLabels />
            <PromptViewer prompt={p4c_response.prompt_used} label="Prompt usado" />
          </div>
        </div>
      </div>
    </div>
  );
}
