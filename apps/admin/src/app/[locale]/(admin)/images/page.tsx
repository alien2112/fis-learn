'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Upload, Link2, CheckCircle2, AlertCircle, RefreshCw,
  Image as ImagesIcon, Loader2, X, Eye,
} from 'lucide-react';
import { siteSettingsApi, SiteSettingRow } from '@/lib/api/site-settings';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const CATEGORY_META: Record<string, { label: string; description: string }> = {
  branding:     { label: 'Branding',          description: 'Logo and brand identity images' },
  hero:         { label: 'Hero Section',       description: 'Large banner images shown on the homepage' },
  features:     { label: 'Features Section',   description: 'Images shown in the "Why choose us" feature blocks' },
  testimonials: { label: 'Testimonials',       description: 'Profile avatars for student testimonials' },
  team:         { label: 'Team Members',       description: 'Photos of the FIS Academy team' },
};

const CATEGORY_ORDER = ['branding', 'hero', 'features', 'testimonials', 'team'];

function groupByCategory(rows: SiteSettingRow[]): Record<string, SiteSettingRow[]> {
  return rows.reduce<Record<string, SiteSettingRow[]>>((acc, row) => {
    (acc[row.category] ??= []).push(row);
    return acc;
  }, {});
}

// ─────────────────────────────────────────────────────────────────────────────
// ImageCard — one card per site-setting image key
// ─────────────────────────────────────────────────────────────────────────────

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

