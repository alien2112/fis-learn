'use client';

import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';

export function ConnectionBanner({ status }: { status: 'connected' | 'connecting' | 'disconnected' }) {
  const t = useTranslations('community');
  if (status === 'connected') return null;

  return (
    <div
      className={cn(
        'rounded-md border px-3 py-2 text-sm',
        status === 'connecting'
          ? 'border-amber-200 bg-amber-50 text-amber-700'
          : 'border-red-200 bg-red-50 text-red-700'
      )}
      role="status"
    >
      {status === 'connecting' ? t('connection_reconnecting') : t('connection_lost')}
    </div>
  );
}
