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
  const [modelSize, setModelSize] = useState<'fast' | 'accurate'>('accurate');
  const [ragEnabled, setRagEnabled] = useState(true);
  const [thinkingMode, setThinkingMode] = useState(true);
  const [language, setLanguage] = useState('es');
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
        model_size: modelSize,
        rag_enabled: ragEnabled,
        thinking_mode: thinkingMode,
        language,
      };

      const sessionId = await createSession(data);
      router.push(`/session/${sessionId}`);
    } catch (err) {
      console.error('Failed to create session:', err);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="border-b border-amber-200 dark:border-amber-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🤔</span>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              SocraticGemma
            </h1>
          </div>
          <nav className="flex gap-4">
            <a
              href="/compare"
              className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-amber-600 dark:hover:text-amber-400"
            >
              Comparar
            </a>
          </nav>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-12">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
            La IA que pregunta en lugar de responder.
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            SocraticGemma usa el método socrático para guiar a niños y adolescentes
            en la exploración de ideas filosóficas a través del diálogo.
          </p>
        </div>

        {/* Main Form */}
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Age Selector */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border border-amber-100 dark:border-amber-900">
            <AgeSelector value={ageGroup} onChange={setAgeGroup} />
          </div>

          {/* Stimulus Form */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border border-amber-100 dark:border-amber-900">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              💬 Tu pregunta o escenario
            </h3>
            <StimulusForm stimulus={stimulus} onChange={setStimulus} />
          </div>

          {/* Presets */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border border-amber-100 dark:border-amber-900">
            <Presets selectedAge={ageGroup} onSelect={handlePresetSelect} />
          </div>

          {/* Advanced Options */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border border-amber-100 dark:border-amber-900">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="w-full flex items-center justify-between text-left"
            >
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                ⚙️ Opciones avanzadas
              </h3>
              <span className={`transform transition-transform ${showAdvanced ? 'rotate-180' : ''}`}>
                ▼
              </span>
            </button>

            {showAdvanced && (
              <div className="mt-4 space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                      Tamaño del modelo
                    </label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setModelSize('fast')}
                        className={`
                          flex-1 px-4 py-2 rounded-lg border transition-all
                          ${modelSize === 'fast'
                            ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
                            : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'
                          }
                        `}
                      >
                        ⚡ Rápido
                      </button>
                      <button
                        type="button"
                        onClick={() => setModelSize('accurate')}
                        className={`
                          flex-1 px-4 py-2 rounded-lg border transition-all
                          ${modelSize === 'accurate'
                            ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
                            : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'
                          }
                        `}
                      >
                        🎯 Preciso
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                      Idioma
                    </label>
                    <select
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                      className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    >
                      <option value="es">Español</option>
                      <option value="en">English</option>
                      <option value="ca">Català</option>
                      <option value="gl">Galego</option>
                    </select>
                  </div>
                </div>

                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={ragEnabled}
                      onChange={(e) => setRagEnabled(e.target.checked)}
                      className="w-4 h-4 text-amber-500 rounded border-gray-300 focus:ring-amber-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-200">
                      📚 RAG habilitado
                    </span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={thinkingMode}
                      onChange={(e) => setThinkingMode(e.target.checked)}
                      className="w-4 h-4 text-amber-500 rounded border-gray-300 focus:ring-amber-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-200">
                      🧠 Mostrar proceso de razonamiento
                    </span>
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-rose-100 dark:bg-rose-900/50 border border-rose-200 dark:border-rose-800 rounded-lg p-4 text-rose-700 dark:text-rose-300">
              Error: {error}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className={`
              w-full py-4 px-6 rounded-xl text-lg font-semibold
              bg-gradient-to-r from-amber-500 to-orange-500
              text-white shadow-lg
              hover:from-amber-600 hover:to-orange-600
              disabled:from-gray-400 disabled:to-gray-500
              disabled:cursor-not-allowed
              transition-all transform hover:scale-[1.02] active:scale-[0.98]
            `}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Creando sesión...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                🚀 Iniciar diálogo socrático
              </span>
            )}
          </button>
        </form>
      </main>

      {/* Footer */}
      <footer className="max-w-4xl mx-auto px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
        <p>
          SocraticGemma usa Google Gemma 2 para generar preguntas socráticas adaptadas a cada edad.
        </p>
      </footer>
    </div>
  );
}
