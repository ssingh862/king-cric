import { io, type Socket } from 'socket.io-client';
import { API_URL, isApiConfigured } from './api';

let socket: Socket | null = null;
const rooms = new Map<string, number>();

export function getSocket(): Socket | null {
  if (!isApiConfigured()) return null;
  if (!socket) {
    socket = io(API_URL, { transports: ['websocket'], autoConnect: true });
    socket.on('connect', () => {
      for (const inningsId of rooms.keys()) socket?.emit('join_innings', inningsId);
    });
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
  const count = rooms.get(inningsId) ?? 0;
  rooms.set(inningsId, count + 1);
  const connection = getSocket();
  if (count === 0 && connection?.connected) connection.emit('join_innings', inningsId);
}

export function leaveInningsRoom(inningsId: string) {
  const count = rooms.get(inningsId) ?? 0;
  if (count > 1) rooms.set(inningsId, count - 1);
  else {
    rooms.delete(inningsId);
    if (socket?.connected) socket.emit('leave_innings', inningsId);
  }
}
