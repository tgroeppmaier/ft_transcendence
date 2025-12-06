import Fastify from "fastify";
import websocket from "@fastify/websocket";
import type * as FastifyWebsocket from "@fastify/websocket";
import { WebSocket } from "ws";
import { Paddle } from "./Paddle.js";

const tickRate = 1000 / 60;
const ballRadius = 0.02;
const paddleSpeed = 0.02;
const winningScore = 5;

let ball = { x: 0.5, y: 0.5, vx: 0.01, vy: 0.008 };
let leftPaddle = new Paddle("left");
let rightPaddle = new Paddle("right");
let scores = { left: 0, right: 0 };
let gameIsRunning = false;
let backendSocket: WebSocket | null = null;
let gameInterval: NodeJS.Timeout | null = null;

const engine = Fastify({ logger: true });
await engine.register(websocket);

function resetBall() {
  ball = { x: 0.5, y: 0.5, vx: Math.random() > 0.5 ? 0.01 : -0.01, vy: (Math.random() - 0.5) * 0.01 };
}

function resetGame() {
  leftPaddle.reset();
  rightPaddle.reset();
  resetBall();
  scores = { left: 0, right: 0 };
  gameIsRunning = false;
  if (gameInterval) {
    clearInterval(gameInterval);
    gameInterval = null;
  }
}

function startGame() {
  gameIsRunning = true;
  if (!gameInterval) {
    gameInterval = setInterval(updateGame, tickRate);
  }
}

engine.get("/ws", { websocket: true }, (connection: FastifyWebsocket.SocketStream) => {
  backendSocket = connection.socket;
  resetGame();

  backendSocket.on("message", (data) => {
    const message = JSON.parse(data.toString());
    const playerPaddle = message.player === 1 ? leftPaddle : rightPaddle;

    if (message.type === "move") {
      if (message.action === "start") {
        playerPaddle.dy = message.direction === "up" ? -paddleSpeed : paddleSpeed;
      } else if (message.action === "stop") {
        playerPaddle.dy = 0;
      }
    } else if (message.type === "reset") {
      resetGame();
    } else if (message.type === "start") {
      startGame();
    }
  });

  backendSocket.on("close", () => {
    backendSocket = null;
    resetGame();
  });
});

function updateGame() {
  if (!gameIsRunning) return;

  // Move paddles
  leftPaddle.y += leftPaddle.dy;
  rightPaddle.y += rightPaddle.dy;
  leftPaddle.y = Math.max(0, Math.min(1 - leftPaddle.h, leftPaddle.y));
  rightPaddle.y = Math.max(0, Math.min(1 - rightPaddle.h, rightPaddle.y));

  ball.x += ball.vx;
  ball.y += ball.vy;

  // Wall collision (top/bottom)
  if (ball.y - ballRadius < 0 || ball.y + ballRadius > 1) {
    ball.vy *= -1;
  }

  // Paddle collision
  if (ball.vx < 0 && ball.x - ballRadius < leftPaddle.x + leftPaddle.w &&
    ball.y > leftPaddle.y && ball.y < leftPaddle.y + leftPaddle.h) {
    ball.vx *= -1;
    ball.x = leftPaddle.x + leftPaddle.w + ballRadius;
  }
  if (ball.vx > 0 && ball.x + ballRadius > rightPaddle.x &&
    ball.y > rightPaddle.y && ball.y < rightPaddle.y + rightPaddle.h) {
    ball.vx *= -1;
    ball.x = rightPaddle.x - ballRadius;
  }

  // Score
  if (ball.x - ballRadius < 0) {
    scores.right++;
    if (scores.right >= winningScore) {
      if (backendSocket) backendSocket.send(JSON.stringify({ type: "gameOver", winner: 2, scores }));
      resetGame();
    } else {
      resetBall();
    }
  } else if (ball.x + ballRadius > 1) {
    scores.left++;
    if (scores.left >= winningScore) {
      if (backendSocket) backendSocket.send(JSON.stringify({ type: "gameOver", winner: 1, scores }));
      resetGame();
    } else {
      resetBall();
    }
  }

  const payload = JSON.stringify({
    type: "gameState",
    ball,
    leftPaddle: { y: leftPaddle.y },
    rightPaddle: { y: rightPaddle.y },
    scores
  });

  if (backendSocket && backendSocket.readyState === WebSocket.OPEN) {
    backendSocket.send(payload);
  }
}

await engine.listen({ host: "0.0.0.0", port: 4000 });