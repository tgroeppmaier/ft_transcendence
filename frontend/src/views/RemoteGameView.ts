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

export async function RemoteGameView(existingGameId?: string) {
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
  gameContainer.className = "flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4";
  gameContainer.innerHTML = `
  <div class="relative">
    <canvas id="board" width="800" height="600" class="rounded-xl shadow-2xl border-4 border-gray-800" style="background-color: #000;"></canvas>
    <div id="invite-overlay" class="absolute top-4 right-4 hidden">
        <button id="invite-btn" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition">
            Invite Friend
        </button>
    </div>
  </div>
  
  <!-- Invite Modal -->
  <div id="invite-modal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 hidden">
      <div class="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl">
          <div class="flex justify-between items-center mb-4">
              <h3 class="text-xl font-bold text-gray-800">Invite a Friend</h3>
              <button id="close-modal" class="text-gray-500 hover:text-gray-700 text-2xl">&times;</button>
          </div>
          <div id="friends-list" class="flex flex-col gap-2 max-h-60 overflow-y-auto">
              <!-- Friends will be loaded here -->
              <p class="text-gray-500 text-center py-4">Loading friends...</p>
          </div>
      </div>
  </div>
  `;
  const canvas = gameContainer.querySelector<HTMLCanvasElement>("#board");
  if (!(canvas instanceof HTMLCanvasElement))
    throw new Error("Canvas not found");

  const inviteOverlay = gameContainer.querySelector("#invite-overlay") as HTMLElement;
  const inviteBtn = gameContainer.querySelector("#invite-btn") as HTMLButtonElement;
  const inviteModal = gameContainer.querySelector("#invite-modal") as HTMLElement;
  const closeModal = gameContainer.querySelector("#close-modal") as HTMLButtonElement;
  const friendsList = gameContainer.querySelector("#friends-list") as HTMLElement;

  inviteBtn.addEventListener("click", async () => {
      inviteModal.classList.remove("hidden");
      try {
          const res = await fetch("/api/friends", { credentials: "include" });
          const data = await res.json();
          friendsList.innerHTML = "";
          
          if (data.friends && data.friends.length > 0) {
              data.friends.forEach((friend: any) => {
                  const btn = document.createElement("button");
                  btn.className = "flex items-center gap-3 p-3 hover:bg-gray-100 rounded-lg transition w-full text-left";
                  btn.innerHTML = `
                      <img src="/uploads/${friend.avatar || 'default.png'}" class="w-8 h-8 rounded-full object-cover">
                      <span class="font-medium text-gray-800">${friend.login}</span>
                  `;
                  btn.onclick = () => sendInvite(friend.id);
                  friendsList.appendChild(btn);
              });
          } else {
              friendsList.innerHTML = `<p class="text-gray-500 text-center py-4">No friends found.</p>`;
          }
      } catch (err) {
          friendsList.innerHTML = `<p class="text-red-500 text-center py-4">Error loading friends.</p>`;
      }
  });

  closeModal.addEventListener("click", () => {
      inviteModal.classList.add("hidden");
  });

  async function sendInvite(friendId: number) {
      try {
          const res = await fetch("/api/game/invite", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ friend_id: friendId, game_uuid: gameId }),
              credentials: "include"
          });
          
          if (res.ok) {
              alert("Invitation sent!");
              inviteModal.classList.add("hidden");
          } else {
              const data = await res.json();
              alert(`Error: ${data.message}`);
          }
      } catch (err) {
          alert("Error sending invitation");
      }
  }

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D context not found");

  let ball: Ball = { x: 0.5, y: 0.5, vx: 0, vy: 0 };
  let leftPaddle: Paddle = { x: 0, y: (CANVAS_HEIGHT - PADDLE_HEIGHT) / 2 };
  let rightPaddle: Paddle = { x: CANVAS_WIDTH - PADDLE_WIDTH, y: (CANVAS_HEIGHT - PADDLE_HEIGHT) / 2 };
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
      
      if (gameStatus === "waiting") {
        if (mySide === "left") {
            inviteOverlay.classList.remove("hidden");
        }
      } else {
        inviteOverlay.classList.add("hidden");
        inviteModal.classList.add("hidden"); 
      }
      return;
    }
    
    // 4. Game Tick (Ball/Paddles)
    if ("t" in msg) {
      ball.x = msg.b[0];
      ball.y = msg.b[1];
      leftPaddle.y = msg.p[0];
      rightPaddle.y = msg.p[1];
    }
  };

  let rafID = 0;

  function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    drawScores(ctx, canvas, score);
    
    if (gameStatus === "waiting") {
      drawMessage(ctx, canvas, "Waiting for other Player");
    } 
    else if (gameStatus === "gameOver") {
       if (mySide === "left") {
        drawMessage(ctx, canvas, score.left > score.right ? "You won!" : "You lost!");
      } else if (mySide === "right") {
        drawMessage(ctx, canvas, score.right > score.left ? "You won!" : "You lost!");
      } else {
        drawMessage(ctx, canvas, "Game Over");
      }
    } else {
      // Game Running
      drawBall(ctx, canvas, ball);
      drawPaddles(ctx, canvas, leftPaddle, rightPaddle);
    }

    rafID = requestAnimationFrame(render);
  }

  // Start render loop
  rafID = requestAnimationFrame(render);

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
      cancelAnimationFrame(rafID);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      ws.close();
    },
  };
}