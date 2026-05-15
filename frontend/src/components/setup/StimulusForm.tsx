'use client';

import { Stimulus } from '@/lib/types';

interface StimulusFormProps {
  stimulus: Stimulus;
  onChange: (stimulus: Stimulus) => void;
}

const STIMULUS_META: Record<string, {
  icon: string;
  label: string;
  tooltip: string;
  titlePlaceholder: string;
  contentPlaceholder: string;
}> = {
  question: {
    icon: '❓',
    label: 'Pregunta',
    tooltip: 'Una pregunta abierta sin respuesta única que invita a reflexionar y argumentar. Ideal para explorar conceptos filosóficos.',
    titlePlaceholder: 'ej: ¿Qué es la justicia?',
    contentPlaceholder: '¿Es posible ser completamente justo con todo el mundo al mismo tiempo?',
  },
  scenario: {
    icon: '🎭',
    label: 'Escenario',
    tooltip: 'Una situación hipotética o dilema ético donde los participantes deben tomar decisiones y razonar sobre sus consecuencias.',
    titlePlaceholder: 'ej: El tranvía descontrolado',
    contentPlaceholder: 'Un tranvía sin frenos se dirige hacia cinco personas atadas a la vía. Puedes accionar una palanca para desviarlo, pero entonces atropellará a una persona. ¿Qué harías?',
  },
  story: {
    icon: '📖',
    label: 'Historia',
    tooltip: 'Un relato corto con personajes y situaciones que esconden preguntas filosóficas. Facilita la discusión a través de la narrativa.',
    titlePlaceholder: 'ej: El barco de Teseo',
    contentPlaceholder: 'Cada año, los atenienses sustituían las tablas podridas del barco de Teseo. Con el tiempo, no quedaba ninguna tabla original. ¿Sigue siendo el mismo barco?',
  },
};

export function StimulusForm({ stimulus, onChange }: StimulusFormProps) {
  const meta = STIMULUS_META[stimulus.type] ?? STIMULUS_META.question;

  return (
    <div className="space-y-4">
      <div>
        <span className="neo-label">Tipo de estímulo</span>
        <div className="flex gap-2 flex-wrap">
          {Object.entries(STIMULUS_META).map(([value, m]) => (
            <div key={value} className="relative group">
              <button
                type="button"
                onClick={() => onChange({ ...stimulus, type: value as Stimulus['type'] })}
                className={`flex items-center gap-2 px-4 py-2 text-sm ${
                  stimulus.type === value ? 'neo-toggle-on' : 'neo-toggle-off'
                }`}
              >
                <span>{m.icon}</span>
                <span>{m.label}</span>
              </button>
              {/* Tooltip */}
              <div
                role="tooltip"
                className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-20
                           w-56 px-3 py-2 text-xs font-medium leading-snug
                           bg-[var(--text)] text-[var(--bg)] border-2 border-[var(--border)]
                           opacity-0 group-hover:opacity-100 transition-opacity duration-150"
                style={{ borderRadius: '4px' }}
              >
                {m.tooltip}
                {/* Arrow */}
                <span
                  className="absolute top-full left-1/2 -translate-x-1/2 -mt-px
                             border-4 border-transparent border-t-[var(--text)]"
                />
              </div>
            </div>
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
          placeholder={meta.titlePlaceholder}
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
          placeholder={meta.contentPlaceholder}
          rows={4}
          className="neo-input px-4 py-3 resize-none"
        />
      </div>
    </div>
  );
}
