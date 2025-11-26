import { navigateTo } from '../router.js';

export function LocalGame() {
  const gameContainer = document.createElement('div');
  gameContainer.innerHTML = `
    <button id="back-to-main">Back to Main Menu</button>
    <canvas id="board" height="600" width="800" style="border: 1px solid #000000;"></canvas>
  `;

  const backButton = gameContainer.querySelector('#back-to-main');
  if (backButton) {
    backButton.addEventListener('click', (e) => {
      e.preventDefault();
      navigateTo('/');
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

  const backendSocket = new WebSocket("/api/ws");

  type Ball = { x: number; y: number; vx: number; vy: number };
  type Paddle = { x: number; y: number; w: number; h: number };
  type GameData = { ball: Ball; leftPaddle: Paddle};

  const keys = { up: false, down: false };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === "ArrowUp" && !keys.up) {
      keys.up = true;
      backendSocket.send(JSON.stringify({ type: "move", direction: "up", action: "start" }));
    } else if (e.key === "ArrowDown" && !keys.down) {
      keys.down = true;
      backendSocket.send(JSON.stringify({ type: "move", direction: "down", action: "start" }));
    }
  };

  const onKeyUp = (e: KeyboardEvent) => {
    if (e.key === "ArrowUp" && keys.up) {
      keys.up = false;
      backendSocket.send(JSON.stringify({ type: "move", direction: "up", action: "stop" }));
    } else if (e.key === "ArrowDown" && keys.down) {
      keys.down = false;
      backendSocket.send(JSON.stringify({ type: "move", direction: "down", action: "stop" }));
    }
  };

  document.addEventListener("keydown", onKeyDown);
  document.addEventListener("keyup", onKeyUp);

  function renderFrame(data: GameData) {
    ctxSafe.clearRect(0, 0, canvas.width, canvas.height);

    const ball: Ball = data.ball;
    const leftPaddle: Paddle = data.leftPaddle;

    ctxSafe.fillStyle = "green";
    const px = ball.x * canvas.width;
    const py = ball.y * canvas.height;
    const radius = 0.04 * canvas.width;
    ctxSafe.beginPath();
    ctxSafe.arc(px, py, radius, 0, Math.PI * 2);
    ctxSafe.fill();

    ctxSafe.fillStyle = "blue";
    ctxSafe.fillRect(leftPaddle.x, leftPaddle.y * canvas.height, leftPaddle.w * canvas.width, leftPaddle.h *canvas.height);
  }

  backendSocket.onmessage = (e) => {
    const data: GameData = JSON.parse(e.data);
    renderFrame(data);
  };

  backendSocket.onopen = () => console.log("WS open");
  backendSocket.onclose = () => {
    console.log("WS closed");
  };
  backendSocket.onerror = (err) => console.error("WS error", err);

  const cleanup = () => {
    console.log("Cleaning up game view");
    document.removeEventListener("keydown", onKeyDown);
    document.removeEventListener("keyup", onKeyUp);
    backendSocket.close();
  };

  return { component: gameContainer, cleanup };
}
