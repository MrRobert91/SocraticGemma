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
    { value: 'story',    label: 'Historia',  icon: '📖' },
  ];

  return (
    <div className="space-y-4">
      <div>
        <span className="neo-label">Tipo de estímulo</span>
        <div className="flex gap-2 flex-wrap">
          {stimulusTypes.map((type) => (
            <button
              key={type.value}
              type="button"
              onClick={() => onChange({ ...stimulus, type: type.value as Stimulus['type'] })}
              className={`flex items-center gap-2 px-4 py-2 text-sm ${
                stimulus.type === type.value ? 'neo-toggle-on' : 'neo-toggle-off'
              }`}
            >
              <span>{type.icon}</span>
              <span>{type.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="neo-label" htmlFor="stimulus-title">
          Título{' '}
          <span className="font-normal normal-case tracking-normal text-[var(--muted)]">(opcional)</span>
        </label>
        <input
          id="stimulus-title"
          type="text"
          value={stimulus.title || ''}
          onChange={(e) => onChange({ ...stimulus, title: e.target.value })}
          placeholder="ej: La naturaleza de la amistad"
          className="neo-input px-4 py-2.5"
        />
      </div>

      <div>
        <label className="neo-label" htmlFor="stimulus-content">
          Contenido
        </label>
        <textarea
          id="stimulus-content"
          value={stimulus.content}
          onChange={(e) => onChange({ ...stimulus, content: e.target.value })}
          placeholder="Escribe tu pregunta filosófica o escenario..."
          rows={4}
          className="neo-input px-4 py-3 resize-none"
        />
      </div>
    </div>
  );
}
