'use client';

import { AgeGroup } from '@/lib/types';
import { getTranslations, LangCode } from '@/lib/i18n';

interface AgeSelectorProps {
  value: AgeGroup;
  onChange: (age: AgeGroup) => void;
  lang?: LangCode;
}

export function AgeSelector({ value, onChange, lang = 'es' }: AgeSelectorProps) {
  const t = getTranslations(lang);
  const ageGroups: { value: AgeGroup; label: string; icon: string }[] = [
    { value: '6-8',   label: t.age_6_8,   icon: '🌱' },
    { value: '9-12',  label: t.age_9_12,  icon: '🌿' },
    { value: '13-16', label: t.age_13_16, icon: '🌳' },
    { value: 'adult', label: t.age_adult, icon: '🧠' },
  ];

  return (
    <div>
      <span className="neo-label">{t.ageGroupLabel}</span>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {ageGroups.map((group) => (
          <button
            key={group.value}
            type="button"
            onClick={() => onChange(group.value)}
            className={`flex flex-col items-center gap-1.5 p-4 ${
              value === group.value ? 'neo-toggle-on' : 'neo-toggle-off'
            }`}
          >
            <span className="text-2xl">{group.icon}</span>
            <span className="text-sm">{group.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
