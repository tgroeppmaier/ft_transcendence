export class Paddle {
  // scaling factor
  static PADDLE_W = 0.02;
  static PADDLE_H = 0.4;

  // x and y position on the -1 to 1 grid
  readonly x: number;
  public y: number = -Paddle.PADDLE_H / 2;

  // readonly w: number = Paddle.PADDLE_W;
  // readonly h: number = Paddle.PADDLE_H;

  constructor(
    side: 'left' | 'right',
  ) {
    this.x = side === 'left' ? -1 : 1;
  }

  // draw(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) {
  //   const left = (this.x + 1) * 0.5 * canvas.width;
  //   const top = (this.y + 1) * 0.5 * canvas.height;
  //   const width = this.w * 0.5 * canvas.width;
  //   const height = this.h * 0.5 * canvas.height;
  //   ctx.fillStyle = "blue";
  //   ctx.fillRect(left, top, width, height);
  // }
}