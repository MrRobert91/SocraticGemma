'use client';

import { Preset } from '@/lib/types';
import { getLocalizedPresets, getTranslations, LangCode } from '@/lib/i18n';

interface PresetsProps {
  onSelect: (preset: Preset) => void;
  lang?: LangCode;
}

export function Presets({ onSelect, lang = 'es' }: PresetsProps) {
  const allPresets = getLocalizedPresets(lang);

  if (allPresets.length === 0) return null;

  return (
    <div>
      <span className="neo-label">{getTranslations(lang).presetsLabel}</span>
      <div className="flex flex-wrap gap-2">
        {allPresets.map((preset) => (
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
    </div>
  );
}
