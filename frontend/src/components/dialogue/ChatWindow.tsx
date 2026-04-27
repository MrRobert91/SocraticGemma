'use client';

import { useRef, useEffect } from 'react';
import { Turn } from '@/lib/types';
import { MessageBubble } from './MessageBubble';

interface ChatWindowProps {
  turns: Turn[];
  isStreaming?: boolean;
  streamingContent?: string;
}

export function ChatWindow({ turns, isStreaming, streamingContent }: ChatWindowProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [turns, streamingContent]);

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
      {turns.map((turn, index) => (
        <MessageBubble
          key={index}
          turn={turn}
          isStreaming={isStreaming && index === turns.length}
          streamingContent={streamingContent}
        />
      ))}
      {isStreaming && (
        <MessageBubble
          turn={{ role: 'assistant', content: '' }}
          isStreaming={true}
          streamingContent={streamingContent}
        />
      )}
      <div ref={bottomRef} />
    </div>
  );
}
