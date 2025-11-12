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
const engineSocket = new WebSocket("ws://engine:4000/ws");

// Forward every message from engine to all connected clients
engineSocket.on("message", (data) => {
  const payload = Buffer.from(data as any).toString("utf8");

  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    } else {
      clients.delete(client);
    }
  }
});

engineSocket.on("open", () => backend.log.info("Connected to engine WS"));
engineSocket.on("close", () => backend.log.warn("Engine WS closed"));
engineSocket.on("error", (err) => backend.log.error({ err }, "Engine WS error"));

type SocketStream = FastifyWebsocket.SocketStream;

// Frontend WS endpoint
backend.get("/api/ws", { websocket: true }, (connection: SocketStream) => {
  const ClientSocket = connection.socket;
  clients.add(ClientSocket);

  ClientSocket.on("close", () => {
    clients.delete(ClientSocket);
  });
});

// Start server (port 3000 for backend)
await backend.listen({ host: "0.0.0.0", port: 3000 });