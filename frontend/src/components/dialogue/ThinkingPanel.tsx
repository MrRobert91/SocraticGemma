'use client';

import { useState } from 'react';

interface ThinkingPanelProps {
  trace: string;
  isStreaming?: boolean;
}

export function ThinkingPanel({ trace, isStreaming }: ThinkingPanelProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (!trace) return null;

  return (
    <div className="border border-indigo-200 dark:border-indigo-800 rounded-lg bg-indigo-50/50 dark:bg-indigo-900/20">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-2 text-sm font-medium text-indigo-700 dark:text-indigo-300"
      >
        <span className="flex items-center gap-2">
          <span>🧠</span>
          <span>Proceso de razonamiento</span>
          {isStreaming && (
            <span className="flex h-3 w-3 ml-2">
              <span className="animate-ping absolute h-3 w-3 rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative rounded-full h-3 w-3 bg-indigo-500"></span>
            </span>
          )}
        </span>
        <span className={`transform transition-transform ${isOpen ? 'rotate-180' : ''}`}>
          ▼
        </span>
      </button>
      {isOpen && (
        <div className="px-4 pb-4">
          <pre className="text-xs text-indigo-800 dark:text-indigo-200 whitespace-pre-wrap font-mono leading-relaxed">
            {trace}
          </pre>
        </div>
      )}
    </div>
  );
}
