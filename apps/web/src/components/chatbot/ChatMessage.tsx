'use client';

import { cn } from '@/lib/utils';

interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: Date;
}

export function ChatMessage({ role, content, timestamp }: ChatMessageProps) {
  const isUser = role === 'user';

  // Simple markdown-like formatting (preserve line breaks and basic formatting)
  const formattedContent = (content || '')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/\n/g, '<br />');

  return (
    <div
      className={cn(
        'flex w-full',
        isUser ? 'justify-end' : 'justify-start'
      )}
    >
      <div
        className={cn(
          'max-w-[85%] rounded-lg px-4 py-2.5',
          isUser
            ? 'bg-primary text-primary-foreground rounded-br-sm'
            : 'bg-muted text-muted-foreground rounded-bl-sm'
        )}
      >
        <div
          className="text-sm leading-relaxed"
          dangerouslySetInnerHTML={{ __html: formattedContent }}
        />
        {timestamp && (
          <div
            className={cn(
              'text-xs mt-1',
              isUser ? 'text-primary-foreground/70' : 'text-muted-foreground/70'
            )}
          >
            {timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        )}
      </div>
    </div>
  );
}