function ImageCard({
  setting,
  onSaved,
}: {
  setting: SiteSettingRow;
  onSaved: (key: string, newValue: string) => void;
}) {
  const [urlValue, setUrlValue]       = useState(setting.value);
  const [previewSrc, setPreviewSrc]   = useState(setting.value);
  const [previewError, setPreviewError] = useState(false);
  const [uploading, setUploading]     = useState(false);
  const [status, setStatus]           = useState<SaveStatus>('idle');
  const [errorMsg, setErrorMsg]       = useState('');
  const [lightbox, setLightbox]       = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Keep URL input in sync if parent refreshes the setting
  useEffect(() => {
    setUrlValue(setting.value);
    setPreviewSrc(setting.value);
    setPreviewError(false);
  }, [setting.value]);

  const flash = (s: SaveStatus, msg = '') => {
    setStatus(s);
    setErrorMsg(msg);
    if (s === 'saved') setTimeout(() => setStatus('idle'), 3000);
  };

  // ── Save by URL ────────────────────────────────────────────────────────────
  const handleSaveUrl = async () => {
    if (!urlValue.trim()) return;
    flash('saving');
    try {
      await siteSettingsApi.updateOne(setting.key, urlValue.trim());
      setPreviewSrc(urlValue.trim());
      setPreviewError(false);
      onSaved(setting.key, urlValue.trim());
      flash('saved');
    } catch (e: unknown) {
      flash('error', e instanceof Error ? e.message : 'Save failed');
    }
  };

  // ── Upload file ────────────────────────────────────────────────────────────
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    flash('saving');
    try {
      const result = await siteSettingsApi.uploadImage(setting.key, file);
      setUrlValue(result.url);
      setPreviewSrc(result.url);
      setPreviewError(false);
      onSaved(setting.key, result.url);
      flash('saved');
    } catch (e: unknown) {
      flash('error', e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const isDirty = urlValue !== setting.value;

  return (
    <>
      <Card className="group relative overflow-hidden border-border/60 bg-card hover:shadow-lg transition-all duration-300">
        {/* Status badge */}
        {status !== 'idle' && (
          <div className={`absolute top-3 right-3 z-10 flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium
            ${status === 'saved'  ? 'bg-green-500/10 text-green-600' : ''}
            ${status === 'saving' ? 'bg-blue-500/10 text-blue-600'   : ''}
            ${status === 'error'  ? 'bg-red-500/10 text-red-600'     : ''}
          `}>
            {status === 'saving' && <Loader2 className="w-3 h-3 animate-spin" />}
            {status === 'saved'  && <CheckCircle2 className="w-3 h-3" />}
            {status === 'error'  && <AlertCircle className="w-3 h-3" />}
            {status === 'saving' ? 'Saving…' : status === 'saved' ? 'Saved!' : errorMsg || 'Error'}
          </div>
        )}

        {/* Image Preview */}
        <div
          className="relative w-full h-48 bg-muted/30 overflow-hidden cursor-pointer"
          onClick={() => previewSrc && !previewError && setLightbox(true)}
        >
          {previewSrc && !previewError ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewSrc}
              alt={setting.label}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              onError={() => setPreviewError(true)}
            />
          ) : (
            <div className="flex flex-col items-center justify-center w-full h-full gap-2 text-muted-foreground">
              <ImagesIcon className="w-10 h-10 opacity-30" />
              <span className="text-xs">{previewError ? 'Image failed to load' : 'No image set'}</span>
            </div>
          )}
          {/* Hover overlay */}
          {previewSrc && !previewError && (
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
              <Eye className="w-8 h-8 text-white drop-shadow" />
            </div>
          )}
        </div>

        <CardContent className="p-5 space-y-4">
          <div>
            <h3 className="font-semibold text-base">{setting.label}</h3>
            {setting.description && (
              <p className="text-xs text-muted-foreground mt-0.5">{setting.description}</p>
            )}
            <Badge variant="outline" className="mt-1 text-[10px]">{setting.key}</Badge>
          </div>

          {/* URL input */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground flex items-center gap-1">
              <Link2 className="w-3 h-3" /> Image URL
            </Label>
            <div className="flex gap-2">
              <Input
                value={urlValue}
                onChange={(e) => setUrlValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSaveUrl()}
                placeholder="https://…"
                className="h-8 text-xs"
              />
              <Button
                size="sm"
                variant={isDirty ? 'default' : 'outline'}
                disabled={!isDirty || status === 'saving'}
                onClick={handleSaveUrl}
                className="h-8 shrink-0"
              >
                {status === 'saving' ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Save'}
              </Button>
            </div>
          </div>

          {/* Upload button */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground flex items-center gap-1">
              <Upload className="w-3 h-3" /> Upload Image
            </Label>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
              className="hidden"
              onChange={handleFileChange}
            />
            <Button
              variant="outline"
              size="sm"
              className="w-full h-9 border-dashed border-2 hover:border-primary hover:bg-primary/5 transition-all"
              disabled={uploading || status === 'saving'}
              onClick={() => fileRef.current?.click()}
            >
              {uploading ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Uploading…</>
              ) : (
                <><Upload className="w-4 h-4 mr-2" /> Choose file to upload</>
              )}
            </Button>
            <p className="text-[10px] text-muted-foreground">JPG, PNG, WebP, GIF, SVG · Max 10 MB</p>
          </div>
        </CardContent>
      </Card>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setLightbox(false)}
        >
          <button
            className="absolute top-4 right-4 text-white hover:text-gray-300"
            onClick={() => setLightbox(false)}
          >
            <X className="w-8 h-8" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewSrc}
            alt={setting.label}
            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────

export default function ImagesPage() {
  const { isAuthenticated } = useAuth();
  const [settings, setSettings] = useState<SiteSettingRow[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');

  const load = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    setError('');
    try {
      const res = await siteSettingsApi.getAll();
      const data: SiteSettingRow[] = (res.data as any)?.data ?? res.data;
      // Only keep image-type settings (value looks like a URL or path)
      setSettings(data.filter((s) =>
        s.key.endsWith('_url') ||
        s.key.endsWith('_image') ||
        s.key.endsWith('_avatar') ||
        s.key === 'logo_url',
      ));
    } catch {
      setError('Failed to load image settings. Make sure you are logged in as admin.');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => { load(); }, [load]);

  const handleSaved = useCallback((key: string, newValue: string) => {
    setSettings((prev) =>
      prev.map((s) => (s.key === key ? { ...s, value: newValue } : s)),
    );
  }, []);

  const grouped   = groupByCategory(settings);
  const categories = CATEGORY_ORDER.filter((c) => (grouped[c]?.length ?? 0) > 0);
  const totalImages = settings.length;
  const hasUnsplash = settings.filter((s) => s.value.includes('unsplash')).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <ImagesIcon className="w-6 h-6 text-primary" />
            Site Images
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Upload or update all images displayed across the public website. Changes take effect immediately.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={load}
          disabled={loading}
          className="shrink-0"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Stats */}
      {!loading && !error && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="pt-4 pb-4">
              <p className="text-2xl font-bold">{totalImages}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Total image settings</p>
            </CardContent>
          </Card>
          <Card className="bg-orange-500/5 border-orange-500/20">
            <CardContent className="pt-4 pb-4">
              <p className="text-2xl font-bold text-orange-600">{hasUnsplash}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Using Unsplash placeholder</p>
            </CardContent>
          </Card>
          <Card className="bg-green-500/5 border-green-500/20">
            <CardContent className="pt-4 pb-4">
              <p className="text-2xl font-bold text-green-600">{totalImages - hasUnsplash}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Custom images set</p>
            </CardContent>
          </Card>
          <Card className="bg-blue-500/5 border-blue-500/20">
            <CardContent className="pt-4 pb-4">
              <p className="text-2xl font-bold text-blue-600">{categories.length}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Categories</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Error */}
      {error && (
        <Card className="border-red-200 bg-red-50 dark:bg-red-950/20">
          <CardContent className="pt-4 flex items-center gap-3 text-red-600">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p className="text-sm">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Loading skeletons */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <Skeleton className="h-48 rounded-t-lg rounded-b-none" />
              <CardContent className="p-5 space-y-3">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-9 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Tabs by category */}
      {!loading && !error && categories.length > 0 && (
        <Tabs defaultValue={categories[0]}>
          <TabsList className="flex-wrap h-auto gap-1 mb-2">
            {categories.map((cat) => (
              <TabsTrigger key={cat} value={cat} className="gap-1.5">
                {CATEGORY_META[cat]?.label ?? cat}
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                  {grouped[cat]?.length ?? 0}
                </Badge>
              </TabsTrigger>
            ))}
          </TabsList>

          {categories.map((cat) => (
            <TabsContent key={cat} value={cat} className="mt-6">
              <div className="mb-4">
                <h2 className="text-lg font-semibold">{CATEGORY_META[cat]?.label ?? cat}</h2>
                <p className="text-sm text-muted-foreground">{CATEGORY_META[cat]?.description}</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {(grouped[cat] ?? []).map((setting) => (
                  <ImageCard key={setting.key} setting={setting} onSaved={handleSaved} />
                ))}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      )}

      {!loading && !error && settings.length === 0 && (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <ImagesIcon className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p>No image settings found. The API may still be seeding defaults.</p>
            <Button variant="outline" size="sm" className="mt-4" onClick={load}>
              <RefreshCw className="w-4 h-4 mr-2" /> Try again
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
