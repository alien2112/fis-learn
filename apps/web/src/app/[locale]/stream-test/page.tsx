'use client';

import React, { useState } from 'react';
import { ZegoStreamingRoom } from '@/components/streaming/ZegoStreamingRoom';

export default function StreamTestPage() {
  const [roomID, setRoomID] = useState('test-room-' + Math.floor(Math.random() * 1000));
  const [userName, setUserName] = useState('معلم ' + Math.floor(Math.random() * 100));
  const [role, setRole] = useState<'Host' | 'Cohost' | 'Audience'>('Host');
  const [joined, setJoined] = useState(false);

  // Generate a simple token (in production, get this from your API)
  const generateToken = () => {
    // This is a placeholder - in production, call your backend API
    return 'token-' + Date.now();
  };

  if (!joined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white p-6">
        <div className="max-w-md w-full bg-slate-800 rounded-xl p-6 shadow-xl">
          <h1 className="text-2xl font-bold mb-6 text-center">اختبار البث المباشر</h1>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1">معرف الغرفة</label>
              <input
                type="text"
                value={roomID}
                onChange={(e) => setRoomID(e.target.value)}
                className="w-full bg-slate-700 rounded-lg px-4 py-2 text-white"
              />
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-1">اسمك</label>
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                className="w-full bg-slate-700 rounded-lg px-4 py-2 text-white"
              />
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-1">الدور</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as any)}
                className="w-full bg-slate-700 rounded-lg px-4 py-2 text-white"
              >
                <option value="Host">مقدم (Host)</option>
                <option value="Cohost">مشارك (Cohost)</option>
                <option value="Audience">مشاهد (Audience)</option>
              </select>
            </div>

            <button
              onClick={() => setJoined(true)}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-lg transition-colors mt-4"
            >
              الانضمام للبث
            </button>

            <div className="text-xs text-slate-500 mt-4">
              <p>ملاحظات:</p>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>افتح نافذتين متصفح مختلفتين للاختبار</li>
                <li>استخدم نفس معرف الغرفة في النافذتين</li>
                <li>أحدهما Host والآخر Audience</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ZegoStreamingRoom
      config={{
        appID: 1765136310,
        server: 'wss://webliveroom1765136310-api.zego.im/ws',
        roomID,
        userID: 'user-' + Date.now(),
        userName,
        token: generateToken(),
        role,
      }}
      onLeave={() => setJoined(false)}
    />
  );
}
