'use client';

import { useState, useRef, useEffect, FormEvent } from 'react';
import { X, Send, Loader2, Bot } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChatMessage } from './ChatMessage';
import { useTranslations } from 'next-intl';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ChatWindowProps {
  isOpen: boolean;
  onClose: () => void;
}

const STORAGE_KEY = 'fis-chatbot-messages';
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://72.62.29.3:8080/api/v1';

export function ChatWindow({ isOpen, onClose }: ChatWindowProps) {
  const t = useTranslations('chatbot');
  const [messages, setMessages] = useState<Message[]>(() => {
    // Load from sessionStorage on mount
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          return parsed.map((m: Message) => ({
            ...m,
            timestamp: new Date(m.timestamp),
          }));
        } catch {
          return [];
        }
      }
    }
    return [];
  });
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Save to sessionStorage when messages change
  useEffect(() => {
    if (typeof window !== 'undefined' && messages.length > 0) {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    }
  }, [messages]);

  // Add initial greeting if no messages
  useEffect(() => {
    if (messages.length === 0) {
      const greeting = t('greeting');
      // Only add greeting if translation is loaded and not empty
      if (greeting && greeting.trim()) {
        setMessages([
          {
            role: 'assistant',
            content: greeting,
            timestamp: new Date(),
          },
        ]);
      }
    }
  }, [messages.length, t]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Prepare messages for API (only user and assistant roles, no timestamps)
      // Limit to last 20 messages to match backend validation
      // Filter out any messages with empty content
      const apiMessages = [...messages, userMessage]
        .filter(({ content }) => content && content.trim())
        .map(({ role, content }) => ({
          role,
          content: content.trim(),
        }))
        .slice(-20);

      // Validate we have at least the user message
      if (apiMessages.length === 0) {
        throw new Error('No valid messages to send');
      }

      const response = await fetch(`${API_URL}/chatbot/public`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'omit',
        body: JSON.stringify({ messages: apiMessages }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const data = await response.json();
      const reply = data?.data?.reply ?? data?.reply;

      const assistantMessage: Message = {
        role: 'assistant',
        content: reply || t('error'),
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: Message = {
        role: 'assistant',
        content: t('error'),
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className={cn(
        'fixed z-50 flex flex-col bg-background border shadow-2xl rounded-lg overflow-hidden',
        // Mobile: full screen
        'inset-0 sm:inset-auto',
        // Desktop: bottom-right corner
        'sm:bottom-4 sm:right-4 sm:w-[380px] sm:h-[520px]'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-primary text-primary-foreground">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5" />
          <span className="font-semibold">{t('title')}</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-primary-foreground hover:bg-primary/80"
          onClick={onClose}
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => (
          <ChatMessage
            key={index}
            role={message.role}
            content={message.content}
            timestamp={message.timestamp}
          />
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-lg px-4 py-3 rounded-bl-sm">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t bg-background">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t('placeholder')}
            disabled={isLoading}
            className="flex-1"
            maxLength={2000}
          />
          <Button
            type="submit"
            size="icon"
            disabled={isLoading || !input.trim()}
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2 text-center">
          {t('disclaimer')}
        </p>
      </form>
    </div>
  );
}