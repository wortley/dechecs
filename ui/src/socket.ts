import { io } from "socket.io-client";

const URL =
  process.env.NODE_ENV === "production"
    ? "https://wchessapi-1-f5231112.deta.app"
    : "http://localhost:8000";

export const socket = io(URL ?? "", {
  transports: ["websocket"],
  autoConnect: false,
});
