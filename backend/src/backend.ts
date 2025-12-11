import Fastify from "fastify";
import websocket from "@fastify/websocket";
import { WebSocket } from "ws";

const backend = Fastify({ logger: true });
await backend.register(websocket);

// Config
const TICK_RATE = 1000 / 60;
const BALL_R = 0.015;
const PADDLE_W = 0.025;
const PADDLE_H = 0.25;
const PADDLE_SPEED = 0.018;
const BALL_SPEED = 0.008;
const MAX_BALL_SPEED = 0.025;
const WIN_SCORE = 5;

// State
let ballX = 0.5;
let ballY = 0.5;
let ballVX = BALL_SPEED;
let ballVY = BALL_SPEED * 0.75;
let paddle0Y = 0.5 - PADDLE_H / 2;
let paddle1Y = 0.5 - PADDLE_H / 2;
let paddle0DY = 0;
let paddle1DY = 0;
let score0 = 0;
let score1 = 0;
let player0: WebSocket | null = null;
let player1: WebSocket | null = null;
let waitingPlayer: WebSocket | null = null;
let gameInterval: ReturnType<typeof setInterval> | null = null;

function resetBall(dir: number) {
  ballX = 0.5;
  ballY = 0.5;
  ballVX = BALL_SPEED * dir;
  ballVY = (Math.random() - 0.5) * BALL_SPEED;
}

function resetGame() {
  paddle0Y = 0.5 - PADDLE_H / 2;
  paddle1Y = 0.5 - PADDLE_H / 2;
  paddle0DY = 0;
  paddle1DY = 0;
  score0 = 0;
  score1 = 0;
  resetBall(Math.random() > 0.5 ? 1 : -1);
  if (gameInterval) {
    clearInterval(gameInterval);
    gameInterval = null;
  }
}

function broadcast(msg: object) {
  const data = JSON.stringify(msg);
  if (player0 && player0.readyState === WebSocket.OPEN) player0.send(data);
  if (player1 && player1.readyState === WebSocket.OPEN) player1.send(data);
}

function bouncePaddle(paddleY: number) {
  // Reverse X direction and speed up
  ballVX = -ballVX * 1.05;
  if (Math.abs(ballVX) > MAX_BALL_SPEED) {
    ballVX = ballVX > 0 ? MAX_BALL_SPEED : -MAX_BALL_SPEED;
  }
  
  // Deflect if hit top or bottom 25% of paddle
  if (ballY < paddleY + PADDLE_H * 0.25) {
    ballVY = -Math.abs(ballVY) - 0.003;
  } else if (ballY > paddleY + PADDLE_H * 0.75) {
    ballVY = Math.abs(ballVY) + 0.003;
  }
}

