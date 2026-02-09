'use client';

import { useState, useEffect } from 'react';

interface CookiePreferences {
  essential: true; // Always true, cannot be disabled
  analytics: boolean;
  thirdParty: boolean;
  consentDate: string;
}

const COOKIE_CONSENT_KEY = 'fis-cookie-consent';

export function getCookiePreferences(): CookiePreferences | null {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem(COOKIE_CONSENT_KEY);
  if (!stored) return null;
  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

function saveCookiePreferences(prefs: CookiePreferences) {
  localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(prefs));
  // Also set as cookie for server-side consent checking
  document.cookie = `fis-cookie-consent=${encodeURIComponent(JSON.stringify(prefs))}; path=/; max-age=${365 * 24 * 60 * 60}; SameSite=Lax`;
  // Record consent server-side
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3011/api/v1';
  fetch(`${apiUrl}/consent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      analytics: prefs.analytics,
      thirdParty: prefs.thirdParty,
      consentDate: prefs.consentDate,
    }),
  }).catch(() => {
    // Non-critical: consent is still stored client-side
  });
}

export function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [thirdParty, setThirdParty] = useState(false);

  useEffect(() => {
    const existing = getCookiePreferences();
    if (!existing) {
      setVisible(true);
    }
  }, []);

  if (!visible) return null;

  const acceptAll = () => {
    saveCookiePreferences({
      essential: true,
      analytics: true,
      thirdParty: true,
      consentDate: new Date().toISOString(),
    });
    setVisible(false);
  };

  const acceptSelected = () => {
    saveCookiePreferences({
      essential: true,
      analytics,
      thirdParty,
      consentDate: new Date().toISOString(),
    });
    setVisible(false);
  };

  const rejectAll = () => {
    saveCookiePreferences({
      essential: true,
      analytics: false,
      thirdParty: false,
      consentDate: new Date().toISOString(),
    });
    setVisible(false);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t shadow-lg p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
          <div className="flex-1">
            <h3 className="font-semibold text-lg mb-1">Cookie Preferences</h3>
            <p className="text-sm text-gray-600">
              We use cookies to provide essential functionality and improve your experience.
              You can choose which optional cookies to allow.
            </p>

            {showDetails && (
              <div className="mt-3 space-y-2">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked disabled className="rounded" />
                  <span><strong>Essential</strong> - Required for authentication and core functionality</span>
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={analytics}
                    onChange={(e) => setAnalytics(e.target.checked)}
                    className="rounded"
                  />
                  <span><strong>Analytics</strong> - Help us understand how you use the platform</span>
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={thirdParty}
                    onChange={(e) => setThirdParty(e.target.checked)}
                    className="rounded"
                  />
                  <span><strong>Third-party</strong> - Video players and external content</span>
                </label>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {!showDetails && (
              <button
                onClick={() => setShowDetails(true)}
                className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50"
              >
                Customize
              </button>
            )}
            {showDetails && (
              <button
                onClick={acceptSelected}
                className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50"
              >
                Save Preferences
              </button>
            )}
            <button
              onClick={rejectAll}
              className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50"
            >
              Reject All
            </button>
            <button
              onClick={acceptAll}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Accept All
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export type { CookiePreferences };
