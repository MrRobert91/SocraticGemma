'use client';

import { useState, useEffect, useRef, useCallback, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ConversationDetail, ConversationTurn, QuestionType, QUESTION_TYPE_LABELS } from '@/lib/types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? '/api/backend';

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
    <div className="space-y-3 animate-fade-up">
      {/* Child message */}
      {turn.child_input && (
        <div className="flex justify-end">
          <div className="max-w-[80%] flex flex-col items-end gap-1.5">
            <span className="text-xs font-black uppercase tracking-widest text-emerald-700 dark:text-emerald-400 px-1">
              👤 Usuario
            </span>
            <div className="neo-card bg-[var(--accent-bg)] px-4 py-3">
              <p className="whitespace-pre-wrap leading-relaxed text-[var(--text)]">{turn.child_input}</p>
            </div>
          </div>
        </div>
      )}

      {/* AI message */}
      <div className="flex justify-start">
        <div className="max-w-[80%] flex flex-col items-start gap-1.5">
          <span className="text-xs font-black uppercase tracking-widest text-[var(--text)] px-1">
            🤖 SocraticGemma
          </span>
          <div className="neo-card bg-[var(--bg-card)] px-4 py-3">
            <p className="whitespace-pre-wrap leading-relaxed text-[var(--text)]">{turn.content}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2 px-1 mt-0.5">
            {turn.question_type && (
              <span
                className={`neo-tag text-xs px-2 py-0.5 ${
                  NEO_QTAG[turn.question_type as QuestionType] ?? 'bg-gray-200 text-gray-900'
                }`}
              >
                {QUESTION_TYPE_LABELS[turn.question_type as QuestionType] ?? turn.question_type}
              </span>
            )}
            {turn.thinking_trace && (
              <button
                onClick={() => setShowThinking((v) => !v)}
                className="text-xs font-bold text-[var(--muted)] hover:text-[var(--text)] underline"
              >
                {showThinking ? 'Ocultar razonamiento' : 'Ver razonamiento'}
              </button>
            )}
          </div>

          {showThinking && turn.thinking_trace && (
            <div className="neo-card mt-1 px-3 py-2 bg-indigo-50 dark:bg-indigo-950/40 text-xs text-indigo-900 dark:text-indigo-200 whitespace-pre-wrap max-h-48 overflow-y-auto font-mono">
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
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      {/* Header */}
      <header
        className="bg-[var(--bg-card)] border-b-2 border-[var(--border)] sticky top-0 z-10"
        style={{ boxShadow: '0 4px 0 0 var(--border)' }}
      >
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <span className="text-3xl" aria-hidden="true">🤔</span>
            <span className="text-xl font-black tracking-tight text-[var(--text)]">SocraticGemma</span>
          </Link>
          <nav className="flex gap-2" aria-label="Navegación">
            <Link href="/"             className="neo-btn-ghost px-3 py-1.5 text-sm">Inicio</Link>
            <Link href="/conversations" className="neo-btn px-3 py-1.5 text-sm">← Conversaciones</Link>
          </nav>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {loading && (
          <div className="space-y-4">
            <div className="h-8 bg-[var(--muted)] opacity-20 rounded w-2/3 animate-pulse" />
            <div className="h-4 bg-[var(--muted)] opacity-10 rounded w-1/3 animate-pulse" />
            <div className="mt-8 space-y-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="neo-card h-24 animate-pulse" />
              ))}
            </div>
          </div>
        )}

        {error && (
          <div className="neo-card bg-rose-100 p-6 text-center text-rose-800">
            <p className="font-bold">No se pudo cargar la conversación</p>
            <p className="text-sm mt-1">{error}</p>
          </div>
        )}

        {conv && (
          <>
            {/* Conversation header card */}
            <div className="neo-card mb-8 p-5 animate-scale-in">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <h2 className="text-xl font-black text-[var(--text)]">
                    {conv.stimulus.title || conv.stimulus.content}
                  </h2>
                  {conv.stimulus.title && (
                  <p className="text-sm text-[var(--muted)] mt-1">{conv.stimulus.content}</p>
                )}
              </div>
              <span className="shrink-0 neo-tag bg-[var(--accent-bg)] text-emerald-900 dark:text-emerald-100 text-sm px-3 py-1">
                {AGE_LABELS[conv.age_group] ?? conv.age_group}
              </span>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-4 text-xs font-semibold text-[var(--muted)]">
                <span>🗓️ {formatDate(conv.created_at)}</span>
                <span>💬 {conv.turns.length} {conv.turns.length === 1 ? 'turno' : 'turnos'}</span>
                <span>🔒 Modo lectura</span>
              </div>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="neo-btn-danger shrink-0 px-3 py-1.5 text-xs"
              >
                {deleting ? 'Eliminando…' : '🗑️ Eliminar'}
              </button>
            </div>
          </div>
            {/* Turns */}
            <div className="space-y-8">
              {conv.turns.length === 0 ? (
                <p className="text-center text-[var(--muted)] py-12">
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
                  <h3 className="text-lg font-black text-[var(--text)] flex items-center gap-2">
                    🗺️ Perfil Filosófico
                  </h3>
                  <button
                    onClick={handleDownloadPdf}
                    className="neo-btn px-4 py-2 text-sm"
                  >
                    🖨️ Imprimir / PDF
                  </button>
                </div>
                <div ref={reportRef} className="neo-card p-6">
                  <div
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(reportContent) }}
                    className="text-[var(--text)]"
                  />
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="mt-10 pt-6 border-t-2 border-[var(--border)] flex justify-between items-center text-sm font-semibold text-[var(--muted)]">
              <Link href="/conversations" className="neo-btn-ghost px-3 py-1.5 text-sm">
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
