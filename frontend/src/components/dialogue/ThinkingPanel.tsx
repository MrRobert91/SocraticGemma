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
    <div className="neo-card w-full overflow-hidden">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        className="w-full flex items-center justify-between px-4 py-2.5 text-sm font-bold text-indigo-900 dark:text-indigo-100 bg-indigo-100 dark:bg-indigo-900/40 border-b-2 border-[var(--border)]"
      >
        <span className="flex items-center gap-2">
          <span>🧠</span>
          <span>Proceso de razonamiento</span>
          {isStreaming && (
            <span className="inline-flex h-2.5 w-2.5 rounded-full bg-indigo-500 animate-ping" />
          )}
        </span>
        <span
          aria-hidden="true"
          className={`text-xs transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`}
        >
          ▼
        </span>
      </button>
      {isOpen && (
        <div className="px-4 py-3 bg-indigo-50 dark:bg-indigo-950/40">
          <pre className="text-xs text-indigo-900 dark:text-indigo-200 whitespace-pre-wrap font-mono leading-relaxed">
            {trace}
          </pre>
        </div>
      )}
    </div>
  );
}
