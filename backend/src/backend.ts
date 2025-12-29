import Fastify, { fastify } from "fastify";
import websocket from "@fastify/websocket";
import type { WebSocket } from "@fastify/websocket";
import { randomUUID } from "crypto";
import cors from "@fastify/cors";

type Ball = { x: number; y: number; radius: number; vx: number; vy: number };
type Paddle = { x: number; y: number; w: number; h: number };
type State = "connecting" | "waiting" | "gameRunning" | "gameOver" | "gameFull";
type Score = { left: number; right: number };
type GameMessage = {
  ball: Ball;
  leftPaddle: Paddle;
  rightPaddle: Paddle;
  state: State;
  score: Score;
};
type ErrorMessage = { error: string };
type Action = {
  move: "start" | "stop";
  direction: "up" | "down";
};

type Player = WebSocket | null;

// scaling Factor 1 = 100%
const PADDLE_WIDTH = 0.02;
const PADDLE_HEIGHT = 0.2;
const PADDLE_SPEED = 0.6;
const BALL_X_SPEED = 0.6;
const BALL_Y_SPEED = 0.4;
const BALL_RADIUS = 0.02;

const POINTS_TO_WIN = 3;
const FPS = 1000 / 60;

class Game {
  public GameId: string;

  private ball: Ball;
  private canvas: { width: number; height: number };
  private leftPaddle: Paddle;
  private rightPaddle: Paddle;
  private score: Score;
  private state: State;
  private lastUpdate: number;
  private keyMap: Record<string, boolean>;
  private player1: Player;
  private player2: Player;
  private gameInterval: ReturnType<typeof setInterval> | null;
  private gameState: GameMessage;
  private onEmpty: () => void;

  constructor(id: string, onEmpty: () => void) {
    this.GameId = id;
    this.onEmpty = onEmpty;
    this.ball = {
      x: 0.5,
      y: 0.5,
      vx: BALL_X_SPEED,
      vy: BALL_Y_SPEED,
      radius: BALL_RADIUS,
    };
    this.canvas = { width: 1, height: 1 };
    this.leftPaddle = {
      x: 0,
      y: this.canvas.height / 2 - PADDLE_HEIGHT / 2,
      w: PADDLE_WIDTH,
      h: PADDLE_HEIGHT,
    };
    this.rightPaddle = {
      x: this.canvas.width - PADDLE_WIDTH,
      y: this.canvas.height / 2 - PADDLE_HEIGHT / 2,
      w: PADDLE_WIDTH,
      h: PADDLE_HEIGHT,
    };
    this.score = { left: 0, right: 0 };
    this.state = "waiting";
    this.lastUpdate = Date.now();
    this.keyMap = { up: false, down: false };
    this.player1 = null;
    this.player2 = null;
    this.gameInterval = null;
    this.gameState = {
      ball: this.ball,
      leftPaddle: this.leftPaddle,
      rightPaddle: this.rightPaddle,
      state: this.state,
      score: this.score,
    };
  }

  private broadcast(msg: object) {
    const data = JSON.stringify(msg);
    if (this.player1) this.player1.send(data);
    if (this.player2) this.player2.send(data);
  }

  public getState() {
    return this.state;
  }

  public addPlayer(socket: WebSocket) {
    if (!this.player1) {
      this.player1 = socket;
      this.setupPlayer(this.player1);
      this.player1.send(JSON.stringify(this.gameState));
    } else if (!this.player2) {
      this.player2 = socket;
      this.setupPlayer(this.player2);
    }
    // else {
    //   socket.send(JSON.stringify({ error: "Game is full" }));
    //   socket.close();
    //   return;
    // }

    if (this.player1 && this.player2 && !this.gameInterval) {
      this.state = "gameRunning";
      this.start();
    }
  }

  private setupPlayer(socket: WebSocket) {
    socket.on("message", (data) => {
      try {
        const msg = JSON.parse(data.toString()) as Action;
        if (msg.move === "start") this.keyMap[msg.direction] = true;
        if (msg.move === "stop") this.keyMap[msg.direction] = false;
        console.log("Message from client:", data.toString());
      } catch (err) {
        console.error("Failed to parse client message", err);
      }
    });

    socket.on("close", () => {
      if (this.player1 === socket) this.player1 = null;
      if (this.player2 === socket) this.player2 = null;

      this.state = "waiting";

      if (!this.player1 && !this.player2) {
        this.stop();
        this.onEmpty();
      }
      console.log("client disconnected");
    });

    socket.on("error", (err) => {
      console.log("Websocket error:", err);
    });
  }

  private start() {
    this.lastUpdate = Date.now();
    this.gameInterval = setInterval(() => this.update(), FPS);
  }

  private stop() {
    if (this.gameInterval) {
      clearInterval(this.gameInterval);
      this.gameInterval = null;
    }
    this.resetGame();
  }

