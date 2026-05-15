'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { SessionResponse, EvalSummary, QuestionType, QUESTION_TYPE_LABELS } from '@/lib/types';
import { useSession } from '@/hooks/useSession';
import { useEval } from '@/hooks/useEval';
import { RadarChart } from '@/components/eval/RadarChart';
import { TurnScoreList } from '@/components/eval/TurnScoreList';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api/backend';

const NEO_QTAG: Record<QuestionType, string> = {
  conceptual:    'bg-violet-200 text-violet-900',
  assumption:    'bg-amber-200  text-amber-900',
  evidence:      'bg-sky-200    text-sky-900',
  perspective:   'bg-emerald-200 text-emerald-900',
  implication:   'bg-rose-200   text-rose-900',
  metacognitive: 'bg-indigo-200 text-indigo-900',
  opening:       'bg-teal-200   text-teal-900',
  statement:     'bg-gray-200   text-gray-900',
};

export default function EvalPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.id as string;

  const { getSession } = useSession();
  const { getEval } = useEval();

  const [session, setSession] = useState<SessionResponse | null>(null);
  const [evalSummary, setEvalSummary] = useState<EvalSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState('Evaluando conversación...');
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'turns'>('overview');

  useEffect(() => {
    async function fetchData() {
      try {
        // Step 1: run batch evaluation first
        setLoadingMessage('Evaluando conversación...');
        await fetch(`${API_BASE}/sessions/${sessionId}/batch-evaluate`, { method: 'POST', credentials: 'include' });

        // Step 2: load session + summary (batch-evaluate may have updated scores)
        setLoadingMessage('Cargando resultados...');
        const [sessionData, evalData] = await Promise.all([
          getSession(sessionId),
          getEval(sessionId),
        ]);
        setSession(sessionData);
        setEvalSummary(evalData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [sessionId, getSession, getEval]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <div className="neo-card p-8 text-center">
          <div className="animate-spin h-12 w-12 border-4 border-[var(--accent)] border-t-transparent rounded-full mx-auto mb-4" />
          <p className="font-bold text-[var(--text)]">{loadingMessage}</p>
        </div>
      </div>
    );
  }

  if (error || !session || !evalSummary) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <div className="neo-card bg-rose-100 p-8 text-center text-rose-800 max-w-sm">
          <p className="font-bold mb-4">{error || 'No se pudo cargar la evaluación'}</p>
          <button onClick={() => router.push('/')} className="neo-btn px-4 py-2">
            Volver al inicio
          </button>
        </div>
      </div>
    );
  }

  const qTypeEntries = Object.entries(evalSummary.question_type_distribution) as [QuestionType, number][];
  const totalQuestions = qTypeEntries.reduce((sum, [, count]) => sum + count, 0);

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
          <div>
            <h1 className="font-black text-[var(--text)]">Panel de Evaluación</h1>
            <p className="text-xs font-semibold text-[var(--muted)]">
              {session.age_group} años • {session.stimulus.title || 'Sesión'}
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('overview')}
            className={activeTab === 'overview' ? 'neo-toggle-on px-4 py-2' : 'neo-toggle-off px-4 py-2'}
          >
            📈 Resumen
          </button>
          <button
            onClick={() => setActiveTab('turns')}
            className={activeTab === 'turns' ? 'neo-toggle-on px-4 py-2' : 'neo-toggle-off px-4 py-2'}
          >
            💬 Turnos
          </button>
        </div>

        {activeTab === 'overview' ? (
          <div className="space-y-6">
            {/* Stats cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Turnos', val: evalSummary.turn_count, raw: true },
                { label: 'Socratismo', val: evalSummary.avg_scores.socratism },
                { label: 'Ajuste edad', val: evalSummary.avg_scores.age_fit },
                { label: 'Total', val: evalSummary.avg_scores.overall },
              ].map(({ label, val, raw }) => {
                const num = typeof val === 'number' ? val : 0;
                const color = raw ? 'text-[var(--text)]'
                  : num >= 4 ? 'text-emerald-600' : num >= 3 ? 'text-amber-600' : 'text-rose-600';
                return (
                  <div key={label} className="neo-card p-4 animate-scale-in">
                    <p className="neo-label mb-2">{label}</p>
                    <p className={`text-2xl font-black ${color}`}>
                      {raw ? val : num.toFixed(1)}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Radar chart and distribution */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="neo-card p-6">
                <h3 className="text-lg font-black text-[var(--text)] mb-4">
                  🎯 Puntuaciones promedio
                </h3>
                <RadarChart scores={evalSummary.avg_scores} />
              </div>

              <div className="neo-card p-6">
                <h3 className="text-lg font-black text-[var(--text)] mb-4">
                  📊 Distribución de tipos de preguntas
                </h3>
                <div className="space-y-3">
                  {qTypeEntries.map(([type, count]) => (
                    <div key={type} className="flex items-center gap-3">
                      <span className={`neo-tag text-xs px-2 py-0.5 shrink-0 ${NEO_QTAG[type] ?? 'bg-gray-200 text-gray-900'}`}>
                        {QUESTION_TYPE_LABELS[type]}
                      </span>
                      <div className="flex-1 bg-[var(--bg)] border-2 border-[var(--border)] rounded-none h-4 overflow-hidden">
                        <div
                          className="h-full bg-[var(--accent)] transition-all"
                          style={{ width: `${(count / totalQuestions) * 100}%` }}
                        />
                      </div>
                      <span className="text-sm font-bold text-[var(--muted)] w-6 text-right">
                        {count}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Forbidden behaviors */}
            {Object.values(evalSummary.forbidden_behaviors_by_turn).some((arr) => arr.length > 0) && (
              <div className="neo-card p-6 bg-rose-50 dark:bg-rose-950/20">
                <h3 className="text-lg font-black text-rose-700 dark:text-rose-300 mb-4">
                  ⚠️ Comportamientos detectados
                </h3>
                <div className="space-y-3">
                  {Object.entries(evalSummary.forbidden_behaviors_by_turn)
                    .filter(([, behaviors]) => behaviors.length > 0)
                    .map(([turn, behaviors], idx) => (
                      <div key={idx} className="flex gap-3">
                        <span className="text-sm font-bold text-[var(--muted)] w-20 shrink-0">
                          Turno {parseInt(turn) + 1}:
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {behaviors.map((behavior, bIdx) => (
                            <span key={bIdx} className="neo-tag bg-rose-100 text-rose-800 text-xs px-2 py-0.5">
                              {behavior}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="neo-card p-6">
            <h3 className="text-lg font-black text-[var(--text)] mb-4">
              💬 Puntuaciones por turno
            </h3>
            <TurnScoreList turns={session.turns} />
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-4 mt-8">
          <button
            onClick={() => router.push(`/session/${sessionId}`)}
            className="flex-1 neo-btn-ghost py-3 px-6"
          >
            ↩️ Volver al diálogo
          </button>
          <button
            onClick={() => router.push('/')}
            className="flex-1 neo-btn py-3 px-6"
          >
            🏠 Nueva sesión
          </button>
        </div>
      </main>
    </div>
  );
}
