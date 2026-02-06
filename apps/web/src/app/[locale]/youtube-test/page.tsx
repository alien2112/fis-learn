'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Lock, Unlock, Play, ExternalLink } from 'lucide-react';

interface YouTubeTestCase {
  name: string;
  description: string;
  videoId: string;
  privacy: 'public' | 'unlisted' | 'private';
  expected: string;
}

const testCases: YouTubeTestCase[] = [
  {
    name: 'Public Video',
    description: 'Standard public YouTube video - should play normally',
    videoId: 'dQw4w9WgXcQ',
    privacy: 'public',
    expected: 'Should play without issues',
  },
  {
    name: 'Unlisted Video',
    description: 'Unlisted video - accessible with direct link only',
    videoId: 'jfKfPfyJRdk', // Lofi girl - example
    privacy: 'unlisted',
    expected: 'Should play (no search indexing)',
  },
  {
    name: 'Privacy-Enhanced Mode',
    description: 'Uses youtube-nocookie.com for no tracking',
    videoId: 'dQw4w9WgXcQ',
    privacy: 'public',
    expected: 'No cookies stored',
  },
];

export default function YouTubeTestPage() {
  const [selectedTest, setSelectedTest] = useState<YouTubeTestCase>(testCases[0]);
  const [embedMode, setEmbedMode] = useState<'standard' | 'privacy'>('privacy');
  const [showControls, setShowControls] = useState(true);

  const getEmbedUrl = (videoId: string, mode: 'standard' | 'privacy') => {
    const baseUrl = mode === 'privacy' 
      ? 'https://www.youtube-nocookie.com' 
      : 'https://www.youtube.com';
    const params = showControls ? '' : '?controls=0';
    return `${baseUrl}/embed/${videoId}${params}`;
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-slate-800 mb-2">
            🔒 YouTube Hidden Videos Test
          </h1>
          <p className="text-slate-600">
            Test embedded YouTube videos with different privacy settings
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Test Cases Panel */}
          <div className="lg:col-span-1 space-y-4">
            <h2 className="font-semibold text-slate-800 mb-4">Test Cases</h2>
            {testCases.map((test) => (
              <button
                key={test.name}
                onClick={() => setSelectedTest(test)}
                className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                  selectedTest.name === test.name
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-slate-800">{test.name}</span>
                  {test.privacy === 'public' ? (
                    <Eye className="w-4 h-4 text-emerald-500" />
                  ) : test.privacy === 'unlisted' ? (
                    <EyeOff className="w-4 h-4 text-amber-500" />
                  ) : (
                    <Lock className="w-4 h-4 text-red-500" />
                  )}
                </div>
                <p className="text-xs text-slate-500">{test.description}</p>
              </button>
            ))}

            {/* Controls */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 mt-6">
              <h3 className="font-medium text-slate-800 mb-4">Embed Settings</h3>
              
              <div className="space-y-3">
                <label className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Embed Mode</span>
                  <select
                    value={embedMode}
                    onChange={(e) => setEmbedMode(e.target.value as any)}
                    className="text-sm border rounded-lg px-2 py-1"
                  >
                    <option value="privacy">Privacy-Enhanced</option>
                    <option value="standard">Standard</option>
                  </select>
                </label>

                <label className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Show Controls</span>
                  <input
                    type="checkbox"
                    checked={showControls}
                    onChange={(e) => setShowControls(e.target.checked)}
                    className="w-4 h-4"
                  />
                </label>
              </div>
            </div>

            {/* Info Box */}
            <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl">
              <h3 className="font-medium text-amber-800 mb-2">⚠️ About Hidden Videos</h3>
              <ul className="text-xs text-amber-700 space-y-1">
                <li>• Unlisted: Not searchable but embeddable</li>
                <li>• Private: Cannot be embedded</li>
                <li>• Privacy mode: No YouTube cookies</li>
                <li>• Domain restrictions may apply</li>
              </ul>
            </div>
          </div>

          {/* Video Player Panel */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              {/* Player Header */}
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-slate-800">{selectedTest.name}</h2>
                  <p className="text-sm text-slate-500">{selectedTest.expected}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    selectedTest.privacy === 'public' 
                      ? 'bg-emerald-100 text-emerald-700'
                      : selectedTest.privacy === 'unlisted'
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-red-100 text-red-700'
                  }`}>
                    {selectedTest.privacy}
                  </span>
                </div>
              </div>

              {/* Video Player */}
              <div className="aspect-video bg-slate-900">
                <iframe
                  src={getEmbedUrl(selectedTest.videoId, embedMode)}
                  title="YouTube video player"
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              </div>

              {/* Video Info */}
              <div className="p-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 p-3 rounded-lg">
                    <p className="text-xs text-slate-500 mb-1">Video ID</p>
                    <p className="font-mono text-sm text-slate-800">{selectedTest.videoId}</p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg">
                    <p className="text-xs text-slate-500 mb-1">Embed URL</p>
                    <p className="font-mono text-xs text-slate-800 truncate">
                      {getEmbedUrl(selectedTest.videoId, embedMode)}
                    </p>
                  </div>
                </div>

                {/* Direct Links */}
                <div className="flex gap-2">
                  <a
                    href={`https://youtube.com/watch?v=${selectedTest.videoId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors text-sm"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Open on YouTube
                  </a>
                  <button
                    onClick={() => {
                      const url = getEmbedUrl(selectedTest.videoId, embedMode);
                      navigator.clipboard.writeText(url);
                      alert('Embed URL copied!');
                    }}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-sm"
                  >
                    <Play className="w-4 h-4" />
                    Copy Embed URL
                  </button>
                </div>
              </div>
            </div>

            {/* Test Results Guide */}
            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { 
                  status: '✅ Working', 
                  desc: 'Video plays normally',
                  color: 'bg-emerald-50 border-emerald-200 text-emerald-800'
                },
                { 
                  status: '⚠️ Restricted', 
                  desc: 'Domain/embed restrictions',
                  color: 'bg-amber-50 border-amber-200 text-amber-800'
                },
                { 
                  status: '❌ Blocked', 
                  desc: 'Private or deleted video',
                  color: 'bg-red-50 border-red-200 text-red-800'
                },
              ].map((item, i) => (
                <div key={i} className={`p-3 rounded-lg border ${item.color}`}>
                  <p className="font-medium">{item.status}</p>
                  <p className="text-xs opacity-80">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
