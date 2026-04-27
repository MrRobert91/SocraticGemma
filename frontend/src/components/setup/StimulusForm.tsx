'use client';

import { Stimulus } from '@/lib/types';

interface StimulusFormProps {
  stimulus: Stimulus;
  onChange: (stimulus: Stimulus) => void;
}

export function StimulusForm({ stimulus, onChange }: StimulusFormProps) {
  const stimulusTypes = [
    { value: 'question', label: 'Pregunta', icon: '❓' },
    { value: 'scenario', label: 'Escenario', icon: '🎭' },
    { value: 'story', label: 'Historia', icon: '📖' },
  ];

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
          Tipo de estímulo
        </label>
        <div className="flex gap-2">
          {stimulusTypes.map((type) => (
            <button
              key={type.value}
              type="button"
              onClick={() => onChange({ ...stimulus, type: type.value as Stimulus['type'] })}
              className={`
                flex items-center gap-2 px-3 py-2 rounded-lg border transition-all text-sm
                ${
                  stimulus.type === type.value
                    ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/30 text-amber-900 dark:text-amber-100'
                    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:border-amber-300'
                }
              `}
            >
              <span>{type.icon}</span>
              <span>{type.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
          Título (opcional)
        </label>
        <input
          type="text"
          value={stimulus.title || ''}
          onChange={(e) => onChange({ ...stimulus, title: e.target.value })}
          placeholder="ej: La naturaleza de la amistad"
          className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-amber-500 focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
          Contenido
        </label>
        <textarea
          value={stimulus.content}
          onChange={(e) => onChange({ ...stimulus, content: e.target.value })}
          placeholder="Escribe tu pregunta filosófica o escenario..."
          rows={4}
          className="w-full px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none"
        />
      </div>
    </div>
  );
}
