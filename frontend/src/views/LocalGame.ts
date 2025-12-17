import { navigateTo } from "../router.js";

// scaling Factor 1 = 100%
const PADDLE_WIDTH = 0.02;
const PADDLE_HEIGHT = 0.2; 
const PADDLE_SPEED = 0.6;
const BALL_X_SPEED = 0.6
const BALL_Y_SPEED = 0.4
const BALL_RADIUS = 0.02

const POINTS_TO_WIN = 3;

export function LocalGame() {
  type Paddle = {x: number, y: number, w: number, h: number};
  
  const gameContainer = document.createElement("div");
  gameContainer.innerHTML = `
  <button id="back-to-main">Back to Main Menu</button>
  <canvas id="board" width="800" height="600" style="background-color: #000;"></canvas>
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

  // actual pixel values
  const paddleW = PADDLE_WIDTH * canvas.width;
  const paddleH = PADDLE_HEIGHT * canvas.height;
  const paddleSpeed = PADDLE_SPEED * canvas.height;

  // Game state
  const ball = {x: canvas.width / 2, y: canvas.height / 2, vx: BALL_X_SPEED * canvas.width, vy: BALL_Y_SPEED * canvas.height, radius: BALL_RADIUS * canvas.width};
  const leftPaddle: Paddle = {x: 0, y: canvas.height / 2 - paddleH / 2, w: paddleW, h: paddleH};
  const rightPaddle: Paddle = {x: canvas.width - paddleW, y: canvas.height / 2 - paddleH / 2, w: paddleW, h: paddleH};
  const score = { left: 0, right: 0};
  const keyMap: Record<string, boolean> = { "w": false, "s": false, "ArrowUp": false, "ArrowDown": false };
  let gameOver = false;

  const resetBall = () => {
    ball.x = canvas.width / 2; 
    ball.y = canvas.height / 2; 
    ball.vx *= -1; ball.vy *= -1
  }

  const resetPaddles = () => {
    leftPaddle.y = canvas.height / 2 - paddleH / 2;
    rightPaddle.y = canvas.height / 2 - paddleH / 2;
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

  const drawBall = () => {
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.closePath();
  }

  const drawScores = () => {
    ctx.font = "50px Arial";
    ctx.fillStyle = "white";
    ctx.textAlign = "center";
    ctx.fillText(String(score.left), canvas.width / 4, 50);
    ctx.fillText(String(score.right), (3 * canvas.width) / 4, 50);
  };

  const drawPaddles = () => {
    ctx.fillStyle = "white";
    ctx.fillRect(leftPaddle.x, leftPaddle.y, leftPaddle.w, leftPaddle.h);
    ctx.fillRect(rightPaddle.x, rightPaddle.y, paddleW, paddleH);
  }

  function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawPaddles();
    drawBall();
    drawScores();
  }
  
  // stores identifier of requestAnimationFrame
  let rafID = 0;
  // get timestamp
  let last = performance.now();

  const handlePaddleCollision = () => {
    //checks if ball is within y axis range of the given paddle
    const checkYaxis = (paddle: Paddle) => {
      return(ball.y + ball.radius >= paddle.y && ball.y - ball.radius <= paddle.y + paddle.h) 
    }
    
    if (ball.vx < 0 && checkYaxis(leftPaddle) && ball.x - ball.radius < paddleW) {
      ball.x = paddleW + ball.radius;
      ball.vx *= -1;
    }
    else if (ball.vx > 0 && checkYaxis(rightPaddle) && ball.x + ball.radius > rightPaddle.x) {
      ball.x = rightPaddle.x - ball.radius;
      ball.vx *= -1;
    }
  }

  function tick(now: number) {
    const dt = (now - last) / 1000; 
    last = now;
    if (keyMap["w"]) leftPaddle.y -= paddleSpeed * dt;
    if (keyMap["s"]) leftPaddle.y += paddleSpeed * dt;
    if (keyMap["ArrowUp"]) rightPaddle.y -= paddleSpeed * dt;
    if (keyMap["ArrowDown"]) rightPaddle.y += paddleSpeed * dt
    
    // clamp to top and bottom. paddle y should be min 0 and max canvas.height - paddleH
    leftPaddle.y = Math.max(0, Math.min(canvas.height - paddleH, leftPaddle.y));
    rightPaddle.y = Math.max(0, Math.min(canvas.height - paddleH, rightPaddle.y));
    
    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;

    handlePaddleCollision();
    if (ball.x < 0) { 
      resetBall();
      score.right += 1;
    } else if (ball.x > canvas.width) { 
      resetBall();
      score.left += 1; 
    }
    
    // top can bottom Wall colission
    if (ball.y + ball.radius > canvas.height) { ball.y = canvas.height - ball.radius; ball.vy *= -1; }
    if (ball.y - ball.radius < 0) { ball.y = ball.radius; ball.vy *= -1; }
    
    if (score.left >= POINTS_TO_WIN || score.right >= POINTS_TO_WIN) {
      gameOver = true;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      drawScores();
      ctx.font = "50px Arial";
      ctx.fillStyle = "white";
      ctx.textAlign = "center";
      ctx.fillText(score.left > score.right ? "Player 1 wins" : "Player 2 wins", canvas.width / 2, canvas.height / 2);
      ctx.fillText("click to play again", canvas.width / 2, (canvas.height / 3) * 2, canvas.width);
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
