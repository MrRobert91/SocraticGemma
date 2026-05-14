'use client';

import { useState, useEffect, useRef, useCallback, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ConversationDetail, ConversationTurn, QuestionType, QUESTION_TYPE_LABELS, QUESTION_TYPE_COLORS } from '@/lib/types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? '/api/backend';

function renderMarkdown(text: string): string {
  return text
    .replace(/^### (.+)$/gm, '<h3 class="text-lg font-semibold text-indigo-700 dark:text-indigo-300 mt-6 mb-2">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-xl font-bold text-indigo-800 dark:text-indigo-200 mt-8 mb-3 border-b border-indigo-200 dark:border-indigo-700 pb-1">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-2xl font-bold text-indigo-900 dark:text-indigo-100 mt-8 mb-4">$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-gray-900 dark:text-gray-100">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em class="italic">$1</em>')
    .replace(/^- (.+)$/gm, '<li class="ml-4 list-disc mb-1">$1</li>')
    .replace(/(<li[\s\S]+?<\/li>\n?)+/g, (m) => `<ul class="my-2 space-y-1">${m}</ul>`)
    .replace(/^---$/gm, '<hr class="my-6 border-indigo-200 dark:border-indigo-700" />')
    .replace(/^(?!<[a-z]|\s*$)(.+)$/gm, '<p class="mb-3 leading-relaxed text-gray-700 dark:text-gray-300">$1</p>')
    .replace(/^\s*$/gm, '');
}

const AGE_LABELS: Record<string, string> = {
  '6-8': '6–8 años',
  '9-12': '9–12 años',
  '13-16': '13–16 años',
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
              👤 Usuario
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
  const router = useRouter();
  const [conv, setConv] = useState<ConversationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reportContent, setReportContent] = useState<string | null>(null);
  const reportRef = useRef<HTMLDivElement>(null);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = useCallback(async () => {
    if (!confirm('¿Eliminar esta conversación? Esta acción no se puede deshacer.')) return;
    setDeleting(true);
    try {
      const res = await fetch(`${API_BASE}/conversations/${id}`, { method: 'DELETE' });
      if (!res.ok && res.status !== 404) throw new Error(`Error ${res.status}`);
      router.push('/conversations');
    } catch (e) {
      console.error('Delete failed', e);
      alert('No se pudo eliminar la conversación. Inténtalo de nuevo.');
      setDeleting(false);
    }
  }, [id, router]);

  const handleDownloadPdf = useCallback(() => {
    if (!reportContent) return;
    const reportHtml = renderMarkdown(reportContent);
    const w = window.open('', '_blank', 'width=900,height=700');
    if (!w) {
      alert('Tu navegador bloqueó la ventana emergente. Permite ventanas emergentes para este sitio e inténtalo de nuevo.');
      return;
    }
    w.document.write(`<!DOCTYPE html><html lang="es">
<head>
  <meta charset="utf-8">
  <title>Perfil Filosófico</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Georgia, serif; max-width: 780px; margin: 40px auto; padding: 0 32px 60px; color: #111827; line-height: 1.75; }
    h1 { font-size: 1.6rem; color: #1e1b4b; border-bottom: 2px solid #4338ca; padding-bottom: 8px; margin: 2rem 0 1rem; }
    h2 { font-size: 1.25rem; color: #3730a3; border-bottom: 1px solid #c7d2fe; padding-bottom: 4px; margin: 2rem 0 0.75rem; }
    h3 { font-size: 1.05rem; color: #4338ca; margin: 1.5rem 0 0.5rem; }
    p { margin-bottom: 0.9rem; }
    ul { padding-left: 1.5rem; margin-bottom: 0.9rem; }
    li { margin-bottom: 0.3rem; }
    strong { font-weight: 700; }
    em { font-style: italic; }
    hr { border: none; border-top: 1px solid #e0e7ff; margin: 1.5rem 0; }
    @media print { body { margin: 0; } }
  </style>
</head>
<body>${reportHtml}</body></html>`);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 300);
  }, [reportContent]);

  useEffect(() => {
    async function load() {
      try {
        const [convRes, reportRes] = await Promise.all([
          fetch(`${API_BASE}/conversations/${id}`),
          fetch(`${API_BASE}/sessions/${id}/report`),
        ]);
        if (!convRes.ok) throw new Error(`Error ${convRes.status}`);
        setConv(await convRes.json());
        if (reportRes.ok) {
          const rd = await reportRes.json();
          setReportContent(rd.content ?? null);
        }
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

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap gap-4 text-xs text-gray-500 dark:text-gray-400">
                  <span>🗓️ {formatDate(conv.created_at)}</span>
                  <span>💬 {conv.turns.length} {conv.turns.length === 1 ? 'turno' : 'turnos'}</span>
                  <span className={`font-medium ${
                    conv.model_size === 'accurate'
                      ? 'text-indigo-600 dark:text-indigo-400'
                      : 'text-amber-600 dark:text-amber-400'
                  }`}>
                    {conv.model_size === 'accurate' ? '🎯 Preciso' : '⚡ Rápido'}
                  </span>
                  <span>🔒 Modo lectura</span>
                </div>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="shrink-0 px-3 py-1.5 text-xs font-medium text-rose-600 dark:text-rose-400 border border-rose-300 dark:border-rose-700 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-900/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {deleting ? 'Eliminando…' : '🗑️ Eliminar'}
                </button>
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

            {/* Philosophical report */}
            {reportContent && (
              <div className="mt-10">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-indigo-800 dark:text-indigo-200 flex items-center gap-2">
                    🗺️ Perfil Filosófico
                  </h3>
                  <button
                    onClick={handleDownloadPdf}
                    className="px-4 py-2 bg-indigo-500 text-white text-sm font-medium rounded-lg hover:bg-indigo-600 transition-colors"
                  >
                    🖨️ Imprimir / PDF
                  </button>
                </div>
                <div
                  ref={reportRef}
                  className="bg-white dark:bg-gray-900 rounded-xl border border-indigo-100 dark:border-indigo-900 p-6 shadow-sm"
                >
                  <div
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(reportContent) }}
                    className="text-gray-800 dark:text-gray-200"
                  />
                </div>
              </div>
            )}

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
