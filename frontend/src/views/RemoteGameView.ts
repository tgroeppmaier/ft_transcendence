import { navigateTo } from "../router.js";
import { RemoteGame } from "../utils/remoteGame.js";
import { GameStatus, Score } from "../../../shared/types.js";

export async function RemoteGameView(existingGameId?: string) {
  let gameId = existingGameId;

  // Check URL params if not provided
  if (!gameId) {
    const params = new URLSearchParams(window.location.search);
    gameId = params.get("gameId") || undefined;
  }
  if (gameId) {
    try {
      const response = await fetch(`/api/games/${gameId}/state`, {
        method: "GET",
        credentials: "include" });
      if (response.ok) {
        const snapshot = await response.json() as any;
        if (snapshot.status && snapshot.status !== "waiting") {
          alert("Game is already running or finished");
          navigateTo("/menu"); // Redirect to menu or lobby
          return { component: document.createElement("div"), cleanup: () => {} };
        }
      }
    } catch (error) {
      console.log("Error fetching Snapshot:", error);
    }
  }

  // If no ID is provided, create a new game
  if (!gameId) {
    const response = await fetch("/api/games", { method: "POST"});
    const data = await response.json();
    gameId = data.gameId;
    // Use replaceState to avoid history loop
    window.history.replaceState({}, "", `/remote-game?gameId=${gameId}`);
  }

  const gameContainer = document.createElement("div");
  gameContainer.className = "flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4";
  gameContainer.innerHTML = `
  <div class="relative">
    <canvas id="board" width="800" height="600" class="shadow-2xl" style="background-color: #000;"></canvas>
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
            const res = await fetch("/api/invite", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ targetId: friendId, gameId: gameId }),
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

  const onStateChange = (status: GameStatus, side: "left" | "right" | null, score: Score) => {
      if (status === "waiting") {
        if (side === "left") {
            inviteOverlay.classList.remove("hidden");
        }
      } else {
        inviteOverlay.classList.add("hidden");
        inviteModal.classList.add("hidden");
      }
  };

  const game = new RemoteGame(gameId, canvas, onStateChange);
  game.start();

  return {
    component: gameContainer,
    cleanup: () => {
      game.stop();
    },
  };
}
