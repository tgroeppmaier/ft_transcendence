import { Ball, Paddle } from "./types.js";
import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  BALL_X_SPEED,
  BALL_Y_SPEED,
  PADDLE_WIDTH,
  PADDLE_HEIGHT,
  MAX_BALL_SPEED,
  BALL_RADIUS,
} from "./constants.js";

export function resetBall(ball: Ball) {
  ball.x = CANVAS_WIDTH / 2;
  ball.y = CANVAS_HEIGHT / 2;
  ball.vx = ball.vx > 0 ? -BALL_X_SPEED : BALL_X_SPEED;
  ball.vy = (Math.random() - 0.5) * BALL_Y_SPEED * 1;
}

export function bouncePaddle(ball: Ball, paddleY: number) {
  // 1. Calculate relative impact point (-1 is top, 0 is center, 1 is bottom)
  const paddleCenter = paddleY + PADDLE_HEIGHT / 2;
  const impactPoint = ball.y - paddleCenter;
  let normalizedImpact = impactPoint / (PADDLE_HEIGHT / 2);

  // Clamp value between -1 and 1
  normalizedImpact = Math.max(-1, Math.min(1, normalizedImpact));

  // 2. Calculate current speed and increase it
  const currentSpeed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
  let newSpeed = currentSpeed * 1.05;
  if (newSpeed > MAX_BALL_SPEED) newSpeed = MAX_BALL_SPEED;

  // 3. Calculate bounce angle (Max 45 degrees or PI/4)
  const MAX_BOUNCE_ANGLE = Math.PI / 4;
  const bounceAngle = normalizedImpact * MAX_BOUNCE_ANGLE;

  // 4. Update Velocities
  // Flip horizontal direction
  const direction = ball.vx > 0 ? -1 : 1;

  ball.vx = direction * newSpeed * Math.cos(bounceAngle);
  ball.vy = newSpeed * Math.sin(bounceAngle);
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