function update() {
  // Move paddles
  paddle0Y = paddle0Y + paddle0DY;
  paddle1Y = paddle1Y + paddle1DY;
  if (paddle0Y < 0) paddle0Y = 0;
  if (paddle0Y > 1 - PADDLE_H) paddle0Y = 1 - PADDLE_H;
  if (paddle1Y < 0) paddle1Y = 0;
  if (paddle1Y > 1 - PADDLE_H) paddle1Y = 1 - PADDLE_H;

  // Move ball
  ballX = ballX + ballVX;
  ballY = ballY + ballVY;

  // Wall bounce
  if (ballY < BALL_R) {
    ballY = BALL_R;
    ballVY = Math.abs(ballVY);
  }
  if (ballY > 1 - BALL_R) {
    ballY = 1 - BALL_R;
    ballVY = -Math.abs(ballVY);
  }

  // Left paddle collision
  if (ballVX < 0 && ballX - BALL_R <= PADDLE_W) {
    if (ballY >= paddle0Y && ballY <= paddle0Y + PADDLE_H) {
      ballX = PADDLE_W + BALL_R;
      bouncePaddle(paddle0Y);
    }
  }

  // Right paddle collision
  if (ballVX > 0 && ballX + BALL_R >= 1 - PADDLE_W) {
    if (ballY >= paddle1Y && ballY <= paddle1Y + PADDLE_H) {
      ballX = 1 - PADDLE_W - BALL_R;
      bouncePaddle(paddle1Y);
    }
  }

  // Scoring
  if (ballX < 0) {
    score1++;
    if (score1 >= WIN_SCORE) {
      broadcast({ type: "gameOver", winner: 2, scores: { left: score0, right: score1 } });
      resetGame();
      if (player0) player0.close();
      if (player1) player1.close();
      player0 = null;
      player1 = null;
      return;
    }
    resetBall(1);
  }
  if (ballX > 1) {
    score0++;
    if (score0 >= WIN_SCORE) {
      broadcast({ type: "gameOver", winner: 1, scores: { left: score0, right: score1 } });
      resetGame();
      if (player0) player0.close();
      if (player1) player1.close();
      player0 = null;
      player1 = null;
      return;
    }
    resetBall(-1);
  }

  broadcast({
    type: "gameState",
    ball: { x: ballX, y: ballY },
    leftPaddle: { y: paddle0Y },
    rightPaddle: { y: paddle1Y },
    scores: { left: score0, right: score1 }
  });
}

backend.get("/api/ws", { websocket: true }, (conn) => {
  const socket = conn.socket;

  if (gameInterval || (player0 && player1)) {
    socket.send(JSON.stringify({ type: "error", message: "Game full or in progress" }));
    socket.close();
    return;
  }

  if (!waitingPlayer) {
    waitingPlayer = socket;
    socket.send(JSON.stringify({ type: "waiting" }));
    socket.on("close", function() {
      if (waitingPlayer === socket) waitingPlayer = null;
    });
    return;
  }

  // Second player joined
  player0 = waitingPlayer;
  player1 = socket;
  waitingPlayer = null;
  resetGame();

  player0.send(JSON.stringify({ type: "countdown", player: 1 }));
  player1.send(JSON.stringify({ type: "countdown", player: 2 }));

  // Helper to handle move messages
  function handleMove(playerSocket: WebSocket, data: unknown) {
    const msg = JSON.parse(String(data));
    if (msg.type !== "move") return;

    const isPlayer0 = playerSocket === player0;
    const isPlayer1 = playerSocket === player1;
    if (!isPlayer0 && !isPlayer1) return;

    let dy = 0;
    if (msg.action === "start") {
      if (msg.direction === "up") dy = -PADDLE_SPEED;
      if (msg.direction === "down") dy = PADDLE_SPEED;
    }

    if (isPlayer0) paddle0DY = dy;
    if (isPlayer1) paddle1DY = dy;
  }

  // Helper to handle disconnect
  function handleClose(playerSocket: WebSocket) {
    const wasPlayer0 = playerSocket === player0;
    const wasPlayer1 = playerSocket === player1;
    if (!wasPlayer0 && !wasPlayer1) return;

    if (gameInterval) {
      clearInterval(gameInterval);
      gameInterval = null;
    }

    if (player0 && player0 !== playerSocket) {
      player0.send(JSON.stringify({ type: "opponentDisconnected" }));
      player0.close();
    }
    if (player1 && player1 !== playerSocket) {
      player1.send(JSON.stringify({ type: "opponentDisconnected" }));
      player1.close();
    }

    player0 = null;
    player1 = null;
    resetGame();
  }

  // Set up handlers for BOTH players
  player0.on("message", (data: unknown) => handleMove(player0!, data));
  player0.on("close", () => handleClose(player0!));
  
  player1.on("message", (data: unknown) => handleMove(player1!, data));
  player1.on("close", () => handleClose(player1!));

  setTimeout(function() {
    if (player0 && player1) {
      gameInterval = setInterval(update, TICK_RATE);
    }
  }, 5000);
});

await backend.listen({ host: "0.0.0.0", port: 3000 });