  private resetBall() {
    this.ball.x = this.canvas.width / 2;
    this.ball.y = this.canvas.height / 2;
    this.ball.vx *= -1;
    this.ball.vy *= -1;
  }

  private resetPaddles() {
    this.leftPaddle.y = this.canvas.height / 2 - PADDLE_HEIGHT / 2;
    this.rightPaddle.y = this.canvas.height / 2 - PADDLE_HEIGHT / 2;
  }

  private resetGame() {
    this.resetBall();
    this.score.left = 0;
    this.score.right = 0;
    this.resetPaddles();
  }

  private handlePaddleCollision() {
    const checkYaxis = (paddle: Paddle) => {
      return (
        this.ball.y + this.ball.radius >= paddle.y &&
        this.ball.y - this.ball.radius <= paddle.y + paddle.h
      );
    };

    if (
      this.ball.vx < 0 &&
      checkYaxis(this.leftPaddle) &&
      this.ball.x - this.ball.radius < this.leftPaddle.w
    ) {
      this.ball.x = this.leftPaddle.w + this.ball.radius;
      this.ball.vx *= -1;
    } else if (
      this.ball.vx > 0 &&
      checkYaxis(this.rightPaddle) &&
      this.ball.x + this.ball.radius > this.rightPaddle.x
    ) {
      this.ball.x = this.rightPaddle.x - this.ball.radius;
      this.ball.vx *= -1;
    }
  }

  private handlePaddleMovement(dt: number) {
    if (this.keyMap["up"]) this.leftPaddle.y -= PADDLE_SPEED * dt;
    if (this.keyMap["down"]) this.leftPaddle.y += PADDLE_SPEED * dt;

    this.leftPaddle.y = Math.max(
      0,
      Math.min(1 - PADDLE_HEIGHT, this.leftPaddle.y),
    );
    this.rightPaddle.y = Math.max(
      0,
      Math.min(1 - PADDLE_HEIGHT, this.rightPaddle.y),
    );
  }

  private handleScore() {
    if (this.ball.x < 0) {
      this.resetBall();
      this.score.right += 1;
    } else if (this.ball.x > this.canvas.width) {
      this.resetBall();
      this.score.left += 1;
    }
  }

  private update() {
    const now = Date.now();
    const dt = (now - this.lastUpdate) / 1000;
    this.lastUpdate = now;

    if (!this.player1 || !this.player2) {
      this.broadcast({
        ball: this.ball,
        leftPaddle: this.leftPaddle,
        rightPaddle: this.rightPaddle,
        state: "waiting",
        score: this.score,
      });
      return;
    }

    this.ball.x += this.ball.vx * dt;
    this.ball.y += this.ball.vy * dt;

    this.handlePaddleMovement(dt);
    this.handlePaddleCollision();
    this.handleScore();

    if (this.ball.y + this.ball.radius > this.canvas.height) {
      this.ball.y = this.canvas.height - this.ball.radius;
      this.ball.vy *= -1;
    }
    if (this.ball.y - this.ball.radius < 0) {
      this.ball.y = this.ball.radius;
      this.ball.vy *= -1;
    }

    this.gameState = {
      ball: this.ball,
      leftPaddle: this.leftPaddle,
      rightPaddle: this.rightPaddle,
      state: this.state,
      score: this.score,
    };
    this.broadcast(this.gameState);
  }
}


const backend = Fastify({logger: true});
await backend.register(cors, { origin: true });
await backend.register(websocket);

const games = new Map<string, Game>();

// 1. API Endpoint for Game Creation
backend.post("/api/games", async (request, reply) => {
  const gameId = randomUUID();
  const newGame = new Game(gameId, () => {
    games.delete(gameId);
    console.log(`Game ${gameId} deleted`);
  }); 
  games.set(gameId, newGame);

  return { gameId };
});

backend.get("/api/games", async (request, reply) => {
  const gameIds = Array.from(games.keys());
  return { games: gameIds };
});

// 2. WebSocket Endpoint for Gameplay
backend.get("/api/ws/:id", { websocket: true }, (socket, req) => {
  const params = req.params as { id: string };
  const gameId = params.id;
  const game = games.get(gameId);
  console.log(`Attempting to join game with ID ${gameId}`);

  if (!game) {
    socket.send(JSON.stringify({ error: "Game not found" } as ErrorMessage));
    socket.close();
    return;
  }
  if (game.getState() !== "waiting") {
    socket.send(
      JSON.stringify({
        error: "Game is not accepting players",
      } as ErrorMessage),
    );
    console.log(`Game with ID ${game.GameId} is not accepting players`);
    socket.close();
    return;
  }

  game.addPlayer(socket);
});

await backend.listen({ host: "0.0.0.0", port: 3000 });
