'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import { useState, useMemo, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Menu, X, BookOpen, LayoutDashboard, Settings, Award, LogOut, User, ChevronDown } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { LanguageSwitcher } from '@/components/language-switcher';
import { NotificationBell } from '@/components/notifications';
import { useTranslations, useLocale } from 'next-intl';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface HeaderProps {
  logoUrl?: string;
}

export function Header({ logoUrl }: HeaderProps) {
  const t = useTranslations('navigation');
  const pathname = usePathname();
  const locale = useLocale();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, isLoading, logout } = useAuth();

  // All internal hrefs must carry the locale prefix so next-intl never
  // falls back to re-detecting the locale from Accept-Language (which
  // would flip an Arabic user to English on every nav click).
  const lp = `/${locale}`;

  const publicNavLinks = useMemo(() => [
    { href: `${lp}`,          label: t('home') },
    { href: `${lp}/courses`,  label: t('courses') },
    { href: `${lp}/about`,    label: t('about') },
    { href: `${lp}/blog`,     label: t('blog') },
    { href: `${lp}/contact`,  label: t('contact') },
  ], [t, lp]);

  const handleMobileLogout = useCallback(() => {
    logout();
    setMobileMenuOpen(false);
  }, [logout]);

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        {/* Logo */}
        <Link href={lp} className="flex items-center gap-2">
          <div className="relative h-10 w-10">
            <Image
              src={logoUrl || '/logo.png'}
              alt={t('brandName')}
              fill
              className="object-contain"
              priority
              unoptimized={!!(logoUrl && !logoUrl.startsWith('/'))}
            />
          </div>
          <span className="text-xl font-bold">{t('brandName')}</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-6">
          {publicNavLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'text-sm font-medium transition-colors hover:text-primary',
                pathname === link.href || (link.href === lp && pathname === `${lp}/`)
                  ? 'text-primary'
                  : 'text-muted-foreground'
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* CTA Buttons */}
        <div className="hidden md:flex items-center gap-4">
          <LanguageSwitcher />
          {isLoading ? null : user ? (
            <>
              <NotificationBell />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    <span className="max-w-[100px] truncate">{user.name || user.email}</span>
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem asChild>
                    <Link href={`${lp}/dashboard`} className="flex items-center gap-2 cursor-pointer">
                      <LayoutDashboard className="h-4 w-4" />
                      {t('studentDashboard')}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href={`${lp}/my-courses`} className="flex items-center gap-2 cursor-pointer">
                      <BookOpen className="h-4 w-4" />
                      {t('myCourses')}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href={`${lp}/assessments`} className="flex items-center gap-2 cursor-pointer">
                      <Award className="h-4 w-4" />
                      {t('assessments')}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href={`${lp}/settings`} className="flex items-center gap-2 cursor-pointer">
                      <Settings className="h-4 w-4" />
                      {t('settings')}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={logout} className="flex items-center gap-2 cursor-pointer text-red-600">
                    <LogOut className="h-4 w-4" />
                    {t('logout')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <Button variant="ghost" asChild>
                <Link href={`${lp}/login`}>{t('login')}</Link>
              </Button>
              <Button asChild>
                <Link href={`${lp}/register`}>{t('register')}</Link>
              </Button>
            </>
          )}
        </div>

        {/* Mobile Menu Button */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? (
            <X className="h-6 w-6" />
          ) : (
            <Menu className="h-6 w-6" />
          )}
        </Button>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t">
          <nav className="container py-4 space-y-2">
            {publicNavLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'block py-2 text-sm font-medium transition-colors hover:text-primary',
                  pathname === link.href
                    ? 'text-primary'
                    : 'text-muted-foreground'
                )}
                onClick={() => setMobileMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <div className="pt-4 space-y-2">
              {isLoading ? null : user ? (
                <>
                  <div className="px-2 py-2 text-sm font-medium text-muted-foreground border-b">
                    {user.name || user.email}
                  </div>
                  <Link
                    href={`${lp}/dashboard`}
                    className="flex items-center gap-2 px-2 py-2 text-sm font-medium hover:bg-accent rounded-md"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <LayoutDashboard className="h-4 w-4" />
                    {t('studentDashboard')}
                  </Link>
                  <Link
                    href={`${lp}/my-courses`}
                    className="flex items-center gap-2 px-2 py-2 text-sm font-medium hover:bg-accent rounded-md"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <BookOpen className="h-4 w-4" />
                    {t('myCourses')}
                  </Link>
                  <Link
                    href={`${lp}/assessments`}
                    className="flex items-center gap-2 px-2 py-2 text-sm font-medium hover:bg-accent rounded-md"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Award className="h-4 w-4" />
                    {t('assessments')}
                  </Link>
                  <div className="border-t my-2"></div>
                  <Link
                    href={`${lp}/settings`}
                    className="flex items-center gap-2 px-2 py-2 text-sm font-medium hover:bg-accent rounded-md"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Settings className="h-4 w-4" />
                    {t('settings')}
                  </Link>
                  <button
                    onClick={handleMobileLogout}
                    className="flex items-center gap-2 px-2 py-2 text-sm font-medium text-red-600 hover:bg-accent rounded-md w-full"
                  >
                    <LogOut className="h-4 w-4" />
                    {t('logout')}
                  </button>
                </>
              ) : (
                <>
                  <Button variant="outline" className="w-full" asChild>
                    <Link href={`${lp}/login`}>{t('login')}</Link>
                  </Button>
                  <Button className="w-full" asChild>
                    <Link href={`${lp}/register`}>{t('register')}</Link>
                  </Button>
                </>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
