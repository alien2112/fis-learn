'use client';

import { cn } from '@/lib/utils';
import { CommunityChannel } from '@/lib/api/community';
import { useTranslations, useLocale } from 'next-intl';

export function ChannelList({
  channels,
  activeId,
  onSelect,
}: {
  channels: CommunityChannel[];
  activeId?: string;
  onSelect: (channel: CommunityChannel) => void;
}) {
  const t = useTranslations('community');
  const locale = useLocale();
  const isRTL = locale === 'ar';

  return (
    <div className="space-y-2">
      {channels.map((channel) => {
        const isActive = channel.id === activeId;
        return (
          <button
            key={channel.id}
            type="button"
            className={cn(
              'w-full rounded-lg border px-3 py-2 transition-colors',
              isRTL ? 'text-right' : 'text-left',
              isActive
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-muted text-muted-foreground hover:border-primary/40 hover:text-foreground'
            )}
            onClick={() => onSelect(channel)}
          >
            <div className="text-sm font-semibold">{t(`channel_types.${channel.type.toLowerCase()}`) || channel.name}</div>
            <div className="text-xs text-muted-foreground">{channel.name}</div>
          </button>
        );
      })}
    </div>
  );
}
