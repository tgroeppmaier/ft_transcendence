import { navigateTo } from "../router.js";

// const cleanupFunction = (ws: WebSocket) => {
//   ws.close();
// }

type Ball = { x: number; y: number; radius: number };
type Paddle = { x: number; y: number; w: number; h: number };
type State = "connecting" | "waiting" | "gameRunning" | "gameOver" | "gameFull";
type Score = { left: number; right: number };
type GameMessage = {
  ball: Ball;
  leftPaddle: Paddle;
  rightPaddle: Paddle;
  state: State;
  score: Score;
};
type ErrorMessage = { error: string };


type MoveDirection = "up" | "down";
type MoveAction = "start" | "stop";

type Action = { move: MoveAction; direction: MoveDirection };

export async function remoteGame(existingGameId?: string) {
  let gameId = existingGameId;

  // Check URL params if not provided
  if (!gameId) {
    const params = new URLSearchParams(window.location.search);
    gameId = params.get("gameId") || undefined;
  }

  // If no ID is provided, create a new game (Lobby "Create" behavior)
  if (!gameId) {
    const response = await fetch("/api/games", { method: "POST"});
    const data = await response.json();
    gameId = data.gameId;
    // Use replaceState to avoid history loop
    window.history.replaceState({}, "", `/remote-game?gameId=${gameId}`);
  }
  
  const ws = new WebSocket(`${window.location.protocol === "https:" ? "wss" : "ws"}://${window.location.host}/api/ws/${gameId}`);


  ws.addEventListener("open", () => console.log("[ws] open"));
  ws.addEventListener("close", (e) =>
    console.log("[ws] close", e.code, e.reason),
  );
  ws.addEventListener("error", (e) => console.log("[ws] error", e));

  const gameContainer = document.createElement("div");
  gameContainer.innerHTML = `
  <canvas id="board" width="800" height="600" style="background-color: #000;"></canvas>
  `;
  const canvas = gameContainer.querySelector<HTMLCanvasElement>("#board");
  if (!(canvas instanceof HTMLCanvasElement))
    throw new Error("Canvas not found");

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D context not found");

  let ball: Ball = { x: 0, y: 0, radius: 0 };
  let leftPaddle = { x: 0, y: 0, w: 0, h: 0 };
  let rightPaddle = { x: 0, y: 0, w: 0, h: 0 };
  let score: Score = { left: 0, right: 0 };

  const drawBall = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.beginPath();
    ctx.arc(
      ball.x * canvas.width,
      ball.y * canvas.height,
      ball.radius * canvas.width,
      0,
      Math.PI * 2,
    );
    ctx.fillStyle = "white";
    ctx.fill();
    ctx.closePath();
  };

  const drawPaddles = () => {
    ctx.fillStyle = "white";
    ctx.fillRect(
      leftPaddle.x * canvas.width,
      leftPaddle.y * canvas.height,
      leftPaddle.w * canvas.width,
      leftPaddle.h * canvas.height,
    );
    ctx.fillRect(
      rightPaddle.x * canvas.width,
      rightPaddle.y * canvas.height,
      rightPaddle.w * canvas.width,
      rightPaddle.h * canvas.height,
    );
  };

  const drawScores = () => {
    ctx.font = "50px Arial";
    ctx.fillStyle = "white";
    ctx.textAlign = "center";
    ctx.fillText(String(score.left), canvas.width / 4, 50);
    ctx.fillText(String(score.right), (3 * canvas.width) / 4, 50);
  };

  const drawMessage = (text: string) => {
    ctx.fillStyle = "white";
    ctx.font = "30px Arial";
    ctx.textAlign = "center";
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);
  };



  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data) as GameMessage | ErrorMessage;
    
    if ("error" in msg) {
      drawMessage(`Error: ${msg.error}`);
      return;
    }
    
    if (msg.state == "waiting") {
      drawMessage("Waiting for other Player");
      return;
    }
    ball = msg.ball;
    leftPaddle = msg.leftPaddle;
    rightPaddle = msg.rightPaddle;
    score = msg.score;

    drawBall();
    drawPaddles();
    drawScores();

    // console.log("Ball position:", msg);
  };

  const keyMap: Record<string, boolean> = { up: false, down: false };

  const sendAction = (action: Action) => {
    if (ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify(action));
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === "w" && !keyMap[e.key]) {
      keyMap[e.key] = true;
      sendAction({ move: "start", direction: "up" });
    }
    if (e.key === "s" && !keyMap[e.key]) {
      keyMap[e.key] = true;
      sendAction({ move: "start", direction: "down" });
    }
  };

  const onKeyUp = (e: KeyboardEvent) => {
    if (e.key === "w") {
      keyMap[e.key] = false;
      sendAction({ move: "stop", direction: "up" });
    }
    if (e.key === "s") {
      keyMap[e.key] = false;
      sendAction({ move: "stop", direction: "down" });
    }
  };

  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);

  return {
    component: gameContainer,
    cleanup: () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      ws.close();
    },
  };
}
