import {
  Ball,
  Paddle,
  Score,
  ServerMessage,
  GameStatus,
  Action,
} from "../../../shared/types.js";
import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  PADDLE_WIDTH,
  PADDLE_HEIGHT,
} from "../../../shared/constants.js";
import { drawBall, drawPaddles, drawScores, drawMessage } from "./gameRenderer.js";

export class RemoteGame {
  private ws: WebSocket;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private gameId: string;
  
  // Game State
  private ball: Ball = { x: 0.5, y: 0.5, vx: 0, vy: 0 };
  private leftPaddle: Paddle = { x: 0, y: (CANVAS_HEIGHT - PADDLE_HEIGHT) / 2 };
  private rightPaddle: Paddle = { x: CANVAS_WIDTH - PADDLE_WIDTH, y: (CANVAS_HEIGHT - PADDLE_HEIGHT) / 2 };
  private score: Score = { left: 0, right: 0 };
  private status: GameStatus = "waiting";
  private mySide: "left" | "right" | null = null;
  private errorMessage: string | null = null;
  
  private rafID: number = 0;
  private keyMap: Record<string, boolean> = { up: false, down: false };

  // Callbacks
  private onStateChange?: (status: GameStatus, side: "left" | "right" | null, score: Score) => void;

  constructor(
    gameId: string, 
    canvas: HTMLCanvasElement, 
    onStateChange?: (status: GameStatus, side: "left" | "right" | null, score: Score) => void
  ) {
    this.gameId = gameId;
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    if (!this.ctx) throw new Error("2D context not found");
    this.onStateChange = onStateChange;

    this.ws = new WebSocket(`${window.location.protocol === "https:" ? "wss" : "ws"}://${window.location.host}/api/ws/${gameId}`);
    
    this.ws.addEventListener("open", () => console.log(`[ws] open ${gameId}`));
    this.ws.addEventListener("close", (e) => console.log(`[ws] close ${gameId}`, e.code));
    this.ws.addEventListener("error", (e) => console.log(`[ws] error`, e));
    this.ws.onmessage = this.handleMessage.bind(this);

    // Bind inputs
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleKeyUp = this.handleKeyUp.bind(this);
    window.addEventListener("keydown", this.handleKeyDown);
    window.addEventListener("keyup", this.handleKeyUp);
  }

  public start() {
    this.rafID = requestAnimationFrame(this.render.bind(this));
  }

  public stop() {
    cancelAnimationFrame(this.rafID);
    window.removeEventListener("keydown", this.handleKeyDown);
    window.removeEventListener("keyup", this.handleKeyUp);
    if (this.ws.readyState === WebSocket.OPEN) {
      this.ws.close();
    }
  }

  private handleMessage(event: MessageEvent) {
    const msg = JSON.parse(event.data) as ServerMessage;

    if ("type" in msg) {
        if (msg.type === "error") {
            this.errorMessage = `Error: ${msg.message}`;
        } else if (msg.type === "init") {
            this.mySide = msg.side;
            this.notifyState();
        } else if (msg.type === "state") {
            this.status = msg.status;
            this.score.left = msg.score[0];
            this.score.right = msg.score[1];
            this.notifyState();
        }
    } else if ("t" in msg) {
        this.ball.x = msg.b[0];
        this.ball.y = msg.b[1];
        this.leftPaddle.y = msg.p[0];
        this.rightPaddle.y = msg.p[1];
    }
  }

  private notifyState() {
      if (this.onStateChange) {
          this.onStateChange(this.status, this.mySide, this.score);
      }
  }

  private sendAction(action: Action) {
    if (this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(JSON.stringify(action));
  }

  private handleKeyDown(e: KeyboardEvent) {
    if (e.key === "w" && !this.keyMap["up"]) {
      this.keyMap["up"] = true;
      this.sendAction({ move: "start", direction: "up" });
    }
    if (e.key === "s" && !this.keyMap["down"]) {
      this.keyMap["down"] = true;
      this.sendAction({ move: "start", direction: "down" });
    }
  }

  private handleKeyUp(e: KeyboardEvent) {
    if (e.key === "w") {
      this.keyMap["up"] = false;
      this.sendAction({ move: "stop", direction: "up" });
    }
    if (e.key === "s") {
      this.keyMap["down"] = false;
      this.sendAction({ move: "stop", direction: "down" });
    }
  }

  private render() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    if (this.errorMessage) {
        drawMessage(this.ctx, this.canvas, this.errorMessage);
        this.rafID = requestAnimationFrame(this.render.bind(this));
        return;
    }

    drawScores(this.ctx, this.canvas, this.score);

    if (this.status === "waiting") {
      drawMessage(this.ctx, this.canvas, "Waiting for other Player");
    } else if (this.status === "gameOver") {
       if (this.mySide === "left") {
        drawMessage(this.ctx, this.canvas, this.score.left > this.score.right ? "You won!" : "You lost!");
      } else if (this.mySide === "right") {
        drawMessage(this.ctx, this.canvas, this.score.right > this.score.left ? "You won!" : "You lost!");
      } else {
        drawMessage(this.ctx, this.canvas, "Game Over");
      }
    } else {
      drawBall(this.ctx, this.canvas, this.ball);
      drawPaddles(this.ctx, this.canvas, this.leftPaddle, this.rightPaddle);
    }

    this.rafID = requestAnimationFrame(this.render.bind(this));
  }
}
