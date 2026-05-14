'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { ConversationDetail, ConversationTurn, QuestionType, QUESTION_TYPE_LABELS, QUESTION_TYPE_COLORS, getScoreColor, getScoreBgColor } from '@/lib/types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? '/api/backend';

const AGE_LABELS: Record<string, string> = {
  '6-8': '6–8 años',
  '9-12': '9–12 años',
  '13-16': '13–16 años',
};

const FORBIDDEN_LABELS: Record<string, string> = {
  overhelp: '🤝 Ayuda excesiva',
  lecture:  '📖 Explicación',
  correct:  '✏️ Corrección',
  leading:  '➡️ Pregunta dirigida',
  closed:   '🔒 Pregunta cerrada',
};

function formatDate(ts: number): string {
  return new Date(ts * 1000).toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function TurnBlock({ turn }: { turn: ConversationTurn }) {
  const [showThinking, setShowThinking] = useState(false);

  return (
    <div className="space-y-3">
      {/* Child message */}
      {turn.child_input && (
        <div className="flex justify-end">
          <div className="max-w-[80%] flex flex-col items-end gap-1">
            <span className="text-xs font-medium text-amber-600 dark:text-amber-400 px-2">
              👤 Niño
            </span>
            <div className="px-4 py-3 rounded-2xl rounded-br-md bg-amber-100 dark:bg-amber-900/50 text-amber-900 dark:text-amber-100">
              <p className="whitespace-pre-wrap leading-relaxed">{turn.child_input}</p>
            </div>
          </div>
        </div>
      )}

      {/* AI message */}
      <div className="flex justify-start">
        <div className="max-w-[80%] flex flex-col items-start gap-1">
          <span className="text-xs font-medium text-sky-600 dark:text-sky-400 px-2">
            🤖 SocraticGemma
          </span>
          <div className="px-4 py-3 rounded-2xl rounded-bl-md bg-sky-100 dark:bg-sky-900/50 text-sky-900 dark:text-sky-100">
            <p className="whitespace-pre-wrap leading-relaxed">{turn.content}</p>
          </div>

          {/* Metadata row */}
          <div className="flex flex-wrap items-center gap-2 px-1 mt-0.5">
            {/* Question type tag */}
            {turn.question_type && (
              <span
                className={`inline-flex items-center rounded-full border font-medium text-xs px-2 py-0.5 ${
                  QUESTION_TYPE_COLORS[turn.question_type as QuestionType] ?? 'bg-gray-100 text-gray-700'
                }`}
              >
                {QUESTION_TYPE_LABELS[turn.question_type as QuestionType] ?? turn.question_type}
              </span>
            )}

            {/* Scores */}
            {turn.eval_scores && (
              <div className="flex flex-wrap gap-1">
                {(
                  ['socratism', 'age_fit', 'builds_on', 'openness', 'advancement'] as const
                ).map((key) => {
                  const val = turn.eval_scores[key];
                  const labels: Record<string, string> = {
                    socratism: 'Socrático',
                    age_fit: 'Edad',
                    builds_on: 'Hilo',
                    openness: 'Abierta',
                    advancement: 'Avance',
                  };
                  return (
                    <div
                      key={key}
                      className={`inline-flex flex-col items-center px-2 py-1 rounded-lg ${getScoreBgColor(val)}`}
                    >
                      <span className={`text-sm font-bold leading-tight ${getScoreColor(val)}`}>
                        {val?.toFixed(1)}
                      </span>
                      <span className="text-[10px] text-gray-500 dark:text-gray-400 leading-tight mt-0.5">
                        {labels[key]}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Forbidden behaviours */}
            {turn.forbidden_behaviors_detected?.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {turn.forbidden_behaviors_detected.map((b) => (
                  <span
                    key={b}
                    className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400"
                  >
                    {FORBIDDEN_LABELS[b] ?? b}
                  </span>
                ))}
              </div>
            )}

            {/* Thinking trace toggle */}
            {turn.thinking_trace && (
              <button
                onClick={() => setShowThinking((v) => !v)}
                className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 underline"
              >
                {showThinking ? 'Ocultar razonamiento' : 'Ver razonamiento'}
              </button>
            )}
          </div>

          {/* Thinking trace */}
          {showThinking && turn.thinking_trace && (
            <div className="mt-1 px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs text-gray-600 dark:text-gray-300 whitespace-pre-wrap max-h-48 overflow-y-auto font-mono">
              {turn.thinking_trace}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ConversationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [conv, setConv] = useState<ConversationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`${API_BASE}/conversations/${id}`);
        if (!res.ok) throw new Error(`Error ${res.status}`);
        setConv(await res.json());
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error desconocido');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="border-b border-amber-200 dark:border-amber-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-3">
              <span className="text-3xl">🤔</span>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">SocraticGemma</h1>
            </Link>
          </div>
          <nav className="flex gap-4">
            <Link
              href="/"
              className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-amber-600 dark:hover:text-amber-400"
            >
              Inicio
            </Link>
            <Link
              href="/conversations"
              className="text-sm font-medium text-amber-600 dark:text-amber-400 hover:text-amber-700"
            >
              ← Conversaciones
            </Link>
          </nav>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {loading && (
          <div className="space-y-4">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-2/3 animate-pulse" />
            <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded w-1/3 animate-pulse" />
            <div className="mt-8 space-y-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-24 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
              ))}
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 dark:bg-rose-900/20 dark:border-rose-800 p-6 text-center text-rose-700 dark:text-rose-400">
            <p className="font-semibold">No se pudo cargar la conversación</p>
            <p className="text-sm mt-1">{error}</p>
          </div>
        )}

        {conv && (
          <>
            {/* Conversation header */}
            <div className="mb-8 p-5 rounded-xl border border-amber-200 dark:border-amber-800 bg-white dark:bg-gray-900 shadow-sm">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    {conv.stimulus.title || conv.stimulus.content}
                  </h2>
                  {conv.stimulus.title && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {conv.stimulus.content}
                    </p>
                  )}
                </div>
                <span className="shrink-0 text-sm px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 font-medium">
                  {AGE_LABELS[conv.age_group] ?? conv.age_group}
                </span>
              </div>

              <div className="mt-4 flex flex-wrap gap-4 text-xs text-gray-500 dark:text-gray-400">
                <span>🗓️ {formatDate(conv.created_at)}</span>
                <span>💬 {conv.turns.length} {conv.turns.length === 1 ? 'turno' : 'turnos'}</span>
                <span>⚡ {conv.model_size === 'fast' ? 'Rápido' : 'Preciso'}</span>
                <span>🔒 Modo lectura</span>
              </div>
            </div>

            {/* Turns */}
            <div className="space-y-8">
              {conv.turns.length === 0 ? (
                <p className="text-center text-gray-400 py-12">
                  Esta conversación no tiene turnos guardados.
                </p>
              ) : (
                conv.turns.map((turn) => (
                  <TurnBlock key={turn.id} turn={turn} />
                ))
              )}
            </div>

            {/* Footer */}
            <div className="mt-10 pt-6 border-t border-amber-200 dark:border-amber-800 flex justify-between items-center text-sm text-gray-400">
              <Link
                href="/conversations"
                className="hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
              >
                ← Volver a la lista
              </Link>
              <span>ID: {conv.id}</span>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
