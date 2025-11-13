export class Paddle {
  // scaling factor
  readonly w: number = 0.02;
  readonly h: number = 0.4;
  readonly speed: number = 0.01;

  // x and y position on the 0 to 1 grid
  readonly x: number;
  private _y: number = 0.5 - this.h / 2;

  get y(): number {
    return this._y;
  }

  constructor(
    side: "left" | "right",
  ) {
    this.x = side === "left" ? 0 : 1 - this.w;
  }

  // Move the paddle up (decrease y, clamped to top)
  moveUp() {
    this._y = Math.max(0, this._y - this.speed);
  }

  // Move the paddle down (increase y, clamped to bottom)
  moveDown() {
    this._y = Math.min(1 - this.h, this._y + this.speed);
  }
}
