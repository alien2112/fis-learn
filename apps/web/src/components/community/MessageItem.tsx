'use client';

import { formatDistanceToNow } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { CheckCircle2, Flag, Pin, MessageSquare, ShieldCheck, Trash2, Lock, Unlock } from 'lucide-react';
import { CommunityMessage } from '@/lib/api/community';

export interface CommunityMessageWithDelivery extends CommunityMessage {
  deliveryStatus?: 'sending' | 'failed';
}

export function MessageItem({
  message,
  isGrouped,
  onSelectThread,
  onPin,
  onMarkAnswer,
  onLock,
  onReport,
  onRemove,
  canModerate,
  allowAnswer,
  allowLock,
}: {
  message: CommunityMessageWithDelivery;
  isGrouped: boolean;
  onSelectThread?: (message: CommunityMessageWithDelivery) => void;
  onPin?: (message: CommunityMessageWithDelivery) => void;
  onMarkAnswer?: (message: CommunityMessageWithDelivery) => void;
  onLock?: (message: CommunityMessageWithDelivery) => void;
  onReport?: (message: CommunityMessageWithDelivery) => void;
  onRemove?: (message: CommunityMessageWithDelivery) => void;
  canModerate?: boolean;
  allowAnswer?: boolean;
  allowLock?: boolean;
}) {
  const roleLabel =
    message.author.role === 'INSTRUCTOR'
      ? 'Instructor'
      : ['ADMIN', 'SUPER_ADMIN'].includes(message.author.role)
      ? 'Staff'
      : null;
  const initials = message.author.name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className={cn('flex gap-3', isGrouped ? 'mt-1' : 'mt-6')}>
      <div className="h-10 w-10 shrink-0 rounded-full bg-muted flex items-center justify-center text-xs font-semibold text-muted-foreground">
        {initials}
      </div>
      <div className="flex-1 space-y-2">
        {!isGrouped && (
          <div className="flex items-center gap-2 text-sm">
            <span className="font-semibold">{message.author.name}</span>
            {roleLabel && (
              <Badge variant="secondary" className="text-[10px] uppercase tracking-wide">
                {roleLabel}
              </Badge>
            )}
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}
            </span>
            {message.isPinned && <Pin className="h-3 w-3 text-primary" />}
            {message.isAnswer && <CheckCircle2 className="h-3 w-3 text-green-600" />}
            {message.isLocked && <Lock className="h-3 w-3 text-muted-foreground" />}
          </div>
        )}

        <div
          className={cn(
            'rounded-lg border px-3 py-2 text-sm leading-relaxed',
            message.status !== 'ACTIVE' ? 'bg-muted/30 text-muted-foreground' : 'bg-background'
          )}
        >
          {message.status === 'HIDDEN' ? 'This message has been hidden by an instructor.' : message.body}
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {typeof message._count?.replies === 'number' && onSelectThread ? (
            <button
              type="button"
              onClick={() => onSelectThread(message)}
              className="inline-flex items-center gap-1 hover:text-foreground"
            >
              <MessageSquare className="h-3 w-3" />
              {message._count.replies} replies
            </button>
          ) : null}

          {message.deliveryStatus === 'sending' && <span>Sending...</span>}
          {message.deliveryStatus === 'failed' && <span className="text-destructive">Failed to send</span>}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {canModerate ? (
          <>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              onClick={() => onPin?.(message)}
              aria-label={message.isPinned ? 'Unpin message' : 'Pin message'}
            >
              <Pin className={cn('h-4 w-4', message.isPinned ? 'text-primary' : 'text-muted-foreground')} />
            </Button>
            {allowAnswer ? (
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                onClick={() => onMarkAnswer?.(message)}
                aria-label={message.isAnswer ? 'Unmark answer' : 'Mark answer'}
              >
                <ShieldCheck className={cn('h-4 w-4', message.isAnswer ? 'text-green-600' : 'text-muted-foreground')} />
              </Button>
            ) : null}
            {allowLock && !message.parentId ? (
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                onClick={() => onLock?.(message)}
                aria-label={message.isLocked ? 'Unlock thread' : 'Lock thread'}
              >
                {message.isLocked ? (
                  <Unlock className="h-4 w-4 text-primary" />
                ) : (
                  <Lock className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            ) : null}
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              onClick={() => onRemove?.(message)}
              aria-label="Remove message"
            >
              <Trash2 className="h-4 w-4 text-muted-foreground" />
            </Button>
          </>
        ) : (
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            onClick={() => onReport?.(message)}
            aria-label="Report message"
          >
            <Flag className="h-4 w-4 text-muted-foreground" />
          </Button>
        )}
      </div>
    </div>
  );
}
