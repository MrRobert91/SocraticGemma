'use client';

import { useState } from 'react';

interface PromptViewerProps {
  prompt: string;
  label?: string;
}

export function PromptViewer({ prompt, label = 'Prompt' }: PromptViewerProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
      >
        <span className="flex items-center gap-2">
          <span>📝</span>
          <span>{label}</span>
        </span>
        <span className={`transform transition-transform ${isOpen ? 'rotate-180' : ''}`}>
          ▼
        </span>
      </button>
      {isOpen && (
        <div className="p-3 bg-white dark:bg-gray-900">
          <pre className="text-xs text-gray-600 dark:text-gray-400 whitespace-pre-wrap font-mono leading-relaxed">
            {prompt}
          </pre>
        </div>
      )}
    </div>
  );
}
