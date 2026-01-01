import Fastify from "fastify";
import websocket from "@fastify/websocket";
import type { WebSocket } from "@fastify/websocket";
import { randomUUID, UUID } from "crypto";
import { validate as uuidValidate } from "uuid";

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

type Side = "left" | "right";
// scaling Factor 1 = 100%
const CANVAS_WIDTH = 1;
const CANVAS_HEIGHT = 1;
const PADDLE_WIDTH = 0.02;
const PADDLE_HEIGHT = 0.2;
const PADDLE_SPEED = 0.6;
const BALL_X_SPEED = 0.6;
const BALL_Y_SPEED = 0.4;
const BALL_RADIUS = 0.02;

const POINTS_TO_WIN = 3;
const FPS = 1000 / 60;

class Player {
  public socket: WebSocket;
  public side: Side;
  public keyMap: Record<string, boolean>;
  public paddle!: Paddle;

  constructor(socket: WebSocket, side: Side) {
    this.socket = socket;
    this.side = side;
    this.keyMap = { up: false, down: false };
    this.resetPaddle();
  }

  public resetPaddle() {
    this.paddle = this.side === "left" ? { x: 0, y: CANVAS_HEIGHT / 2 - PADDLE_HEIGHT / 2, w: PADDLE_WIDTH, h: PADDLE_HEIGHT, }
     : { x: CANVAS_WIDTH - PADDLE_WIDTH, y: CANVAS_HEIGHT / 2 - PADDLE_HEIGHT / 2, w: PADDLE_WIDTH, h: PADDLE_HEIGHT, };
  }

  public sendToSocket(msg: object) {
    if (this.socket && this.socket.readyState === 1) {
      this.socket.send(JSON.stringify(msg));
    }
  }

  public paddleMove(dt: number) {
    if (this.keyMap["up"]) this.paddle.y -= PADDLE_SPEED * dt;
    if (this.keyMap["down"]) this.paddle.y += PADDLE_SPEED * dt;

    this.paddle.y = Math.max(0, Math.min(1 - PADDLE_HEIGHT, this.paddle.y));
  }
}

class Game {
  public gameId: string;

  private ball: Ball;
  private canvas: { width: number; height: number };
  private score: Score;
  private state: State;
  private lastUpdate: number;
  private player1: Player | null = null;
  private player2: Player | null = null;
  private gameInterval: ReturnType<typeof setInterval> | null;
  private gameState: GameMessage | null = null;
  private onEmpty: () => void;

  constructor(id: string, onEmpty: () => void) {
    this.gameId = id;
    this.onEmpty = onEmpty;
    this.ball = { x: 0.5, y: 0.5, vx: BALL_X_SPEED, vy: BALL_Y_SPEED, radius: BALL_RADIUS, };
    this.canvas = { width: 1, height: 1 };
    this.score = { left: 0, right: 0 };
    this.state = "waiting";
    this.lastUpdate = Date.now();
    this.gameInterval = null;
  }

  private broadcast(msg: object) {
    this.player1?.sendToSocket(msg);
    this.player2?.sendToSocket(msg);
  }

  public getState() {
    return this.state;
  }

  public addPlayer(socket: WebSocket) {
    if (!this.player1) {
      this.player1 = new Player(socket, "left");
      this.setupPlayer(this.player1);
    } else if (!this.player2) {
      this.player2 = new Player(socket, "right");
      this.setupPlayer(this.player2);
    }
    if (this.player1 && this.player2 && !this.gameInterval) {
      this.state = "gameRunning";
      this.start();
    }
  }

  private setupPlayer(player: Player) {
    player.socket.on("message", (data) => {
      try {
        const msg = JSON.parse(data.toString()) as Partial<Action>;
        if ((msg.move !== "start" && msg.move !== "stop") ||
          (msg.direction !== "up" && msg.direction !== "down")) {
          return;
        }
        player.keyMap[msg.direction] = msg.move === "start";
      } catch {

      }
    });

    player.socket.on("close", () => {
      if (this.player1?.socket === player.socket) {
        // game over, save result in DB
        this.player1 = null;
      } else if (this.player2?.socket === player.socket) {
        this.player2 = null;
      }
      this.state = "gameOver";
      this.stop();
      this.onEmpty();
      backend.log.info(
        { gameId: this.gameId },
        "Client disconnected, game over",
      );
    });

    player.socket.on("error", (err) => {
      backend.log.error({ err, gameId: this.gameId }, "WebSocket error");
    });
  }

  private start() {
    this.lastUpdate = Date.now();
    this.gameInterval = setInterval(() => this.update(), FPS);
  }

