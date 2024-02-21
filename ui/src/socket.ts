import { io } from "socket.io-client";

const URL =
  process.env.NODE_ENV === "production"
    ? "https://unichess-api-62644c9d9bf1.herokuapp.com"
    : "http://localhost:8000";

export const socket = io(URL ?? "", {
  path: "/ws/socket.io",
  transports: ["websocket"],
  autoConnect: false,
  timeout: 2000,
});
