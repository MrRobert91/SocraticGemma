import { useState, useRef, useCallback, useEffect } from 'react';
import { StreamStatus, Turn, ThinkingEvent, TokenEvent, CompleteEvent } from '@/lib/types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface UseDialogueStreamReturn {
  sendMessage: (sessionId: string, text: string) => void;
  tokens: string;
  thinking_trace: string;
  currentTurn: Turn | null;
  status: StreamStatus;
  error: string | null;
  reset: () => void;
}

export function useDialogueStream(): UseDialogueStreamReturn {
  const [tokens, setTokens] = useState('');
  const [thinking_trace, setThinkingTrace] = useState('');
  const [currentTurn, setCurrentTurn] = useState<Turn | null>(null);
  const [status, setStatus] = useState<StreamStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const reset = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setTokens('');
    setThinkingTrace('');
    setCurrentTurn(null);
    setStatus('idle');
    setError(null);
  }, []);

  const sendMessage = useCallback((sessionId: string, text: string) => {
    // Reset previous state
    reset();
    setStatus('connecting');

    abortControllerRef.current = new AbortController();

    fetch(`${API_BASE}/sessions/${sessionId}/turns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
      signal: abortControllerRef.current.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`HTTP error: ${response.status}`);
        }
        if (!response.body) {
          throw new Error('No response body');
        }

        setStatus('streaming');
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              if (line.startsWith('event:')) {
                const eventType = line.slice(6).trim();
                continue;
              }
              if (line.startsWith('data:')) {
                const dataStr = line.slice(5).trim();
                if (!dataStr) continue;

                try {
                  const data = JSON.parse(dataStr);

                  // Determine event type from data structure
                  if ('trace' in data) {
                    // Thinking event
                    setThinkingTrace((prev) => prev + data.trace);
                  } else if ('text' in data) {
                    // Token event
                    setTokens((prev) => prev + data.text);
                  } else if ('turn' in data) {
                    // Complete event
                    const completeData = data as CompleteEvent;
                    setCurrentTurn(completeData.turn);
                    setStatus('complete');
                  }
                } catch {
                  // Ignore parsing errors for incomplete JSON
                }
              }
            }
          }
        } catch (err) {
          if ((err as Error).name === 'AbortError') {
            setStatus('idle');
          } else {
            setError((err as Error).message);
            setStatus('error');
          }
        }
      })
      .catch((err) => {
        if ((err as Error).name !== 'AbortError') {
          setError(err.message);
          setStatus('error');
        }
      });
  }, [reset]);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return { sendMessage, tokens, thinking_trace, currentTurn, status, error, reset };
}
