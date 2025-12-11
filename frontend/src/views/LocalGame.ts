import { navigateTo } from "../router.js";

// ---- Types & constants ------------------------------------------------------
type Paddle = { x: number; y: number; width: number; height: number };
type Ball = { x: number; y: number; radius: number; dx: number; dy: number };

const PADDLE_WIDTH = 10;
const PADDLE_HEIGHT = 100;
const BALL_RADIUS = 7;
const BALL_SPEED_X = 5;
const BALL_SPEED_Y = 5;
const PADDLE_SPEED = 8;
const FPS = 60;
const COUNTDOWN_START = 5;

// ---- View -------------------------------------------------------------------
export function LocalGame() {
  const gameContainer = document.createElement("div");
  gameContainer.innerHTML = `
    <button id="back-to-main">Back to Main Menu</button>
    <canvas id="board" height="600" width="800" style="border: 1px solid #000000; background-color: #000;"></canvas>
  `;

  const backButton = gameContainer.querySelector("#back-to-main");
  if (backButton) {
    backButton.addEventListener("click", (e) => {
      e.preventDefault();
      navigateTo("/");
    });
  }

  const canvasElement = gameContainer.querySelector("#board");
  if (!(canvasElement instanceof HTMLCanvasElement)) {
    throw new Error("Canvas #board not found");
  }
  const canvas = canvasElement;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D context not available");
  const ctxSafe = ctx as CanvasRenderingContext2D;

  // ---- State ----------------------------------------------------------------
  let leftPaddle: Paddle = {
    x: 0,
    y: canvas.height / 2 - PADDLE_HEIGHT / 2,
    width: PADDLE_WIDTH,
    height: PADDLE_HEIGHT,
  };
  let rightPaddle: Paddle = {
    x: canvas.width - PADDLE_WIDTH,
    y: canvas.height / 2 - PADDLE_HEIGHT / 2,
    width: PADDLE_WIDTH,
    height: PADDLE_HEIGHT,
  };
  let ball: Ball = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    radius: BALL_RADIUS,
    dx: BALL_SPEED_X,
    dy: BALL_SPEED_Y,
  };
  let leftScore = 0;
  let rightScore = 0;
  let countdown = COUNTDOWN_START;
  let gameStarted = false;
  let intervalId: ReturnType<typeof setInterval> | undefined;

  const keys: Record<string, boolean> = {
    w: false,
    s: false,
    ArrowUp: false,
    ArrowDown: false,
  };

  // ---- Helpers --------------------------------------------------------------
  const resetBall = () => {
    ball = { ...ball, x: canvas.width / 2, y: canvas.height / 2, dx: -ball.dx, dy: BALL_SPEED_Y };
  };

  const drawPaddles = () => {
    ctxSafe.fillStyle = "white";
    ctxSafe.fillRect(leftPaddle.x, leftPaddle.y, leftPaddle.width, leftPaddle.height);
    ctxSafe.fillRect(rightPaddle.x, rightPaddle.y, rightPaddle.width, rightPaddle.height);
  };

  const drawBall = () => {
    ctxSafe.beginPath();
    ctxSafe.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctxSafe.fillStyle = "white";
    ctxSafe.fill();
    ctxSafe.closePath();
  };

  const drawScores = () => {
    ctxSafe.font = "50px Arial";
    ctxSafe.fillStyle = "white";
    ctxSafe.textAlign = "center";
    ctxSafe.fillText(String(leftScore), canvas.width / 4, 50);
    ctxSafe.fillText(String(rightScore), (3 * canvas.width) / 4, 50);
  };

  const drawCountdown = () => {
    ctxSafe.fillStyle = "white";
    ctxSafe.font = "30px Arial";
    ctxSafe.textAlign = "center";
    ctxSafe.fillText(`Game starting in ${countdown}`, canvas.width / 2, canvas.height / 2 - 100);
    ctxSafe.font = "20px Arial";
    ctxSafe.fillText("Left Player: W/S", canvas.width / 2, canvas.height / 2);
    ctxSafe.fillText("Right Player: ArrowUp/ArrowDown", canvas.width / 2, canvas.height / 2 + 50);
  };

  // ---- Render ---------------------------------------------------------------
  function render() {
    ctxSafe.clearRect(0, 0, canvas.width, canvas.height);
    if (!gameStarted) {
      drawCountdown();
      return;
    }
    drawPaddles();
    drawBall();
    drawScores();
  }

  // ---- Game loop ------------------------------------------------------------
  function gameLoop() {
    if (!gameStarted) return;

    // Move paddles
    if (keys.w && leftPaddle.y > 0) leftPaddle.y -= PADDLE_SPEED;
    if (keys.s && leftPaddle.y < canvas.height - leftPaddle.height) leftPaddle.y += PADDLE_SPEED;
    if (keys.ArrowUp && rightPaddle.y > 0) rightPaddle.y -= PADDLE_SPEED;
    if (keys.ArrowDown && rightPaddle.y < canvas.height - rightPaddle.height) rightPaddle.y += PADDLE_SPEED;

    // Move ball
    ball.x += ball.dx;
    ball.y += ball.dy;

    // Wall collision
    if (ball.y + ball.radius > canvas.height || ball.y - ball.radius < 0) ball.dy *= -1;

    // Paddle collision
    const hitLeft =
      ball.dx < 0 &&
      ball.x - ball.radius < leftPaddle.x + leftPaddle.width &&
      ball.y > leftPaddle.y &&
      ball.y < leftPaddle.y + leftPaddle.height;

    const hitRight =
      ball.dx > 0 &&
      ball.x + ball.radius > rightPaddle.x &&
      ball.y > rightPaddle.y &&
      ball.y < rightPaddle.y + rightPaddle.height;

    if (hitLeft || hitRight) ball.dx *= -1;

    // Scoring
    if (ball.x - ball.radius < 0) {
      rightScore++;
      resetBall();
    } else if (ball.x + ball.radius > canvas.width) {
      leftScore++;
      resetBall();
    }

    render();
  }

  // ---- Countdown & start ----------------------------------------------------
  function startCountdown() {
    render();
    const countdownInterval = setInterval(() => {
      countdown--;
      render();
      if (countdown === 0) {
        clearInterval(countdownInterval);
        gameStarted = true;
        intervalId = setInterval(gameLoop, 1000 / FPS);
      }
    }, 1000);
  }

  // ---- Input ----------------------------------------------------------------
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key in keys) keys[e.key] = true;
  };

  const onKeyUp = (e: KeyboardEvent) => {
    if (e.key in keys) keys[e.key] = false;
  };

  document.addEventListener("keydown", onKeyDown);
  document.addEventListener("keyup", onKeyUp);

  // ---- Init -----------------------------------------------------------------
  startCountdown();

  // ---- Cleanup --------------------------------------------------------------
  const cleanup = () => {
    document.removeEventListener("keydown", onKeyDown);
    document.removeEventListener("keyup", onKeyUp);
    if (intervalId) clearInterval(intervalId);
  };

  return { component: gameContainer, cleanup };
}
