import { useState, useCallback } from 'react';
import { EvalSummary } from '@/lib/types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export function useEval() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getEval = useCallback(async (sessionId: string): Promise<EvalSummary> => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/sessions/${sessionId}/eval`);
      if (!response.ok) {
        throw new Error(`Error fetching evaluation: ${response.statusText}`);
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

  return { getEval, loading, error };
}
