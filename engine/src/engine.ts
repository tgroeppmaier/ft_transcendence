import Fastify from "fastify";
import websocket from "@fastify/websocket";
import type * as FastifyWebsocket from "@fastify/websocket";
import { WebSocket } from "ws";
import { Paddle } from "./Paddle.js";

const engine = Fastify({ logger: true });
await engine.register(websocket);

let ball = { x: 0.5, y: 0.5, vx: 0.01, vy: 0.008 };  // Center on 0-1 grid
let leftPaddle = new Paddle("left");

const clients = new Set<WebSocket>();
const tickRate = 1000 / 60;
const radius = 0.04;

setInterval(() => {
  ball.x += ball.vx;
  ball.y += ball.vy;

  // Paddle collision (left paddle)
  if (ball.x - radius <= leftPaddle.x + leftPaddle.w && ball.y >= leftPaddle.y && ball.y <= leftPaddle.y + leftPaddle.h) {
    ball.x = leftPaddle.x + leftPaddle.w + radius;
    ball.vx *= -1;
  } else if (ball.x + radius > 1) {  // Right wall
    ball.x = 1 - radius;
    ball.vx *= -1;
  } else if (ball.x - radius < 0) {  // Left wall
    ball.x = 0 + radius;
    ball.vx *= -1;
  }

  if (ball.y + radius > 1) {  // Bottom wall
    ball.y = 1 - radius;
    ball.vy *= -1;
  } else if (ball.y - radius < 0) {  // Top wall
    ball.y = 0 + radius;
    ball.vy *= -1;
  }

  const payload = JSON.stringify({
    ball,
    leftPaddle: {
      x: leftPaddle.x,
      y: leftPaddle.y,
      w: leftPaddle.w,
      h: leftPaddle.h
    }
  });
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
  socket.on("close", () => clients.delete(socket));
});

await engine.listen({ host: "0.0.0.0", port: 4000 });