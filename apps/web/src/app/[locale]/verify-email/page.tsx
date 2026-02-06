'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3011/api';

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<'pending' | 'success' | 'error'>('pending');
  const [message, setMessage] = useState('Verifying your email…');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('No verification token found in the URL.');
      return;
    }

    let cancelled = false;

    const verify = async () => {
      try {
        const response = await fetch(`${API_URL}/auth/verify-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });

        const payload = await response.json();
        if (cancelled) return;

        if (response.ok) {
          setStatus('success');
          setMessage(payload?.data?.message || 'Email verified successfully.');
        } else {
          setStatus('error');
          setMessage(payload?.message || 'Verification failed.');
        }
      } catch {
        if (!cancelled) {
          setStatus('error');
          setMessage('Unable to reach the server. Please try again.');
        }
      }
    };

    verify();

    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <div className="container flex min-h-[calc(100vh-4rem)] items-center justify-center py-12">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>
            {status === 'pending'
              ? 'Verifying…'
              : status === 'success'
                ? 'Email verified'
                : 'Verification failed'}
          </CardTitle>
          <CardDescription>{message}</CardDescription>
        </CardHeader>
        {status !== 'pending' && (
          <CardContent>
            <Button asChild className="w-full">
              <Link href="/login">Go to login</Link>
            </Button>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
