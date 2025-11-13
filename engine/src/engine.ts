import Fastify from "fastify";
import websocket from "@fastify/websocket";
import type * as FastifyWebsocket from "@fastify/websocket";
import { WebSocket } from "ws";
import { Paddle } from "./Paddle.js";

const tickRate = 1000 / 60;
const radius = 0.04;

let ball = { x: 0.5, y: 0.5, vx: 0.01, vy: 0.008 };
let leftPaddle = new Paddle("left");
let backendSocket: WebSocket | null = null;

const engine = Fastify({ logger: true });
await engine.register(websocket);

engine.get("/ws", { websocket: true }, (connection: FastifyWebsocket.SocketStream) => {
  backendSocket = connection.socket;
  backendSocket.on("close", () => backendSocket = null);
});

function updateGame() {
  ball.x += ball.vx;
  ball.y += ball.vy;

  // Paddle collision
  if (ball.x - radius <= leftPaddle.x + leftPaddle.w && ball.y >= leftPaddle.y && ball.y <= leftPaddle.y + leftPaddle.h) {
    ball.x = leftPaddle.x + leftPaddle.w + radius;
    ball.vx *= -1;
  } else if (ball.x + radius > 1) {
    ball.x = 1 - radius;
    ball.vx *= -1;
  } else if (ball.x - radius < 0) {
    ball.x = 0 + radius;
    ball.vx *= -1;
  }

  if (ball.y + radius > 1) {
    ball.y = 1 - radius;
    ball.vy *= -1;
  } else if (ball.y - radius < 0) {
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
  if (backendSocket && backendSocket.readyState === WebSocket.OPEN) {
    backendSocket.send(payload);
  }
}

setInterval(updateGame, tickRate);
await engine.listen({ host: "0.0.0.0", port: 4000 });