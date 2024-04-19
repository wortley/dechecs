import { io } from "socket.io-client";

const URL = import.meta.env.VITE_API_URL;

export const socket = io(URL, {
  path: "/ws/socket.io",
  transports: ["websocket"],
  autoConnect: false,
  timeout: 2000,
});
