import Fastify from "fastify";
import websocket from "@fastify/websocket";
import cookie from "@fastify/cookie";
import jwt from "@fastify/jwt";
import type { WebSocket } from "@fastify/websocket";
import { randomUUID } from "crypto";
import { validate as uuidValidate } from "uuid";
import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  PADDLE_WIDTH,
  PADDLE_HEIGHT,
  PADDLE_SPEED,
  BALL_X_SPEED,
  BALL_Y_SPEED,
  BALL_RADIUS,
  POINTS_TO_WIN,
  FPS,
  MAX_BALL_SPEED,
} from "../../shared/constants.js";
import {
  Ball,
  Paddle,
  GameStatus,
  Score,
  InitMessage,
  StateSnapshot,
  GameStateSnapshot,
  ErrorMessage,
  Action,
} from "../../shared/types.js";

type Side = "left" | "right";

class Player {
  public userId: number;
  public socket: WebSocket;
  public side: Side;
  public keyMap: Record<string, boolean>;
  public paddle!: Paddle;

  constructor(userId: number, socket: WebSocket, side: Side) {
    this.userId = userId;
    this.socket = socket;
    this.side = side;
    this.keyMap = { up: false, down: false };
    this.resetPaddle();
  }

  public resetPaddle() {
    this.paddle = this.side === "left" ? { x: 0, y: CANVAS_HEIGHT / 2 - PADDLE_HEIGHT / 2 }
      : { x: CANVAS_WIDTH - PADDLE_WIDTH, y: CANVAS_HEIGHT / 2 - PADDLE_HEIGHT / 2 };
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
  private state: GameStatus;
  private lastUpdate: number;
  private player1: Player | null = null;
  private player2: Player | null = null;
  private gameInterval: ReturnType<typeof setInterval> | null;
  private onEmpty: () => void;

  constructor(id: string, onEmpty: () => void) {
    this.gameId = id;
    this.onEmpty = onEmpty;
    this.ball = { x: 0.5, y: 0.5, vx: BALL_X_SPEED, vy: BALL_Y_SPEED };
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

  private broadcastState() {
    const msg: StateSnapshot = {
      type: "state",
      status: this.state,
      score: [this.score.left, this.score.right],
    };
    this.broadcast(msg);
  }

  public getState() {
    return this.state;
  }

  public addPlayer(userId: number, socket: WebSocket) {
    if (!this.player1) {
      this.player1 = new Player(userId, socket, "left");
      this.setupPlayer(this.player1);
    } else if (!this.player2) {
      this.player2 = new Player(userId, socket, "right");
      this.setupPlayer(this.player2);
    }

    // Broadcast state update when player joins
    this.broadcastState();

    if (this.player1 && this.player2 && !this.gameInterval) {
      this.state = "gameRunning";
      this.broadcastState();
      this.start();
    }
  }

  private setupPlayer(player: Player) {
    player.sendToSocket({ type: "init", side: player.side } as InitMessage);

    player.socket.on("message", (data) => {
      try {
        const msg = JSON.parse(data.toString()) as Partial<Action>;
        if ((msg.move !== "start" && msg.move !== "stop") ||
          (msg.direction !== "up" && msg.direction !== "down")) {
          return;
        }
        player.keyMap[msg.direction] = msg.move === "start";
      } catch {
        // Ignore parse errors
      }
    });

    player.socket.on("close", () => {
      if (this.state === "gameOver") return;

      const isPlayer1 = this.player1?.socket === player.socket;
      const isPlayer2 = this.player2?.socket === player.socket;

      if (!isPlayer1 && !isPlayer2) return;

      // Only record stats if game was actually running
      if (this.state === "gameRunning" && this.player1 && this.player2) {
        const p1Id = this.player1.userId;
        const p2Id = this.player2.userId;
        let winnerId = null;

        if (isPlayer1) {
          winnerId = p2Id;
          this.score.right = POINTS_TO_WIN; // Give win to P2
        } else {
          winnerId = p1Id;
          this.score.left = POINTS_TO_WIN; // Give win to P1
        }

        // Save Match Result to Database
        fetch("http://database:3000/internal/match-result", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            player1_id: p1Id,
            player2_id: p2Id,
            score1: this.score.left,
            score2: this.score.right,
            winner_id: winnerId
          })
        }).catch(err => backend.log.error({ err }, "Failed to save forfeit result"));
      }

      if (isPlayer1) this.player1 = null;
      if (isPlayer2) this.player2 = null;

      this.state = "gameOver";
      this.broadcastState();
      this.stop(false);
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
    this.ball.vx = this.ball.vx > 0 ? -BALL_X_SPEED : BALL_X_SPEED;
    this.ball.vy = (Math.random() - 0.5) * BALL_Y_SPEED * 3;
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

  private bouncePaddle(paddleY: number) {
    this.ball.vx = -this.ball.vx * 1.05;
    if (Math.abs(this.ball.vx) > MAX_BALL_SPEED) {
      this.ball.vx = this.ball.vx > 0 ? MAX_BALL_SPEED : -MAX_BALL_SPEED;
    }
    if (this.ball.y < paddleY + PADDLE_HEIGHT * 0.25) {
      this.ball.vy = -Math.abs(this.ball.vy) - 0.01;
    } else if (this.ball.y > paddleY + PADDLE_HEIGHT * 0.75) {
      this.ball.vy = Math.abs(this.ball.vy) + 0.01;
    }
  }

  private handlePaddleCollision() {
    const checkYaxis = (paddle: Paddle) => {
      return (this.ball.y + BALL_RADIUS >= paddle.y && this.ball.y - BALL_RADIUS <= paddle.y + PADDLE_HEIGHT);
    };

    if (this.player1 && this.ball.vx < 0 && checkYaxis(this.player1.paddle) &&
      this.ball.x - BALL_RADIUS < this.player1.paddle.x + PADDLE_WIDTH) {
      this.ball.x = this.player1.paddle.x + PADDLE_WIDTH + BALL_RADIUS;
      this.bouncePaddle(this.player1.paddle.y);
    } else if (this.player2 && this.ball.vx > 0 && checkYaxis(this.player2.paddle) &&
      this.ball.x + BALL_RADIUS > this.player2.paddle.x) {
      this.ball.x = this.player2.paddle.x - BALL_RADIUS;
      this.bouncePaddle(this.player2.paddle.y);
    }
  }

  private handlePaddleMovement(dt: number) {
    this.player1?.paddleMove(dt);
    this.player2?.paddleMove(dt);
  }

  public createGameState(): GameStateSnapshot | null {
    if (!this.player1 || !this.player2) return null;

    return {
      t: Date.now(),
      b: [this.ball.x, this.ball.y],
      p: [this.player1.paddle.y, this.player2.paddle.y],
    };
  }

  public handleAction(userId: number, side: Side, move: Action["move"], direction: Action["direction"]): boolean {
    const targetPlayer = side === "left" ? this.player1 : this.player2;

    // Check if the user is actually the player they are trying to control
    if (targetPlayer && targetPlayer.userId === userId) {
      targetPlayer.keyMap[direction] = move === "start";
      return true;
    }
    return false;
  }

  private handleWallCollision() {
    if (this.ball.y + BALL_RADIUS > this.canvas.height) {
      this.ball.y = this.canvas.height - BALL_RADIUS;
      this.ball.vy *= -1;
    }
    if (this.ball.y - BALL_RADIUS < 0) {
      this.ball.y = BALL_RADIUS;
      this.ball.vy *= -1;
    }
  }

  private update() {
    const now = Date.now();
    const dt = (now - this.lastUpdate) / 1000;
    this.lastUpdate = now;

    if (!this.player1 || !this.player2) {
      this.stop(); // Stop game if player missing
      return;
    }

    this.ball.x += this.ball.vx * dt;
    this.ball.y += this.ball.vy * dt;

    this.handlePaddleMovement(dt);
    this.handlePaddleCollision();

    let scoreChanged = false;
    if (this.ball.x < 0) {
      this.resetBall();
      this.score.right += 1;
      scoreChanged = true;
    } else if (this.ball.x > this.canvas.width) {
      this.resetBall();
      this.score.left += 1;
      scoreChanged = true;
    }

    if (scoreChanged) {
      this.broadcastState();
    }

    if (this.score.left >= POINTS_TO_WIN || this.score.right >= POINTS_TO_WIN) {
      this.state = "gameOver";
      this.broadcastState();

      // Save Match Result to Database
      if (this.player1 && this.player2) {
        const winnerId = this.score.left > this.score.right ? this.player1.userId : (this.score.right > this.score.left ? this.player2.userId : null);

        // Use the docker service name "database" to reach the container
        fetch("http://database:3000/internal/match-result", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            player1_id: this.player1.userId,
            player2_id: this.player2.userId,
            score1: this.score.left,
            score2: this.score.right,
            winner_id: winnerId
          })
        }).catch(err => console.error("Failed to save match result:", err));
      }

      this.stop(false);
      return;
    }
    this.handleWallCollision();

