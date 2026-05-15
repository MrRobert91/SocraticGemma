'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AgeGroup, Stimulus, CreateSessionRequest, Preset } from '@/lib/types';
import { AgeSelector } from '@/components/setup/AgeSelector';
import { StimulusForm } from '@/components/setup/StimulusForm';
import { Presets } from '@/components/setup/Presets';
import { useSession } from '@/hooks/useSession';
import { useAuth } from '@/context/AuthContext';
import { getTranslations, LangCode } from '@/lib/i18n';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? '/api/backend';

const LANGUAGE_LABELS: Record<string, string> = {
  es: 'ES',
  en: 'EN',
};

export default function HomePage() {
  const router = useRouter();
  const { createSession, loading, error } = useSession();
  const { user, loading: authLoading, logout } = useAuth();

  const [ageGroup, setAgeGroup] = useState<AgeGroup>('9-12');
  const [stimulus, setStimulus] = useState<Stimulus>({
    type: 'question',
    content: '',
    title: '',
  });
  const [ragEnabled, setRagEnabled] = useState(true);
  const [thinkingMode, setThinkingMode] = useState(true);
  const [language, setLanguage] = useState('es');
  const [totalTurns, setTotalTurns] = useState(5);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const t = getTranslations(language as LangCode);

  // Initialize language from user preference
  useEffect(() => {
    if (user?.preferred_language) setLanguage(user.preferred_language);
  }, [user?.preferred_language]);

  const handleLanguageChange = (lang: string) => {
    setLanguage(lang);
    if (user) {
      fetch(`${API_BASE}/auth/preferences`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ preferred_language: lang }),
      }).catch(console.error);
    }
  };

  const handlePresetSelect = (preset: Preset) => {
    setAgeGroup(preset.ageGroup);
    setStimulus(preset.stimulus);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stimulus.content.trim()) {
      alert(t.errorStimulusRequired);
      return;
    }
    try {
      const data: CreateSessionRequest = {
        age_group: ageGroup,
        stimulus,
        rag_enabled: ragEnabled,
        thinking_mode: thinkingMode,
        language,
        total_turns: totalTurns,
      };
      const sessionId = await createSession(data);
      router.push(`/session/${sessionId}`);
    } catch (err) {
      console.error('Failed to create session:', err);
    }
  };

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      {/* ─── Header ─────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-10 bg-[var(--bg-card)] border-b-2 border-[var(--border)]"
        style={{ boxShadow: '0 4px 0 0 var(--border)' }}
      >
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl" aria-hidden="true">🤔</span>
            <span className="text-xl font-black tracking-tight text-[var(--text)]">
              SocraticGemma
            </span>
          </div>
          <nav className="flex items-center gap-2" aria-label="Navegación principal">
            {/* Language selector — always visible */}
            <select
              value={language}
              onChange={(e) => handleLanguageChange(e.target.value)}
              className="neo-select px-2 py-1 text-xs"
              aria-label="Idioma"
            >
              {Object.entries(LANGUAGE_LABELS).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
            {!authLoading && (
              user ? (
                <>
                  <a href="/conversations" className="neo-btn-ghost px-3 py-1.5 text-sm">{t.navConversations}</a>
                  <span className="hidden sm:block text-xs text-[var(--muted)] font-semibold truncate max-w-[140px]">
                    {user.email}
                  </span>
                  <button
                    onClick={() => logout()}
                    className="neo-btn-ghost px-3 py-1.5 text-sm"
                  >
                    {t.navLogout}
                  </button>
                </>
              ) : (
                <>
                  <a href="/login" className="neo-btn-ghost px-3 py-1.5 text-sm">{t.navLogin}</a>
                  <a href="/register" className="neo-btn px-3 py-1.5 text-sm">{t.navRegister}</a>
                </>
              )
            )}
          </nav>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-12">
        {/* ─── Hero ──────────────────────────────────────────── */}
        <div className="mb-10 animate-fade-up">
          <h1 className="text-4xl md:text-5xl font-black text-[var(--text)] leading-tight mb-4">
            {t.heroTitleLine1}<br />{t.heroTitleLine2}
          </h1>
          <p className="text-lg text-[var(--muted)] max-w-2xl">
            {t.heroSubtitle}
          </p>
        </div>

        {/* ─── Form ──────────────────────────────────────────── */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Age selector */}
          <section className="neo-card p-6 animate-fade-up">
            <AgeSelector value={ageGroup} onChange={setAgeGroup} lang={language as LangCode} />
          </section>

          {/* Stimulus form */}
          <section className="neo-card p-6 animate-fade-up">
            <h2 className="neo-label">{t.stimulusSectionHeader}</h2>
            <StimulusForm stimulus={stimulus} onChange={setStimulus} lang={language as LangCode} />
          </section>

          {/* Presets */}
          <section className="neo-card p-6 animate-fade-up">
            <Presets selectedAge={ageGroup} onSelect={handlePresetSelect} lang={language as LangCode} />
          </section>

          {/* Advanced options */}
          <section className="neo-card animate-fade-up">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="w-full flex items-center justify-between px-6 py-4 text-left"
              aria-expanded={showAdvanced}
            >
              <span className="font-black text-sm uppercase tracking-widest text-[var(--text)]">
                {t.advancedOptionsLabel}
              </span>
              <span
                aria-hidden="true"
                className={`text-xs font-bold transition-transform duration-150 ${showAdvanced ? 'rotate-180' : ''}`}
              >
                ▼
              </span>
            </button>

            {showAdvanced && (
              <div className="px-6 pb-6 space-y-5 border-t-2 border-[var(--border)] pt-5">
                <div className="flex flex-wrap gap-5">
                  <label className="flex items-center gap-2 cursor-pointer font-semibold text-[var(--text)]">
                    <input
                      type="checkbox"
                      checked={ragEnabled}
                      onChange={(e) => setRagEnabled(e.target.checked)}
                      className="w-4 h-4 rounded border-2 border-black"
                      style={{ accentColor: 'var(--accent-dark)' }}
                    />
                    {t.ragLabel}
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer font-semibold text-[var(--text)]">
                    <input
                      type="checkbox"
                      checked={thinkingMode}
                      onChange={(e) => setThinkingMode(e.target.checked)}
                      className="w-4 h-4 rounded border-2 border-black"
                      style={{ accentColor: 'var(--accent-dark)' }}
                    />
                    {t.thinkingLabel}
                  </label>
                </div>

                <div>
                  <label className="neo-label">
                    {t.durationLabel}{' '}
                    <span className="font-black" style={{ color: 'var(--accent-dark)' }}>
                      {totalTurns} {t.durationUnit}
                    </span>
                  </label>
                  <input
                    type="range"
                    min={1}
                    max={50}
                    step={1}
                    value={totalTurns}
                    onChange={(e) => setTotalTurns(Number(e.target.value))}
                    className="w-full h-2 cursor-pointer"
                    style={{ accentColor: 'var(--accent-dark)' }}
                    aria-label={`${t.durationLabel} ${totalTurns} ${t.durationUnit}`}
                  />
                  <div className="flex justify-between text-xs font-bold text-[var(--muted)] mt-1">
                    <span>1</span>
                    <span>50</span>
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* Error */}
          {error && (
            <div className="neo-card bg-rose-100 p-4 font-semibold text-rose-800 animate-fade-up">
              ⚠️ {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="neo-btn w-full py-4 px-6 text-lg animate-fade-up"
          >
            {loading ? (
              <>
                <svg
                  className="animate-spin h-5 w-5 flex-shrink-0"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
                >
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                {t.submitLoading}
              </>
            ) : (
              t.submitLabel
            )}
          </button>
        </form>
      </main>

      <footer className="max-w-4xl mx-auto px-4 py-8 mt-8 border-t-2 border-[var(--border)] text-center text-sm text-[var(--muted)]">
        {t.footer}
      </footer>
    </div>
  );
}

