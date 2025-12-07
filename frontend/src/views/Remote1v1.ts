import { navigateTo } from "../router.js";

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

  let player_id: number;
  let gameState: any = { type: "connecting" };
  let message = "Connecting to server...";
  let countdownValue = 5;

  const paddleWidth = 0.025;  // Normalized (matches backend)
  const paddleHeight = 0.25;  // Normalized (matches backend)
  const ballRadius = 0.015;  // Normalized (matches backend)

  function draw() {
    ctxSafe.clearRect(0, 0, canvas.width, canvas.height);
    ctxSafe.fillStyle = "white";
    ctxSafe.font = "30px Arial";
    ctxSafe.textAlign = "center";

    if (gameState.type === "countdown") {
      ctxSafe.fillText(`Game starting in ${countdownValue}`, canvas.width / 2, canvas.height / 2);
      return;
    }

    if (gameState.type === "gameOver") {
      const iWon = (player_id === 1 && gameState.winner === 1) || (player_id === 2 && gameState.winner === 2);
      ctxSafe.font = "50px Arial";
      ctxSafe.fillText(iWon ? "You win!" : "You lose!", canvas.width / 2, canvas.height / 2 - 50);
      const myScore = player_id === 1 ? gameState.scores.left : gameState.scores.right;
      const opponentScore = player_id === 1 ? gameState.scores.right : gameState.scores.left;
      ctxSafe.font = "30px Arial";
      ctxSafe.fillText(`${myScore} - ${opponentScore}`, canvas.width / 2, canvas.height / 2 + 50);
      return;
    }

    if (gameState.type !== "gameState") {
      ctxSafe.fillText(message, canvas.width / 2, canvas.height / 2);
      return;
    }

    // Get positions relative to player (player always on left)
    const myPaddleY = player_id === 1 ? gameState.leftPaddle.y : gameState.rightPaddle.y;
    const opponentPaddleY = player_id === 1 ? gameState.rightPaddle.y : gameState.leftPaddle.y;
    const ballX = player_id === 1 ? gameState.ball.x : 1 - gameState.ball.x;
    const ballY = gameState.ball.y;
    const myScore = player_id === 1 ? gameState.scores.left : gameState.scores.right;
    const opponentScore = player_id === 1 ? gameState.scores.right : gameState.scores.left;

    // Draw scores (my score on left, opponent on right)
    ctxSafe.font = "50px Arial";
    ctxSafe.fillText(String(myScore), canvas.width / 4, 50);
    ctxSafe.fillText(String(opponentScore), 3 * canvas.width / 4, 50);

    // Draw ball
    const ballPixelRadius = ballRadius * Math.min(canvas.width, canvas.height);
    ctxSafe.beginPath();
    ctxSafe.arc(ballX * canvas.width, ballY * canvas.height, ballPixelRadius, 0, Math.PI * 2);
    ctxSafe.fill();
    ctxSafe.closePath();

    // Draw paddles (my paddle on left, opponent on right)
    ctxSafe.fillRect(0, myPaddleY * canvas.height, paddleWidth * canvas.width, paddleHeight * canvas.height);
    ctxSafe.fillRect(canvas.width - paddleWidth * canvas.width, opponentPaddleY * canvas.height, paddleWidth * canvas.width, paddleHeight * canvas.height);
  }


  const backendSocket = new WebSocket(`${window.location.protocol === "https:" ? "wss" : "ws"}://${window.location.host}/api/ws`);

  backendSocket.onmessage = (e) => {
    const data = JSON.parse(e.data);
    gameState = data;
    switch (data.type) {
      case "waiting":
        message = "Waiting for an opponent...";
        break;
      case "countdown":
        player_id = data.player;
        let countdownInterval = setInterval(() => {
          countdownValue--;
          if (countdownValue <= 0) {
            clearInterval(countdownInterval);
          }
          draw();
        }, 1000);
        break;
      case "gameStart":
        message = "Game is starting!";
        break;
      case "gameOver":
        setTimeout(() => navigateTo("/"), 3000);
        break;
      case "opponentDisconnected":
        message = "Opponent disconnected.";
        setTimeout(() => navigateTo("/"), 3000);
        break;
      case "error":
        message = data.message;
        break;
    }
    draw();
  };

  backendSocket.onopen = () => {
    console.log("WS open");
    message = "Connected. Waiting for game to start...";
    draw();
  };
  backendSocket.onclose = () => {
    console.log("WS closed");
    message = "Connection lost.";
    draw();
  };
  backendSocket.onerror = (err) => {
    console.error("WS error", err);
    message = "Connection error.";
    draw();
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === "w" || e.key === "ArrowUp") {
      backendSocket.send(JSON.stringify({ type: "move", direction: "up", action: "start" }));
    } else if (e.key === "s" || e.key === "ArrowDown") {
      backendSocket.send(JSON.stringify({ type: "move", direction: "down", action: "start" }));
    }
  };

  const onKeyUp = (e: KeyboardEvent) => {
    if (e.key === "w" || e.key === "ArrowUp") {
      backendSocket.send(JSON.stringify({ type: "move", direction: "up", action: "stop" }));
    } else if (e.key === "s" || e.key === "ArrowDown") {
      backendSocket.send(JSON.stringify({ type: "move", direction: "down", action: "stop" }));
    }
  };

  document.addEventListener("keydown", onKeyDown);
  document.addEventListener("keyup", onKeyUp);

  const cleanup = () => {
    console.log("Cleaning up game view");
    document.removeEventListener("keydown", onKeyDown);
    document.removeEventListener("keyup", onKeyUp);
    if (backendSocket.readyState === WebSocket.OPEN) {
      backendSocket.close();
    }
  };

  draw();

  return { component: gameContainer, cleanup };
}
