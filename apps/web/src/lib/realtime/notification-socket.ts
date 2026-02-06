'use client';

import { io, Socket } from 'socket.io-client';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3011/api';
const WS_URL = API_URL.replace(/\/api\/?$/, '');

export function createNotificationSocket(): Socket {
  return io(`${WS_URL}/notifications`, {
    withCredentials: true,
    transports: ['websocket'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 800,
  });
}
