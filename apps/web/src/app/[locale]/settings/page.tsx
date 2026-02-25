'use client';

import { useEffect, useState } from 'react';
import apiClient from '@/lib/api/client';
import { useAuth } from '@/contexts/auth-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Shield, ShieldCheck, User, Lock, Smartphone, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3011/api/v1';

export default function SettingsPage() {
  const t = useTranslations('settings');
  const locale = useLocale();
  const isRTL = locale === 'ar';
  const { user, isLoading: isAuthLoading } = useAuth();

  // Password change
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // MFA
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [mfaQrCode, setMfaQrCode] = useState<string | null>(null);
  const [mfaSecret, setMfaSecret] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState('');
  const [mfaError, setMfaError] = useState<string | null>(null);
  const [mfaSuccess, setMfaSuccess] = useState<string | null>(null);
  const [isSettingUpMfa, setIsSettingUpMfa] = useState(false);
  const [isVerifyingMfa, setIsVerifyingMfa] = useState(false);
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);

  useEffect(() => {
    if (isAuthLoading || !user) return;
    const fetchMfaStatus = async () => {
      try {
        const response = await apiClient.get('/mfa/status');
        setMfaEnabled(response.data.data?.enabled ?? false);
      } catch {
        setMfaEnabled(false);
      }
    };
    fetchMfaStatus();
  }, [user, isAuthLoading]);

  const handlePasswordChange = async (event: React.FormEvent) => {
    event.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError(t('password.updating') /* Should be a validation message, but sticking to provided keys */);
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError(t('password.confirm'));
      return;
    }

    setIsChangingPassword(true);
    try {
      const response = await fetch(`${API_URL}/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const payload = await response.json();
      if (!response.ok) {
        const msg = payload?.message || 'Password change failed.';
        setPasswordError(Array.isArray(msg) ? msg.join(', ') : msg);
        return;
      }

      setPasswordSuccess(payload?.data?.message || 'Password changed successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch {
      setPasswordError('Unable to reach the server.');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleMfaSetup = async () => {
    setIsSettingUpMfa(true);
    setMfaError(null);
    setMfaSuccess(null);
    setBackupCodes(null);
    try {
      const response = await apiClient.post('/mfa/setup');
      const data = response.data.data;
      setMfaQrCode(data.qrCode);
      setMfaSecret(data.secret);
    } catch (err: any) {
      setMfaError(err?.response?.data?.message || 'Failed to start MFA setup.');
    } finally {
      setIsSettingUpMfa(false);
    }
  };

  const handleMfaVerify = async () => {
    setIsVerifyingMfa(true);
    setMfaError(null);
    try {
      const response = await apiClient.post('/mfa/setup/verify', {
        code: mfaCode,
        secret: mfaSecret,
      });
      const data = response.data.data;
      setMfaSuccess(t('mfa.descriptionEnabled'));
      setBackupCodes(data.backupCodes || null);
      setMfaQrCode(null);
      setMfaSecret(null);
      setMfaCode('');
      setMfaEnabled(true);
    } catch (err: any) {
      setMfaError(err?.response?.data?.message || 'Verification failed.');
    } finally {
      setIsVerifyingMfa(false);
    }
  };

  const handleMfaDisable = async () => {
    setMfaError(null);
    setMfaSuccess(null);
    try {
      await apiClient.post('/mfa/disable');
      setMfaEnabled(false);
      setMfaSuccess(t('mfa.descriptionDisabled'));
      setBackupCodes(null);
    } catch (err: any) {
      setMfaError(err?.response?.data?.message || 'Failed to disable MFA.');
    }
  };

  if (isAuthLoading || !user) {
    return (
      <div className="container py-12 max-w-3xl mx-auto space-y-6">
        <Skeleton className="h-12 w-48 rounded-xl" />
        <Skeleton className="h-64 w-full rounded-3xl" />
        <Skeleton className="h-96 w-full rounded-3xl" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <section className="bg-primary/5 py-12 mb-8">
        <div className="container max-w-4xl px-4">
          <h1 className="text-3xl md:text-5xl font-black tracking-tight">{t('title')}</h1>
        </div>
      </section>

      <div className="container max-w-4xl px-4 space-y-8 text-foreground" dir={isRTL ? 'rtl' : 'ltr'}>
        {/* Profile Section */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="border-none shadow-lg overflow-hidden">
            <div className="h-2 bg-primary w-full" />
            <CardHeader>
              <div className="flex items-center gap-3 text-primary mb-1">
                <User className="w-5 h-5" />
                <span className="text-xs font-bold uppercase tracking-widest">{t('profile.title')}</span>
              </div>
              <CardTitle className="text-2xl">{t('profile.title')}</CardTitle>
              <CardDescription>{t('profile.subtitle')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row items-center gap-6 p-4 rounded-2xl bg-muted/30">
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary text-2xl font-black text-primary-foreground shadow-xl shadow-primary/20">
                  {user.name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 text-center sm:text-left min-w-0">
                  <p className="text-xl font-bold">{user.name}</p>
                  <p className="text-muted-foreground truncate mb-2">{user.email}</p>
                  <Badge variant="outline" className="bg-background font-bold uppercase tracking-widest text-[10px]">
                    {user.role}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Security Section */}
        <div className="grid md:grid-cols-2 gap-8">
          {/* Password Card */}
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
            <Card className="h-full border-none shadow-lg">
              <CardHeader>
                <div className="flex items-center gap-3 text-orange-500 mb-1">
                  <Lock className="w-5 h-5" />
                  <span className="text-xs font-bold uppercase tracking-widest">{t('password.title')}</span>
                </div>
                <CardTitle>{t('password.title')}</CardTitle>
                <CardDescription>{t('password.subtitle')}</CardDescription>
              </CardHeader>
              <CardContent>
                <form className="space-y-4" onSubmit={handlePasswordChange}>
                  <div className="space-y-2">
                    <Label htmlFor="currentPassword">{t('password.current')}</Label>
                    <Input
                      id="currentPassword"
                      type="password"
                      className="rounded-xl h-11"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder={t('password.placeholder')}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">{t('password.new')}</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      className="rounded-xl h-11"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder={t('password.placeholder')}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">{t('password.confirm')}</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      className="rounded-xl h-11"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder={t('password.placeholder')}
                    />
                  </div>

                  {passwordError && <p className="text-sm text-destructive font-medium">{passwordError}</p>}
                  {passwordSuccess && <p className="text-sm text-green-600 font-medium flex items-center gap-1"><CheckCircle2 className="w-4 h-4" /> {passwordSuccess}</p>}

                  <Button type="submit" disabled={isChangingPassword} className="w-full rounded-xl h-11 shadow-lg shadow-primary/10">
                    {isChangingPassword ? t('password.updating') : t('password.button')}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </motion.div>

          {/* MFA Card */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
            <Card className="h-full border-none shadow-lg">
              <CardHeader>
                <div className="flex items-center gap-3 text-green-500 mb-1">
                  <Smartphone className="w-5 h-5" />
                  <span className="text-xs font-bold uppercase tracking-widest">{t('mfa.security')}</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <CardTitle>{t('mfa.title')}</CardTitle>
                  <Badge variant={mfaEnabled ? 'success' : 'outline'} className="rounded-md">
                    {mfaEnabled ? t('mfa.enabled') : t('mfa.disabled')}
                  </Badge>
                </div>
                <CardDescription>
                  {mfaEnabled ? t('mfa.descriptionEnabled') : t('mfa.descriptionDisabled')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {mfaError && <p className="text-sm text-destructive font-medium">{mfaError}</p>}
                {mfaSuccess && <p className="text-sm text-green-600 font-medium flex items-center gap-1"><CheckCircle2 className="w-4 h-4" /> {mfaSuccess}</p>}

                {backupCodes && (
                  <div className="rounded-2xl border bg-muted/20 p-4 space-y-3">
                    <p className="text-sm font-bold">{t('mfa.backupCodes')}</p>
                    <p className="text-xs text-muted-foreground">
                      {t('mfa.backupCodesDesc')}
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {backupCodes.map((code, i) => (
                        <code key={i} className="text-xs bg-background border rounded-lg px-2 py-2 text-center font-mono">
                          {code}
                        </code>
                      ))}
                    </div>
                  </div>
                )}

                {mfaQrCode && (
                  <div className="space-y-4 bg-muted/30 p-4 rounded-2xl">
                    <p className="text-sm text-muted-foreground text-center">
                      {t('mfa.scanCode')}
                    </p>
                    <div className="flex justify-center bg-white p-2 rounded-xl">
                      <img src={mfaQrCode} alt="MFA QR Code" className="w-40 h-40" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="mfaCode">{t('mfa.verificationCode')}</Label>
                      <Input
                        id="mfaCode"
                        type="text"
                        inputMode="numeric"
                        className="rounded-xl h-11 text-center text-lg tracking-[0.5em] font-black"
                        value={mfaCode}
                        onChange={(e) => setMfaCode(e.target.value)}
                        placeholder="000000"
                        maxLength={6}
                      />
                    </div>
                    <Button
                      className="w-full rounded-xl h-11"
                      onClick={handleMfaVerify}
                      disabled={isVerifyingMfa || mfaCode.length < 6}
                    >
                      {isVerifyingMfa ? t('mfa.verifying') : t('mfa.verify')}
                    </Button>
                  </div>
                )}

                {!mfaQrCode && (
                  <div className="pt-2">
                    {mfaEnabled ? (
                      <Button variant="outline" className="w-full rounded-xl h-11 border-2 border-destructive/20 text-destructive hover:bg-destructive hover:text-destructive-foreground hover:border-destructive transition-all" onClick={handleMfaDisable}>
                        {t('mfa.disable')}
                      </Button>
                    ) : (
                      <Button onClick={handleMfaSetup} disabled={isSettingUpMfa} className="w-full rounded-xl h-11 shadow-lg shadow-primary/10 group">
                        {isSettingUpMfa ? t('mfa.settingUp') : t('mfa.setup')}
                        <ArrowRight className={cn("ml-2 w-4 h-4 transition-transform group-hover:translate-x-1", isRTL && "rotate-180")} />
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}