import { io } from "socket.io-client";

// Same env var convention as api/client.js.
const BASE_URL = (process.env.EXPO_PUBLIC_API_URL?.trim?.() || "http://localhost:5001").replace(/\/$/, "");

let socket = null;

export function connectSocket() {
  if (!socket) {
    socket = io(BASE_URL, {
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
    });
  } else if (!socket.connected) {
    socket.connect();
  }
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
}

export function getSocket() {
  return socket;
}
