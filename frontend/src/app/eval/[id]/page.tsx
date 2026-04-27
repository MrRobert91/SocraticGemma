'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { SessionResponse, EvalSummary, QuestionType, QUESTION_TYPE_LABELS, QUESTION_TYPE_COLORS } from '@/lib/types';
import { useSession } from '@/hooks/useSession';
import { useEval } from '@/hooks/useEval';
import { RadarChart } from '@/components/eval/RadarChart';
import { TurnScoreList } from '@/components/eval/TurnScoreList';

export default function EvalPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.id as string;

  const { getSession } = useSession();
  const { getEval } = useEval();

  const [session, setSession] = useState<SessionResponse | null>(null);
  const [evalSummary, setEvalSummary] = useState<EvalSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'turns'>('overview');

  useEffect(() => {
    async function fetchData() {
      try {
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-amber-50 to-orange-50 dark:from-gray-900 dark:to-gray-800">
        <div className="text-center">
          <div className="animate-spin h-12 w-12 border-4 border-amber-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Cargando evaluación...</p>
        </div>
      </div>
    );
  }

  if (error || !session || !evalSummary) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-amber-50 to-orange-50 dark:from-gray-900 dark:to-gray-800">
        <div className="text-center">
          <p className="text-rose-600 dark:text-rose-400 mb-4">
            {error || 'No se pudo cargar la evaluación'}
          </p>
          <button
            onClick={() => router.push('/')}
            className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600"
          >
            Volver al inicio
          </button>
        </div>
      </div>
    );
  }

  const qTypeEntries = Object.entries(evalSummary.question_type_distribution) as [QuestionType, number][];
  const totalQuestions = qTypeEntries.reduce((sum, [, count]) => sum + count, 0);

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
          <div>
            <h1 className="font-bold text-gray-900 dark:text-white">Panel de Evaluación</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">
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
            className={`
              px-4 py-2 rounded-lg font-medium transition-colors
              ${activeTab === 'overview'
                ? 'bg-amber-500 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-amber-100 dark:hover:bg-amber-900/30'
              }
            `}
          >
            📈 Resumen
          </button>
          <button
            onClick={() => setActiveTab('turns')}
            className={`
              px-4 py-2 rounded-lg font-medium transition-colors
              ${activeTab === 'turns'
                ? 'bg-amber-500 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-amber-100 dark:hover:bg-amber-900/30'
              }
            `}
          >
            💬 Turnos
          </button>
        </div>

        {activeTab === 'overview' ? (
          <div className="space-y-6">
            {/* Stats cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-amber-100 dark:border-amber-900">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Turnos</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {evalSummary.turn_count}
                </p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-amber-100 dark:border-amber-900">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Socratismo</p>
                <p className={`text-2xl font-bold ${
                  evalSummary.avg_scores.socratism >= 4 ? 'text-emerald-600' :
                  evalSummary.avg_scores.socratism >= 3 ? 'text-amber-600' : 'text-rose-600'
                }`}>
                  {evalSummary.avg_scores.socratism.toFixed(1)}
                </p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-amber-100 dark:border-amber-900">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Ajuste edad</p>
                <p className={`text-2xl font-bold ${
                  evalSummary.avg_scores.age_fit >= 4 ? 'text-emerald-600' :
                  evalSummary.avg_scores.age_fit >= 3 ? 'text-amber-600' : 'text-rose-600'
                }`}>
                  {evalSummary.avg_scores.age_fit.toFixed(1)}
                </p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-amber-100 dark:border-amber-900">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Total</p>
                <p className={`text-2xl font-bold ${
                  evalSummary.avg_scores.overall >= 4 ? 'text-emerald-600' :
                  evalSummary.avg_scores.overall >= 3 ? 'text-amber-600' : 'text-rose-600'
                }`}>
                  {evalSummary.avg_scores.overall.toFixed(1)}
                </p>
              </div>
            </div>

            {/* Radar chart and distribution */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border border-amber-100 dark:border-amber-900">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  🎯 Puntuaciones proedio
                </h3>
                <RadarChart scores={evalSummary.avg_scores} />
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border border-amber-100 dark:border-amber-900">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  📊 Distribución de tipos de preguntas
                </h3>
                <div className="space-y-3">
                  {qTypeEntries.map(([type, count]) => (
                    <div key={type} className="flex items-center gap-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${QUESTION_TYPE_COLORS[type]}`}>
                        {QUESTION_TYPE_LABELS[type]}
                      </span>
                      <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full h-4 overflow-hidden">
                        <div
                          className="h-full bg-amber-500 rounded-full transition-all"
                          style={{ width: `${(count / totalQuestions) * 100}%` }}
                        />
                      </div>
                      <span className="text-sm text-gray-600 dark:text-gray-400 w-8 text-right">
                        {count}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Forbidden behaviors */}
            {Object.values(evalSummary.forbidden_behaviors_by_turn).some((arr) => arr.length > 0) && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border border-rose-200 dark:border-rose-800">
                <h3 className="text-lg font-semibold text-rose-700 dark:text-rose-300 mb-4">
                  ⚠️ Comportamientos detectados
                </h3>
                <div className="space-y-3">
                  {Object.entries(evalSummary.forbidden_behaviors_by_turn)
                    .filter(([, behaviors]) => behaviors.length > 0)
                    .map(([turn, behaviors], idx) => (
                      <div key={idx} className="flex gap-3">
                        <span className="text-sm font-medium text-gray-500 dark:text-gray-400 w-20">
                          Turno {parseInt(turn) + 1}:
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {behaviors.map((behavior, bIdx) => (
                            <span
                              key={bIdx}
                              className="px-2 py-1 bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-300 rounded text-sm"
                            >
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
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border border-amber-100 dark:border-amber-900">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              💬 Puntuaciones por turno
            </h3>
            <TurnScoreList turns={session.turns} />
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-4 mt-8">
          <button
            onClick={() => router.push(`/session/${sessionId}`)}
            className="flex-1 py-3 px-6 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-semibold rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            ↩️ Volver al diálogo
          </button>
          <button
            onClick={() => router.push('/')}
            className="flex-1 py-3 px-6 bg-amber-500 text-white font-semibold rounded-xl hover:bg-amber-600 transition-colors"
          >
            🏠 Nueva sesión
          </button>
        </div>
      </main>
    </div>
  );
}
