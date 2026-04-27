'use client';

import { AgeGroup } from '@/lib/types';

interface AgeSelectorProps {
  value: AgeGroup;
  onChange: (age: AgeGroup) => void;
}

export function AgeSelector({ value, onChange }: AgeSelectorProps) {
  const ageGroups: { value: AgeGroup; label: string; icon: string }[] = [
    { value: '6-8', label: '6-8 años', icon: '🌱' },
    { value: '9-12', label: '9-12 años', icon: '🌿' },
    { value: '13-16', label: '13-16 años', icon: '🌳' },
  ];

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
        Grupo de edad
      </label>
      <div className="grid grid-cols-3 gap-2">
        {ageGroups.map((group) => (
          <button
            key={group.value}
            type="button"
            onClick={() => onChange(group.value)}
            className={`
              flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-all
              ${
                value === group.value
                  ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/30 text-amber-900 dark:text-amber-100'
                  : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:border-amber-300 dark:hover:border-amber-600'
              }
            `}
          >
            <span className="text-xl">{group.icon}</span>
            <span className="text-sm font-medium">{group.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
