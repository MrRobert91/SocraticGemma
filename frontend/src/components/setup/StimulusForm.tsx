'use client';

import { Stimulus } from '@/lib/types';
import { getTranslations, LangCode } from '@/lib/i18n';
import { Tooltip } from '@/components/Tooltip';

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
            <Tooltip key={value} content={m.tooltip} side="top">
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
            </Tooltip>
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
