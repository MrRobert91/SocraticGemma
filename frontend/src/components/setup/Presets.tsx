'use client';

import { useState } from 'react';
import { Preset } from '@/lib/types';
import { getLocalizedPresets, getTranslations, LangCode } from '@/lib/i18n';

const PER_PAGE = 10;

interface PresetsProps {
  onSelect: (preset: Preset) => void;
  lang?: LangCode;
}

export function Presets({ onSelect, lang = 'es' }: PresetsProps) {
  const allPresets = getLocalizedPresets(lang);
  const [page, setPage] = useState(0);

  if (allPresets.length === 0) return null;

  const totalPages = Math.ceil(allPresets.length / PER_PAGE);
  const visible = allPresets.slice(page * PER_PAGE, (page + 1) * PER_PAGE);

  return (
    <div>
      <span className="neo-label">{getTranslations(lang).presetsLabel}</span>
      <div className="flex flex-wrap gap-2">
        {visible.map((preset) => (
          <button
            key={preset.id}
            type="button"
            onClick={() => onSelect(preset)}
            className="neo-btn-ghost px-3 py-2 text-sm flex items-center gap-2"
          >
            <span>💡</span>
            <span>{preset.title}</span>
          </button>
        ))}
      </div>
      {totalPages > 1 && (
        <div className="flex items-center gap-2 mt-2">
          <button
            type="button"
            disabled={page === 0}
            onClick={() => setPage((p) => p - 1)}
            className="neo-btn-ghost px-2 py-1 text-xs disabled:opacity-40"
          >
            ←
          </button>
          <span className="text-xs text-[var(--muted)]">
            {page + 1} / {totalPages}
          </span>
          <button
            type="button"
            disabled={page === totalPages - 1}
            onClick={() => setPage((p) => p + 1)}
            className="neo-btn-ghost px-2 py-1 text-xs disabled:opacity-40"
          >
            →
          </button>
        </div>
      )}
    </div>
  );
}

