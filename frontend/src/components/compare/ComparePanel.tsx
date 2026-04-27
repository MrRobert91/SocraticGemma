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
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300">
          <span className="text-lg">📈</span>
          <span className="font-semibold">
            Mejora del {improvement_pct.toFixed(1)}%
          </span>
        </div>
      </div>

      {/* Side by side comparison */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Baseline */}
        <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
          <div className="bg-gray-100 dark:bg-gray-800 px-4 py-2 border-b border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold text-gray-700 dark:text-gray-300">
              🅱️ Respuesta Base
            </h3>
          </div>
          <div className="p-4 space-y-4">
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
              <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                {base_response.content}
              </p>
            </div>
            <ScoreMini scores={base_response.scores} showLabels />
            <PromptViewer prompt={base_response.prompt_used} label="Prompt usado" />
          </div>
        </div>

        {/* P4C */}
        <div className="border border-amber-200 dark:border-amber-700 rounded-xl overflow-hidden">
          <div className="bg-amber-100 dark:bg-amber-900/50 px-4 py-2 border-b border-amber-200 dark:border-amber-700">
            <h3 className="font-semibold text-amber-700 dark:text-amber-300">
              ✨ Respuesta SocraticGemma
            </h3>
          </div>
          <div className="p-4 space-y-4">
            <div className="bg-amber-50 dark:bg-amber-900/30 rounded-lg p-4">
              <p className="text-sm text-amber-900 dark:text-amber-100 whitespace-pre-wrap">
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
