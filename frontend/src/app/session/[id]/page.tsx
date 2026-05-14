'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { SessionResponse, Turn } from '@/lib/types';
import { useSession } from '@/hooks/useSession';
import { useDialogueStream } from '@/hooks/useDialogueStream';
import { ChatWindow } from '@/components/dialogue/ChatWindow';

export default function SessionPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.id as string;

  const { getSession, loading: sessionLoading } = useSession();
  const { sendMessage, tokens, thinking_trace, currentTurn, status, error, reset } = useDialogueStream();

  const [session, setSession] = useState<SessionResponse | null>(null);
  const [assistantTurnCount, setAssistantTurnCount] = useState(0);
  const [extraTurns, setExtraTurns] = useState(0);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Fetch session on mount
  useEffect(() => {
    if (sessionId) {
      getSession(sessionId)
        .then((s) => {
          setSession(s);
          // All turns returned by the API are assistant turns
          setAssistantTurnCount(s.turns.length);
        })
        .catch((err) => console.error('Failed to fetch session:', err));
    }
  }, [sessionId, getSession]);

  // Update session when turn completes — always append; ChatWindow shows the live
  // streaming bubble separately, so there is no duplication.
  useEffect(() => {
    if (!currentTurn) return;
    setAssistantTurnCount((n) => n + 1);
    setSession((prev) =>
      prev ? { ...prev, turns: [...prev.turns, currentTurn] } : prev
    );
  }, [currentTurn]);

  // Add child turn immediately when sending
  const handleSend = useCallback(() => {
    if (!inputText.trim() || isTyping) return;

    const childTurn: Turn = {
      role: 'child',
      content: inputText,
      timestamp: new Date().toISOString(),
    };

    // Add child message immediately
    setSession((prev) =>
      prev ? { ...prev, turns: [...prev.turns, childTurn] } : prev
    );

    // Send to API
    sendMessage(sessionId, inputText);
    setInputText('');
    setIsTyping(true);
  }, [inputText, isTyping, sessionId, sendMessage]);

  // Handle streaming complete
  useEffect(() => {
    if (status === 'complete' || status === 'error') {
      setIsTyping(false);
      textareaRef.current?.focus();
    }
  }, [status]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleEndSession = () => {
    reset();
    router.push(`/eval/${sessionId}`);
  };

  if (sessionLoading && !session) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <div className="neo-card p-8 text-center animate-scale-in">
          <div className="animate-spin h-10 w-10 border-4 border-[var(--border)] border-t-[var(--accent)] rounded-full mx-auto mb-4" />
          <p className="font-bold text-[var(--text)]">Cargando sesión...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <div className="neo-card p-8 text-center animate-scale-in">
          <p className="font-bold text-[var(--text)] mb-4">Sesión no encontrada</p>
          <button onClick={() => router.push('/')} className="neo-btn px-4 py-2">
            Volver al inicio
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg)' }}>
      {/* ─── Header ─── */}
      <header
        className="bg-[var(--bg-card)] border-b-2 border-[var(--border)] sticky top-0 z-10"
        style={{ boxShadow: '0 4px 0 0 var(--border)' }}
      >
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/')}
              className="neo-btn-ghost px-2 py-1 text-sm"
              aria-label="Volver al inicio"
            >
              ←
            </button>
            <span className="text-2xl" aria-hidden="true">🤔</span>
            <div>
              <p className="font-black text-[var(--text)] text-sm leading-tight">SocraticGemma</p>
              <p className="text-xs text-[var(--muted)]">
                {session.age_group} años · {session.stimulus.title || 'Sesión'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[var(--muted)] hidden sm:block">
              Turno {assistantTurnCount} / {session.total_turns}
            </span>
            <button
              onClick={() => { reset(); router.push(`/eval/${sessionId}`); }}
              className="neo-btn-ghost px-3 py-1.5 text-xs"
            >
              📊 Evaluación
            </button>
            <button
              onClick={() => { reset(); router.push(`/report/${sessionId}`); }}
              className="neo-btn px-3 py-1.5 text-xs"
            >
              🗺️ Perfil
            </button>
          </div>
        </div>
      </header>

      {/* Stimulus banner */}
      <div className="max-w-4xl mx-auto w-full px-4 pt-4">
        <div className="neo-card bg-[var(--accent-bg)] p-4">
          <p className="text-xs font-black uppercase tracking-widest text-emerald-800 dark:text-emerald-300 mb-1">
            💬 Pregunta inicial
          </p>
          <p className="text-[var(--text)] font-medium">{session.stimulus.content}</p>
        </div>
      </div>

      {/* Chat Window */}
      <div className="flex-1 overflow-hidden">
        <ChatWindow
          turns={session.turns}
          isStreaming={status === 'streaming' || status === 'connecting'}
          streamingContent={tokens}
        />
      </div>

      {/* Error message */}
      {error && (
        <div className="max-w-4xl mx-auto px-4 w-full">
          <div className="neo-card bg-rose-100 p-3 text-rose-800 font-semibold text-sm">
            ⚠️ {error}
          </div>
        </div>
      )}

      {/* Turn limit reached */}
      {session && assistantTurnCount >= session.total_turns + extraTurns && !isTyping && (
        <div
          className="bg-[var(--bg-card)] border-t-2 border-[var(--border)]"
          style={{ boxShadow: '0 -4px 0 0 var(--border)' }}
        >
          <div className="max-w-4xl mx-auto px-4 py-5">
            <p className="text-center font-black text-[var(--text)] mb-4">
              🏁 Has llegado al límite de {session.total_turns + extraTurns} turnos
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => { reset(); router.push(`/report/${sessionId}`); }}
                className="neo-btn px-6 py-3 text-base"
              >
                🗺️ Ver perfil filosófico
              </button>
              <button
                onClick={() => setExtraTurns((n) => n + 5)}
                className="neo-btn-ghost px-6 py-3 text-base"
              >
                ➕ Continuar 5 turnos más
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Input area */}
      {(!session || assistantTurnCount < session.total_turns + extraTurns || isTyping) && (
      <div
        className="bg-[var(--bg-card)] border-t-2 border-[var(--border)]"
        style={{ boxShadow: '0 -4px 0 0 var(--border)' }}
      >
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex gap-3">
            <textarea
              ref={textareaRef}
              autoFocus
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Escribe tu respuesta..."
              disabled={status === 'streaming' || status === 'connecting'}
              className="neo-input flex-1 px-4 py-3 resize-none"
              rows={1}
            />
            <button
              onClick={handleSend}
              disabled={!inputText.trim() || status === 'streaming' || status === 'connecting'}
              className="neo-btn px-6 py-3"
            >
              {status === 'streaming' || status === 'connecting' ? (
                <svg
                  className="animate-spin h-5 w-5 flex-shrink-0"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
                >
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                'Enviar'
              )}
            </button>
          </div>
          <p className="text-xs text-[var(--muted)] mt-2 text-center">
            Enter para enviar · Shift+Enter para nueva línea
          </p>
        </div>
      </div>
      )}
    </div>
  );
}
