'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { usersApi, UserProfile } from '@/lib/api/users';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { User, Lock, Mail, ChevronRight } from 'lucide-react';

const settingsNav = [
  { href: '/settings', label: 'Profile', icon: User, description: 'Manage your personal information' },
  { href: '/settings/security', label: 'Security', icon: Lock, description: 'Password and authentication' },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading: isAuthLoading } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const pathname = usePathname();

  useEffect(() => {
    if (!user) return;

    const loadProfile = async () => {
      try {
        const data = await usersApi.getMe();
        setProfile(data);
      } catch {
        // Error handled silently
      } finally {
        setIsLoading(false);
      }
    };

    loadProfile();
  }, [user]);

  if (isAuthLoading || isLoading) {
    return (
      <div className="container py-12">
        <Skeleton className="h-10 w-48 mb-8" />
        <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container py-12">
        <Card>
          <CardHeader>
            <CardTitle>Sign in required</CardTitle>
            <CardDescription>You must be logged in to access settings.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/login">Log In</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage your account preferences</p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
        {/* Sidebar Navigation */}
        <nav className="space-y-2">
          {settingsNav.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-4 py-3 transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted'
                )}
              >
                <Icon className="h-5 w-5" />
                <div className="flex-1">
                  <p className="font-medium">{item.label}</p>
                  <p className={cn('text-xs', isActive ? 'text-primary-foreground/70' : 'text-muted-foreground')}>
                    {item.description}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 opacity-50" />
              </Link>
            );
          })}
        </nav>

        {/* Main Content */}
        <div>{children}</div>
      </div>
    </div>
  );
}
