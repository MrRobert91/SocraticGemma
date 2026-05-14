'use client';

import { Turn } from '@/lib/types';
import { QTypeTag } from './QTypeTag';
import { ThinkingPanel } from './ThinkingPanel';

const FORBIDDEN_LABELS: Record<string, string> = {
  overhelp:  '🤝 Ayuda excesiva — resolvió el pensamiento en lugar de guiar al niño',
  lecture:   '📖 Explicación — dio una lección en vez de hacer una pregunta',
  correct:   '✏️ Corrección — corrigió al niño en lugar de explorar su idea',
  leading:   '➡️ Pregunta dirigida — la pregunta sugiere la respuesta esperada',
  closed:    '🔒 Pregunta cerrada — se puede responder con sí/no sin reflexión',
};

interface MessageBubbleProps {
  turn: Turn;
  isStreaming?: boolean;
  streamingContent?: string;
}

export function MessageBubble({ turn, isStreaming, streamingContent }: MessageBubbleProps) {
  const isChild = turn.role === 'child';
  const content = isStreaming && isChild === false ? streamingContent : turn.content;

  return (
    <div className={`flex ${isChild ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`
          max-w-[85%] md:max-w-[75%] flex flex-col gap-1
          ${isChild ? 'items-end' : 'items-start'}
        `}
      >
        {/* Role indicator */}
        <div
          className={`
            text-xs font-medium px-2
            ${isChild ? 'text-amber-600 dark:text-amber-400' : 'text-sky-600 dark:text-sky-400'}
          `}
        >
          {isChild ? '👤 Niño' : '🤖 SocraticGemma'}
        </div>

        {/* Message bubble */}
        <div
          className={`
            px-4 py-3 rounded-2xl
            ${
              isChild
                ? 'bg-amber-100 dark:bg-amber-900/50 text-amber-900 dark:text-amber-100 rounded-br-md'
                : 'bg-sky-100 dark:bg-sky-900/50 text-sky-900 dark:text-sky-100 rounded-bl-md'
            }
          `}
        >
          <p className="whitespace-pre-wrap leading-relaxed">{content}</p>
          {isStreaming && !isChild && (
            <span className="inline-block h-4 w-2 bg-sky-400 animate-pulse ml-1" />
          )}
        </div>

        {/* Question type tag for AI messages */}
        {!isChild && turn.question_type && (
          <div className="mt-1">
            <QTypeTag type={turn.question_type} />
          </div>
        )}

        {/* Thinking trace for AI messages */}
        {!isChild && turn.thinking_trace && (
          <div className="mt-2 w-full">
            <ThinkingPanel trace={turn.thinking_trace} isStreaming={isStreaming && !isChild} />
          </div>
        )}

        {/* RAG moves used */}
        {turn.rag_moves_used && turn.rag_moves_used.length > 0 && (
          <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            📚 Movimientos RAG: {turn.rag_moves_used.join(', ')}
          </div>
        )}
      </div>
    </div>
  );
}
