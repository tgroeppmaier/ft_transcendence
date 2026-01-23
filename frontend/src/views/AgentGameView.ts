import { navigateTo } from "../router.js";
import { AgentGame } from "../utils/agentGame.js";

export function AgentGameView() {
  const gameContainer = document.createElement("div");
  gameContainer.className = "flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4";
  gameContainer.id = "agent-game";
  gameContainer.innerHTML = `
    <div class="mb-4">
      <button id="back-to-main" class="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg transition shadow-sm">
        ← Back to Home
      </button>
    </div>
          <canvas id="board" width="800" height="600" class="shadow-2xl bg-black"></canvas>  `;

  const backButton = gameContainer.querySelector("#back-to-main");
  if (backButton) {
    backButton.addEventListener("click", (e) => {
      e.preventDefault();
      navigateTo("/");
    });
  }

  const canvas = gameContainer.querySelector<HTMLCanvasElement>("#board");
  if (!(canvas instanceof HTMLCanvasElement))
    throw new Error("Canvas not found");

  const ctx = canvas.getContext("2d");
  if (!ctx)
    throw new Error("Context not found");

  const onKeyDown = (e: KeyboardEvent) => {
    game.onKeyDown(e.key);
  }

  const onKeyUp = (e: KeyboardEvent) => {
    game.onKeyUp(e.key);
  }

  const onCanvasClick = () => {
    game.resetGame();
  }

  // adding event Listeners
  document.addEventListener("keydown", onKeyDown);
  document.addEventListener("keyup", onKeyUp);
  canvas.addEventListener("click", onCanvasClick);

  const game = new AgentGame(canvas, ctx);
  game.start();

  const cleanup = () => {
    game.stop();
    document.removeEventListener("keydown", onKeyDown);
    document.removeEventListener("keyup", onKeyUp);
    canvas.removeEventListener("click", onCanvasClick);
  }
  return { component: gameContainer, cleanup };
}
