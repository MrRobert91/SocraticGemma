'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ConversationSummary, type ConversationsPage } from '@/lib/types';
import { useAuth } from '@/context/AuthContext';
import { useWikiProfile } from '@/hooks/useWiki';
import { MarkdownContent } from '@/components/MarkdownContent';
import { useLang } from '@/hooks/useLang';
import { getTranslations } from '@/lib/i18n';
import type { LangCode, UITranslations } from '@/lib/i18n';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? '/api/backend';
const PER_PAGE = 24;

const LANG_LABELS: Record<string, string> = {
  es: 'Español',
  en: 'English',
  ca: 'Català',
};

function formatDate(ts: number, lang: LangCode): string {
  const locale = lang === 'en' ? 'en-GB' : 'es-ES';
  return new Date(ts * 1000).toLocaleDateString(locale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function ConversationCard({ conv, t, lang }: { conv: ConversationSummary; t: UITranslations; lang: LangCode }) {
  return (
    <Link
      href={`/conversations/${conv.id}`}
      className="neo-card neo-card-hover block p-5 animate-fade-up"
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <h2 className="text-sm font-bold text-[var(--text)] line-clamp-2">
          {conv.stimulus.title || conv.stimulus.content}
        </h2>
      </div>

      {conv.stimulus.title && (
        <p className="text-xs text-[var(--muted)] line-clamp-2 mb-3">
          {conv.stimulus.content}
        </p>
      )}

      <div className="flex items-center justify-between text-xs text-[var(--muted)]">
        <div className="flex items-center gap-3">
          <span>💬 {conv.turn_count} {conv.turn_count === 1 ? t.turnSingular : t.turnPlural}</span>
          <span className="capitalize">{LANG_LABELS[conv.language] ?? conv.language}</span>
        </div>
        <time dateTime={new Date(conv.created_at * 1000).toISOString()}>
          {formatDate(conv.created_at, lang)}
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
  t,
}: {
  page: number;
  pages: number;
  total: number;
  perPage: number;
  onChange: (p: number) => void;
  t: UITranslations;
}) {
  if (pages <= 1) return null;

  const from = (page - 1) * perPage + 1;
  const to = Math.min(page * perPage, total);

  return (
    <div className="flex items-center justify-between mt-8">
      <p className="text-sm font-semibold text-[var(--muted)]">
        {from}–{to} de {total} {total === 1 ? t.conversationsTotalSingular : t.conversationsTotalPlural}
      </p>
      <div className="flex gap-2">
        <button
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
          className="neo-btn-ghost px-3 py-1.5 text-sm disabled:opacity-40"
        >
          {t.paginationPrev}
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
          {t.paginationNext}
        </button>
      </div>
    </div>
  );
}

function stripFrontmatter(md: string): string {
  return md.replace(/^---[\s\S]*?---\s*/m, '').trim();
}

export default function ConversationsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const lang = useLang();
  const t = getTranslations(lang);
  const [data, setData] = useState<ConversationsPage | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { profile } = useWikiProfile();
  const [profileExpanded, setProfileExpanded] = useState(false);

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
      setError(err instanceof Error ? err.message : t.unknownError);
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
            <span className="text-xl font-black tracking-tight text-[var(--text)] hidden md:inline">SocraticGemma</span>
          </Link>
          <nav className="flex gap-2" aria-label="Navegación principal">
            <Link href="/" className="neo-btn-ghost px-3 py-1.5 text-sm" aria-label={t.navHome}>
              ←<span className="hidden md:inline"> {t.navHome}</span>
            </Link>
            <Link href="/wiki" className="neo-btn-ghost px-3 py-1.5 text-sm" aria-label={t.navWiki}>
              🗺<span className="hidden md:inline"> Wiki</span>
            </Link>
            <Link href="/conversations" className="neo-btn px-3 py-1.5 text-sm">
              <span className="md:hidden">💬</span>
              <span className="hidden md:inline">{t.navConversations}</span>
            </Link>
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-10">
        {/* Wiki panel — always visible for logged-in users */}
        {!profile?.content ? (
          <div className="neo-card mb-8 p-5 border-l-4 border-dashed border-[var(--border)] flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl" aria-hidden="true">🗺️</span>
              <div>
                <p className="text-sm font-black text-[var(--text)]">{t.wikiEmptyTitle}</p>
                <p className="text-xs text-[var(--muted)] mt-0.5">
                  {t.wikiEmptyDesc}
                </p>
              </div>
            </div>
            <Link href="/wiki" className="neo-btn-ghost px-3 py-1.5 text-xs font-bold shrink-0">
              Ver grafo →
            </Link>
          </div>
        ) : (
          <div className="neo-card mb-8 p-5 border-l-4 border-[var(--accent)]">
            <div className="flex items-center justify-between gap-4 mb-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl" aria-hidden="true">🧠</span>
                <h3 className="text-base font-black text-[var(--text)]">{t.profileGlobalTitle}</h3>
              </div>
              <Link href="/wiki" className="neo-btn px-3 py-1.5 text-xs font-bold">
                {t.profileViewWiki}
              </Link>
            </div>

            {profileExpanded ? (
              <div className="max-h-[60vh] overflow-y-auto pr-2 border-t-2 border-dashed border-[var(--border)] pt-3">
                <MarkdownContent
                  source={stripFrontmatter(profile.content ?? profile.summary ?? '')}
                  compact
                />
              </div>
            ) : (
              <p className="text-sm text-[var(--muted)] leading-relaxed line-clamp-4 whitespace-pre-line">
                {profile.summary}
              </p>
            )}

            <button
              type="button"
              onClick={() => setProfileExpanded(v => !v)}
              className="neo-btn-ghost mt-3 px-3 py-1.5 text-xs font-bold"
              aria-expanded={profileExpanded}
            >
              {profileExpanded ? t.profileShowLess : t.profileReadFull}
            </button>
          </div>
        )}

        <div className="mb-8">
          <h2 className="text-2xl font-black text-[var(--text)]">
            {t.savedConversationsTitle}
          </h2>
          {data && (
            <p className="text-sm text-[var(--muted)] mt-1 font-semibold">
              {data.total} {data.total === 1 ? t.conversationsTotalSingular : t.conversationsTotalPlural}
            </p>
          )}
        </div>

        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
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
            <p className="font-bold">{t.errorLoadConversations}</p>
            <p className="text-sm mt-1">{error}</p>
            <button onClick={() => fetchPage(page)} className="neo-btn mt-3 px-4 py-2 text-sm">
              {t.retryButton}
            </button>
          </div>
        )}

        {!loading && !error && data && data.items.length === 0 && (
          <div className="text-center py-20 text-gray-500 dark:text-gray-400">
            <p className="text-5xl mb-4">🗂️</p>
            <p className="text-lg font-medium">{t.emptyConversationsTitle}</p>
            <p className="text-sm mt-2">{t.emptyConversationsDesc}</p>
          </div>
        )}

        {!loading && !error && data && data.items.length > 0 && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {data.items.map((conv) => (
                <ConversationCard key={conv.id} conv={conv} t={t} lang={lang} />
              ))}
            </div>

            <Pagination
              page={data.page}
              pages={data.pages}
              total={data.total}
              perPage={data.per_page}
              onChange={fetchPage}
              t={t}
            />
          </>
        )}
      </main>
    </div>
  );
}
