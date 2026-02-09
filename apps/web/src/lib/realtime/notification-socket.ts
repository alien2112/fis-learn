'use client';

import { io, Socket } from 'socket.io-client';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3011/api/v1';

function getWsOrigin(url: string) {
  try {
    return new URL(url).origin;
  } catch {
    // Fallback for non-absolute URLs (shouldn't happen in this app).
    return url.replace(/\/api(?:\/v\d+)?\/?$/, '');
  }
}

const WS_URL = getWsOrigin(API_URL);

export function createNotificationSocket(): Socket {
  return io(`${WS_URL}/notifications`, {
    withCredentials: true,
    transports: ['websocket'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 800,
  });
}
