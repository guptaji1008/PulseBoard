import { io, Socket } from 'socket.io-client';
import { SOCKET_URL } from './config';

let socket: Socket | null = null;

/** Lazily create a single shared socket. Auth is handled via the HttpOnly cookie. */
export function getSocket(): Socket {
  if (!socket) {
    socket = io(SOCKET_URL, { withCredentials: true, transports: ['websocket', 'polling'] });
  }
  return socket;
}

export function disconnectSocket(): void {
  socket?.disconnect();
  socket = null;
}
