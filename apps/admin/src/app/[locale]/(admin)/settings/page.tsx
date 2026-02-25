'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RefreshCw, Save, Image as ImageIcon, User, CheckCircle2, AlertCircle } from 'lucide-react';
import { siteSettingsApi, SiteSettingRow } from '@/lib/api/site-settings';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<string, string> = {
  branding: 'Branding',
  hero: 'Hero Section',
  features: 'Features Section',
  testimonials: 'Testimonials',
  team: 'Team Members',
};

const CATEGORY_ORDER = ['branding', 'hero', 'features', 'testimonials', 'team'];

function groupByCategory(rows: SiteSettingRow[]): Record<string, SiteSettingRow[]> {
  return rows.reduce<Record<string, SiteSettingRow[]>>((acc, row) => {
    (acc[row.category] ??= []).push(row);
    return acc;
  }, {});
}

// ─────────────────────────────────────────────────────────────────────────────
// ImageSettingRow
// ─────────────────────────────────────────────────────────────────────────────

function ImageSettingRow({ setting }: { setting: SiteSettingRow }) {
  const [value, setValue] = useState(setting.value);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<'idle' | 'saved' | 'error'>('idle');
  const [previewError, setPreviewError] = useState(false);

  // Reset preview error when URL changes
  useEffect(() => { setPreviewError(false); }, [value]);

  const handleSave = async () => {
    setSaving(true);
    setStatus('idle');
    try {
      await siteSettingsApi.updateOne(setting.key, value);
      setStatus('saved');
      setTimeout(() => setStatus('idle'), 3000);
    } catch {
      setStatus('error');
    } finally {
      setSaving(false);
    }
  };

  const isDirty = value !== setting.value || status === 'saved';

  return (
    <div className="flex gap-4 items-start py-4 border-b last:border-0">
      {/* Image preview */}
      <div className="flex-shrink-0 w-20 h-20 rounded-lg border bg-muted overflow-hidden flex items-center justify-center">
        {value && !previewError ? (
          <img
            src={value}
            alt={setting.label}
            className="w-full h-full object-cover"
            onError={() => setPreviewError(true)}
          />
        ) : (
          <ImageIcon className="w-8 h-8 text-muted-foreground" />
        )}
      </div>

      {/* Label + input + save */}
      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="flex items-center gap-2">
          <Label className="font-medium text-sm">{setting.label}</Label>
          {status === 'saved' && (
            <span className="flex items-center gap-1 text-xs text-green-600">
              <CheckCircle2 className="w-3 h-3" /> Saved
            </span>
          )}
          {status === 'error' && (
            <span className="flex items-center gap-1 text-xs text-red-600">
              <AlertCircle className="w-3 h-3" /> Failed
            </span>
          )}
        </div>
        {setting.description && (
          <p className="text-xs text-muted-foreground">{setting.description}</p>
        )}
        <div className="flex gap-2">
          <Input
            value={value}
            onChange={(e) => { setValue(e.target.value); setStatus('idle'); }}
            placeholder="https://example.com/image.jpg"
            className="text-sm font-mono"
          />
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving || value === setting.value}
            className="shrink-0"
          >
            {saving ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <><Save className="w-3.5 h-3.5 mr-1" /> Save</>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// AccountTab (original settings content)
// ─────────────────────────────────────────────────────────────────────────────

function AccountTab() {
  const { user, isLoading, refreshUser } = useAuth();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try { await refreshUser(); } finally { setIsRefreshing(false); }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN': return 'destructive';
      case 'ADMIN': return 'default';
      case 'INSTRUCTOR': return 'secondary';
      default: return 'outline';
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'success' as any;
      case 'SUSPENDED': return 'warning' as any;
      case 'BANNED': return 'destructive';
      default: return 'outline';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="outline" onClick={handleRefresh} disabled={isRefreshing || isLoading}>
          <RefreshCw className="mr-2 h-4 w-4" />
          {isRefreshing ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Account</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-4 w-56" />
                <Skeleton className="h-4 w-32" />
              </div>
            ) : user ? (
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Name</span>
                  <span className="font-medium">{user.name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Email</span>
                  <span className="font-medium">{user.email}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Role</span>
                  <Badge variant={getRoleBadgeVariant(user.role)}>{user.role.replace('_', ' ')}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <Badge variant={getStatusBadgeVariant(user.status)}>{user.status}</Badge>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No user data available.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Preferences</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-4 w-40" />
              </div>
            ) : user ? (
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Locale</span>
                  <span className="font-medium">{user.locale || 'N/A'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Timezone</span>
                  <span className="font-medium">{user.timezone || 'N/A'}</span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No preferences available.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SiteImagesTab
// ─────────────────────────────────────────────────────────────────────────────

function SiteImagesTab() {
  const [settings, setSettings] = useState<SiteSettingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await siteSettingsApi.getAll();
      const data = (res.data as any)?.data ?? res.data;
      setSettings(Array.isArray(data) ? data : []);
    } catch {
      setError('Failed to load site settings.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader><Skeleton className="h-5 w-32" /></CardHeader>
            <CardContent className="space-y-4">
              {[1, 2].map((j) => <Skeleton key={j} className="h-16 w-full" />)}
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6 text-center text-red-600">
          <AlertCircle className="w-8 h-8 mx-auto mb-2" />
          <p>{error}</p>
          <Button variant="outline" className="mt-4" onClick={load}>Retry</Button>
        </CardContent>
      </Card>
    );
  }

  const grouped = groupByCategory(settings);

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Enter any publicly accessible image URL. Changes take effect within 5 minutes due to caching.
      </p>
      {CATEGORY_ORDER.map((cat) => {
        const rows = grouped[cat];
        if (!rows?.length) return null;
        return (
          <Card key={cat}>
            <CardHeader>
              <CardTitle className="text-base">{CATEGORY_LABELS[cat] ?? cat}</CardTitle>
              <CardDescription>{rows.length} image{rows.length !== 1 ? 's' : ''}</CardDescription>
            </CardHeader>
            <CardContent>
              {rows.map((row) => (
                <ImageSettingRow key={row.key} setting={row} />
              ))}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage your account and site configuration.</p>
      </div>

      <Tabs defaultValue="account">
        <TabsList>
          <TabsTrigger value="account" className="flex items-center gap-2">
            <User className="w-4 h-4" /> Account
          </TabsTrigger>
          <TabsTrigger value="site-images" className="flex items-center gap-2">
            <ImageIcon className="w-4 h-4" /> Site Images
          </TabsTrigger>
        </TabsList>

        <TabsContent value="account" className="mt-6">
          <AccountTab />
        </TabsContent>

        <TabsContent value="site-images" className="mt-6">
          <SiteImagesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
