'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AgeGroup, Stimulus, CreateSessionRequest, CompareResponse } from '@/lib/types';
import { AgeSelector } from '@/components/setup/AgeSelector';
import { StimulusForm } from '@/components/setup/StimulusForm';
import { ComparePanel } from '@/components/compare/ComparePanel';
import { ScoreDiff } from '@/components/compare/ScoreDiff';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api/backend';

export default function ComparePage() {
  const router = useRouter();

  const [ageGroup, setAgeGroup] = useState<AgeGroup>('9-12');
  const [stimulus, setStimulus] = useState<Stimulus>({
    type: 'question',
    content: '',
    title: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CompareResponse | null>(null);

  const handleCompare = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stimulus.content.trim()) {
      alert('Por favor, introduce un estímulo o pregunta');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data: CreateSessionRequest = {
        age_group: ageGroup,
        stimulus,
      };

      const response = await fetch(`${API_BASE}/compare`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`Error: ${response.statusText}`);
      }

      const compareResult = await response.json();
      setResult(compareResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      {/* Header */}
      <header
        className="bg-[var(--bg-card)] border-b-2 border-[var(--border)] sticky top-0 z-10"
        style={{ boxShadow: '0 4px 0 0 var(--border)' }}
      >
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => router.push('/')}
            className="neo-btn-ghost px-2 py-1 text-lg font-bold"
            aria-label="Volver"
          >
            ←
          </button>
          <span className="text-3xl" aria-hidden="true">📊</span>
          <h1 className="text-xl font-black text-[var(--text)]">
            Comparar respuestas
          </h1>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Form */}
        <form onSubmit={handleCompare} className="space-y-6 mb-8">
          <div className="neo-card p-6">
            <AgeSelector value={ageGroup} onChange={setAgeGroup} />
          </div>

          <div className="neo-card p-6">
            <h3 className="neo-label mb-4">💬 Pregunta o escenario a comparar</h3>
            <StimulusForm stimulus={stimulus} onChange={setStimulus} />
          </div>

          {error && (
            <div className="neo-card bg-rose-100 p-4 text-rose-800 font-semibold">
              Error: {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="neo-btn w-full py-4 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Comparando respuestas...
              </span>
            ) : (
              'Comparar respuestas'
            )}
          </button>
        </form>

        {/* Results */}
        {result && (
          <div className="space-y-8 animate-fade-up">
            <ComparePanel result={result} />

            <div className="neo-card p-6">
              <h3 className="text-lg font-black text-[var(--text)] mb-4">
                📈 Comparación de puntuaciones
              </h3>
              <ScoreDiff base={result.base_response.scores} p4c={result.p4c_response.scores} />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
