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
import { Shield, ShieldCheck } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3011/api';

export default function SettingsPage() {
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
      setPasswordError('All fields are required.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match.');
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
      setMfaSuccess('Two-factor authentication enabled.');
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
      setMfaSuccess('Two-factor authentication disabled.');
      setBackupCodes(null);
    } catch (err: any) {
      setMfaError(err?.response?.data?.message || 'Failed to disable MFA.');
    }
  };

  if (isAuthLoading || !user) {
    return (
      <div className="container py-12 max-w-2xl mx-auto space-y-6">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-64" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  return (
    <div className="container py-12 max-w-2xl mx-auto space-y-8">
      <h1 className="text-2xl font-bold">Settings</h1>

      {/* Profile card */}
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Your account information.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted text-lg font-semibold">
              {user.name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold">{user.name}</p>
              <p className="text-sm text-muted-foreground truncate">{user.email}</p>
            </div>
            <Badge variant="outline">{user.role}</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Password card */}
      <Card>
        <CardHeader>
          <CardTitle>Change password</CardTitle>
          <CardDescription>Update your account password.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handlePasswordChange}>
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Current password</Label>
              <Input
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword">New password</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm new password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat new password"
              />
            </div>

            {passwordError && <p className="text-sm text-destructive">{passwordError}</p>}
            {passwordSuccess && <p className="text-sm text-green-600">{passwordSuccess}</p>}

            <Button type="submit" disabled={isChangingPassword}>
              {isChangingPassword ? 'Updating…' : 'Update password'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* MFA card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              {mfaEnabled ? (
                <ShieldCheck className="h-5 w-5 text-green-500" />
              ) : (
                <Shield className="h-5 w-5 text-muted-foreground" />
              )}
              Two-factor authentication
            </CardTitle>
            <Badge variant={mfaEnabled ? 'default' : 'outline'}>
              {mfaEnabled ? 'Enabled' : 'Disabled'}
            </Badge>
          </div>
          <CardDescription>
            {mfaEnabled
              ? 'Your account is protected with two-factor authentication.'
              : 'Add an extra layer of security by requiring a code at login.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {mfaError && <p className="text-sm text-destructive">{mfaError}</p>}
          {mfaSuccess && <p className="text-sm text-green-600">{mfaSuccess}</p>}

          {backupCodes && (
            <div className="rounded-lg border p-4 space-y-2">
              <p className="text-sm font-medium">Backup codes</p>
              <p className="text-xs text-muted-foreground">
                Save these codes in a safe place. Each can only be used once.
              </p>
              <div className="grid grid-cols-2 gap-1">
                {backupCodes.map((code, i) => (
                  <code key={i} className="text-xs bg-muted rounded px-2 py-1 text-center">
                    {code}
                  </code>
                ))}
              </div>
            </div>
          )}

          {mfaQrCode && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
              </p>
              <div className="flex justify-center">
                <img src={mfaQrCode} alt="MFA QR Code" className="w-48 h-48" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mfaCode">Verification code</Label>
                <Input
                  id="mfaCode"
                  type="text"
                  inputMode="numeric"
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value)}
                  placeholder="Enter 6-digit code"
                  maxLength={6}
                />
              </div>
              <Button
                onClick={handleMfaVerify}
                disabled={isVerifyingMfa || mfaCode.length < 6}
              >
                {isVerifyingMfa ? 'Verifying…' : 'Verify and enable'}
              </Button>
            </div>
          )}

          {!mfaQrCode && (
            <div>
              {mfaEnabled ? (
                <Button variant="destructive" onClick={handleMfaDisable}>
                  Disable 2FA
                </Button>
              ) : (
                <Button onClick={handleMfaSetup} disabled={isSettingUpMfa}>
                  {isSettingUpMfa ? 'Setting up…' : 'Set up 2FA'}
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
