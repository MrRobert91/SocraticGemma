'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AgeGroup, Stimulus, CreateSessionRequest, PRESETS, Preset } from '@/lib/types';
import { AgeSelector } from '@/components/setup/AgeSelector';
import { StimulusForm } from '@/components/setup/StimulusForm';
import { Presets } from '@/components/setup/Presets';
import { useSession } from '@/hooks/useSession';

export default function HomePage() {
  const router = useRouter();
  const { createSession, loading, error } = useSession();

  const [ageGroup, setAgeGroup] = useState<AgeGroup>('9-12');
  const [stimulus, setStimulus] = useState<Stimulus>({
    type: 'question',
    content: '',
    title: '',
  });
  const [ragEnabled, setRagEnabled] = useState(true);
  const [thinkingMode, setThinkingMode] = useState(true);
  const [language, setLanguage] = useState('es');
  const [totalTurns, setTotalTurns] = useState(10);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handlePresetSelect = (preset: Preset) => {
    setAgeGroup(preset.ageGroup);
    setStimulus(preset.stimulus);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stimulus.content.trim()) {
      alert('Por favor, introduce un estímulo o pregunta');
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
          <nav className="flex gap-2" aria-label="Navegación principal">
            <a href="/compare"       className="neo-btn-ghost px-3 py-1.5 text-sm">Comparar</a>
            <a href="/conversations" className="neo-btn-ghost px-3 py-1.5 text-sm">Conversaciones</a>
          </nav>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-12">
        {/* ─── Hero ──────────────────────────────────────────── */}
        <div className="mb-10 animate-fade-up">
          <h1 className="text-4xl md:text-5xl font-black text-[var(--text)] leading-tight mb-4">
            La IA que pregunta<br />en lugar de responder.
          </h1>
          <p className="text-lg text-[var(--muted)] max-w-2xl">
            SocraticGemma usa el método socrático para guiar a niños y adolescentes
            en la exploración de ideas filosóficas a través del diálogo.
          </p>
        </div>

        {/* ─── Form ──────────────────────────────────────────── */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Age selector */}
          <section className="neo-card p-6 animate-fade-up">
            <AgeSelector value={ageGroup} onChange={setAgeGroup} />
          </section>

          {/* Stimulus form */}
          <section className="neo-card p-6 animate-fade-up">
            <h2 className="neo-label">💬 Tu pregunta o escenario</h2>
            <StimulusForm stimulus={stimulus} onChange={setStimulus} />
          </section>

          {/* Presets */}
          <section className="neo-card p-6 animate-fade-up">
            <Presets selectedAge={ageGroup} onSelect={handlePresetSelect} />
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
                ⚙️ Opciones avanzadas
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
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="neo-label" htmlFor="lang-select">Idioma</label>
                    <select
                      id="lang-select"
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                      className="neo-select px-4 py-2.5"
                    >
                      <option value="es">Español</option>
                      <option value="en">English</option>
                      <option value="ca">Català</option>
                      <option value="gl">Galego</option>
                    </select>
                  </div>
                </div>

                <div className="flex flex-wrap gap-5">
                  <label className="flex items-center gap-2 cursor-pointer font-semibold text-[var(--text)]">
                    <input
                      type="checkbox"
                      checked={ragEnabled}
                      onChange={(e) => setRagEnabled(e.target.checked)}
                      className="w-4 h-4 rounded border-2 border-black"
                      style={{ accentColor: 'var(--accent-dark)' }}
                    />
                    📚 RAG habilitado
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer font-semibold text-[var(--text)]">
                    <input
                      type="checkbox"
                      checked={thinkingMode}
                      onChange={(e) => setThinkingMode(e.target.checked)}
                      className="w-4 h-4 rounded border-2 border-black"
                      style={{ accentColor: 'var(--accent-dark)' }}
                    />
                    🧠 Mostrar razonamiento
                  </label>
                </div>

                <div>
                  <label className="neo-label">
                    💬 Duración:{' '}
                    <span className="font-black" style={{ color: 'var(--accent-dark)' }}>
                      {totalTurns} turnos
                    </span>
                  </label>
                  <input
                    type="range"
                    min={5}
                    max={50}
                    step={5}
                    value={totalTurns}
                    onChange={(e) => setTotalTurns(Number(e.target.value))}
                    className="w-full h-2 cursor-pointer"
                    style={{ accentColor: 'var(--accent-dark)' }}
                    aria-label={`Duración de la conversación: ${totalTurns} turnos`}
                  />
                  <div className="flex justify-between text-xs font-bold text-[var(--muted)] mt-1">
                    <span>5</span>
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
                Creando sesión...
              </>
            ) : (
              '🚀 Iniciar diálogo socrático'
            )}
          </button>
        </form>
      </main>

      <footer className="max-w-4xl mx-auto px-4 py-8 mt-8 border-t-2 border-[var(--border)] text-center text-sm text-[var(--muted)]">
        SocraticGemma usa Google Gemma 2 para generar preguntas socráticas adaptadas a cada edad.
      </footer>
    </div>
  );
}

