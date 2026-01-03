// src/utils/gameRenderer.ts

import { Ball, Paddle, Score } from "../../../shared/types.js";

export function drawBall(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  ball: Ball
) {
  ctx.beginPath();
  ctx.arc(
    ball.x * canvas.width,
    ball.y * canvas.height,
    ball.radius * canvas.width,
    0,
    Math.PI * 2,
  );
  ctx.fillStyle = "white";
  ctx.fill();
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
    leftPaddle.w * canvas.width,
    leftPaddle.h * canvas.height,
  );
  ctx.fillRect(
    rightPaddle.x * canvas.width,
    rightPaddle.y * canvas.height,
    rightPaddle.w * canvas.width,
    rightPaddle.h * canvas.height,
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
  text: string
) {
  ctx.fillStyle = "white";
  ctx.font = "30px Arial";
  ctx.textAlign = "center";
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);
}