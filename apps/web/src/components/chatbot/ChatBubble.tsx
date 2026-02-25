'use client';

import { useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ChatWindow } from './ChatWindow';

export function ChatBubble() {
  const [isOpen, setIsOpen] = useState(false);
  const [hasOpened, setHasOpened] = useState(false);

  const handleToggle = () => {
    setIsOpen(!isOpen);
    if (!hasOpened) {
      setHasOpened(true);
    }
  };

  return (
    <>
      {/* Chat Window */}
      <ChatWindow isOpen={isOpen} onClose={() => setIsOpen(false)} />

      {/* Floating Button */}
      <Button
        onClick={handleToggle}
        className={cn(
          'fixed bottom-4 right-4 z-40 h-14 w-14 rounded-full shadow-lg transition-all duration-300',
          'hover:scale-110 hover:shadow-xl',
          isOpen && 'scale-0 opacity-0'
        )}
        size="icon"
      >
        <MessageCircle className="w-6 h-6" />
      </Button>
    </>
  );
}
