import { io, type Socket } from 'socket.io-client';
import { API_URL, isApiConfigured } from './api';

let socket: Socket | null = null;

export function getSocket(): Socket | null {
  if (!isApiConfigured()) return null;
  if (!socket) {
    socket = io(API_URL, { transports: ['websocket'], autoConnect: true });
  }
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function joinInningsRoom(inningsId: string) {
  getSocket()?.emit('join_innings', inningsId);
}

export function leaveInningsRoom(inningsId: string) {
  getSocket()?.emit('leave_innings', inningsId);
}