    const snapshot = this.createGameState();
    if (snapshot) {
      this.broadcast(snapshot);
    }
  }
}

const backend = Fastify({ logger: true });
await backend.register(websocket);

const JWT_SECRET = process.env.JWT_SECRET || 'change_this_to_a_strong_secret';
await backend.register(cookie, { secret: JWT_SECRET });
await backend.register(jwt, { secret: JWT_SECRET });

backend.decorate("authenticate", async (request: any, reply: any) => {
  try {
    const token = request.cookies?.token;
    if (!token) return reply.code(401).send({ message: 'Not authenticated' });
    const decoded = backend.jwt.verify(token);
    request.user = decoded;
  } catch (err) {
    return reply.code(401).send({ message: 'Authentication error' });
  }
});

const games = new Map<string, Game>();

// 1. API Endpoint for Game Creation
backend.post("/api/games", { preHandler: [(backend as any).authenticate] }, async (request, reply) => {
  const gameId = randomUUID();
  const newGame = new Game(gameId, () => {
    games.delete(gameId);
    backend.log.info(`Game ${gameId} deleted`);
  });
  games.set(gameId, newGame);
  backend.log.info({ gameId }, "New game created");

  return { gameId };
});

backend.get("/api/games", { preHandler: [(backend as any).authenticate] }, async (request, reply) => {
  const gameIds = Array.from(games.keys());
  return { games: gameIds };
});

