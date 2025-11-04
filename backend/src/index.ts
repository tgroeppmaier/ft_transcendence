import Fastify from "fastify";
import websocket from "@fastify/websocket";
import type * as FastifyWebsocket from "@fastify/websocket";
import { WebSocket } from "ws";

const backend = Fastify({ logger: true });

// Register WS support
await backend.register(websocket);

// Track connected frontend clients
const clients = new Set<WebSocket>();

// Connect to engine WS
// const engine_socket = new WebSocket("ws://host.docker.internal:4000/ws");
const engine_socket = new WebSocket("ws://engine:4000/ws");

// Forward every message from engine to all connected clients
engine_socket.on("message", (data) => {
  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    } else {
      clients.delete(client);
    }
  }
});

engine_socket.on("open", () => backend.log.info("Connected to engine WS"));
engine_socket.on("close", () => backend.log.warn("Engine WS closed"));
engine_socket.on("error", (err) => backend.log.error({ err }, "Engine WS error"));

type SocketStream = FastifyWebsocket.SocketStream;

// Frontend WS endpoint
backend.get("/ws", { websocket: true }, (connection: SocketStream) => {
  const client_socket = connection.socket;
  clients.add(client_socket);

  client_socket.on("close", () => {
    clients.delete(client_socket);
  });
});

// Start server (port 3000 for backend)
await backend.listen({ host: "0.0.0.0", port: 3000 });