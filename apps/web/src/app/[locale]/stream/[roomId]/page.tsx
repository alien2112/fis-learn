'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { ZegoStreamingRoom } from '@/components/streaming/ZegoStreamingRoom';
import { Skeleton } from '@/components/ui/skeleton';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3011/api/v1';

interface StreamTokenResponse {
  token: string;
  appId: string;
  userId: string;
  userName: string;
  roomId: string;
  role: number;
}

export default function StreamRoomPage() {
  const params = useParams();
  const roomId = params?.roomId as string;
  const { user, isLoading: isAuthLoading } = useAuth();
  const [isLeft, setIsLeft] = useState(false);
  const [streamData, setStreamData] = useState<StreamTokenResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user || !roomId) return;

    const fetchToken = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API_URL}/streaming/token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            roomId,
            userName: user.name,
            role: 0, // Audience by default
          }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => null);
          throw new Error(errData?.error?.message || 'Failed to get stream token');
        }

        const json = await res.json();
        setStreamData(json.data);
      } catch (err: any) {
        setError(err.message || 'Failed to connect to stream');
      } finally {
        setIsLoading(false);
      }
    };

    fetchToken();
  }, [user, roomId]);

  if (isAuthLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="space-y-4 text-center">
          <Skeleton className="h-8 w-48 mx-auto bg-slate-700" />
          <Skeleton className="h-4 w-32 mx-auto bg-slate-700" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Login Required</h1>
          <p className="text-slate-400 mb-6">You must be logged in to join a stream.</p>
          <a
            href="/login"
            className="px-6 py-3 bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors inline-block"
          >
            Log In
          </a>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Connection Error</h1>
          <p className="text-slate-400 mb-6">{error}</p>
          <a
            href="/courses"
            className="px-6 py-3 bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors inline-block"
          >
            Back to Courses
          </a>
        </div>
      </div>
    );
  }

  if (isLeft) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">You have left the stream</h1>
          <p className="text-slate-400 mb-6">You left the session successfully.</p>
          <a
            href="/courses"
            className="px-6 py-3 bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors inline-block"
          >
            Back to Courses
          </a>
        </div>
      </div>
    );
  }

  if (!streamData) return null;

  const appID = parseInt(streamData.appId, 10);
  const zegoServer = process.env.NEXT_PUBLIC_ZEGO_SERVER
    || `wss://webliveroom${appID}-api.zego.im/ws`;

  return (
    <ZegoStreamingRoom
      config={{
        appID,
        server: zegoServer,
        roomID: roomId,
        userID: streamData.userId,
        userName: user.name,
        token: streamData.token,
        role: streamData.role === 1 ? 'Host' : 'Audience',
      }}
      onLeave={() => setIsLeft(true)}
    />
  );
}
