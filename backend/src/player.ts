import { WebSocket } from "@fastify/websocket";
import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  PADDLE_HEIGHT,
  PADDLE_SPEED,
  PADDLE_WIDTH,
} from "../../shared/constants.js";
import { Action, InitMessage, Paddle } from "../../shared/types.js";

export type Side = "left" | "right";

export class Player {
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
