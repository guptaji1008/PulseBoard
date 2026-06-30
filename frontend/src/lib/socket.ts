import { io, Socket } from 'socket.io-client';
import { SOCKET_URL } from './config';

let socket: Socket | null = null;

/**
 * Lazily create a single shared socket. Cookie auth doesn't reach this connection
 * in production (it lives on the Vercel domain via the rewrite proxy, while this
 * socket connects directly to the backend's own origin) — so a short-lived token
 * fetched over REST is passed explicitly instead.
 */
export function getSocket(token: string): Socket {
  if (!socket) {
    socket = io(SOCKET_URL, { withCredentials: true, transports: ['websocket', 'polling'], auth: { token } });
  }
  return socket;
}

export function disconnectSocket(): void {
  socket?.disconnect();
  socket = null;
}