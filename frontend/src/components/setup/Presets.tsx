'use client';

import { Preset, AgeGroup } from '@/lib/types';
import { getLocalizedPresets, getTranslations, LangCode } from '@/lib/i18n';

interface PresetsProps {
  selectedAge?: AgeGroup;
  onSelect: (preset: Preset) => void;
  lang?: LangCode;
}

export function Presets({ selectedAge, onSelect, lang = 'es' }: PresetsProps) {
  const allPresets = getLocalizedPresets(lang);
  const filteredPresets = selectedAge
    ? allPresets.filter((p) => p.ageGroup === selectedAge)
    : allPresets;

  if (filteredPresets.length === 0) return null;

  return (
    <div>
      <span className="neo-label">{getTranslations(lang).presetsLabel}</span>
      <div className="flex flex-wrap gap-2">
        {filteredPresets.map((preset) => (
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
