'use client';

import { Turn } from '@/lib/types';
import { QTypeTag } from './QTypeTag';

interface MessageBubbleProps {
  turn: Turn;
  isStreaming?: boolean;
  streamingContent?: string;
  lang?: string;
}

export function MessageBubble({ turn, isStreaming, streamingContent, lang }: MessageBubbleProps) {
  const isChild = turn.role === 'child';
  const content = isStreaming && !isChild ? streamingContent : turn.content;
  const userLabel = lang === 'en' ? '👤 User' : '👤 Usuario';

  return (
    <div className={`flex ${isChild ? 'justify-end' : 'justify-start'} animate-fade-up`}>
      <div
        className={`max-w-[85%] md:max-w-[75%] flex flex-col gap-1.5 ${
          isChild ? 'items-end' : 'items-start'
        }`}
      >
        {/* Role label */}
        <div
          className={`text-xs font-black uppercase tracking-widest px-1 ${
            isChild
              ? 'text-emerald-700 dark:text-emerald-400'
              : 'text-[var(--text)]'
          }`}
        >
          {isChild ? userLabel : '🤖 SocraticGemma'}
        </div>

        {/* Message bubble */}
        <div
          className={`neo-card px-4 py-3 ${
            isChild
              ? 'bg-[var(--accent-bg)] animate-slide-in-right'
              : 'bg-[var(--bg-card)] animate-slide-in-left'
          }`}
        >
          <p className="whitespace-pre-wrap leading-relaxed text-[var(--text)]">{content}</p>
          {isStreaming && !isChild && (
            <span className="inline-block h-4 w-2 bg-emerald-600 dark:bg-emerald-400 animate-pulse ml-1 align-middle" />
          )}
        </div>

        {/* Question type tag */}
        {!isChild && turn.question_type && (
          <div className="mt-0.5">
            <QTypeTag type={turn.question_type} lang={lang} />
          </div>
        )}

        {/* RAG moves */}
        {turn.rag_moves_used && turn.rag_moves_used.length > 0 && (
          <div className="mt-1 text-xs text-[var(--muted)] px-1">
            📚 RAG: {turn.rag_moves_used.join(', ')}
          </div>
        )}
      </div>
    </div>
  );
}
