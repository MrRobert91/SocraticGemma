'use client';

import { useState } from 'react';

interface PromptViewerProps {
  prompt: string;
  label?: string;
}

export function PromptViewer({ prompt, label = 'Prompt' }: PromptViewerProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border-2 border-[var(--border)] overflow-hidden" style={{ borderRadius: '4px' }}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        className="w-full flex items-center justify-between px-3 py-2 bg-[var(--bg)] text-sm font-bold text-[var(--text)] hover:bg-[var(--accent-bg)] transition-colors"
      >
        <span className="flex items-center gap-2">
          <span>📝</span>
          <span>{label}</span>
        </span>
        <span className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}>▼</span>
      </button>
      {isOpen && (
        <div className="p-3 bg-[var(--bg-card)] border-t-2 border-[var(--border)]">
          <pre className="text-xs text-[var(--muted)] whitespace-pre-wrap font-mono leading-relaxed">
            {prompt}
          </pre>
        </div>
      )}
    </div>
  );
}
