export class Paddle {
  readonly w: number = 0.02;
  readonly h: number = 0.2;
  readonly x: number;
  y: number;
  dy: number = 0;

  private readonly initialY: number;

  constructor(side: "left" | "right") {
    this.x = side === "left" ? 0 : 1 - this.w;
    this.initialY = 0.5 - this.h / 2;
    this.y = this.initialY;
  }

  reset() {
    this.y = this.initialY;
    this.dy = 0;
  }
}
