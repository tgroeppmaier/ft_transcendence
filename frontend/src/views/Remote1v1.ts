import { navigateTo } from "../router.js";
import {
  drawBall,
  drawPaddles,
  drawScores,
  drawMessage,
} from "../utils/gameRenderer.js";
import {
  Ball,
  Paddle,
  Score,
  ServerMessage,
  GameStatus,
  ErrorMessage,
  Action,
} from "../../../shared/types.js";
import {
  BALL_RADIUS,
  PADDLE_WIDTH,
  PADDLE_HEIGHT,
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
} from "../../../shared/constants.js";

// const cleanupFunction = (ws: WebSocket) => {
//   ws.close();
// }

export async function remoteGame(existingGameId?: string) {
  let gameId = existingGameId;

  // Check URL params if not provided
  if (!gameId) {
    const params = new URLSearchParams(window.location.search);
    gameId = params.get("gameId") || undefined;
  }

  // If no ID is provided, create a new game 
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

  let ball: Ball = { x: 0.5, y: 0.5, vx: 0, vy: 0 };
  let leftPaddle: Paddle = { x: 0, y: 0.4 };
  let rightPaddle: Paddle = { x: 1 - PADDLE_WIDTH, y: 0.4 };
  let score: Score = { left: 0, right: 0 };
  let gameStatus: GameStatus = "waiting";
  let mySide: "left" | "right" | null = null;


  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data) as ServerMessage;
    
    // 1. Error Message
    if ("type" in msg && msg.type === "error") {
      drawMessage(ctx, canvas, `Error: ${msg.message}`);
      return;
    }

    // 2. Init Message
    if ("type" in msg && msg.type === "init") {
      mySide = msg.side;
      return;
    }

    // 3. State Update (Score/Status)
    if ("type" in msg && msg.type === "state") {
      gameStatus = msg.status;
      score.left = msg.score[0];
      score.right = msg.score[1];
      
      // Force redraw of score/status
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      drawScores(ctx, canvas, score);
      drawBall(ctx, canvas, ball);
      drawPaddles(ctx, canvas, leftPaddle, rightPaddle);
      
      if (gameStatus === "waiting") {
        drawMessage(ctx, canvas, "Waiting for other Player");
      } else if (gameStatus === "gameOver") {
        if (mySide === "left") {
          drawMessage(ctx, canvas, score.left > score.right ? "You won!" : "You lost!");
        } else if (mySide === "right") {
          drawMessage(ctx, canvas, score.right > score.left ? "You won!" : "You lost!");
        } else {
          drawMessage(ctx, canvas, "Game Over");
        }
      }
      return;
    }
    
    // 4. Game Tick (Ball/Paddles)
    if ("t" in msg) {
      // Update local state from snapshot
      ball.x = msg.b[0];
      ball.y = msg.b[1];
      leftPaddle.y = msg.p[0];
      rightPaddle.y = msg.p[1];

      // Render Loop
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      drawScores(ctx, canvas, score);
      
      if (gameStatus === "gameOver") {
         if (mySide === "left") {
          drawMessage(ctx, canvas, score.left > score.right ? "You won!" : "You lost!");
        } else if (mySide === "right") {
          drawMessage(ctx, canvas, score.right > score.left ? "You won!" : "You lost!");
        } else {
          drawMessage(ctx, canvas, "Game Over");
        }
        return;
      }
      
      if (gameStatus === "waiting") {
        drawMessage(ctx, canvas, "Waiting for other Player");
        return;
      }

      drawBall(ctx, canvas, ball);
      drawPaddles(ctx, canvas, leftPaddle, rightPaddle);
    }
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