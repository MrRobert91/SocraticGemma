'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useReport } from '@/hooks/useReport';

// Simple markdown-to-HTML renderer (no external lib needed for basic structure)
function renderMarkdown(text: string): string {
  return text
    // headings
    .replace(/^### (.+)$/gm, '<h3 class="text-lg font-semibold text-indigo-700 dark:text-indigo-300 mt-6 mb-2">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-xl font-bold text-indigo-800 dark:text-indigo-200 mt-8 mb-3 border-b border-indigo-200 dark:border-indigo-700 pb-1">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-2xl font-bold text-indigo-900 dark:text-indigo-100 mt-8 mb-4">$1</h1>')
    // bold
    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-gray-900 dark:text-gray-100">$1</strong>')
    // italic
    .replace(/\*(.+?)\*/g, '<em class="italic">$1</em>')
    // unordered list items
    .replace(/^- (.+)$/gm, '<li class="ml-4 list-disc mb-1">$1</li>')
    // wrap consecutive li in ul
    .replace(/(<li[\s\S]+?<\/li>\n?)+/g, (m) => `<ul class="my-2 space-y-1">${m}</ul>`)
    // horizontal rule
    .replace(/^---$/gm, '<hr class="my-6 border-indigo-200 dark:border-indigo-700" />')
    // paragraph (lines that aren't already wrapped in a tag)
    .replace(/^(?!<[a-z]|\s*$)(.+)$/gm, '<p class="mb-3 leading-relaxed text-gray-700 dark:text-gray-300">$1</p>')
    // blank lines → spacing
    .replace(/^\s*$/gm, '');
}

export default function ReportPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.id as string;

  const { content, status, error, loadReport, generateReport } = useReport();
  const reportRef = useRef<HTMLDivElement>(null);
  const [pdfLoading, setPdfLoading] = useState(false);

  // On mount: try to load existing report
  useEffect(() => {
    loadReport(sessionId);
  }, [sessionId, loadReport]);

  const handleDownloadPdf = useCallback(async () => {
    if (!reportRef.current || !content) return;
    setPdfLoading(true);
    try {
      // Dynamic import — html2pdf.js is browser-only (UMD module, need .default ?? mod)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mod: any = await import('html2pdf.js');
      const html2pdf = mod.default ?? mod;
      html2pdf()
        .set({
          margin: [15, 15, 15, 15],
          filename: `perfil-filosofico-${sessionId.slice(0, 8)}.pdf`,
          html2canvas: { scale: 2, useCORS: true },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        })
        .from(reportRef.current)
        .save();
    } catch (e) {
      console.error('PDF export failed', e);
    } finally {
      setPdfLoading(false);
    }
  }, [content, sessionId]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-purple-50 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="border-b border-indigo-200 dark:border-indigo-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push(`/session/${sessionId}`)}
              className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            >
              ←
            </button>
            <span className="text-2xl">🗺️</span>
            <h1 className="font-bold text-gray-900 dark:text-white">Perfil Filosófico</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push(`/eval/${sessionId}`)}
              className="px-3 py-2 text-sm font-medium text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 border border-amber-300 dark:border-amber-700 rounded-lg transition-colors"
            >
              📊 Evaluación técnica
            </button>
            {status === 'complete' && content && (
              <button
                onClick={handleDownloadPdf}
                disabled={pdfLoading}
                className="px-3 py-2 bg-indigo-500 text-white text-sm font-medium rounded-lg hover:bg-indigo-600 disabled:bg-gray-400 transition-colors"
              >
                {pdfLoading ? '⏳ Generando…' : '⬇️ Descargar PDF'}
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Idle state: no report yet */}
        {status === 'idle' && (
          <div className="text-center py-20">
            <p className="text-6xl mb-6">🗺️</p>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
              Tu mapa filosófico
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
              Genera un informe personalizado basado en tu conversación: qué corrientes filosóficas
              resuenan contigo, cuáles son tus puntos ciegos, y qué caminos explorar.
            </p>
            <button
              onClick={() => generateReport(sessionId)}
              className="px-8 py-4 bg-indigo-500 text-white text-lg font-semibold rounded-xl hover:bg-indigo-600 transition-colors shadow-lg"
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
                <div className="animate-spin h-12 w-12 border-4 border-indigo-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-gray-600 dark:text-gray-400">Analizando la conversación...</p>
              </div>
            )}
            {content && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 border border-indigo-100 dark:border-indigo-900">
                <div
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
                  className="text-gray-800 dark:text-gray-200"
                />
                <span className="inline-block h-4 w-2 bg-indigo-400 animate-pulse ml-1 align-middle" />
              </div>
            )}
          </div>
        )}

        {/* Error state */}
        {status === 'error' && (
          <div className="text-center py-12">
            <p className="text-rose-600 dark:text-rose-400 mb-4">{error}</p>
            <button
              onClick={() => generateReport(sessionId)}
              className="px-6 py-3 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600"
            >
              Reintentar
            </button>
          </div>
        )}

        {/* Complete state */}
        {status === 'complete' && content && (
          <div>
            <div
              ref={reportRef}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 border border-indigo-100 dark:border-indigo-900"
            >
              <div
                dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
                className="text-gray-800 dark:text-gray-200"
              />
            </div>

            <div className="mt-6 flex flex-wrap gap-3 justify-center">
              <button
                onClick={() => generateReport(sessionId)}
                className="px-5 py-2 text-sm text-indigo-600 dark:text-indigo-400 border border-indigo-300 dark:border-indigo-700 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors"
              >
                🔄 Regenerar informe
              </button>
              <button
                onClick={handleDownloadPdf}
                disabled={pdfLoading}
                className="px-5 py-2 bg-indigo-500 text-white text-sm font-medium rounded-lg hover:bg-indigo-600 disabled:bg-gray-400 transition-colors"
              >
                {pdfLoading ? '⏳ Generando PDF…' : '⬇️ Descargar PDF'}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
