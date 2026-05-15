'use client';

import { use } from 'react';
import Link from 'next/link';
import { useWikiPage } from '@/hooks/useWiki';
import { MarkdownContent } from '@/components/MarkdownContent';

export default function WikiSlugPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const decodedSlug = decodeURIComponent(slug);
  const { page, loading, error } = useWikiPage(decodedSlug);

  const processedContent = page
    ? page.content.replace(/^---[\s\S]*?---\s*/m, '').trim()
    : '';

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      {/* Header */}
      <header
        className="bg-[var(--bg-card)] border-b-2 border-[var(--border)] sticky top-0 z-10"
        style={{ boxShadow: '0 4px 0 0 var(--border)' }}
      >
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/wiki" className="neo-btn-ghost px-2 py-1 text-lg font-bold" aria-label="Volver al grafo">
            ←
          </Link>
          <span className="text-xl" aria-hidden="true">📄</span>
          <h1 className="text-xl font-black text-[var(--text)] truncate">
            {loading ? 'Cargando…' : (page?.title ?? decodedSlug)}
          </h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-10">
        {loading && (
          <div className="space-y-3 animate-pulse">
            <div className="h-6 bg-[var(--muted)] opacity-20 rounded w-1/3" />
            <div className="h-4 bg-[var(--muted)] opacity-10 rounded w-full" />
            <div className="h-4 bg-[var(--muted)] opacity-10 rounded w-2/3" />
            <div className="h-4 bg-[var(--muted)] opacity-10 rounded w-5/6" />
          </div>
        )}

        {error && (
          <div className="neo-card bg-rose-100 p-6 text-center text-rose-800">
            <p className="font-bold">Página no encontrada</p>
            <p className="text-sm mt-1">{error}</p>
            <Link href="/wiki" className="neo-btn mt-3 inline-block px-4 py-2 text-sm">
              ← Volver al wiki
            </Link>
          </div>
        )}

        {!loading && !error && page && (
          <>
            {/* Meta badges */}
            <div className="flex flex-wrap gap-2 mb-6">
              <span className="neo-tag text-xs capitalize">{page.category}</span>
              {page.sessions.length > 0 && (
                <span className="neo-tag text-xs bg-[var(--accent-bg)]">
                  {page.sessions.length} sesión{page.sessions.length !== 1 ? 'es' : ''}
                </span>
              )}
              {page.updated_at && (
                <span className="text-xs text-[var(--muted)] font-semibold">
                  Actualizado: {new Date(page.updated_at * 1000).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                </span>
              )}
            </div>

            {/* Markdown content */}
            <article className="neo-card p-6">
              <MarkdownContent source={processedContent} />
            </article>

            {/* Linked sessions */}
            {page.sessions.length > 0 && (
              <section className="mt-8">
                <h2 className="text-sm font-black text-[var(--muted)] uppercase tracking-wide mb-3">
                  Conversaciones relacionadas
                </h2>
                <div className="flex flex-col gap-2">
                  {page.sessions.map(sid => (
                    <Link
                      key={sid}
                      href={`/conversations/${sid}`}
                      className="neo-card neo-card-hover px-4 py-3 text-sm font-semibold text-[var(--text)] flex items-center gap-2"
                    >
                      <span>💬</span>
                      <span className="font-mono text-xs">{sid}</span>
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}
