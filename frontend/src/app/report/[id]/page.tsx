'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useReport } from '@/hooks/useReport';

// Simple markdown-to-HTML renderer (no external lib needed for basic structure)
function renderMarkdown(text: string): string {
  return text
    // headings
    .replace(/^### (.+)$/gm, '<h3 class="text-lg font-black text-emerald-700 dark:text-emerald-400 mt-6 mb-2">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-xl font-black text-emerald-800 dark:text-emerald-300 mt-8 mb-3 border-b-2 border-black dark:border-white pb-1">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-2xl font-black text-emerald-900 dark:text-emerald-200 mt-8 mb-4">$1</h1>')
    // bold
    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-black">$1</strong>')
    // italic
    .replace(/\*(.+?)\*/g, '<em class="italic">$1</em>')
    // unordered list items
    .replace(/^- (.+)$/gm, '<li class="ml-4 list-disc mb-1">$1</li>')
    // wrap consecutive li in ul
    .replace(/(<li[\s\S]+?<\/li>\n?)+/g, (m) => `<ul class="my-2 space-y-1">${m}</ul>`)
    // horizontal rule
    .replace(/^---$/gm, '<hr class="my-6 border-2 border-black dark:border-white" />')
    // paragraph (lines that aren't already wrapped in a tag)
    .replace(/^(?!<[a-z]|\s*$)(.+)$/gm, '<p class="mb-3 leading-relaxed">$1</p>')
    // blank lines → spacing
    .replace(/^\s*$/gm, '');
}

export default function ReportPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.id as string;

  const { content, status, error, loadReport, generateReport } = useReport();
  const reportRef = useRef<HTMLDivElement>(null);

  // On mount: try to load existing report
  useEffect(() => {
    loadReport(sessionId);
  }, [sessionId, loadReport]);

  const handleDownloadPdf = useCallback(() => {
    if (!content) return;
    const reportHtml = renderMarkdown(content);
    const w = window.open('', '_blank', 'width=900,height=700');
    if (!w) {
      alert('Tu navegador bloqu\u00e9 la ventana emergente. Permite ventanas emergentes para este sitio e int\u00e9ntalo de nuevo.');
      return;
    }
    w.document.write(`<!DOCTYPE html><html lang="es">
<head>
  <meta charset="utf-8">
  <title>Perfil Filos\u00f3fico</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Georgia, serif; max-width: 780px; margin: 40px auto; padding: 0 32px 60px; color: #111827; line-height: 1.75; }
    h1 { font-size: 1.6rem; color: #065f46; border-bottom: 2px solid #059669; padding-bottom: 8px; margin: 2rem 0 1rem; }
    h2 { font-size: 1.25rem; color: #047857; border-bottom: 1px solid #6ee7b7; padding-bottom: 4px; margin: 2rem 0 0.75rem; }
    h3 { font-size: 1.05rem; color: #059669; margin: 1.5rem 0 0.5rem; }
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
  }, [content]);

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      {/* Header */}
      <header
        className="bg-[var(--bg-card)] border-b-2 border-[var(--border)] sticky top-0 z-10"
        style={{ boxShadow: '0 4px 0 0 var(--border)' }}
      >
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push(`/session/${sessionId}`)}
              className="neo-btn-ghost px-2 py-1 text-lg font-bold"
              aria-label="Volver"
            >
              ←
            </button>
            <span className="text-2xl" aria-hidden="true">🗺️</span>
            <h1 className="font-black text-[var(--text)]">Perfil Filosófico</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push(`/eval/${sessionId}`)}
              className="neo-btn-ghost px-3 py-1.5 text-sm"
            >
              📊 Evaluación técnica
            </button>
            {status === 'complete' && content && (
              <button onClick={handleDownloadPdf} className="neo-btn px-3 py-1.5 text-sm">
                🖨️ Imprimir / PDF
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Idle state: no report yet */}
        {status === 'idle' && (
          <div className="text-center py-20 animate-scale-in">
            <p className="text-6xl mb-6">🗺️</p>
            <h2 className="text-2xl font-black text-[var(--text)] mb-3">
              Tu mapa filosófico
            </h2>
            <p className="text-[var(--muted)] mb-8 max-w-md mx-auto">
              Genera un informe personalizado basado en tu conversación: qué corrientes filosóficas
              resuenan contigo, cuáles son tus puntos ciegos, y qué caminos explorar.
            </p>
            <button
              onClick={() => generateReport(sessionId)}
              className="neo-btn px-8 py-4 text-lg"
            >
              ✨ Generar informe filosófico
            </button>
          </div>
        )}

        {/* Loading / streaming state */}
        {(status === 'loading' || status === 'streaming') && (
          <div>
            {status === 'loading' && (
              <div className="text-center py-12">
                <div className="animate-spin h-12 w-12 border-4 border-[var(--accent)] border-t-transparent rounded-full mx-auto mb-4" />
                <p className="font-semibold text-[var(--muted)]">Analizando la conversación...</p>
              </div>
            )}
            {content && (
              <div className="neo-card p-8">
                <div
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
                  className="text-[var(--text)]"
                />
                <span className="inline-block h-4 w-2 bg-emerald-600 dark:bg-emerald-400 animate-pulse ml-1 align-middle" />
              </div>
            )}
          </div>
        )}

        {/* Error state */}
        {status === 'error' && (
          <div className="neo-card bg-rose-100 p-8 text-center text-rose-800">
            <p className="font-bold mb-4">{error}</p>
            <button onClick={() => generateReport(sessionId)} className="neo-btn px-6 py-3">
              Reintentar
            </button>
          </div>
        )}

        {/* Complete state */}
        {status === 'complete' && content && (
          <div className="animate-fade-up">
            <div ref={reportRef} className="neo-card p-8">
              <div
                dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
                className="text-[var(--text)]"
              />
            </div>

            <div className="mt-6 flex flex-wrap gap-3 justify-center">
              <button
                onClick={() => generateReport(sessionId)}
                className="neo-btn-ghost px-5 py-2 text-sm"
              >
                🔄 Regenerar informe
              </button>
              <button onClick={handleDownloadPdf} className="neo-btn px-5 py-2 text-sm">
                🖨️ Imprimir / PDF
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
