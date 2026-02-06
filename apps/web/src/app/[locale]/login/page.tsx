'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/auth-context';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3011/api';

export default function LoginPage() {
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
      setError('Email and password are required.');
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
        const message = payload?.message || payload?.error || 'Login failed.';
        setError(Array.isArray(message) ? message.join(', ') : message);
        return;
      }

      const data = payload?.data;

      if (data?.mfaRequired) {
        setMfaPendingToken(data.mfaPendingToken);
        return;
      }

      // Tokens are now set as httpOnly cookies by the server
      setSuccess('Logged in successfully. Redirecting...');
      await refreshUser();
      router.push('/dashboard');
    } catch (err) {
      setError('Unable to reach the server. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMfaSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (!mfaPendingToken || !mfaCode) {
      setError('MFA code is required.');
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

      // Tokens are now set as httpOnly cookies by the server
      setSuccess('Logged in successfully. Redirecting...');
      await refreshUser();
      router.push('/dashboard');
    } catch (err) {
      setError('Unable to reach the server. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container flex min-h-[calc(100vh-4rem)] items-center justify-center py-12">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Welcome back</CardTitle>
          <CardDescription>Log in to continue your learning journey.</CardDescription>
        </CardHeader>
        <CardContent>
          {mfaPendingToken ? (
            <form className="space-y-4" onSubmit={handleMfaSubmit}>
              <div className="space-y-1">
                <p className="text-sm font-medium">Two-factor authentication</p>
                <p className="text-sm text-muted-foreground">
                  Enter the code from your authenticator app.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="mfaCode">Verification code</Label>
                <Input
                  id="mfaCode"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={mfaCode}
                  onChange={(event) => setMfaCode(event.target.value)}
                  placeholder="6-digit code"
                  maxLength={6}
                />
              </div>

              {error ? <p className="text-sm text-destructive">{error}</p> : null}
              {success ? <p className="text-sm text-green-600">{success}</p> : null}

              <Button type="submit" className="w-full" disabled={isSubmitting || mfaCode.length < 6}>
                {isSubmitting ? 'Verifying…' : 'Verify'}
              </Button>

              <button
                type="button"
                onClick={() => { setMfaPendingToken(null); setMfaCode(''); setError(null); }}
                className="text-sm text-primary hover:underline w-full"
              >
                Back to login
              </button>
            </form>
          ) : (
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Your password"
                />
              </div>

              <div className="flex justify-end">
                <Link href="/forgot-password" className="text-sm text-primary hover:underline">
                  Forgot your password?
                </Link>
              </div>

              {error ? <p className="text-sm text-destructive">{error}</p> : null}
              {success ? <p className="text-sm text-green-600">{success}</p> : null}

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? 'Signing in...' : 'Log In'}
              </Button>
            </form>
          )}

          <p className="mt-6 text-sm text-muted-foreground">
            New to FIS Learn?{' '}
            <Link href="/register" className="text-primary hover:underline">
              Create an account
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