// 2. WebSocket Endpoint for Gameplay
backend.get("/api/ws/:id", { websocket: true }, (socket, req) => {
  const token = req.cookies?.token;
  if (!token) {
    socket.close();
    return;
  }
  let decoded;
  try {
    decoded = backend.jwt.verify(token) as { id: number };
  } catch {
    socket.close();
    return;
  }

  const userId = decoded.id;
  const params = req.params as { id: string };
  const gameId = params.id;
  if (!uuidValidate(gameId)) {
    backend.log.warn({ gameId }, "Invalid game ID attempted");
    socket.send(
      JSON.stringify({ type: "error", message: "Invalid game ID format" } as ErrorMessage),
    );
    socket.close();
    return;
  }
  const game = games.get(gameId);
  backend.log.info({ gameId }, "Attempting to join game");

  if (!game) {
    backend.log.warn({ gameId }, "Game not found");
    socket.send(JSON.stringify({ type: "error", message: "Game not found" } as ErrorMessage));
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
        type: "error",
        message: "Game is not accepting players",
      } as ErrorMessage),
    );
    socket.close();
    return;
  }

  game.addPlayer(userId, socket);
});

// 3. REST API for Server-Side Pong Module (CLI Interop)

// Get Game State (Polling)
backend.get("/api/games/:id/state", { preHandler: [(backend as any).authenticate] }, async (request, reply) => {
  const { id } = request.params as { id: string };
  const game = games.get(id);

  if (!game) {
    return reply.status(404).send({ type: "error", message: "Game not found" });
  }

  // Return the latest snapshot (or create one if null)
  const snapshot = game.createGameState();
  return snapshot || { type: "error", message: "Game not initialized" };
});

// Send Action (Control Paddle)
backend.post("/api/games/:id/action", { preHandler: [(backend as any).authenticate] }, async (request, reply) => {
  const { id } = request.params as { id: string };
  // Get userId from authenticated request
  const userId = (request as any).user.id;

  const body = request.body as {
    side: "left" | "right";
    move: "start" | "stop";
    direction: "up" | "down";
  };

  const game = games.get(id);

  if (!game) {
    return reply.status(404).send({ type: "error", message: "Game not found" });
  }

  const success = game.handleAction(userId, body.side, body.move, body.direction);

  if (success) {
    return { success: true, side: body.side, action: body.move, direction: body.direction };
  } else {
    return reply.status(403).send({ type: "error", message: "Forbidden: You cannot control this paddle" });
  }
});

await backend.listen({ host: "0.0.0.0", port: 3000 });