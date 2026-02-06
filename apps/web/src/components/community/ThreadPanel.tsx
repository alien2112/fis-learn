'use client';

import { MessageComposer } from '@/components/community/MessageComposer';
import { MessageItem, CommunityMessageWithDelivery } from '@/components/community/MessageItem';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

export function ThreadPanel({
  parent,
  replies,
  onClose,
  onSendReply,
  onPin,
  onMarkAnswer,
  onLock,
  onReport,
  onRemove,
  canModerate,
  hasMore,
  onLoadMore,
  isLoading,
  disabled,
  allowAnswer,
  allowLock,
  helper,
}: {
  parent: CommunityMessageWithDelivery;
  replies: CommunityMessageWithDelivery[];
  onClose: () => void;
  onSendReply: (body: string) => Promise<void> | void;
  onPin?: (message: CommunityMessageWithDelivery) => void;
  onMarkAnswer?: (message: CommunityMessageWithDelivery) => void;
  onLock?: (message: CommunityMessageWithDelivery) => void;
  onReport?: (message: CommunityMessageWithDelivery) => void;
  onRemove?: (message: CommunityMessageWithDelivery) => void;
  canModerate?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
  isLoading?: boolean;
  disabled?: boolean;
  allowAnswer?: boolean;
  allowLock?: boolean;
  helper?: string;
}) {
  const helperText = disabled ? helper ?? 'This channel is locked.' : undefined;

  return (
    <div className="flex h-full flex-col border-l bg-background">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div>
          <h3 className="text-sm font-semibold">Thread</h3>
          <p className="text-xs text-muted-foreground">Replies and answers</p>
        </div>
        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {hasMore && (
          <Button variant="outline" size="sm" onClick={onLoadMore} disabled={isLoading}>
            {isLoading ? 'Loading...' : 'Load older replies'}
          </Button>
        )}
        <MessageItem
          message={parent}
          isGrouped={false}
          canModerate={canModerate}
          allowAnswer={allowAnswer}
          allowLock={allowLock}
          onPin={onPin}
          onMarkAnswer={onMarkAnswer}
          onLock={onLock}
          onReport={onReport}
          onRemove={onRemove}
        />

        <div className="pl-6 space-y-4 border-l border-dashed border-muted">
          {replies.length === 0 ? (
            <p className="text-sm text-muted-foreground">No replies yet. Be the first to respond.</p>
          ) : (
            replies.map((reply, index) => (
              <MessageItem
                key={reply.id}
                message={reply}
                isGrouped={index > 0 && replies[index - 1].author.id === reply.author.id}
                canModerate={canModerate}
                allowAnswer={allowAnswer}
                onPin={onPin}
                onMarkAnswer={onMarkAnswer}
                onReport={onReport}
                onRemove={onRemove}
              />
            ))
          )}
        </div>
      </div>

      <div className="border-t p-4">
        <MessageComposer
          placeholder="Write a reply..."
          onSend={onSendReply}
          disabled={disabled}
          helper={helperText}
        />
      </div>
    </div>
  );
}
