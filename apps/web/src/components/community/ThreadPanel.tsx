'use client';

import { MessageComposer } from '@/components/community/MessageComposer';
import { MessageItem, CommunityMessageWithDelivery } from '@/components/community/MessageItem';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import { cn } from '@/lib/utils';

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
  onRetry,
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
  onRetry?: (message: CommunityMessageWithDelivery) => void;
  canModerate?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
  isLoading?: boolean;
  disabled?: boolean;
  allowAnswer?: boolean;
  allowLock?: boolean;
  helper?: string;
}) {
  const t = useTranslations('community');
  const locale = useLocale();
  const isRTL = locale === 'ar';
  const helperText = disabled ? helper ?? t('locked_channel_helper') : undefined;

  return (
    <div className={cn("flex h-full flex-col bg-background", isRTL ? "border-r" : "border-l")}>
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div>
          <h3 className="text-sm font-semibold">{t('thread_title')}</h3>
          <p className="text-xs text-muted-foreground">{t('thread_subtitle')}</p>
        </div>
        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 font-sans">
        {hasMore && (
          <Button variant="outline" className="w-full" size="sm" onClick={onLoadMore} disabled={isLoading}>
            {isLoading ? t('loading') : t('load_older_replies')}
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
          onRetry={onRetry}
        />

        <div className={cn("space-y-4 border-dashed border-muted", isRTL ? "pr-6 border-r" : "pl-6 border-l")}>
          {replies.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('no_replies_yet')}</p>
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
                onRetry={onRetry}
              />
            ))
          )}
        </div>
      </div>

      <div className="border-t p-4">
        <MessageComposer
          placeholder={t('write_reply_placeholder')}
          onSend={onSendReply}
          disabled={disabled}
          helper={helperText}
        />
      </div>
    </div>
  );
}
