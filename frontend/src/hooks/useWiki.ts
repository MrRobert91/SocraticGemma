import { useState, useEffect, useCallback } from 'react';
import { WikiProfile, WikiGraph, WikiPage } from '@/lib/types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api/backend';

// ─── useWikiProfile ───────────────────────────────────────────────────────────

export function useWikiProfile() {
  const [profile, setProfile] = useState<WikiProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch_ = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/wiki/profile`, { credentials: 'include' });
      if (res.status === 401) {
        setProfile(null);
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setProfile(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error loading wiki profile');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch_(); }, [fetch_]);

  return { profile, loading, error, refetch: fetch_ };
}

// ─── useWikiGraph ─────────────────────────────────────────────────────────────

export function useWikiGraph() {
  const [graph, setGraph] = useState<WikiGraph | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch_ = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/wiki/graph`, { credentials: 'include' });
      if (res.status === 401) {
        setGraph(null);
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setGraph(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error loading wiki graph');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch_(); }, [fetch_]);

  return { graph, loading, error, refetch: fetch_ };
}

// ─── useWikiPage ──────────────────────────────────────────────────────────────

export function useWikiPage(slug: string) {
  const [page, setPage] = useState<WikiPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    setError(null);
    fetch(`${API_BASE}/wiki/pages/${encodeURIComponent(slug)}`, { credentials: 'include' })
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(setPage)
      .catch(e => setError(e instanceof Error ? e.message : 'Error loading page'))
      .finally(() => setLoading(false));
  }, [slug]);

  return { page, loading, error };
}

// ─── useWikiStatus ────────────────────────────────────────────────────────────

export interface WikiStatus {
  page_count: number;
  session_count: number;
  last_page_updated_at: number | null;
}

export function useWikiStatus() {
  const [status, setStatus] = useState<WikiStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch_ = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/wiki/status`, { credentials: 'include' });
      if (res.status === 401) {
        setStatus(null);
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setStatus(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error loading wiki status');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch_(); }, [fetch_]);

  return { status, loading, error, refetch: fetch_ };
}

// ─── useWikiPages ─────────────────────────────────────────────────────────────

export function useWikiPages() {
  const [pages, setPages] = useState<WikiPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch_ = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/wiki/pages`, { credentials: 'include' });
      if (res.status === 401) {
        setPages([]);
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setPages(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error loading wiki pages');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch_(); }, [fetch_]);

  return { pages, loading, error, refetch: fetch_ };
}
