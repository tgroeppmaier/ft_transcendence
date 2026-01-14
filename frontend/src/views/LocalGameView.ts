import { navigateTo } from "../router.js";
import { Ball, Paddle, Score } from "../../../shared/types.js";
import { drawBall, drawPaddles, drawMessage, drawScores } from "../utils/gameRenderer.js";
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

export function LocalGameView() {
  const gameContainer = document.createElement("div");
  gameContainer.className = "flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4";
  gameContainer.id = "local-game";
  gameContainer.innerHTML = `
    <div class="mb-4">
      <button id="back-to-main" class="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg transition shadow-sm">
        ← Back to Home
      </button>
    </div>
    <canvas id="board" width="800" height="600" class="rounded-xl shadow-2xl border-4 border-gray-800" style="background-color: #000;"></canvas>
  `;

  const backButton = gameContainer.querySelector("#back-to-main");
  if (backButton) {
    backButton.addEventListener("click", (e) => {
      e.preventDefault();
      navigateTo("/");
    });
  }

  const canvas = gameContainer.querySelector<HTMLCanvasElement>("#board");
  if (!(canvas instanceof HTMLCanvasElement))
    throw new Error("Canvas not found");

  const ctx = canvas.getContext("2d");
  if (!ctx)
    throw new Error("Context not found");

  // Game state
  const ball: Ball = { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2, vx: BALL_X_SPEED, vy:BALL_Y_SPEED };
  const leftPaddle: Paddle = { x: 0, y: CANVAS_HEIGHT / 2 - PADDLE_HEIGHT / 2 };
  const rightPaddle: Paddle = { x: CANVAS_WIDTH - PADDLE_WIDTH, y: CANVAS_HEIGHT / 2 - PADDLE_HEIGHT / 2 };
  const score: Score = { left: 0, right: 0 };
  const keyMap: Record<string, boolean> = { "w": false, "s": false, "ArrowUp": false, "ArrowDown": false };
  let gameOver = false;
  let countdown = 7;
  let gameStarted = false;

  function resetBall() {
    ball.x = CANVAS_WIDTH / 2;
    ball.y = CANVAS_HEIGHT / 2;
    ball.vx = ball.vx > 0 ? -BALL_X_SPEED : BALL_X_SPEED;
    ball.vy = (Math.random() - 0.5) * BALL_Y_SPEED * 3;
  }

  const resetPaddles = () => {
    leftPaddle.y = CANVAS_HEIGHT / 2 - PADDLE_HEIGHT / 2;
    rightPaddle.y = CANVAS_HEIGHT / 2 - PADDLE_HEIGHT / 2
  }

  const resetGame = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    score.left = 0;
    score.right = 0;
    resetPaddles();
    resetBall();
    cancelAnimationFrame(rafID);
    gameOver = false;
    last = performance.now();
    render()
    rafID = requestAnimationFrame(tick);
  }

  function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!gameStarted) {
      drawMessage(ctx, canvas, "Player 1: W/S keys | Player 2: Arrow Up/Down", canvas.height / 3);
+     drawMessage(ctx, canvas, `Game starts in ${Math.ceil(countdown)}`, canvas.height / 2);
    }
    else {
      drawBall(ctx, canvas, ball);
      drawPaddles(ctx, canvas, leftPaddle, rightPaddle);
      drawScores(ctx, canvas, score);
    }
  }

  // stores identifier of requestAnimationFrame
  let rafID = 0;
  // get timestamp
  let last = performance.now();

  function bouncePaddle(paddleY: number) {
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

  function handlePaddleCollision() {
    const checkYaxis = (paddle: Paddle) => {
      return (ball.y + BALL_RADIUS >= paddle.y && ball.y - BALL_RADIUS <= paddle.y + PADDLE_HEIGHT);
    };

    if (ball.vx < 0 && checkYaxis(leftPaddle) &&
      ball.x - BALL_RADIUS < leftPaddle.x + PADDLE_WIDTH) {
      ball.x = leftPaddle.x + PADDLE_WIDTH + BALL_RADIUS;
      bouncePaddle(leftPaddle.y);
    } else if (ball.vx > 0 && checkYaxis(rightPaddle) &&
      ball.x + BALL_RADIUS > rightPaddle.x) {
      ball.x = rightPaddle.x - BALL_RADIUS;
      bouncePaddle(rightPaddle.y);
    }
  }

  const handleScore = () => {
    if (ball.x < 0) {
      resetBall();
      score.right += 1;
    } else if (ball.x > CANVAS_WIDTH) {
      resetBall();
      score.left += 1;
    }
  }

  function tick(now: number) {
    const dt = (now - last) / 1000;
    last = now;
    if (!gameStarted) {
      countdown -= dt;
      if (countdown > 0) {
        render();
        rafID = requestAnimationFrame(tick);
        return;
      }
      else gameStarted = true;
    }
    if (keyMap["w"]) leftPaddle.y -= PADDLE_SPEED * dt;
    if (keyMap["s"]) leftPaddle.y += PADDLE_SPEED * dt;
    if (keyMap["ArrowUp"]) rightPaddle.y -= PADDLE_SPEED * dt;
    if (keyMap["ArrowDown"]) rightPaddle.y += PADDLE_SPEED * dt

    // clamp to top and bottom. paddle y should be min 0 and max canvas.height - paddleH
    leftPaddle.y = Math.max(0, Math.min(CANVAS_HEIGHT - PADDLE_HEIGHT, leftPaddle.y));
    rightPaddle.y = Math.max(0, Math.min(CANVAS_HEIGHT - PADDLE_HEIGHT, rightPaddle.y));

    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;

    handlePaddleCollision();
    handleScore();

    // top can bottom Wall colission
    if (ball.y + BALL_RADIUS > CANVAS_HEIGHT) { ball.y = CANVAS_HEIGHT - BALL_RADIUS; ball.vy *= -1; }
    if (ball.y - BALL_RADIUS < 0) { ball.y = BALL_RADIUS; ball.vy *= -1; }

    if (score.left >= POINTS_TO_WIN || score.right >= POINTS_TO_WIN) {
      gameOver = true;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      drawScores(ctx, canvas, score);
      drawMessage(ctx, canvas, score.left > score.right ? "Player 1 wins" : "Player 2 wins");
      drawMessage(ctx, canvas, "click to play again", (canvas.height / 3) * 2);
      return;
    }

    render();
    rafID = requestAnimationFrame(tick);
  }

  // event listener callback functions
  const onCanvasClick = () => {
    if(gameOver)
      resetGame();
  }

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key in keyMap) keyMap[e.key] = true;
  }

  const onKeyUp = (e: KeyboardEvent) => {
    if (e.key in keyMap) keyMap[e.key] = false;
  }

  // adding event Listeners
  document.addEventListener("keydown", onKeyDown);
  document.addEventListener("keyup", onKeyUp);
  canvas.addEventListener("click", onCanvasClick);

  // // // calls callback function tick and passes in timestamp
  rafID = requestAnimationFrame(tick);

  const cleanup = () => {
    cancelAnimationFrame(rafID);
    document.removeEventListener("keydown", onKeyDown);
    document.removeEventListener("keyup", onKeyUp);
    canvas.removeEventListener("click", onCanvasClick);
  }
  return { component: gameContainer, cleanup };
}
