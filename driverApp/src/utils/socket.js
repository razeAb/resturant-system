import { io } from "socket.io-client";

// Same env var convention as api/client.js.
const BASE_URL = (process.env.EXPO_PUBLIC_API_URL?.trim?.() || "http://localhost:5001").replace(/\/$/, "");

let socket = null;
let currentDriverId = null;

export function connectSocket(token) {
  if (!socket) {
    socket = io(BASE_URL, {
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      auth: { token },
    });
    // A fresh connection gets a fresh server-side socketId, so presence has to be
    // re-announced on every (re)connect, not just once - otherwise a reconnect after
    // a dropped network leaves the driver looking online in the DB but unreachable.
    socket.on("connect", () => {
      if (currentDriverId) socket.emit("driver_online", currentDriverId);
    });
  } else if (!socket.connected) {
    socket.auth = { token };
    socket.connect();
  }
  return socket;
}

// Announces this driver's presence so the backend can target delivery offers at their
// socket (it tracks presence via these explicit events + Driver.socketId, not a
// JWT-derived room - see server.js's driver_online/driver_offline handlers).
export function identifyDriver(driverId) {
  currentDriverId = driverId || null;
  if (currentDriverId && socket?.connected) socket.emit("driver_online", currentDriverId);
}

export function disconnectSocket() {
  if (socket?.connected) socket.emit("driver_offline");
  currentDriverId = null;
  socket?.disconnect();
}

export function getSocket() {
  return socket;
}
