'use client';

import { useLocale } from 'next-intl';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Globe } from 'lucide-react';

export function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const handleLanguageChange = () => {
    const newLocale = locale === 'en' ? 'ar' : 'en';
    // Remove current locale prefix and add new one
    const pathWithoutLocale = pathname.replace(/^\/(en|ar)/, '') || '/';
    const newPath = `/${newLocale}${pathWithoutLocale}`;
    router.push(newPath);
  };

  const nextLanguage = locale === 'en' ? 'AR' : 'EN';

  return (
    <Button 
      variant="ghost" 
      size="sm" 
      className="gap-2"
      onClick={handleLanguageChange}
    >
      <Globe className="h-4 w-4" />
      <span>{nextLanguage}</span>
    </Button>
  );
}
