import Fastify from "fastify";
import websocket from "@fastify/websocket";
import type * as FastifyWebsocket from "@fastify/websocket";
import { WebSocket } from "ws";
import { Paddle } from "./Paddle.js";

const backend = Fastify({ logger: true });
await backend.register(websocket);

// --- GAME CONFIG ---
const tickRate = 1000 / 60;
const ballRadius = 0.015;
const paddleSpeed = 0.015;
const winningScore = 5;
const aspectRatio = 800 / 600; // Canvas aspect ratio

// --- GAME STATE ---
let ball = { x: 0.5, y: 0.5, vx: 0.008, vy: 0.006 };
let leftPaddle = new Paddle("left");
let rightPaddle = new Paddle("right");
let scores = { left: 0, right: 0 };
let gameIsRunning = false;
let gameInterval: NodeJS.Timeout | null = null;

// --- PLAYER STATE ---
let waitingPlayer: WebSocket | null = null;
let players: WebSocket[] = []; // Index 0 = Left, Index 1 = Right

function resetBall() {
  ball = { x: 0.5, y: 0.5, vx: Math.random() > 0.5 ? 0.008 : -0.008, vy: (Math.random() - 0.5) * 0.008 };
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

function broadcast(msg: any) {
  const data = JSON.stringify(msg);
  players.forEach(p => {
    if (p.readyState === WebSocket.OPEN) p.send(data);
  });
}

function startGame() {
  gameIsRunning = true;
  if (!gameInterval) {
    gameInterval = setInterval(updateGame, tickRate);
  }
  broadcast({ type: "gameStart" });
}

function updateGame() {
  if (!gameIsRunning) return;

  // Move paddles
  leftPaddle.y += leftPaddle.dy;
  rightPaddle.y += rightPaddle.dy;
  leftPaddle.y = Math.max(0, Math.min(1 - leftPaddle.h, leftPaddle.y));
  rightPaddle.y = Math.max(0, Math.min(1 - rightPaddle.h, rightPaddle.y));

  ball.x += ball.vx;
  ball.y += ball.vy;

  // Wall collision
  if (ball.y - ballRadius < 0) {
    ball.y = ballRadius;
    ball.vy = Math.abs(ball.vy);
  } else if (ball.y + ballRadius > 1) {
    ball.y = 1 - ballRadius;
    ball.vy = -Math.abs(ball.vy);
  }

  // Simple AABB paddle collision
  // Left paddle (x=0, width=0.025)
  if (ball.vx < 0 && ball.x - ballRadius <= leftPaddle.w) {
    if (ball.y >= leftPaddle.y && ball.y <= leftPaddle.y + leftPaddle.h) {
      ball.x = leftPaddle.w + ballRadius;
      ball.vx = Math.abs(ball.vx);
    }
  }

  // Right paddle (x=1-0.025=0.975)
  if (ball.vx > 0 && ball.x + ballRadius >= rightPaddle.x) {
    if (ball.y >= rightPaddle.y && ball.y <= rightPaddle.y + rightPaddle.h) {
      ball.x = rightPaddle.x - ballRadius;
      ball.vx = -Math.abs(ball.vx);
    }
  }

  // Score
  if (ball.x - ballRadius < 0) {
    scores.right++;
    if (scores.right >= winningScore) {
      broadcast({ type: "gameOver", winner: 2, scores });
      resetGame();
      // Disconnect players after game over to reset lobby
      players.forEach(p => p.close());
      players = [];
    } else {
      resetBall();
    }
  } else if (ball.x + ballRadius > 1) {
    scores.left++;
    if (scores.left >= winningScore) {
      broadcast({ type: "gameOver", winner: 1, scores });
      resetGame();
      players.forEach(p => p.close());
      players = [];
    } else {
      resetBall();
    }
  }

  broadcast({
    type: "gameState",
    ball,
    leftPaddle: { y: leftPaddle.y },
    rightPaddle: { y: rightPaddle.y },
    scores
  });
}

backend.get("/api/ws", { websocket: true }, (connection: FastifyWebsocket.SocketStream) => {
  const socket = connection.socket;
  backend.log.info("Client connected");

  if (gameIsRunning || players.length >= 2) {
    socket.send(JSON.stringify({ type: "error", message: "Game full or in progress" }));
    socket.close();
    return;
  }

  if (!waitingPlayer) {
    waitingPlayer = socket;
    socket.send(JSON.stringify({ type: "waiting" }));
    
    socket.on("close", () => {
      if (waitingPlayer === socket) waitingPlayer = null;
    });
  } else {
    // Start game
    players = [waitingPlayer, socket];
    waitingPlayer = null;
    
    // Notify players of their side
    players[0].send(JSON.stringify({ type: "countdown", player: 1 }));
    players[1].send(JSON.stringify({ type: "countdown", player: 2 }));

    resetGame();
    
    // Start after countdown (approx 5s)
    setTimeout(() => {
      if (players.length === 2) startGame();
    }, 5000);
  }

  socket.on("message", (data) => {
    const msg = JSON.parse(data.toString());
    const playerIdx = players.indexOf(socket);
    
    if (playerIdx === -1) return; // Not in game

    if (msg.type === "move") {
      const paddle = playerIdx === 0 ? leftPaddle : rightPaddle;
      if (msg.action === "start") {
        paddle.dy = msg.direction === "up" ? -paddleSpeed : paddleSpeed;
      } else if (msg.action === "stop") {
        paddle.dy = 0;
      }
    }
  });

  socket.on("close", () => {
    const idx = players.indexOf(socket);
    if (idx !== -1) {
      // Player disconnected
      players.splice(idx, 1);
      gameIsRunning = false;
      if (gameInterval) clearInterval(gameInterval);
      gameInterval = null;
      
      // Notify remaining player
      players.forEach(p => {
        p.send(JSON.stringify({ type: "opponentDisconnected" }));
        p.close();
      });
      players = [];
      resetGame();
    }
  });
});

await backend.listen({ host: "0.0.0.0", port: 3000 });
