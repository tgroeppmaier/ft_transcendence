import { WebSocket } from "@fastify/websocket";
import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  BALL_X_SPEED,
  BALL_Y_SPEED,
  POINTS_TO_WIN,
  FPS,
} from "../../shared/constants.js";
import {
  Ball,
  GameStatus,
  Score,
  InitMessage,
  StateSnapshot,
  GameStateSnapshot,
  Action,
} from "../../shared/types.js";
import { handlePaddleCollision, handleWallCollision, resetBall } from "../../shared/gameLogic.js";
import { Player, Side } from "./player.js";

export class Game {
  public gameId: string;

  private ball: Ball;
  private score: Score;
  private state: GameStatus;
  private countdown: number = 3;
  private lastUpdate: number;
  private player1: Player | null = null;
  private player2: Player | null = null;
  private gameInterval: ReturnType<typeof setInterval> | null;
  private onEmpty: () => void;
  private onResult?: (winnerId: number) => void;

  constructor(id: string, onEmpty: () => void, onResult?: (winnerId: number) => void) {
    this.gameId = id;
    this.onEmpty = onEmpty;
    this.onResult = onResult;
    this.ball = { x: 0.5, y: 0.5, vx: BALL_X_SPEED, vy: BALL_Y_SPEED };
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
    if (this.player1?.userId === userId || this.player2?.userId === userId) {
      socket.send(JSON.stringify({ type: "error", message: "You cannot join the same game twice" }));
      socket.close();
      return;
    }
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
      this.state = "countdown";
      this.countdown = 3;
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
      if ((this.state === "gameRunning" || this.state === "countdown") && this.player1 && this.player2) {
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

        if (this.onResult && winnerId) this.onResult(winnerId);

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
        }).catch(err => console.error("Failed to save forfeit result:", err));
      }

      if (isPlayer1) this.player1 = null;
      if (isPlayer2) this.player2 = null;

      this.state = "gameOver";
      this.broadcastState();
      this.stop(false);
      this.onEmpty();
      console.log(`Game ${this.gameId}: Client disconnected, game over`);
    });

    player.socket.on("error", (err) => {
      console.error(`Game ${this.gameId}: WebSocket error`, err);
    });
  }

  private start() {
    this.lastUpdate = Date.now();
    this.gameInterval = setInterval(() => this.tick(), FPS);
  }

  private stop(reset = true) {
    if (this.gameInterval) {
      clearInterval(this.gameInterval);
      this.gameInterval = null;
    }
    // Force close sockets to ensure cleanup and prevent memory leaks
    if (this.player1?.socket && this.player1.socket.readyState === 1) {
       this.player1.socket.close();
    }
    if (this.player2?.socket && this.player2.socket.readyState === 1) {
       this.player2.socket.close();
    }

    if (reset) this.resetGame();
  }

  private resetPaddles() {
    this.player1?.resetPaddle();
    this.player2?.resetPaddle();
  }

  private resetGame() {
    resetBall(this.ball);
    this.score.left = 0;
    this.score.right = 0;
    this.resetPaddles();
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

  private handleScore() {
    let scoreChanged = false;
    if (this.ball.x < 0) {
      resetBall(this.ball);
      this.score.right += 1;
      scoreChanged = true;
    } else if (this.ball.x > CANVAS_WIDTH) {
      resetBall(this.ball);
      this.score.left += 1;
      scoreChanged = true;
    }

    if (scoreChanged) {
      this.broadcastState();
    }
  }

  private tick() {
    const now = Date.now();
    const dt = (now - this.lastUpdate) / 1000;
    this.lastUpdate = now;

    if (!this.player1 || !this.player2) {
      this.stop(); // Stop game if player missing
      return;
    }

    if (this.state === "countdown") {
      this.countdown -= dt;
      if (this.countdown <= 0) {
        this.state = "gameRunning";
        this.broadcastState();
      }
      const snapshot = this.createGameState();
      if (snapshot) this.broadcast(snapshot);
      return;
    }

    this.ball.x += this.ball.vx * dt;
    this.ball.y += this.ball.vy * dt;

    this.handlePaddleMovement(dt);
    handlePaddleCollision(this.ball, this.player1?.paddle, this.player2?.paddle);
    this.handleScore();

    if (this.score.left >= POINTS_TO_WIN || this.score.right >= POINTS_TO_WIN) {
      this.state = "gameOver";
      this.broadcastState();

      // Save Match Result to Database
      if (this.player1 && this.player2) {
        const winnerId = this.score.left > this.score.right ? this.player1.userId : (this.score.right > this.score.left ? this.player2.userId : null);

        if (this.onResult && winnerId) this.onResult(winnerId);

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
      this.onEmpty();
      return;
    }
    handleWallCollision(this.ball);

    const snapshot = this.createGameState();
    if (snapshot) {
      this.broadcast(snapshot);
    }
  }
}
