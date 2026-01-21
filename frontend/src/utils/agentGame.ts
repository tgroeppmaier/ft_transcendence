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
import { handlePaddleCollision, handleWallCollision } from "../../../shared/physics.js";
import { drawBall, drawPaddles, drawMessage, drawScores } from "../utils/gameRenderer.js";

export class AgentGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  private ball: Ball = { x: 0.5, y: 0.5, vx: BALL_X_SPEED, vy: BALL_Y_SPEED };
  private score: Score = { left: 0, right: 0};
  private lastUpdate: number;
  private keyAgentMap: Record<string, boolean> = { "w": false, "s": false };
  private keyPlayerMap: Record<string, boolean> = { "ArrowUp": false, "ArrowDown": false };
	private keyDebugMap: Record<string, boolean> = { "p": false }
  private player1: string;
  private player2: string;
  private leftPaddle: Paddle;
  private rightPaddle: Paddle;
  private gameOver = false;
  private countdown = 5;
  private gameStarted = false;
  private rafID: number;

  constructor(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, player1?: string, player2?: string) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.lastUpdate = Date.now();
    this.player1 = player1 ?? "Agent";
    this.player2 = player2 ?? "Player";
    this.resetPaddles();
  }

  public start() {
    this.lastUpdate = performance.now();
    this.rafID = requestAnimationFrame(this.tick);
  }

  public stop() {
    cancelAnimationFrame(this.rafID);
  }

  public onKeyDown(key: string) {
    if (key in this.keyPlayerMap) this.keyPlayerMap[key] = true;
		if (key in this.keyDebugMap) this.keyDebugMap[key] = !this.keyDebugMap[key];
  }

  public onKeyUp(key: string) {
    if (key in this.keyPlayerMap) this.keyPlayerMap[key] = false;
  }

  public resetGame = () => {
    if (this.gameOver) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      this.score.left = 0;
      this.score.right = 0;
      this.resetPaddles();
      this.resetBall();
      cancelAnimationFrame(this.rafID);
      this.gameOver = false;
      this.lastUpdate = performance.now();
      this.render()
      this.rafID = requestAnimationFrame(this.tick);
    }
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
      drawMessage(this.ctx, this.canvas, `                      ${this.player1}        VS      ${this.player2}: Arrow Up/Down` , this.canvas.height / 3);
      drawMessage(this.ctx, this.canvas, `Game starts in ${Math.ceil(this.countdown)}`, this.canvas.height / 2);
    }
    else {
      drawBall(this.ctx, this.canvas, this.ball);
      drawPaddles(this.ctx, this.canvas, this.leftPaddle, this.rightPaddle);
      drawScores(this.ctx, this.canvas, this.score);
			if (this.keyDebugMap['p']) {
				drawMessage(this.ctx, this.canvas, `w: ${this.keyAgentMap['w']}, s: ${this.keyAgentMap['s']}, p: ${this.keyDebugMap['p']}`);
				drawMessage(this.ctx, this.canvas, `${(this.leftPaddle.y).toFixed(5)} -- ${(this.leftPaddle.y + PADDLE_HEIGHT / 2).toFixed(5)} -- ${(this.leftPaddle.y + PADDLE_HEIGHT).toFixed(5)}`, this.canvas.height * 2/3);
				drawMessage(this.ctx, this.canvas, `${this.ball.y.toFixed(5)}, vx:${this.ball.vx.toFixed(5)}, vy:${this.ball.vy.toFixed(5)}`, this.canvas.height * 3/4);
			}
    }
  }

  private handlePaddleMovement(dt: number) {
    if (this.keyAgentMap["w"]) this.leftPaddle.y -= PADDLE_SPEED * dt;
    if (this.keyAgentMap["s"]) this.leftPaddle.y += PADDLE_SPEED * dt;
		// 
    if (this.keyPlayerMap["ArrowUp"]) this.rightPaddle.y -= PADDLE_SPEED * dt;
    if (this.keyPlayerMap["ArrowDown"]) this.rightPaddle.y += PADDLE_SPEED * dt;

    this.leftPaddle.y = Math.max(0, Math.min(CANVAS_HEIGHT - PADDLE_HEIGHT, this.leftPaddle.y));
    this.rightPaddle.y = Math.max(0, Math.min(CANVAS_HEIGHT - PADDLE_HEIGHT, this.rightPaddle.y));
  }

	private agentMove() {
		console.log(this.leftPaddle.y);
		this.keyAgentMap["w"] = false;
		this.keyAgentMap["s"] = false;
		if (this.leftPaddle.y + 0.5*PADDLE_HEIGHT / 2 >= this.ball.y) {
			this.keyAgentMap["w"] = true;
		}
		else if (this.leftPaddle.y + 1.5*PADDLE_HEIGHT / 2 <= this.ball.y) {
			this.keyAgentMap["s"] = true;
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


		if (!this.keyDebugMap['p']) {

	    this.ball.x += this.ball.vx * dt;
	    this.ball.y += this.ball.vy * dt;

			//this.leftPaddle.y = this.ball.y; // upper part of the paddle equals position of the ball // - 0.5*PADDLE_HEIGHT;
			//this.leftPaddle.y = this.ball.y - 0.5*PADDLE_HEIGHT;

			// aaa	
			//this.rightPaddle.y = this.ball.y;	

			this.agentMove();
	    this.handlePaddleMovement(dt);
	    handlePaddleCollision(this.ball, this.leftPaddle, this.rightPaddle);
	    handleWallCollision(this.ball);
	    this.handleScore();
		}

    if (this.score.left >= POINTS_TO_WIN || this.score.right >= POINTS_TO_WIN) {
      this.gameOver = true;
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      drawScores(this.ctx, this.canvas, this.score);
      drawMessage(this.ctx, this.canvas, this.score.left > this.score.right ? `${this.player1} wins` : `${this.player2} wins`);
      drawMessage(this.ctx, this.canvas, "click to play again", (this.canvas.height / 3) * 2);
      return;
    }
    this.render();
    this.rafID = requestAnimationFrame(this.tick);
  }
}
