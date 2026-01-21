import {
  CANVAS_HEIGHT,
  PADDLE_WIDTH,
  PADDLE_HEIGHT,
  MAX_BALL_SPEED,
  BALL_RADIUS,
} from "./constants.js";
import { Ball, Paddle } from "./types.js";

export function bouncePaddle(ball: Ball, paddleY: number) {
  ball.vx = -ball.vx * 1.05;
  if (Math.abs(ball.vx) > MAX_BALL_SPEED) {
    ball.vx = ball.vx > 0 ? MAX_BALL_SPEED : -MAX_BALL_SPEED;
  }
  if (ball.y < paddleY + PADDLE_HEIGHT * 0.25) {
    ball.vy = -Math.abs(ball.vy) - 0.01;
  } else if (ball.y > paddleY + PADDLE_HEIGHT * 0.75) {
    ball.vy = Math.abs(ball.vy) + 0.01;
  }
}

export function handlePaddleCollision(
  ball: Ball,
  leftPaddle: Paddle | null | undefined,
  rightPaddle: Paddle | null | undefined
) {
  const checkYaxis = (paddle: Paddle) => {
    return (
      ball.y + BALL_RADIUS >= paddle.y &&
      ball.y - BALL_RADIUS <= paddle.y + PADDLE_HEIGHT
    );
  };

  if (
    leftPaddle &&
    ball.vx < 0 &&
    checkYaxis(leftPaddle) &&
    ball.x - BALL_RADIUS < leftPaddle.x + PADDLE_WIDTH
  ) {
    ball.x = leftPaddle.x + PADDLE_WIDTH + BALL_RADIUS;
    bouncePaddle(ball, leftPaddle.y);
  } else if (
    rightPaddle &&
    ball.vx > 0 &&
    checkYaxis(rightPaddle) &&
    ball.x + BALL_RADIUS > rightPaddle.x
  ) {
    ball.x = rightPaddle.x - BALL_RADIUS;
    bouncePaddle(ball, rightPaddle.y);
  }
}

export function handleWallCollision(ball: Ball) {
  if (ball.y + BALL_RADIUS > CANVAS_HEIGHT) {
    ball.y = CANVAS_HEIGHT - BALL_RADIUS;
    ball.vy *= -1;
  }
  if (ball.y - BALL_RADIUS < 0) {
    ball.y = BALL_RADIUS;
    ball.vy *= -1;
  }
}
