'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/auth-context';
import { setTokens } from '@/lib/auth-storage';
import { motion } from 'framer-motion';
import { LogIn, ShieldCheck, Mail, Lock, ArrowRight, Loader2, Bot } from 'lucide-react';
import { cn } from '@/lib/utils';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3011/api/v1';

export default function LoginPage() {
  const t = useTranslations('auth.login');
  const locale = useLocale();
  const isRTL = locale === 'ar';
  const router = useRouter();
  const { refreshUser } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [mfaPendingToken, setMfaPendingToken] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState('');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (!email || !password) {
      setError(t('errors.required'));
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        credentials: 'include',
      });

      const payload = await response.json();
      if (!response.ok) {
        const message = payload?.message || payload?.error || t('errors.server');
        setError(Array.isArray(message) ? message.join(', ') : message);
        return;
      }

      const data = payload?.data;

      if (data?.mfaRequired) {
        setMfaPendingToken(data.mfaPendingToken);
        return;
      }

      if (data?.tokens?.accessToken && data?.tokens?.refreshToken) {
        setTokens(data.tokens.accessToken, data.tokens.refreshToken);
      }
      setSuccess(t('success.loggedIn'));
      await refreshUser();
      router.push('/dashboard');
    } catch (err) {
      setError(t('errors.server'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMfaSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (!mfaPendingToken || !mfaCode) {
      setError(t('errors.mfaRequired'));
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`${API_URL}/auth/mfa/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mfaPendingToken, code: mfaCode }),
        credentials: 'include',
      });

      const payload = await response.json();
      if (!response.ok) {
        const message = payload?.message || payload?.error || 'MFA verification failed.';
        setError(Array.isArray(message) ? message.join(', ') : message);
        return;
      }

      if (payload?.data?.tokens?.accessToken && payload?.data?.tokens?.refreshToken) {
        setTokens(payload.data.tokens.accessToken, payload.data.tokens.refreshToken);
      }
      setSuccess(t('success.loggedIn'));
      await refreshUser();
      router.push('/dashboard');
    } catch (err) {
      setError(t('errors.server'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-12 px-4 relative overflow-hidden bg-background">
      {/* Background Blobs */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] -z-10 animate-pulse" />
      <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-purple-500/5 rounded-full blur-[100px] -z-10" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card className="border-none shadow-2xl rounded-[2rem] overflow-hidden bg-card/50 backdrop-blur-md">
          <div className="h-2 bg-primary w-full" />
          <CardHeader className="space-y-1 text-center pt-8">
            <div className="mx-auto w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary mb-4">
              <LogIn className="w-6 h-6" />
            </div>
            <CardTitle className="text-3xl font-black tracking-tight">{t('welcomeBack')}</CardTitle>
            <CardDescription className="text-base font-medium opacity-70">
              {t('subtitle')}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-8 pt-4">
            {mfaPendingToken ? (
              <form className="space-y-6" onSubmit={handleMfaSubmit}>
                <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10 space-y-1 text-center">
                  <p className="text-sm font-bold text-primary flex items-center justify-center gap-2">
                    <ShieldCheck className="w-4 h-4" />
                    {t('mfa.title')}
                  </p>
                  <p className="text-xs text-muted-foreground font-medium">{t('mfa.instruction')}</p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="mfaCode" className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">
                    {t('mfa.codeLabel')}
                  </Label>
                  <Input
                    id="mfaCode"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    className="rounded-xl h-12 text-center text-xl tracking-[0.5em] font-black"
                    value={mfaCode}
                    onChange={(event) => setMfaCode(event.target.value)}
                    placeholder="000000"
                    maxLength={6}
                  />
                </div>

                {error && (
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-destructive font-bold text-center">
                    {error}
                  </motion.p>
                )}

                <Button type="submit" className="w-full h-12 rounded-xl font-bold shadow-lg shadow-primary/20" disabled={isSubmitting || mfaCode.length < 6}>
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  {isSubmitting ? t('mfa.submitting') : t('mfa.submit')}
                </Button>

                <button
                  type="button"
                  onClick={() => { setMfaPendingToken(null); setMfaCode(''); setError(null); }}
                  className="text-sm text-primary font-bold hover:opacity-70 w-full transition-opacity"
                >
                  {t('mfa.back')}
                </button>
              </form>
            ) : (
              <form className="space-y-5" onSubmit={handleSubmit}>
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">
                    {t('email')}
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      autoComplete="email"
                      className="rounded-xl h-12 pl-10"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder={t('emailPlaceholder')}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between ml-1">
                    <Label htmlFor="password" className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                      {t('password')}
                    </Label>
                    <Link href="/forgot-password" size="sm" className="text-xs text-primary font-bold hover:underline">
                      {t('forgotPassword')}
                    </Link>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      autoComplete="current-password"
                      className="rounded-xl h-12 pl-10"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder={t('passwordPlaceholder')}
                    />
                  </div>
                </div>

                {error && (
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-destructive font-bold text-center">
                    {error}
                  </motion.p>
                )}
                
                {success && (
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-green-600 font-bold text-center">
                    {success}
                  </motion.p>
                )}

                <Button type="submit" className="w-full h-12 rounded-xl font-bold shadow-lg shadow-primary/20 group" disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <LogIn className="w-4 h-4 mr-2" />}
                  {isSubmitting ? t('submitting') : t('submit')}
                  {!isSubmitting && <ArrowRight className={cn("w-4 h-4 ml-2 transition-transform group-hover:translate-x-1", isRTL && "rotate-180 group-hover:-translate-x-1")} />}
                </Button>
              </form>
            )}

            <div className="mt-8 text-sm text-muted-foreground text-center font-medium">
              {t('newTo')}{' '}
              <Link href="/register" className="text-primary font-black hover:underline ml-1">
                {t('createAccount')}
              </Link>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}