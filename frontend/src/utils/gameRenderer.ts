import { Ball, ColoredBall, Paddle, Score } from "../../../shared/types.js";
import { BALL_RADIUS, PADDLE_WIDTH, PADDLE_HEIGHT, } from "../../../shared/constants.js";

export function drawBall( ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, ball: Ball ) {
  ctx.beginPath();
  ctx.arc( ball.x * canvas.width, ball.y * canvas.height, BALL_RADIUS * canvas.width, 0, Math.PI * 2, );
  ctx.fillStyle = "white";
  ctx.fill();
  ctx.closePath();
}

export function drawColoredBall( ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, ball: ColoredBall ) {
  ctx.beginPath();
  ctx.arc( ball.x * canvas.width, ball.y * canvas.height, BALL_RADIUS * canvas.width, 0, Math.PI * 2, );
  ctx.fillStyle = ball.color;
  ctx.fill();
	console.log(ball.color);
  ctx.closePath();
}

export function drawPaddles(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  leftPaddle: Paddle,
  rightPaddle: Paddle
) {
  ctx.fillStyle = "white";
  ctx.fillRect(
    leftPaddle.x * canvas.width,
    leftPaddle.y * canvas.height,
    PADDLE_WIDTH * canvas.width,
    PADDLE_HEIGHT * canvas.height,
  );
  ctx.fillRect(
    rightPaddle.x * canvas.width,
    rightPaddle.y * canvas.height,
    PADDLE_WIDTH * canvas.width,
    PADDLE_HEIGHT * canvas.height,
  );
}

export function drawScores(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  score: Score
) {
  ctx.font = "50px Arial";
  ctx.fillStyle = "white";
  ctx.textAlign = "center";
  ctx.fillText(String(score.left), canvas.width / 4, 50);
  ctx.fillText(String(score.right), (3 * canvas.width) / 4, 50);
}

export function drawMessage(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  text: string,
  y = canvas.height / 2
) {
  ctx.fillStyle = "white";
  ctx.font = "30px Arial";
  ctx.textAlign = "center";
  ctx.fillText(text, canvas.width / 2, y);
}
