'use client';

import { Turn, QuestionType, QUESTION_TYPE_LABELS, QUESTION_TYPE_COLORS } from '@/lib/types';
import { QTypeTag } from './QTypeTag';
import { ScoreMini } from './ScoreMini';
import { ThinkingPanel } from './ThinkingPanel';

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

        {/* Scores for AI messages */}
        {!isChild && turn.eval_scores && (
          <div className="mt-2">
            <ScoreMini scores={turn.eval_scores} />
          </div>
        )}

        {/* Forbidden behaviors warning */}
        {turn.forbidden_behaviors_detected && turn.forbidden_behaviors_detected.length > 0 && (
          <div className="mt-2 px-3 py-2 bg-rose-100 dark:bg-rose-900/30 border border-rose-200 dark:border-rose-800 rounded-lg">
            <p className="text-xs text-rose-700 dark:text-rose-300">
              ⚠️ {turn.forbidden_behaviors_detected.join(', ')}
            </p>
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
