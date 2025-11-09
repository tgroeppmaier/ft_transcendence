import Fastify from "fastify";
import websocket from "@fastify/websocket";
import type * as FastifyWebsocket from "@fastify/websocket";
import { WebSocket } from "ws";
import { Paddle } from "./Paddle.js";
// import { Paddle} from "Paddle.js";

const engine = Fastify({ logger: true });
await engine.register(websocket);

let ball = { x: 0, y: 0, vx: 0.01, vy: 0.008 };
let paddle = new Paddle("left");

const clients = new Set<WebSocket>();
const tickRate = 1000 / 60;
const radius = 0.04;


setInterval(() => {
  ball.x += ball.vx;
  ball.y += ball.vy;

 // Left paddle bounce (paddle at x = -1 to -1 + paddleW, y = paddle.y to paddle.y + paddleH)
  if (ball.x - radius <= -1 + Paddle.PADDLE_W && ball.y >= paddle.y && ball.y <= paddle.y + Paddle.PADDLE_H) {
    ball.x = -1 + Paddle.PADDLE_W + radius;  // Position ball just outside the paddle
    ball.vx *= -1;
  } else if (ball.x + radius > 1) {
    ball.x = 1 - radius;
    ball.vx *= -1;
  } else if (ball.x - radius < -1) {
    ball.x = -1 + radius;
    ball.vx *= -1;
  }

  if (ball.y + radius > 1) {
    ball.y = 1 - radius;
    ball.vy *= -1;
  } else if (ball.y - radius < -1) {
    ball.y = -1 + radius;
    ball.vy *= -1;
  }

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