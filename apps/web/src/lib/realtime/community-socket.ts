'use client';

import { io, Socket } from 'socket.io-client';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3011/api';
const WS_URL = API_URL.replace(/\/api\/?$/, '');

export function createCommunitySocket(): Socket {
  return io(`${WS_URL}/community`, {
    withCredentials: true,
    transports: ['websocket'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 800,
  });
}
