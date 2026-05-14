'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ConversationSummary, type ConversationsPage } from '@/lib/types';

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
      className="group block rounded-xl border border-amber-200 dark:border-amber-800 bg-white dark:bg-gray-900 p-5 shadow-sm hover:shadow-md hover:border-amber-400 dark:hover:border-amber-600 transition-all"
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white line-clamp-2 group-hover:text-amber-700 dark:group-hover:text-amber-400 transition-colors">
          {conv.stimulus.title || conv.stimulus.content}
        </h2>
        <span className="shrink-0 text-xs px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 font-medium">
          {AGE_LABELS[conv.age_group] ?? conv.age_group}
        </span>
      </div>

      {conv.stimulus.title && (
        <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mb-3">
          {conv.stimulus.content}
        </p>
      )}

      <div className="flex items-center justify-between text-xs text-gray-400 dark:text-gray-500">
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
      <p className="text-sm text-gray-500 dark:text-gray-400">
        {from}–{to} de {total} conversaciones
      </p>
      <div className="flex gap-2">
        <button
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
          className="px-3 py-1.5 rounded-lg text-sm border border-amber-200 dark:border-amber-800 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:bg-amber-50 dark:hover:bg-amber-900/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
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
                    ? 'border-amber-500 bg-amber-500 text-white font-semibold'
                    : 'border-amber-200 dark:border-amber-800 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:bg-amber-50 dark:hover:bg-amber-900/20'
                }`}
              >
                {item}
              </button>
            )
          )}

        <button
          disabled={page >= pages}
          onClick={() => onChange(page + 1)}
          className="px-3 py-1.5 rounded-lg text-sm border border-amber-200 dark:border-amber-800 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:bg-amber-50 dark:hover:bg-amber-900/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Siguiente →
        </button>
      </div>
    </div>
  );
}

export default function ConversationsPage() {
  const [data, setData] = useState<ConversationsPage | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPage = useCallback(async (p: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `${API_BASE}/conversations?page=${p}&per_page=${PER_PAGE}`
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
    fetchPage(1);
  }, [fetchPage]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="border-b border-amber-200 dark:border-amber-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-3">
              <span className="text-3xl">🤔</span>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                SocraticGemma
              </h1>
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
              href="/compare"
              className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-amber-600 dark:hover:text-amber-400"
            >
              Comparar
            </Link>
            <Link
              href="/conversations"
              className="text-sm font-semibold text-amber-600 dark:text-amber-400 border-b-2 border-amber-500"
            >
              Conversaciones
            </Link>
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-10">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Conversaciones guardadas
          </h2>
          {data && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {data.total} {data.total === 1 ? 'conversación' : 'conversaciones'} en total
            </p>
          )}
        </div>

        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="rounded-xl border border-amber-100 dark:border-gray-700 bg-white dark:bg-gray-900 p-5 animate-pulse"
              >
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-3" />
                <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-full mb-2" />
                <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-2/3" />
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 dark:bg-rose-900/20 dark:border-rose-800 p-6 text-center text-rose-700 dark:text-rose-400">
            <p className="font-semibold">No se pudieron cargar las conversaciones</p>
            <p className="text-sm mt-1">{error}</p>
            <button
              onClick={() => fetchPage(page)}
              className="mt-3 text-sm underline hover:no-underline"
            >
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
