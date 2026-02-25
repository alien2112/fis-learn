export interface SiteSettings {
  [key: string]: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3011/api/v1';

export async function getSiteSettings(): Promise<SiteSettings> {
  try {
    const res = await fetch(`${API_URL}/site-settings/public`, {
      next: { revalidate: 300 }, // revalidate every 5 minutes
    });
    if (!res.ok) return {};
    const json = await res.json();
    // API wraps response in { data: ... } via TransformInterceptor
    return (json.data ?? json) as SiteSettings;
  } catch {
    return {};
  }
}
