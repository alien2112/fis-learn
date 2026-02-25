'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { motion, AnimatePresence } from 'framer-motion';
import { UserPlus, Mail, Lock, User, ArrowRight, Loader2, CheckCircle2, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3011/api/v1';

export default function RegisterPage() {
  const t = useTranslations('auth.register');
  const locale = useLocale();
  const router = useRouter();
  const isRTL = locale === 'ar';

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (!name || !email || !password || !confirmPassword) {
      setError(t('errors.required'));
      return;
    }

    if (password !== confirmPassword) {
      setError(t('errors.match'));
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });

      const payload = await response.json();
      if (!response.ok) {
        if (response.status === 409) {
          setError(t('errors.emailExists'));
        } else {
          const message = payload?.message || payload?.error || t('errors.server');
          setError(Array.isArray(message) ? message.join(', ') : message);
        }
        return;
      }

      setSuccess(t('success'));
      setName('');
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      // Redirect to login after a short delay so the user sees the success message
      setTimeout(() => router.push(`/${locale}/login`), 2000);
    } catch (err) {
      setError(t('errors.server'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-12 px-4 relative overflow-hidden bg-background">
      {/* Background elements */}
      <div className="absolute top-0 right-1/4 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px] -z-10" />
      <div className="absolute bottom-0 left-1/4 w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-[100px] -z-10" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-lg"
      >
        <Card className="border-none shadow-2xl rounded-[2.5rem] overflow-hidden bg-card/50 backdrop-blur-md">
          <div className="h-2 bg-primary w-full" />
          <CardHeader className="space-y-1 text-center pt-10">
            <div className="mx-auto w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center text-primary mb-4 shadow-inner">
              <UserPlus className="w-7 h-7" />
            </div>
            <CardTitle className="text-3xl md:text-4xl font-black tracking-tight">{t('title')}</CardTitle>
            <CardDescription className="text-base md:text-lg font-medium opacity-70">
              {t('subtitle')}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-8 md:p-10 pt-4">
            <form className="space-y-5" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label htmlFor="name" className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">
                  {t('name')}
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="name"
                    type="text"
                    autoComplete="name"
                    className="rounded-xl h-12 pl-10 bg-background/50 border-border/50 focus:border-primary/50 transition-all"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder={t('namePlaceholder')}
                  />
                </div>
              </div>

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
                    className="rounded-xl h-12 pl-10 bg-background/50 border-border/50 focus:border-primary/50 transition-all"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder={t('emailPlaceholder')}
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">
                    {t('password')}
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      autoComplete="new-password"
                      className="rounded-xl h-12 pl-10 bg-background/50 border-border/50 focus:border-primary/50 transition-all"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder={t('passwordPlaceholder')}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">
                    {t('confirmPassword')}
                  </Label>
                  <div className="relative">
                    <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="confirmPassword"
                      type="password"
                      autoComplete="new-password"
                      className="rounded-xl h-12 pl-10 bg-background/50 border-border/50 focus:border-primary/50 transition-all"
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      placeholder={t('confirmPasswordPlaceholder')}
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-2 p-3 rounded-xl bg-muted/30 border border-border/50">
                <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <p className="text-[10px] md:text-xs text-muted-foreground font-bold leading-normal">
                  {t('passwordHint')}
                </p>
              </div>

              <AnimatePresence>
                {error && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                    <p className="text-sm text-destructive font-black text-center py-2 bg-destructive/10 rounded-lg border border-destructive/20">
                      {error}
                    </p>
                  </motion.div>
                )}
                
                {success && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                    <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-2xl text-center space-y-2">
                      <p className="text-sm text-green-600 font-black flex items-center justify-center gap-2">
                        <CheckCircle2 className="w-4 h-4" />
                        {success}
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <Button type="submit" className="w-full h-14 rounded-2xl font-black text-base shadow-xl shadow-primary/20 group relative overflow-hidden transition-all active:scale-[0.98]" disabled={isSubmitting}>
                <span className="relative z-10 flex items-center justify-center">
                  {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <UserPlus className="w-5 h-5 mr-2" />}
                  {isSubmitting ? t('submitting') : t('submit')}
                  {!isSubmitting && <ArrowRight className={cn("w-5 h-5 ml-2 transition-transform group-hover:translate-x-1.5", isRTL && "rotate-180 group-hover:-translate-x-1.5")} />}
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-primary via-primary-dark to-primary opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              </Button>
            </form>

            <div className="mt-10 text-sm text-muted-foreground text-center font-bold">
              {t('alreadyHaveAccount')}{' '}
              <Link href="/login" className="text-primary font-black hover:underline hover:opacity-80 transition-all px-1">
                {t('login')}
              </Link>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}