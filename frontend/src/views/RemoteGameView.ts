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
    <canvas id="board" width="800" height="600" class="shadow-2xl bg-black"></canvas>
  </div>
  `;
  const canvas = gameContainer.querySelector<HTMLCanvasElement>("#board");
  if (!(canvas instanceof HTMLCanvasElement))
    throw new Error("Canvas not found");

  const onStateChange = (status: GameStatus, side: "left" | "right" | null, score: Score) => {
      // Logic for state changes can be added here (e.g., UI updates outside canvas)
  };

  const game = new RemoteGame(gameId, canvas, onStateChange);
  game.start();

  const handleKeyDown = (e: KeyboardEvent) => game.onKeyDown(e.key);
  const handleKeyUp = (e: KeyboardEvent) => game.onKeyUp(e.key);

  window.addEventListener("keydown", handleKeyDown);
  window.addEventListener("keyup", handleKeyUp);

  return {
    component: gameContainer,
    cleanup: () => {
      game.stop();
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    },
  };
}
