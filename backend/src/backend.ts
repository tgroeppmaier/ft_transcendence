import Fastify from "fastify";
import websocket from "@fastify/websocket";
import type * as FastifyWebsocket from "@fastify/websocket";
import { WebSocket } from "ws";

const backend = Fastify({ logger: true });
await backend.register(websocket);

// Config
const TICK_RATE = 1000 / 60;
const BALL_R = 0.015;
const PADDLE_W = 0.025;
const PADDLE_H = 0.2;
const PADDLE_SPEED = 0.018;
const BALL_SPEED = 0.008;
const MAX_BALL_SPEED = 0.025;
const WIN_SCORE = 5;

// State
let ball = { x: 0.5, y: 0.5, vx: BALL_SPEED, vy: BALL_SPEED * 0.75 };
let paddles = [
  { y: 0.5 - PADDLE_H / 2, dy: 0 },  // left
  { y: 0.5 - PADDLE_H / 2, dy: 0 }   // right
];
let scores = [0, 0];
let players: WebSocket[] = [];
let waitingPlayer: WebSocket | null = null;
let gameInterval: NodeJS.Timeout | null = null;

function resetBall(dir = Math.random() > 0.5 ? 1 : -1) {
  ball = { x: 0.5, y: 0.5, vx: BALL_SPEED * dir, vy: (Math.random() - 0.5) * BALL_SPEED };
}

function resetGame() {
  paddles[0].y = paddles[1].y = 0.5 - PADDLE_H / 2;
  paddles[0].dy = paddles[1].dy = 0;
  scores = [0, 0];
  resetBall();
  if (gameInterval) { clearInterval(gameInterval); gameInterval = null; }
}

function broadcast(msg: object) {
  const data = JSON.stringify(msg);
  players.forEach(p => p.readyState === WebSocket.OPEN && p.send(data));
}

function bouncePaddle(paddleY: number, goingRight: boolean) {
  const hitPos = (ball.y - paddleY - PADDLE_H / 2) / (PADDLE_H / 2);
  const speed = Math.min(Math.hypot(ball.vx, ball.vy) * 1.05, MAX_BALL_SPEED);
  const angle = hitPos * Math.PI / 3;
  ball.vx = Math.cos(angle) * speed * (goingRight ? 1 : -1);
  ball.vy = Math.sin(angle) * speed;
}

function update() {
  // Move paddles
  for (const p of paddles) {
    p.y = Math.max(0, Math.min(1 - PADDLE_H, p.y + p.dy));
  }

  // Move ball
  ball.x += ball.vx;
  ball.y += ball.vy;

  // Wall bounce
  if (ball.y < BALL_R) { ball.y = BALL_R; ball.vy = Math.abs(ball.vy); }
  if (ball.y > 1 - BALL_R) { ball.y = 1 - BALL_R; ball.vy = -Math.abs(ball.vy); }

  // Left paddle
  if (ball.vx < 0 && ball.x - BALL_R <= PADDLE_W &&
      ball.y >= paddles[0].y && ball.y <= paddles[0].y + PADDLE_H) {
    ball.x = PADDLE_W + BALL_R;
    bouncePaddle(paddles[0].y, true);
  }

  // Right paddle
  if (ball.vx > 0 && ball.x + BALL_R >= 1 - PADDLE_W &&
      ball.y >= paddles[1].y && ball.y <= paddles[1].y + PADDLE_H) {
    ball.x = 1 - PADDLE_W - BALL_R;
    bouncePaddle(paddles[1].y, false);
  }

  // Scoring
  let scorer = ball.x < 0 ? 1 : ball.x > 1 ? 0 : -1;
  if (scorer >= 0) {
    scores[scorer]++;
    if (scores[scorer] >= WIN_SCORE) {
      broadcast({ type: "gameOver", winner: scorer + 1, scores: { left: scores[0], right: scores[1] } });
      resetGame();
      players.forEach(p => p.close());
      players = [];
      return;
    }
    resetBall(scorer === 0 ? -1 : 1);
  }

  broadcast({
    type: "gameState",
    ball,
    leftPaddle: { y: paddles[0].y },
    rightPaddle: { y: paddles[1].y },
    scores: { left: scores[0], right: scores[1] }
  });
}

backend.get("/api/ws", { websocket: true }, (conn: FastifyWebsocket.SocketStream) => {
  const socket = conn.socket;

  if (gameInterval || players.length >= 2) {
    socket.send(JSON.stringify({ type: "error", message: "Game full or in progress" }));
    socket.close();
    return;
  }

  if (!waitingPlayer) {
    waitingPlayer = socket;
    socket.send(JSON.stringify({ type: "waiting" }));
    socket.on("close", () => { if (waitingPlayer === socket) waitingPlayer = null; });
    return;
  }

  // Second player joined - start game
  players = [waitingPlayer, socket];
  waitingPlayer = null;
  resetGame();

  players[0].send(JSON.stringify({ type: "countdown", player: 1 }));
  players[1].send(JSON.stringify({ type: "countdown", player: 2 }));

  setTimeout(() => {
    if (players.length === 2) gameInterval = setInterval(update, TICK_RATE);
  }, 5000);

  socket.on("message", (data) => {
    const msg = JSON.parse(data.toString());
    const idx = players.indexOf(socket);
    if (idx < 0 || msg.type !== "move") return;

    paddles[idx].dy = msg.action === "start"
      ? (msg.direction === "up" ? -PADDLE_SPEED : PADDLE_SPEED)
      : 0;
  });

  socket.on("close", () => {
    const idx = players.indexOf(socket);
    if (idx < 0) return;
    
    players.splice(idx, 1);
    if (gameInterval) { clearInterval(gameInterval); gameInterval = null; }
    
    players.forEach(p => {
      p.send(JSON.stringify({ type: "opponentDisconnected" }));
      p.close();
    });
    players = [];
    resetGame();
  });
});

await backend.listen({ host: "0.0.0.0", port: 3000 });
