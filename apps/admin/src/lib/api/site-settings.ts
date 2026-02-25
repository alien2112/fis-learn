import apiClient from './client';

export interface SiteSettingRow {
  id: string;
  key: string;
  value: string;
  label: string;
  description?: string;
  category: string;
  updatedAt: string;
}

export const siteSettingsApi = {
  getAll: () => apiClient.get<SiteSettingRow[]>('/site-settings'),
  updateOne: (key: string, value: string) =>
    apiClient.patch<SiteSettingRow>(`/site-settings/${encodeURIComponent(key)}`, { value }),
  bulkUpdate: (updates: { key: string; value: string }[]) =>
    apiClient.post<SiteSettingRow[]>('/site-settings/bulk', { updates }),
};
