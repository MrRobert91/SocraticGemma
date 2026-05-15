'use client';

import { Stimulus } from '@/lib/types';
import { getTranslations, LangCode } from '@/lib/i18n';

interface StimulusFormProps {
  stimulus: Stimulus;
  onChange: (stimulus: Stimulus) => void;
  lang?: LangCode;
}

export function StimulusForm({ stimulus, onChange, lang = 'es' }: StimulusFormProps) {
  const t = getTranslations(lang);
  const STIMULUS_META = {
    question: t.stimulusQuestion,
    scenario: t.stimulusScenario,
    story: t.stimulusStory,
  };
  const meta = STIMULUS_META[stimulus.type as keyof typeof STIMULUS_META] ?? STIMULUS_META.question;

  return (
    <div className="space-y-4">
      <div>
        <span className="neo-label">{t.stimulusTypeLabel}</span>
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
          {t.stimulusTitleLabel}{' '}
          <span className="font-normal normal-case tracking-normal text-[var(--muted)]">{t.stimulusTitleOptional}</span>
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
          {t.stimulusContentLabel}
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
