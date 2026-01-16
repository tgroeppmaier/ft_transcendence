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

export class AgentGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  private ball: Ball = { x: 0.5, y: 0.5, vx: BALL_X_SPEED, vy: BALL_Y_SPEED };
	private bounce_balls_list: Ball[] = [];
  //private reference_ball: Ball = { x: 0.5, y: 0.5, vx: BALL_X_SPEED, vy: BALL_Y_SPEED };
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
			if (this.keyDebugMap['p'] || true) {
				drawMessage(this.ctx, this.canvas, `w: ${this.keyAgentMap['w']}, \
								s: ${this.keyAgentMap['s']}, p: ${this.keyDebugMap['p']}`);
				drawMessage(this.ctx, this.canvas, `${(this.leftPaddle.y).toFixed(5)} -- ${(this.leftPaddle.y + PADDLE_HEIGHT / 2).toFixed(5)} -- ${(this.leftPaddle.y + PADDLE_HEIGHT).toFixed(5)}`, this.canvas.height * 2/3);
				drawMessage(this.ctx, this.canvas, `${this.ball.y.toFixed(5)}, vx:${this.ball.vx.toFixed(5)}, vy:${this.ball.vy.toFixed(5)}`, this.canvas.height * 3/4);
				drawMessage(this.ctx, this.canvas, `rafID: ${(this.rafID/60).toFixed(5)}`, this.canvas.height* 4/5);
				for (let reference_ball of this.bounce_balls_list) {
					drawBall(this.ctx, this.canvas, reference_ball);
				}
			}
    }
  }
	// aaa

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
    if (this.keyAgentMap["w"]) this.leftPaddle.y -= PADDLE_SPEED * dt;
    if (this.keyAgentMap["s"]) this.leftPaddle.y += PADDLE_SPEED * dt;
		// 
    if (this.keyPlayerMap["ArrowUp"]) this.rightPaddle.y -= PADDLE_SPEED * dt;
    if (this.keyPlayerMap["ArrowDown"]) this.rightPaddle.y += PADDLE_SPEED * dt;

    this.leftPaddle.y = Math.max(0, Math.min(CANVAS_HEIGHT - PADDLE_HEIGHT, this.leftPaddle.y));
    this.rightPaddle.y = Math.max(0, Math.min(CANVAS_HEIGHT - PADDLE_HEIGHT, this.rightPaddle.y));
  }

	private agentMove() {
		//console.log(this.leftPaddle.y);
		if (0 == this.rafID % 120) {
			this.keyAgentMap["w"] = false;
			this.keyAgentMap["s"] = false;
			if (this.leftPaddle.y + 0.5*PADDLE_HEIGHT / 2 >= this.ball.y) {
				this.keyAgentMap["w"] = true;
			}
			else if (this.leftPaddle.y + 1.5*PADDLE_HEIGHT / 2 <= this.ball.y) {
				this.keyAgentMap["s"] = true;
			}
			if (this.ball.vx > 0) {
				this.bounce_balls_list = [];
				let delta = (2 * CANVAS_WIDTH - BALL_RADIUS - this.ball.x) / this.ball.vx;
				let reference_ball: Ball = { x: BALL_RADIUS, 
						y: (this.ball.y + delta * this.ball.vy ) % CANVAS_HEIGHT, 
						vx: 0, vy: 0
					}
				this.bounce_balls_list.push(reference_ball);
			}
			this.find_bounces();
		}
	}

	private find_bounces() {
		let reference_ball: Ball = { x: this.ball.x, y: this.ball.y, 
															vx: this.ball.vx, vy: this.ball.vy };
		let delta_time_x: number, delta_time_y: number, delta: number;
		let vx_tmp: number, vy_tmp: number;
		//this.bounce_balls_list = [];
		let keep_doing: boolean = true;
		let cnt: number = 0;
		while (keep_doing || cnt < 10) {
			cnt += 1;
			if (reference_ball.vx > 0) {
				delta_time_x = (CANVAS_WIDTH - BALL_RADIUS - reference_ball.x) / reference_ball.vx;
				if (delta_time_x < 0) {
					delta_time_x = 0;
				}
			}
			else if (reference_ball.vx < 0) {
				delta_time_x = (BALL_RADIUS - reference_ball.x) / reference_ball.vx;
				if (delta_time_x < 0) {
					delta_time_x = 0;
				}
			}
			else {
				delta_time_x = -1;
			}
			if (reference_ball.vy > 0) {
				delta_time_y = (CANVAS_HEIGHT - BALL_RADIUS - reference_ball.y) / reference_ball.vy;
				if (delta_time_y < 0) {
					delta_time_y = 0;
				}
			}
			else if (reference_ball.vy < 0) {
				delta_time_y = (BALL_RADIUS - reference_ball.y) / reference_ball.vy;
				if (delta_time_y < 0) {
					delta_time_y = 0;
				}
			}
			else {
				delta_time_y = -1;
			}
			if (delta_time_x < 0 && delta_time_y < 0) {
				delta = -1;
			}
			else if (delta_time_x >= 0 && (delta_time_y < 0 || delta_time_y > delta_time_x)) {
				delta = delta_time_x;
        reference_ball.x = reference_ball.x + delta * reference_ball.vx;
        reference_ball.y = reference_ball.y + delta * reference_ball.vy;
				reference_ball.vx *= -1.05;
				if (reference_ball.vx > 0) {
					keep_doing = false;
				}
			}
			else if (delta_time_y >= 0 && (delta_time_x < 0 || delta_time_x > delta_time_y)) {
				delta = delta_time_y;
        reference_ball.x = reference_ball.x + delta * reference_ball.vx;
        reference_ball.y = reference_ball.y + delta * reference_ball.vy;
				reference_ball.vy *= -1;
			}
			else if (delta_time_x == delta_time_y) {
				delta = delta_time_x;
        reference_ball.x = reference_ball.x + delta * reference_ball.vx;
        reference_ball.y = reference_ball.y + delta * reference_ball.vy;
				reference_ball.vy *= -1;
				reference_ball.vx *= -1.05;
				if (reference_ball.vx > 0) {
					keep_doing = false;
				}
			}
			else {
				console.log("What are the other options?", delta_time_x, delta_time_y, BALL_RADIUS, CANVAS_HEIGHT, CANVAS_WIDTH);
        console.log("reference_ball: ", reference_ball.x, reference_ball.y, reference_ball.vx, reference_ball.y);
			}
      this.bounce_balls_list.push(reference_ball);
      console.log("delta_x, delta_y, r, h, w:", delta_time_x, delta_time_y, BALL_RADIUS, CANVAS_HEIGHT, CANVAS_WIDTH);
      console.log("reference_ball: ", reference_ball.x, reference_ball.y, reference_ball.vx, reference_ball.y);
		}
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

  private tick = (now: number) => {
    const dt = (now - this.lastUpdate) / 1000;
		//console.log(dt);
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
			this.leftPaddle.y = this.ball.y;
      this.rightPaddle.y = this.ball.y;	

			//this.agentMove();
	    this.handlePaddleMovement(dt);
	    this.handlePaddleCollision();
	    this.handleWallCollision();
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
