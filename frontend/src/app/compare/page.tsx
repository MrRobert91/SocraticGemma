'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AgeGroup, Stimulus, CreateSessionRequest, CompareResponse } from '@/lib/types';
import { AgeSelector } from '@/components/setup/AgeSelector';
import { StimulusForm } from '@/components/setup/StimulusForm';
import { ComparePanel } from '@/components/compare/ComparePanel';
import { ScoreDiff } from '@/components/compare/ScoreDiff';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

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
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="border-b border-amber-200 dark:border-amber-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-3">
          <button
            onClick={() => router.push('/')}
            className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          >
            ←
          </button>
          <span className="text-3xl">📊</span>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            Comparar respuestas
          </h1>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Form */}
        <form onSubmit={handleCompare} className="space-y-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border border-amber-100 dark:border-amber-900">
            <AgeSelector value={ageGroup} onChange={setAgeGroup} />
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border border-amber-100 dark:border-amber-900">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              💬 Pregunta o escenario a comparar
            </h3>
            <StimulusForm stimulus={stimulus} onChange={setStimulus} />
          </div>

          {error && (
            <div className="bg-rose-100 dark:bg-rose-900/50 border border-rose-200 dark:border-rose-800 rounded-lg p-4 text-rose-700 dark:text-rose-300">
              Error: {error}
            </div>
          )}

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
              transition-all
            `}
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
          <div className="space-y-8">
            <ComparePanel result={result} />

            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border border-amber-100 dark:border-amber-900">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
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
