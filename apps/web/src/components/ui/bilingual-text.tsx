import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function BilingualHeading({
  ar,
  en,
  className,
}: {
  ar: ReactNode;
  en: ReactNode;
  className?: string;
}) {
  return (
    <span className={cn('inline-flex flex-col gap-1', className)}>
      <span lang="ar" dir="rtl" className="text-balance">
        {ar}
      </span>
      <span lang="en" dir="ltr" className="text-balance">
        {en}
      </span>
    </span>
  );
}

export function BilingualInline({
  ar,
  en,
  className,
}: {
  ar: ReactNode;
  en: ReactNode;
  className?: string;
}) {
  return (
    <span className={className}>
      <span lang="en" dir="ltr">
        {en}
      </span>
      <span aria-hidden="true">{' / '}</span>
      <span lang="ar" dir="rtl">
        {ar}
      </span>
    </span>
  );
}

