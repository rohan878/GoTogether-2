import { io, Socket } from "socket.io-client";
import { API_ORIGIN } from "./api";

let _socket: Socket | null = null;

export function getSocket(): Socket {
  if (_socket) return _socket;

  const token = localStorage.getItem("token") || "";

  _socket = io(API_ORIGIN, {
    transports: ["websocket"],
    withCredentials: true,
    auth: { token },
  });

  return _socket;
}

/**
 * ✅ Backward-compatible export:
 * Some files do: import { socket } from "../lib/socket";
 * We expose a Proxy that always forwards to the live socket instance.
 */
export const socket: Socket = new Proxy({} as Socket, {
  get(_target, prop) {
    const s = getSocket() as any;
    return s[prop as any];
  },
}) as Socket;

/**
 * ✅ Backward-compatible helper:
 * LoginPage calls this after receiving a token.
 */
export function reconnectSocketWithToken(token: string) {
  try {
    if (_socket) {
      _socket.disconnect();
      _socket = null;
    }

    _socket = io(API_ORIGIN, {
      transports: ["websocket"],
      withCredentials: true,
      auth: { token },
    });

    return _socket;
  } catch (e) {
    console.error("reconnectSocketWithToken failed:", e);
    return null;
  }
}

export function disconnectSocket() {
  if (_socket) {
    _socket.disconnect();
    _socket = null;
  }
}
