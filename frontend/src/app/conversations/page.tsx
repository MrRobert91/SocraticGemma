'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ConversationSummary, type ConversationsPage } from '@/lib/types';
import { useAuth } from '@/context/AuthContext';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? '/api/backend';
const PER_PAGE = 24;

const AGE_LABELS: Record<string, string> = {
  '6-8': '6–8 años',
  '9-12': '9–12 años',
  '13-16': '13–16 años',
};

const LANG_LABELS: Record<string, string> = {
  es: 'Español',
  en: 'English',
  ca: 'Català',
};

function formatDate(ts: number): string {
  return new Date(ts * 1000).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function ConversationCard({ conv }: { conv: ConversationSummary }) {
  return (
    <Link
      href={`/conversations/${conv.id}`}
      className="neo-card neo-card-hover block p-5 animate-fade-up"
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <h2 className="text-sm font-bold text-[var(--text)] line-clamp-2">
          {conv.stimulus.title || conv.stimulus.content}
        </h2>
        <span className="shrink-0 neo-tag bg-[var(--accent-bg)] text-emerald-900 dark:text-emerald-100 text-xs px-2 py-0.5">
          {AGE_LABELS[conv.age_group] ?? conv.age_group}
        </span>
      </div>

      {conv.stimulus.title && (
        <p className="text-xs text-[var(--muted)] line-clamp-2 mb-3">
          {conv.stimulus.content}
        </p>
      )}

      <div className="flex items-center justify-between text-xs text-[var(--muted)]">
        <div className="flex items-center gap-3">
          <span>💬 {conv.turn_count} {conv.turn_count === 1 ? 'turno' : 'turnos'}</span>
          <span className="capitalize">{LANG_LABELS[conv.language] ?? conv.language}</span>
        </div>
        <time dateTime={new Date(conv.created_at * 1000).toISOString()}>
          {formatDate(conv.created_at)}
        </time>
      </div>
    </Link>
  );
}

function Pagination({
  page,
  pages,
  total,
  perPage,
  onChange,
}: {
  page: number;
  pages: number;
  total: number;
  perPage: number;
  onChange: (p: number) => void;
}) {
  if (pages <= 1) return null;

  const from = (page - 1) * perPage + 1;
  const to = Math.min(page * perPage, total);

  return (
    <div className="flex items-center justify-between mt-8">
      <p className="text-sm font-semibold text-[var(--muted)]">
        {from}–{to} de {total} conversaciones
      </p>
      <div className="flex gap-2">
        <button
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
          className="neo-btn-ghost px-3 py-1.5 text-sm disabled:opacity-40"
        >
          ← Anterior
        </button>

        {/* Page numbers — show at most 7 around current */}
        {Array.from({ length: pages }, (_, i) => i + 1)
          .filter(
            (p) =>
              p === 1 ||
              p === pages ||
              (p >= page - 2 && p <= page + 2)
          )
          .reduce<(number | '...')[]>((acc, p, idx, arr) => {
            if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push('...');
            acc.push(p);
            return acc;
          }, [])
          .map((item, idx) =>
            item === '...' ? (
              <span key={`ellipsis-${idx}`} className="px-2 py-1.5 text-sm text-gray-400">
                …
              </span>
            ) : (
              <button
                key={item}
                onClick={() => onChange(item as number)}
                className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
            item === page
                    ? 'neo-toggle-on px-3 py-1.5 text-sm'
                    : 'neo-btn-ghost px-3 py-1.5 text-sm'
                }`}
              >
                {item}
              </button>
            )
          )}

        <button
          disabled={page >= pages}
          onClick={() => onChange(page + 1)}
          className="neo-btn-ghost px-3 py-1.5 text-sm disabled:opacity-40"
        >
          Siguiente →
        </button>
      </div>
    </div>
  );
}

export default function ConversationsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [data, setData] = useState<ConversationsPage | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && user === null) {
      router.push('/login');
    }
  }, [authLoading, user, router]);

  const fetchPage = useCallback(async (p: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `${API_BASE}/conversations?page=${p}&per_page=${PER_PAGE}`,
        { credentials: 'include' },
      );
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const json: ConversationsPage = await res.json();
      setData(json);
      setPage(p);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && user !== null) {
      fetchPage(1);
    }
  }, [fetchPage, authLoading, user]);

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      {/* Header */}
      <header
        className="bg-[var(--bg-card)] border-b-2 border-[var(--border)] sticky top-0 z-10"
        style={{ boxShadow: '0 4px 0 0 var(--border)' }}
      >
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <span className="text-3xl" aria-hidden="true">🤔</span>
            <span className="text-xl font-black tracking-tight text-[var(--text)]">SocraticGemma</span>
          </Link>
          <nav className="flex gap-2" aria-label="Navegación principal">
            <Link href="/"        className="neo-btn-ghost px-3 py-1.5 text-sm">Inicio</Link>
            <Link href="/conversations" className="neo-btn px-3 py-1.5 text-sm">Conversaciones</Link>
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-10">
        <div className="mb-8">
          <h2 className="text-2xl font-black text-[var(--text)]">
            Conversaciones guardadas
          </h2>
          {data && (
            <p className="text-sm text-[var(--muted)] mt-1 font-semibold">
              {data.total} {data.total === 1 ? 'conversación' : 'conversaciones'} en total
            </p>
          )}
        </div>

        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="neo-card p-5 animate-pulse">
                <div className="h-4 bg-[var(--muted)] opacity-20 rounded w-3/4 mb-3" />
                <div className="h-3 bg-[var(--muted)] opacity-10 rounded w-full mb-2" />
                <div className="h-3 bg-[var(--muted)] opacity-10 rounded w-2/3" />
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="neo-card bg-rose-100 p-6 text-center text-rose-800">
            <p className="font-bold">No se pudieron cargar las conversaciones</p>
            <p className="text-sm mt-1">{error}</p>
            <button onClick={() => fetchPage(page)} className="neo-btn mt-3 px-4 py-2 text-sm">
              Reintentar
            </button>
          </div>
        )}

        {!loading && !error && data && data.items.length === 0 && (
          <div className="text-center py-20 text-gray-500 dark:text-gray-400">
            <p className="text-5xl mb-4">🗂️</p>
            <p className="text-lg font-medium">No hay conversaciones guardadas aún</p>
            <p className="text-sm mt-2">
              Inicia una{' '}
              <Link href="/" className="text-amber-600 dark:text-amber-400 underline">
                nueva sesión
              </Link>{' '}
              para que aparezca aquí.
            </p>
          </div>
        )}

        {!loading && !error && data && data.items.length > 0 && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {data.items.map((conv) => (
                <ConversationCard key={conv.id} conv={conv} />
              ))}
            </div>

            <Pagination
              page={data.page}
              pages={data.pages}
              total={data.total}
              perPage={data.per_page}
              onChange={fetchPage}
            />
          </>
        )}
      </main>
    </div>
  );
}
