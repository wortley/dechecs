import { io } from "socket.io-client"
import { API_URL } from "./constants"

export const socket = io(API_URL, {
  path: "/ws/socket.io",
  transports: ["websocket"],
  autoConnect: false,
  timeout: 2000,
})
