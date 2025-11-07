import Fastify from "fastify";
import websocket from "@fastify/websocket";
import type * as FastifyWebsocket from "@fastify/websocket";
import { WebSocket } from "ws";

const engine = Fastify({ logger: true });
await engine.register(websocket);

let ball = { x: 0, y: 0, vx: 0.01, vy: 0.008 };
const clients = new Set<WebSocket>();
const tickRate = 1000 / 60;

setInterval(() => {
  ball.x += ball.vx;
  ball.y += ball.vy;
  if (ball.x > 1 || ball.x < -1) ball.vx *= -1;
  if (ball.y > 1 || ball.y < -1) ball.vy *= -1;

  const payload = JSON.stringify(ball);
  for (const socket of clients) {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(payload);
    } else {
      clients.delete(socket);
    }
  }
}, tickRate);

type SocketStream = FastifyWebsocket.SocketStream;

engine.get("/ws", { websocket: true }, (connection: SocketStream) => {
  const socket = connection.socket;
  clients.add(socket);
  socket.send(JSON.stringify(ball));
  socket.on("close", () => clients.delete(socket));
});

await engine.listen({ host: "0.0.0.0", port: 4000 });