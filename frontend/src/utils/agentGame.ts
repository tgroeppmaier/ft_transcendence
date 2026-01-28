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
import { Ball, ColoredBall, Paddle, Score } from "../../../shared/types.js";
import { handlePaddleCollision, handleWallCollision, resetBall } from "../../../shared/gameLogic.js";
import { drawBall, drawColoredBall, drawPaddles, drawMessage, drawScores } from "./gameRenderer.js";

export class AgentGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  private ball: Ball = { x: 0.5, y: 0.5, vx: BALL_X_SPEED, vy: BALL_Y_SPEED };
  private bounce_balls_list: ColoredBall[] = [];
  private anticipated_bounce_position: number = 0.5;
	private are_you_sure_about_anticipated_bounce_position: boolean = false;
	private y_defend_position: number = 0.5;
	private attack_mode: boolean = false;
	private y_aim: number;
	private y_attack_position: number;
	private move_down_in_defence: boolean = false;
	private move_up_in_defence: boolean = false;
  private score: Score = { left: 0, right: 0 };
  private lastUpdate: number;
  private lastAgentUpdate: number;
  private keyAgentMap: Record<string, boolean> = { "w": false, "s": false };
  private keyPlayerMap: Record<string, boolean> = { "ArrowUp": false, "ArrowDown": false };
  /* p: pause, d: debug mode, a: autopilot */
  private keyDebugMap: Record<string, boolean> = { "p": false, "d": false, "a": false }
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
    this.lastAgentUpdate = Date.now();
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
      resetBall(this.ball);
      cancelAnimationFrame(this.rafID);
      this.gameOver = false;
      this.lastUpdate = performance.now();
      this.render()
      this.rafID = requestAnimationFrame(this.tick);
    }
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
      if (this.keyDebugMap['d']) {
        drawMessage(this.ctx, this.canvas, `w: ${this.keyAgentMap['w']}, \
                s: ${this.keyAgentMap['s']}, p: ${this.keyDebugMap['p']}`);
        drawMessage(this.ctx, this.canvas, `${(this.leftPaddle.y).toFixed(5)} -- ${(this.leftPaddle.y + PADDLE_HEIGHT / 2).toFixed(5)} -- ${(this.leftPaddle.y + PADDLE_HEIGHT).toFixed(5)}`, this.canvas.height * 2/3);
        drawMessage(this.ctx, this.canvas, `${this.ball.y.toFixed(5)}, vx:${this.ball.vx.toFixed(5)}, vy:${this.ball.vy.toFixed(5)}`, this.canvas.height * 3/4);
        drawMessage(this.ctx, this.canvas, `rafID: ${(this.rafID/60).toFixed(5)}`, this.canvas.height* 4/5);
        drawMessage(this.ctx, this.canvas, `${this.anticipated_bounce_position}`, this.canvas.height * 0.85);
        drawMessage(this.ctx, this.canvas, `${((Date.now() - this.lastAgentUpdate)/1000).toFixed(5)}`, this.canvas.height * 0.9);
				let msg: string;
				if (this.attack_mode) {
					msg = "attack";
					drawMessage(this.ctx, this.canvas, `${msg} from ${this.y_attack_position.toFixed(5)} at ${this.y_aim.toFixed(5)}, ${this.attack_mode}`, this.canvas.height * 0.1);
				} else {
					msg = "defend";
					drawMessage(this.ctx, this.canvas, `${msg} from ${this.anticipated_bounce_position.toFixed(5)} at ${this.y_defend_position.toFixed(5)}, ${this.attack_mode}`, this.canvas.height * 0.1);
				}
				drawMessage(this.ctx, this.canvas, `abp: ${this.anticipated_bounce_position}, sure: ${this.are_you_sure_about_anticipated_bounce_position}`, this.canvas.height * 0.2);
        for (let reference_ball of this.bounce_balls_list) {
          drawColoredBall(this.ctx, this.canvas, reference_ball);
        }
      }
    }
  }

  private handlePaddleMovement(dt: number) {
    if (this.keyAgentMap["w"]) this.leftPaddle.y -= PADDLE_SPEED * dt;
    if (this.keyAgentMap["s"]) this.leftPaddle.y += PADDLE_SPEED * dt;

    if (this.keyPlayerMap["ArrowUp"]) this.rightPaddle.y -= PADDLE_SPEED * dt;
    if (this.keyPlayerMap["ArrowDown"]) this.rightPaddle.y += PADDLE_SPEED * dt;

    this.leftPaddle.y = Math.max(0, Math.min(CANVAS_HEIGHT - PADDLE_HEIGHT, this.leftPaddle.y));
    this.rightPaddle.y = Math.max(0, Math.min(CANVAS_HEIGHT - PADDLE_HEIGHT, this.rightPaddle.y));
  }

  private agentMove() {
    if (Date.now() - this.lastAgentUpdate >= 1000) {
      this.lastAgentUpdate = Date.now();
      this.find_bounces();
			if (this.are_you_sure_about_anticipated_bounce_position) {
				this.attack_mode = true;
				this.determine_y_aim();
				this.compute_attack_position();
			} else {
				this.attack_mode = false;
				this.compute_defend_position();
			}
    }
		if (this.attack_mode) {
			this.attack();
		} else {
			this.defend();
		}
	}

	private determine_y_aim() {
		if (this.rightPaddle.y + PADDLE_HEIGHT / 2 < CANVAS_WIDTH / 2) {
			this.y_aim = CANVAS_WIDTH - BALL_RADIUS;
		} else {
			this.y_aim = BALL_RADIUS;
		}
	}

	private compute_attack_position() {
		let tanphi = (this.y_aim - this.anticipated_bounce_position) / (CANVAS_WIDTH - 2 * BALL_RADIUS);
		let phi = Math.atan(tanphi);
		let y_to_take = this.anticipated_bounce_position - PADDLE_HEIGHT * (1/2 + 2/Math.PI*phi);
		if (y_to_take <= 0 || y_to_take + PADDLE_HEIGHT >= CANVAS_HEIGHT) {
		}
		this.y_attack_position = y_to_take;
	}

	private attack() {
    this.keyAgentMap["w"] = false;
    this.keyAgentMap["s"] = false;
    if (this.leftPaddle.y + 0.04*PADDLE_HEIGHT <= this.y_attack_position) {
      this.keyAgentMap["s"] = true;
    }
    else if (this.leftPaddle.y - 0.04*PADDLE_HEIGHT >= this.y_attack_position) {
      this.keyAgentMap["w"] = true;
    }
  }

	private compute_defend_position() {
		this.y_defend_position = this.anticipated_bounce_position - 0.01 * PADDLE_HEIGHT;
		if (this.anticipated_bounce_position > CANVAS_HEIGHT / 2) {
			this.y_defend_position = this.anticipated_bounce_position + 0.01 * PADDLE_HEIGHT - PADDLE_HEIGHT;
		}
	}

	private defend() {
		if (!this.are_you_sure_about_anticipated_bounce_position) {
			this.keyAgentMap["w"] = false;
			this.keyAgentMap["s"] = false;
			if (this.leftPaddle.y + 0.04*PADDLE_HEIGHT <= this.y_defend_position) {
				this.keyAgentMap["s"] = true;
			}
			else if (this.leftPaddle.y - 0.04*PADDLE_HEIGHT >= this.y_defend_position) {
				this.keyAgentMap["w"] = true;
			}
		}
	}

  private find_bounces() {
    let reference_ball: ColoredBall = { x: this.ball.x, y: this.ball.y,
                              vx: this.ball.vx, vy: this.ball.vy, color: "white" };
    let delta_time_x: number;
    let delta_time_y: number;
    let delta: number;
    let colors: string[] = ["green", "red", "blue", "pink", "yellow"];
    let keep_doing: boolean = true;
    let cnt: number = -1;
    this.bounce_balls_list = [];
		this.are_you_sure_about_anticipated_bounce_position = true;
    while (keep_doing && cnt < 10) {
      cnt += 1;
      // determine delta_time_x
      if (reference_ball.vx > 0) {
        delta_time_x = (CANVAS_WIDTH - BALL_RADIUS - reference_ball.x) / reference_ball.vx;
      }
      else if (reference_ball.vx < 0) {
        delta_time_x = (BALL_RADIUS - reference_ball.x) / reference_ball.vx;
      }
      else {
        delta_time_x = Infinity;
      }
      // determine delta_time_y
      if (reference_ball.vy > 0) {
        delta_time_y = (CANVAS_HEIGHT - BALL_RADIUS - reference_ball.y) / reference_ball.vy;
      }
      else if (reference_ball.vy < 0) {
        delta_time_y = (BALL_RADIUS - reference_ball.y) / reference_ball.vy;
      }
      else {
        delta_time_y = Infinity;
      }

      delta = (delta_time_x <= delta_time_y) ? delta_time_x : delta_time_y;
      reference_ball.x = reference_ball.x + delta * reference_ball.vx;
      reference_ball.y = reference_ball.y + delta * reference_ball.vy;
      if (delta_time_x == delta) {
        if (reference_ball.vx < 0) {
          keep_doing = false;
          this.anticipated_bounce_position = reference_ball.y;
        }
				else {
					let currentSpeed = Math.sqrt(reference_ball.vx * reference_ball.vx + reference_ball.vy * reference_ball.vy);
					let newSpeed = currentSpeed * 1.05;
					newSpeed =(newSpeed <= MAX_BALL_SPEED ? newSpeed : MAX_BALL_SPEED);
					// compute anticipated paddle position of an opponent. Presumably the middle position.
					let upper_edge_opponent_paddle = Math.max(0, reference_ball.y - PADDLE_HEIGHT);
					let lower_edge_opponent_paddle = Math.min(CANVAS_HEIGHT, reference_ball.y + PADDLE_HEIGHT);
					let center_opponent_paddle = (upper_edge_opponent_paddle + lower_edge_opponent_paddle) / 2;
					let normalizedImpact = (reference_ball.y - center_opponent_paddle) / (PADDLE_HEIGHT / 2);
					normalizedImpact = Math.min(1, Math.max(-1, normalizedImpact));
					let bounce_angle = normalizedImpact * Math.PI / 4;
        	reference_ball.vx = -newSpeed * Math.cos(bounce_angle);
					reference_ball.vy = newSpeed * Math.sin(bounce_angle);
          this.anticipated_bounce_position = reference_ball.y;
					this.are_you_sure_about_anticipated_bounce_position = false;
				}
      }
      if (delta_time_y == delta) {
        reference_ball.vy *= -1;
      }
      if (cnt < colors.length) {
        reference_ball.color = colors[cnt];
      }  else {
        reference_ball.color = colors[colors.length-1];
      }
      let ball_to_push: ColoredBall = { x: reference_ball.x, y: reference_ball.y,
                                        vx: reference_ball.vx, vy: reference_ball.vy,
                                        color: reference_ball.color };
      this.bounce_balls_list.push(ball_to_push);
			this.compute_position_to_send_to_ywanted(CANVAS_HEIGHT - BALL_RADIUS);
    }
  }

	private compute_position_to_send_to_ywanted(ywanted: number) {
		let tanphi: number = (ywanted - this.anticipated_bounce_position) / (CANVAS_WIDTH - 2 * BALL_RADIUS);
		let phi = Math.atan(tanphi);
	}

  private handleScore() {
    if (this.ball.x < 0) {
      resetBall(this.ball);
      this.score.right += 1;
    } else if (this.ball.x > CANVAS_WIDTH) {
      resetBall(this.ball);
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

      if (this.keyDebugMap['a']) {
        this.rightPaddle.y = this.ball.y - PADDLE_HEIGHT / 2;
      }

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
