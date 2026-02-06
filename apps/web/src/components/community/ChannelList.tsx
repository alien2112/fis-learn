'use client';

import { cn } from '@/lib/utils';
import { CommunityChannel } from '@/lib/api/community';

const channelLabels: Record<CommunityChannel['type'], string> = {
  ANNOUNCEMENTS: 'Announcements',
  QA: 'Q&A',
  DISCUSSION: 'Discussion',
};

export function ChannelList({
  channels,
  activeId,
  onSelect,
}: {
  channels: CommunityChannel[];
  activeId?: string;
  onSelect: (channel: CommunityChannel) => void;
}) {
  return (
    <div className="space-y-2">
      {channels.map((channel) => {
        const isActive = channel.id === activeId;
        return (
          <button
            key={channel.id}
            type="button"
            className={cn(
              'w-full text-left rounded-lg border px-3 py-2 transition-colors',
              isActive
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-muted text-muted-foreground hover:border-primary/40 hover:text-foreground'
            )}
            onClick={() => onSelect(channel)}
          >
            <div className="text-sm font-semibold">{channelLabels[channel.type] || channel.name}</div>
            <div className="text-xs text-muted-foreground">{channel.name}</div>
          </button>
        );
      })}
    </div>
  );
}