  private stop(reset = true) {
    if (this.gameInterval) {
      clearInterval(this.gameInterval);
      this.gameInterval = null;
    }
    if (reset) this.resetGame();
  }

  private resetBall() {
    this.ball.x = this.canvas.width / 2;
    this.ball.y = this.canvas.height / 2;
    this.ball.vx *= -1;
    this.ball.vy = (Math.random() - 0.5) * BALL_Y_SPEED * 2;
  }

  private resetPaddles() {
    this.player1?.resetPaddle();
    this.player2?.resetPaddle();
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
      this.player1 &&
      this.ball.vx < 0 &&
      checkYaxis(this.player1?.paddle) &&
      this.ball.x - this.ball.radius < this.player1?.paddle.w
    ) {
      this.ball.x = this.player1?.paddle.w + this.ball.radius;
      this.ball.vx *= -1;
    } else if (
      this.player2 &&
      this.ball.vx > 0 &&
      checkYaxis(this.player2?.paddle) &&
      this.ball.x + this.ball.radius > this.player2?.paddle.x
    ) {
      this.ball.x = this.player2?.paddle.x - this.ball.radius;
      this.ball.vx *= -1;
    }
  }

  private handlePaddleMovement(dt: number) {
    this.player1?.paddleMove(dt);
    this.player2?.paddleMove(dt);
  }

  private handleScore() {
    if (this.ball.x < 0) { this.resetBall(); this.score.right += 1; }
    else if (this.ball.x > this.canvas.width) { this.resetBall(); this.score.left += 1; }
  }

  private handleWallCollision() {
    if (this.ball.y + this.ball.radius > this.canvas.height) {
      this.ball.y = this.canvas.height - this.ball.radius;
      this.ball.vy *= -1;
    }
    if (this.ball.y - this.ball.radius < 0) {
      this.ball.y = this.ball.radius;
      this.ball.vy *= -1;
    }
  }

  private update() {
    const now = Date.now();
    const dt = (now - this.lastUpdate) / 1000;
    this.lastUpdate = now;

    if (!this.player1 || !this.player2) {
      this.broadcast({
        ball: this.ball,
        leftPaddle: this.player1?.paddle,
        rightPaddle: this.player2?.paddle,
        state: "gameOver",
        score: this.score,
      });
      return;
    }

    this.ball.x += this.ball.vx * dt;
    this.ball.y += this.ball.vy * dt;

    this.handlePaddleMovement(dt);
    this.handlePaddleCollision();
    this.handleScore();

    // if (this.score.left >= POINTS_TO_WIN || this.score.right >= POINTS_TO_WIN) {
    //   this.state = "gameOver";
    //   this.gameState = {
    //     ball: this.ball,
    //     leftPaddle: this.player1.paddle,
    //     rightPaddle: this.player2.paddle,
    //     state: this.state,
    //     score: this.score,
    //   };
    //   this.broadcast(this.gameState);
    //   this.stop(false);
    //   return;
    // }

    this.handleWallCollision();

    this.gameState = {
      ball: this.ball,
      leftPaddle: this.player1.paddle,
      rightPaddle: this.player2.paddle,
      state: this.state,
      score: this.score,
    };
    this.broadcast(this.gameState);
  }
}

const backend = Fastify({ logger: true });
await backend.register(websocket);

const games = new Map<string, Game>();

// 1. API Endpoint for Game Creation
backend.post("/api/games", async (request, reply) => {
  const gameId = randomUUID();
  const newGame = new Game(gameId, () => {
    games.delete(gameId);
    backend.log.info(`Game ${gameId} deleted`);
  });
  games.set(gameId, newGame);
  backend.log.info({ gameId }, "New game created");

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
  if (!uuidValidate(gameId)) {
    backend.log.warn({ gameId }, "Invalid game ID attempted");
    socket.send(
      JSON.stringify({ error: "Invalid game ID format" } as ErrorMessage),
    );
    socket.close();
    return;
  }
  const game = games.get(gameId);
  backend.log.info({ gameId }, "Attempting to join game");

  if (!game) {
    backend.log.warn({ gameId }, "Game not found");
    socket.send(JSON.stringify({ error: "Game not found" } as ErrorMessage));
    socket.close();
    return;
  }
  if (game.getState() !== "waiting") {
    backend.log.info(
      { gameId, state: game.getState() },
      "Game not accepting players",
    );
    socket.send(
      JSON.stringify({
        error: "Game is not accepting players",
      } as ErrorMessage),
    );
    socket.close();
    return;
  }

  game.addPlayer(socket);
});

await backend.listen({ host: "0.0.0.0", port: 3000 });
