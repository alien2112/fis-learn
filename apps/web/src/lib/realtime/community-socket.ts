'use client';

import { io, Socket } from 'socket.io-client';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3011/api/v1';

function getWsOrigin(url: string) {
  try {
    return new URL(url).origin;
  } catch {
    return url.replace(/\/api(?:\/v\d+)?\/?$/, '');
  }
}

const WS_URL = getWsOrigin(API_URL);

export function createCommunitySocket(): Socket {
  return io(`${WS_URL}/community`, {
    withCredentials: true,
    transports: ['websocket', 'polling'], // polling as fallback if websocket blocked
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,       // start at 1s
    reconnectionDelayMax: 30000,   // cap at 30s
    randomizationFactor: 0.5,      // jitter to avoid thundering herd
    timeout: 20000,
    ackTimeout: 20000,
  });
}
