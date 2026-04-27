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

  if (filteredPresets.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
        Sugerencias
      </label>
      <div className="flex flex-wrap gap-2">
        {filteredPresets.map((preset) => (
          <button
            key={preset.id}
            type="button"
            onClick={() => onSelect(preset)}
            className="
              px-3 py-2 rounded-lg border border-amber-200 dark:border-amber-700
              bg-amber-50/50 dark:bg-amber-900/20
              text-amber-800 dark:text-amber-200
              text-sm font-medium
              hover:bg-amber-100 dark:hover:bg-amber-900/40
              transition-all
              flex items-center gap-2
            "
          >
            <span>💡</span>
            <span className="hidden sm:inline">{preset.title}</span>
            <span className="sm:hidden">{preset.ageGroup}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
