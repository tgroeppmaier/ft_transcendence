const out = document.getElementById("output") as HTMLPreElement;
let ws: WebSocket | undefined;

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

function renderBall(ball: { x: number; y: number; vx: number; vy: number }) {
  ctxSafe.clearRect(0, 0, canvas.width, canvas.height);
  ctxSafe.fillStyle = "green";
  const px = (ball.x + 1) * 0.5 * canvas.width;
  const py = (ball.y + 1) * 0.5 * canvas.height;
  ctxSafe.fillRect(px, py, 10, 10);

}

document.getElementById("fetch")!.onclick = () => {
  // Only create if not already open or connecting
  if (!ws || ws.readyState === WebSocket.CLOSED) {
    ws = new WebSocket("/api/ws");
    // ws.onmessage = (e) => (out.textContent = e.data);
    ws.onmessage = (e) => {
      const parsedBall = JSON.parse(e.data);
      renderBall(parsedBall);
    }
    ws.onopen = () => console.log("WS open");
    ws.onclose = () => console.log("WS closed");
    ws.onerror = (err) => console.error("WS error", err);
  } else {
    console.log("WS already connected");
  }

};
