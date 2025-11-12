const out = document.getElementById("output") as HTMLPreElement;
const ws = new WebSocket("/api/ws");

const canvasElement = document.getElementById("board");
if (!(canvasElement instanceof HTMLCanvasElement)) {
  throw new Error('Canvas #board not found');
}
const canvas = canvasElement;
const ctx = canvas.getContext("2d");
if (!ctx) {
  throw new Error('2D context not available');
}
const ctxSafe = ctx as CanvasRenderingContext2D;

type Ball = { x: number; y: number; vx: number; vy: number };
type Paddle = { x: number; y: number; w: number; h: number };
type GameData = { ball: Ball; leftPaddle: Paddle};


function renderFrame(data: GameData) {
  ctxSafe.clearRect(0, 0, canvas.width, canvas.height);

  const ball: Ball = data.ball;
  const leftPaddle: Paddle = data.leftPaddle;

  // Draw the ball
  ctxSafe.fillStyle = "green";
  const px = ball.x * canvas.width;
  const py = ball.y * canvas.height;
  const radius = 0.04 * canvas.width;
  ctxSafe.beginPath();
  ctxSafe.arc(px, py, radius, 0, Math.PI * 2);
  ctxSafe.fill();

  // Draw the left paddle
  ctxSafe.fillStyle = "blue";
  ctxSafe.fillRect(leftPaddle.x, leftPaddle.y * canvas.height, leftPaddle.w * canvas.width, leftPaddle.h *canvas.height);
}

document.getElementById("fetch")!.onclick = () => {
  // Only create if not already open or connecting
  // if (!ws || ws.readyState === WebSocket.CLOSED) {
    // ws.onmessage = (e) => (out.textContent = e.data);
    ws.onmessage = (e) => {
      const data: GameData = JSON.parse(e.data);
      renderFrame(data);
    }
    ws.onopen = () => console.log("WS open");
    ws.onclose = () => console.log("WS closed");
    ws.onerror = (err) => console.error("WS error", err);

};
