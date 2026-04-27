import { useState, useCallback } from 'react';
import { CreateSessionRequest, SessionResponse } from '@/lib/types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export function useSession() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createSession = useCallback(async (data: CreateSessionRequest): Promise<string> => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        throw new Error(`Error creating session: ${response.statusText}`);
      }
      const result = await response.json();
      return result.session_id;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getSession = useCallback(async (id: string): Promise<SessionResponse> => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/sessions/${id}`);
      if (!response.ok) {
        throw new Error(`Error fetching session: ${response.statusText}`);
      }
      return await response.json();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { createSession, getSession, loading, error };
}
