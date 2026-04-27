'use client';

import { useState, useEffect, useCallback } from 'react';
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
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  // Fetch session on mount
  useEffect(() => {
    if (sessionId) {
      getSession(sessionId)
        .then(setSession)
        .catch((err) => console.error('Failed to fetch session:', err));
    }
  }, [sessionId, getSession]);

  // Update session when turn completes
  useEffect(() => {
    if (currentTurn && session) {
      const updatedTurns = [...session.turns];
      // Replace the last assistant turn if it exists, otherwise append
      const lastAssistantIdx = updatedTurns.findLastIndex((t) => t.role === 'assistant');
      if (lastAssistantIdx >= 0) {
        updatedTurns[lastAssistantIdx] = currentTurn;
      } else {
        updatedTurns.push(currentTurn);
      }

      setSession({
        ...session,
        turns: updatedTurns,
      });
    }
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
    if (status === 'complete') {
      setIsTyping(false);
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-amber-50 to-orange-50 dark:from-gray-900 dark:to-gray-800">
        <div className="text-center">
          <div className="animate-spin h-12 w-12 border-4 border-amber-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Cargando sesión...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-amber-50 to-orange-50 dark:from-gray-900 dark:to-gray-800">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400">Sesión no encontrada</p>
          <button
            onClick={() => router.push('/')}
            className="mt-4 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600"
          >
            Volver al inicio
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-amber-50 to-orange-50 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-b border-amber-200 dark:border-amber-800 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/')}
              className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            >
              ←
            </button>
            <span className="text-2xl">🤔</span>
            <div>
              <h1 className="font-bold text-gray-900 dark:text-white">SocraticGemma</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {session.age_group} años • {session.stimulus.title || 'Sesión'}
              </p>
            </div>
          </div>
          <button
            onClick={handleEndSession}
            className="px-4 py-2 bg-emerald-500 text-white text-sm font-medium rounded-lg hover:bg-emerald-600 transition-colors"
          >
            📊 Ver evaluación
          </button>
        </div>
      </header>

      {/* Initial stimulus */}
      <div className="max-w-4xl mx-auto w-full px-4 py-4">
        <div className="bg-amber-100/50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
          <p className="text-sm font-medium text-amber-800 dark:text-amber-200 mb-1">
            💬 Pregunta inicial:
          </p>
          <p className="text-gray-700 dark:text-gray-300">
            {session.stimulus.content}
          </p>
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
          <div className="bg-rose-100 dark:bg-rose-900/50 border border-rose-200 dark:border-rose-800 rounded-lg p-3 text-rose-700 dark:text-rose-300 text-sm">
            Error: {error}
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex gap-3">
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Escribe tu respuesta..."
              disabled={status === 'streaming' || status === 'connecting'}
              className="flex-1 px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 resize-none focus:ring-2 focus:ring-amber-500 focus:border-transparent disabled:bg-gray-100 dark:disabled:bg-gray-800"
              rows={1}
            />
            <button
              onClick={handleSend}
              disabled={!inputText.trim() || status === 'streaming' || status === 'connecting'}
              className="px-6 py-3 bg-amber-500 text-white font-semibold rounded-xl hover:bg-amber-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {status === 'streaming' || status === 'connecting' ? (
                <>
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                </>
              ) : (
                'Enviar'
              )}
            </button>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
            Presiona Enter para enviar • Shift+Enter para nueva línea
          </p>
        </div>
      </div>
    </div>
  );
}
