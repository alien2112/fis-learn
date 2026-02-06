'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import { ZegoStreamingRoom } from '@/components/streaming/ZegoStreamingRoom';

export default function StreamRoomPage() {
  const params = useParams();
  const roomId = params?.roomId as string;
  const [isLeft, setIsLeft] = useState(false);

  // Get user info from your auth system
  const userInfo = {
    userID: 'user-' + Math.random().toString(36).substr(2, 9),
    userName: 'طالب ' + Math.floor(Math.random() * 100),
    token: 'your-jwt-token-here', // Get this from your API
    role: 'Audience' as const,
  };

  if (isLeft) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">تم المغادرة</h1>
          <p className="text-slate-400 mb-6">غادرت الجلسة بنجاح</p>
          <a
            href="/courses"
            className="px-6 py-3 bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors inline-block"
          >
            العودة للدورات
          </a>
        </div>
      </div>
    );
  }

  return (
    <ZegoStreamingRoom
      config={{
        appID: 1765136310,
        server: 'wss://webliveroom1765136310-api.zego.im/ws',
        roomID: roomId || 'test-room',
        userID: userInfo.userID,
        userName: userInfo.userName,
        token: userInfo.token,
        role: userInfo.role,
      }}
      onLeave={() => setIsLeft(true)}
    />
  );
}
