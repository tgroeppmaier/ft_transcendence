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
  MAX_BALL_SPEED,
} from "../../../shared/constants.js";
import { Ball, Paddle, Score } from "../../../shared/types.js";
import { drawBall, drawPaddles, drawMessage, drawScores } from "../utils/gameRenderer.js";

export class LocalGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  private winner: string | null = null;
  private ball: Ball = { x: 0.5, y: 0.5, vx: BALL_X_SPEED, vy: BALL_Y_SPEED };
  private score: Score = { left: 0, right: 0};
  private lastUpdate: number;
  private keyMap: Record<string, boolean> = { "w": false, "s": false, "ArrowUp": false, "ArrowDown": false };
  private player1: string;
  private player2: string;
  private leftPaddle: Paddle;
  private rightPaddle: Paddle;
  private gameOver = false;
  private countdown = 5;
  private gameStarted = false;
  private rafID: number;
  private isTournamentGame: boolean;
  private onTournamentMatchEnd: ((winner: string) => void) | null;

  constructor(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, player1?: string, player2?: string, tG?: boolean, cb?: (winner: string) => void) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.lastUpdate = Date.now();
    this.player1 = player1 ?? "Player1";
    this.player2 = player2 ?? "Player2";
    this.isTournamentGame = tG ?? false;
    this.resetPaddles();
    this.onTournamentMatchEnd = cb ?? null;
  }

  public start() {
    this.lastUpdate = performance.now();
    this.rafID = requestAnimationFrame(this.tick);
  }

  public stop() {
    cancelAnimationFrame(this.rafID);
  }

  public onKeyDown(key: string) {
    if (key in this.keyMap) this.keyMap[key] = true;
  }

  public onKeyUp(key: string) {
    if (key in this.keyMap) this.keyMap[key] = false;
  }

  public resetGame = () => {
    if (!this.gameOver) return;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.score.left = 0;
    this.score.right = 0;
    this.resetPaddles();
    this.resetBall();
    cancelAnimationFrame(this.rafID);
    this.gameOver = false;
    this.gameStarted = false;
    this.countdown = 3;
    this.lastUpdate = performance.now();
    this.render()
    this.rafID = requestAnimationFrame(this.tick);
  }

    private resetBall() {
    this.ball.x = CANVAS_WIDTH / 2;
    this.ball.y = CANVAS_HEIGHT / 2;
    this.ball.vx = this.ball.vx > 0 ? -BALL_X_SPEED : BALL_X_SPEED;
    this.ball.vy = (Math.random() - 0.5) * BALL_Y_SPEED * 3;
  }

  private resetPaddles() {
    this.leftPaddle = { x: 0, y: CANVAS_HEIGHT / 2 - PADDLE_HEIGHT / 2 }
    this.rightPaddle = { x: CANVAS_WIDTH - PADDLE_WIDTH, y: CANVAS_HEIGHT / 2 - PADDLE_HEIGHT / 2 };
  }

  private render() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    if (!this.gameStarted) {
      drawMessage(this.ctx, this.canvas, `${this.player1}: W/S keys | ${this.player2}: Arrow Up/Down` , this.canvas.height / 3);
      drawMessage(this.ctx, this.canvas, `Game starts in ${Math.ceil(this.countdown)}`, this.canvas.height / 2);
    }
    else {
      drawBall(this.ctx, this.canvas, this.ball);
      drawPaddles(this.ctx, this.canvas, this.leftPaddle, this.rightPaddle);
      drawScores(this.ctx, this.canvas, this.score);
    }
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

    if (this.ball.vx < 0 && checkYaxis(this.leftPaddle) &&
      this.ball.x - BALL_RADIUS < this.leftPaddle.x + PADDLE_WIDTH) {
      this.ball.x = this.leftPaddle.x + PADDLE_WIDTH + BALL_RADIUS;
      this.bouncePaddle(this.leftPaddle.y);
    } else if (this.ball.vx > 0 && checkYaxis(this.rightPaddle) &&
      this.ball.x + BALL_RADIUS > this.rightPaddle.x) {
      this.ball.x = this.rightPaddle.x - BALL_RADIUS;
      this.bouncePaddle(this.rightPaddle.y);
    }
  }

  private handlePaddleMovement(dt: number) {
    if (this.keyMap["w"]) this.leftPaddle.y -= PADDLE_SPEED * dt;
    if (this.keyMap["s"]) this.leftPaddle.y += PADDLE_SPEED * dt;
    if (this.keyMap["ArrowUp"]) this.rightPaddle.y -= PADDLE_SPEED * dt;
    if (this.keyMap["ArrowDown"]) this.rightPaddle.y += PADDLE_SPEED * dt;

    this.leftPaddle.y = Math.max(0, Math.min(CANVAS_HEIGHT - PADDLE_HEIGHT, this.leftPaddle.y));
    this.rightPaddle.y = Math.max(0, Math.min(CANVAS_HEIGHT - PADDLE_HEIGHT, this.rightPaddle.y));
  }

  private handleWallCollision() {
    if (this.ball.y + BALL_RADIUS > CANVAS_HEIGHT) {
      this.ball.y = CANVAS_HEIGHT - BALL_RADIUS;
      this.ball.vy *= -1;
    }
    if (this.ball.y - BALL_RADIUS < 0) {
      this.ball.y = BALL_RADIUS;
      this.ball.vy *= -1;
    }
  }

  private handleScore() {
    if (this.ball.x < 0) {
      this.resetBall();
      this.score.right += 1;
    } else if (this.ball.x > CANVAS_WIDTH) {
      this.resetBall();
      this.score.left += 1;
    }
  }

  private handleGameEnd() {
    this.winner = this.score.left > this.score.right ? this.player1 : this.player2
    this.gameOver = true;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    drawScores(this.ctx, this.canvas, this.score);
    drawMessage(this.ctx, this.canvas, `${this.winner} wins`);
    if (this.isTournamentGame && this.onTournamentMatchEnd) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      this.onTournamentMatchEnd(this.winner);
      return;
    }
    drawMessage(this.ctx, this.canvas, "click to play again", (this.canvas.height / 3) * 2);
  }

  private tick = (now: number) => {
    const dt = (now - this.lastUpdate) / 1000;
    this.lastUpdate = now;
    if (!this.gameStarted) {
      this.countdown -= dt;
      if (this.countdown > 0) {
        this.render();
        this.rafID = requestAnimationFrame(this.tick);
        return;
      } else this.gameStarted = true;
    }
    this.ball.x += this.ball.vx * dt;
    this.ball.y += this.ball.vy * dt;

    this.handlePaddleMovement(dt);
    this.handlePaddleCollision();
    this.handleWallCollision();
    this.handleScore();

    if (this.score.left >= POINTS_TO_WIN || this.score.right >= POINTS_TO_WIN) {
      this.handleGameEnd();
      return;
    }

    this.render();
    this.rafID = requestAnimationFrame(this.tick);
  }
}
