import { navigateTo } from "../router.js";

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
  if (!ctx) {
    throw new Error("2D context not available");
  }
  const ctxSafe = ctx as CanvasRenderingContext2D;

  // Game state
  const paddleWidth = 10, paddleHeight = 100;
  let leftPaddle = { x: 0, y: canvas.height / 2 - paddleHeight / 2, width: paddleWidth, height: paddleHeight, dy: 0 };
  let rightPaddle = { x: canvas.width - paddleWidth, y: canvas.height / 2 - paddleHeight / 2, width: paddleWidth, height: paddleHeight, dy: 0 };
  let ball = { x: canvas.width / 2, y: canvas.height / 2, radius: 7, dx: 5, dy: 5 };
  let leftScore = 0;
  let rightScore = 0;
  let countdown = 5;
  let gameStarted = false;
  let intervalId: any;


  const keys: { [key: string]: boolean } = { w: false, s: false, ArrowUp: false, ArrowDown: false };

  function resetBall() {
    ball.x = canvas.width / 2;
    ball.y = canvas.height / 2;
    ball.dx = -ball.dx;
    ball.dy = 5;
  }

  function gameLoop() {
    if (!gameStarted) return;

    // Move paddles
    if (keys.w && leftPaddle.y > 0) {
      leftPaddle.y -= 8;
    }
    if (keys.s && leftPaddle.y < canvas.height - leftPaddle.height) {
      leftPaddle.y += 8;
    }
    if (keys.ArrowUp && rightPaddle.y > 0) {
      rightPaddle.y -= 8;
    }
    if (keys.ArrowDown && rightPaddle.y < canvas.height - rightPaddle.height) {
      rightPaddle.y += 8;
    }

    // Move ball
    ball.x += ball.dx;
    ball.y += ball.dy;

    // Wall collision (top/bottom)
    if (ball.y + ball.radius > canvas.height || ball.y - ball.radius < 0) {
      ball.dy *= -1;
    }

    // Paddle collision
    if (ball.dx < 0 && ball.x - ball.radius < leftPaddle.x + leftPaddle.width &&
        ball.y > leftPaddle.y && ball.y < leftPaddle.y + leftPaddle.height) {
      ball.dx *= -1;
    }
    if (ball.dx > 0 && ball.x + ball.radius > rightPaddle.x &&
        ball.y > rightPaddle.y && ball.y < rightPaddle.y + rightPaddle.height) {
      ball.dx *= -1;
    }

    // Score
    if (ball.x - ball.radius < 0) {
      rightScore++;
      resetBall();
    } else if (ball.x + ball.radius > canvas.width) {
      leftScore++;
      resetBall();
    }

    render();
  }

  function render() {
    ctxSafe.clearRect(0, 0, canvas.width, canvas.height);

    if (!gameStarted) {
      ctxSafe.fillStyle = "white";
      ctxSafe.font = "30px Arial";
      ctxSafe.textAlign = "center";
      ctxSafe.fillText(`Game starting in ${countdown}`, canvas.width / 2, canvas.height / 2 - 100);
      ctxSafe.font = "20px Arial";
      ctxSafe.fillText("Left Player: W/S", canvas.width / 2, canvas.height / 2);
      ctxSafe.fillText("Right Player: ArrowUp/ArrowDown", canvas.width / 2, canvas.height / 2 + 50);
      return;
    }

    // Draw paddles
    ctxSafe.fillStyle = "white";
    ctxSafe.fillRect(leftPaddle.x, leftPaddle.y, leftPaddle.width, leftPaddle.height);
    ctxSafe.fillRect(rightPaddle.x, rightPaddle.y, rightPaddle.width, rightPaddle.height);

    // Draw ball
    ctxSafe.beginPath();
    ctxSafe.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctxSafe.fillStyle = "white";
    ctxSafe.fill();
    ctxSafe.closePath();

    // Draw scores
    ctxSafe.font = "50px Arial";
    ctxSafe.fillText(String(leftScore), canvas.width / 4, 50);
    ctxSafe.fillText(String(rightScore), 3 * canvas.width / 4, 50);
  }

  function startCountdown() {
    render();
    const countdownInterval = setInterval(() => {
      countdown--;
      render();
      if (countdown === 0) {
        clearInterval(countdownInterval);
        gameStarted = true;
        intervalId = setInterval(gameLoop, 1000 / 60); // 60 FPS
      }
    }, 1000);
  }

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key in keys) {
      keys[e.key] = true;
    }
  };

  const onKeyUp = (e: KeyboardEvent) => {
    if (e.key in keys) {
      keys[e.key] = false;
    }
  };

  document.addEventListener("keydown", onKeyDown);
  document.addEventListener("keyup", onKeyUp);

  startCountdown();

  const cleanup = () => {
    console.log("Cleaning up game view");
    document.removeEventListener("keydown", onKeyDown);
    document.removeEventListener("keyup", onKeyUp);
    clearInterval(intervalId);
  };

  return { component: gameContainer, cleanup };
}
