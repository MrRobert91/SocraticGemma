'use client';

import { PRESETS, Preset, AgeGroup } from '@/lib/types';

interface PresetsProps {
  selectedAge?: AgeGroup;
  onSelect: (preset: Preset) => void;
}

export function Presets({ selectedAge, onSelect }: PresetsProps) {
  const filteredPresets = selectedAge
    ? PRESETS.filter((p) => p.ageGroup === selectedAge)
    : PRESETS;

  if (filteredPresets.length === 0) return null;

  return (
    <div>
      <span className="neo-label">Sugerencias rápidas</span>
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
