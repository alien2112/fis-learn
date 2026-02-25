'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useTranslations } from 'next-intl';

export function MessageComposer({
  placeholder,
  onSend,
  disabled,
  helper,
}: {
  placeholder: string;
  onSend: (message: string) => Promise<void> | void;
  disabled?: boolean;
  helper?: string;
}) {
  const t = useTranslations('community');
  const [value, setValue] = useState('');
  const [isSending, setIsSending] = useState(false);

  const handleSend = async () => {
    if (!value.trim() || disabled) return;
    setIsSending(true);
    try {
      await onSend(value.trim());
      setValue('');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-2">
      <Textarea
        value={value}
        placeholder={placeholder}
        onChange={(event) => setValue(event.target.value)}
        rows={3}
        disabled={disabled}
      />
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{helper}</p>
        <Button size="sm" onClick={handleSend} disabled={disabled || isSending || !value.trim()}>
          {isSending ? t('sending') : t('send')}
        </Button>
      </div>
    </div>
  );
}
