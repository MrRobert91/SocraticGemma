import { useState, useCallback, useRef } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api/backend';

type ReportStatus = 'idle' | 'loading' | 'streaming' | 'complete' | 'error';

export function useReport() {
  const [content, setContent] = useState('');
  const [status, setStatus] = useState<ReportStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const loadReport = useCallback(async (sessionId: string): Promise<boolean> => {
    try {
      const res = await fetch(`${API_BASE}/sessions/${sessionId}/report`);
      if (!res.ok) return false;
      const data = await res.json();
      setContent(data.content ?? '');
      setStatus('complete');
      return true;
    } catch {
      return false;
    }
  }, []);

  const generateReport = useCallback(async (sessionId: string) => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    setContent('');
    setError(null);
    setStatus('streaming');

    try {
      const res = await fetch(`${API_BASE}/sessions/${sessionId}/report`, {
        method: 'POST',
        signal: abortRef.current.signal,
      });

      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || res.statusText);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        let eventType = '';
        for (const line of lines) {
          if (line.startsWith('event: ')) {
            eventType = line.slice(7).trim();
          } else if (line.startsWith('data: ')) {
            try {
              const payload = JSON.parse(line.slice(6));
              if (eventType === 'token' && payload.text) {
                setContent((prev) => prev + payload.text);
              } else if (eventType === 'complete') {
                setStatus('complete');
              } else if (eventType === 'error') {
                throw new Error(payload.message ?? 'Error desconocido');
              }
            } catch (parseErr) {
              // non-JSON data line, skip
            }
            eventType = '';
          }
        }
      }
      setStatus('complete');
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return;
      const msg = err instanceof Error ? err.message : 'Error desconocido';
      setError(msg);
      setStatus('error');
    }
  }, []);

  return { content, status, error, loadReport, generateReport };
}
