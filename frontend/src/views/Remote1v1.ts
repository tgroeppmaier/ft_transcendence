import { navigateTo } from "../router.js";

type Scores = { left: number; right: number };
type BallData = { x: number; y: number };
type PaddleData = { y: number };
type GameState =
  | { type: "connecting" }
  | { type: "waiting" }
  | { type: "countdown"; player: number }
  | { type: "gameState"; ball: BallData; leftPaddle: PaddleData; rightPaddle: PaddleData; scores: Scores }
  | { type: "gameOver"; winner: number; scores: Scores }
  | { type: "opponentDisconnected" }
  | { type: "error"; message: string };

type MoveDirection = "up" | "down";
type MoveAction = "start" | "stop";

const PADDLE_WIDTH = 0.025;
const PADDLE_HEIGHT = 0.25;
const BALL_RADIUS = 0.015;
const COUNTDOWN_START = 5;

export function Remote1v1() {
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

  let playerId: number | null = null;
  let gameState: GameState = { type: "connecting" };
  let statusText = "Connecting to server...";
  let countdownValue = COUNTDOWN_START;
  let countdownTimer: ReturnType<typeof setInterval> | null = null;

  const viewFromPerspective = (state: Extract<GameState, { type: "gameState" }>) => {
    const myPaddleY = playerId === 1 ? state.leftPaddle.y : state.rightPaddle.y;
    const opponentPaddleY = playerId === 1 ? state.rightPaddle.y : state.leftPaddle.y;
    const ballX = playerId === 1 ? state.ball.x : 1 - state.ball.x;
    const ballY = state.ball.y;
    const myScore = playerId === 1 ? state.scores.left : state.scores.right;
    const opponentScore = playerId === 1 ? state.scores.right : state.scores.left;
    return { myPaddleY, opponentPaddleY, ballX, ballY, myScore, opponentScore };
  };

  const drawMessage = (text: string) => {
    ctxSafe.fillStyle = "white";
    ctxSafe.font = "30px Arial";
    ctxSafe.textAlign = "center";
    ctxSafe.fillText(text, canvas.width / 2, canvas.height / 2);
  };

  const drawCountdown = () => {
    ctxSafe.clearRect(0, 0, canvas.width, canvas.height);
    drawMessage(`Game starting in ${countdownValue}`);
  };

  const drawGameOver = (state: Extract<GameState, { type: "gameOver" }>) => {
    if (playerId === null) return drawMessage("Game over");
    const iWon = (playerId === 1 && state.winner === 1) || (playerId === 2 && state.winner === 2);
    ctxSafe.clearRect(0, 0, canvas.width, canvas.height);
    ctxSafe.fillStyle = "white";
    ctxSafe.font = "50px Arial";
    ctxSafe.textAlign = "center";
    ctxSafe.fillText(iWon ? "You win!" : "You lose!", canvas.width / 2, canvas.height / 2 - 50);
    const myScore = playerId === 1 ? state.scores.left : state.scores.right;
    const opponentScore = playerId === 1 ? state.scores.right : state.scores.left;
    ctxSafe.font = "30px Arial";
    ctxSafe.fillText(`${myScore} - ${opponentScore}`, canvas.width / 2, canvas.height / 2 + 50);
  };

  const drawScores = (myScore: number, opponentScore: number) => {
    ctxSafe.font = "50px Arial";
    ctxSafe.textAlign = "center";
    ctxSafe.fillText(String(myScore), canvas.width / 4, 50);
    ctxSafe.fillText(String(opponentScore), (3 * canvas.width) / 4, 50);
  };

  const drawBall = (x: number, y: number) => {
    const radius = BALL_RADIUS * Math.min(canvas.width, canvas.height);
    ctxSafe.beginPath();
    ctxSafe.arc(x * canvas.width, y * canvas.height, radius, 0, Math.PI * 2);
    ctxSafe.fill();
    ctxSafe.closePath();
  };

  const drawPaddles = (myPaddleY: number, opponentPaddleY: number) => {
    ctxSafe.fillRect(0, myPaddleY * canvas.height, PADDLE_WIDTH * canvas.width, PADDLE_HEIGHT * canvas.height);
    ctxSafe.fillRect(canvas.width - PADDLE_WIDTH * canvas.width, opponentPaddleY * canvas.height, PADDLE_WIDTH * canvas.width, PADDLE_HEIGHT * canvas.height);
  };

  function draw() {
    ctxSafe.clearRect(0, 0, canvas.width, canvas.height);
    ctxSafe.fillStyle = "white";

    if (gameState.type === "countdown") {
      drawCountdown();
      return;
    }

    if (gameState.type === "gameOver") {
      drawGameOver(gameState);
      return;
    }

    if (gameState.type !== "gameState" || playerId === null) {
      drawMessage(statusText);
      return;
    }

    const view = viewFromPerspective(gameState);
    drawScores(view.myScore, view.opponentScore);
    drawBall(view.ballX, view.ballY);
    drawPaddles(view.myPaddleY, view.opponentPaddleY);
  }


  const ws = new WebSocket(`${window.location.protocol === "https:" ? "wss" : "ws"}://${window.location.host}/api/ws`);

  const sendMove = (direction: MoveDirection, action: MoveAction) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "move", direction, action }));
    }
  };

  const handleWaiting = () => {
    statusText = "Waiting for an opponent...";
  };

  const handleCountdown = (player: number) => {
    playerId = player;
    countdownValue = COUNTDOWN_START;
    if (countdownTimer) clearInterval(countdownTimer);
    countdownTimer = setInterval(() => {
      countdownValue--;
      if (countdownValue <= 0 && countdownTimer) {
        clearInterval(countdownTimer);
        countdownTimer = null;
      }
      draw();
    }, 1000);
  };

  const handleGameOver = () => {
    setTimeout(() => navigateTo("/"), 3000);
  };

  const handleOpponentDisconnected = () => {
    statusText = "Opponent disconnected.";
    setTimeout(() => navigateTo("/"), 3000);
  };

  ws.onmessage = (e) => {
    const data: GameState = JSON.parse(e.data);
    gameState = data;
    switch (data.type) {
      case "waiting":
        handleWaiting();
        break;
      case "countdown":
        handleCountdown(data.player);
        break;
      case "gameOver":
        handleGameOver();
        break;
      case "opponentDisconnected":
        handleOpponentDisconnected();
        break;
      case "error":
        statusText = data.message;
        break;
      default:
        break;
    }
    draw();
  };

  ws.onopen = () => {
    statusText = "Connected. Waiting for game to start...";
    draw();
  };
  ws.onclose = () => {
    statusText = "Connection lost.";
    draw();
  };
  ws.onerror = () => {
    statusText = "Connection error.";
    draw();
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === "w" || e.key === "ArrowUp") {
      sendMove("up", "start");
    } else if (e.key === "s" || e.key === "ArrowDown") {
      sendMove("down", "start");
    }
  };

  const onKeyUp = (e: KeyboardEvent) => {
    if (e.key === "w" || e.key === "ArrowUp") {
      sendMove("up", "stop");
    } else if (e.key === "s" || e.key === "ArrowDown") {
      sendMove("down", "stop");
    }
  };

  document.addEventListener("keydown", onKeyDown);
  document.addEventListener("keyup", onKeyUp);

  const cleanup = () => {
    document.removeEventListener("keydown", onKeyDown);
    document.removeEventListener("keyup", onKeyUp);
    if (countdownTimer) {
      clearInterval(countdownTimer);
      countdownTimer = null;
    }
    if (ws.readyState === WebSocket.OPEN) {
      ws.close();
    }
  };

  draw();

  return { component: gameContainer, cleanup };
}
