const out = document.getElementById("output") as HTMLPreElement;
// let ws: WebSocket | undefined;
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

// must match the values used by the engine
const PADDLE_W = 0.02;
const PADDLE_H = 0.4;

function renderFrame(ball: { x: number; y: number; vx: number; vy: number }) {
  ctxSafe.clearRect(0, 0, canvas.width, canvas.height);

  // Draw the ball
  ctxSafe.fillStyle = "green";
  const px = (ball.x + 1) * 0.5 * canvas.width;
  const py = (ball.y + 1) * 0.5 * canvas.height;
  const radius = 0.04 * (canvas.width / 2);
  ctxSafe.beginPath();
  ctxSafe.arc(px, py, radius, 0, Math.PI * 2);
  ctxSafe.fill();

  // Draw the left paddle with same dimensions
  ctxSafe.fillStyle = "blue";
  const paddleTop = (-PADDLE_H / 2 + 1) * 0.5 * canvas.height;
  const paddleWidth = PADDLE_W * 0.5 * canvas.width;
  const paddleHeight = PADDLE_H * 0.5 * canvas.height;
  ctxSafe.fillRect(-1, paddleTop, paddleWidth, paddleHeight);
}

document.getElementById("fetch")!.onclick = () => {
  // Only create if not already open or connecting
  // if (!ws || ws.readyState === WebSocket.CLOSED) {
    // ws.onmessage = (e) => (out.textContent = e.data);
    ws.onmessage = (e) => {
      const parsedBall = JSON.parse(e.data);
      renderFrame(parsedBall);
    }
    ws.onopen = () => console.log("WS open");
    ws.onclose = () => console.log("WS closed");
    ws.onerror = (err) => console.error("WS error", err);

};
