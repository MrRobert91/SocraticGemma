'use client';

import { AgeGroup } from '@/lib/types';

interface AgeSelectorProps {
  value: AgeGroup;
  onChange: (age: AgeGroup) => void;
}

export function AgeSelector({ value, onChange }: AgeSelectorProps) {
  const ageGroups: { value: AgeGroup; label: string; icon: string }[] = [
    { value: '6-8',   label: '6–8 años',   icon: '🌱' },
    { value: '9-12',  label: '9–12 años',  icon: '🌿' },
    { value: '13-16', label: '13–16 años', icon: '🌳' },
    { value: 'adult', label: 'Adultos',    icon: '🧠' },
  ];

  return (
    <div>
      <span className="neo-label">Grupo de edad</span>
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
