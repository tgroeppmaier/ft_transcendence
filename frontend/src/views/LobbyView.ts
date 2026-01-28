import { navigateTo } from "../router.js";

export async function gameLobby() {
  const container = document.createElement("div");
  

  container.className = "min-h-screen bg-gray-100 p-8 flex flex-col items-center";
  container.innerHTML = `
    <div class="w-full max-w-4xl">
      <div class="flex justify-between items-center mb-8">
        <h2 class="text-3xl font-bold text-blue-900">Available Games</h2>
        <button id="back-to-menu" class="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg transition">
          Back to Menu
        </button>
      </div>
      
      <div id="game-list" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <!-- Games will be injected here -->
      </div>
      
      <div class="text-center">
        <button id="create-game" class="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-8 rounded-xl shadow-lg transform transition hover:scale-105">
          + Create New Game
        </button>
      </div>
    </div>
  `;
  
  const gameList = container.querySelector("#game-list") as HTMLDivElement;
  const createButton = container.querySelector("#create-game") as HTMLButtonElement;
  const backButton = container.querySelector("#back-to-menu") as HTMLButtonElement;

  backButton.onclick = () => navigateTo("/menu");
  
  try {
    const response = await fetch("/api/games", { method: "GET" });
    if (!response.ok) throw new Error("Failed to fetch games");
    const data = await response.json();
    
    if (data.games && data.games.length > 0) {
      data.games.forEach((gameId: string) => {
        const gameCard = document.createElement("div");
        gameCard.className = "bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition cursor-pointer border border-gray-200";
        gameCard.innerHTML = `
          <div class="flex flex-col items-center gap-2">
            <span class="text-4xl">🏓</span>
            <h3 class="font-semibold text-gray-800 text-lg">Game</h3>
            <p class="text-xs text-gray-500 font-mono bg-gray-100 px-2 py-1 rounded">${gameId.slice(0, 8)}...</p>
            <button class="mt-2 w-full bg-blue-100 text-blue-700 font-semibold py-2 rounded-lg hover:bg-blue-200 transition">
              Join
            </button>
          </div>
        `;
        gameCard.onclick = () => navigateTo(`/remote-game?gameId=${gameId}`);
        gameList.appendChild(gameCard);
      });
    } else {
      gameList.innerHTML = `
        <div class="col-span-full text-center py-12 bg-white rounded-2xl border-2 border-dashed border-gray-300">
          <p class="text-gray-500 text-lg">No active games found.</p>
          <p class="text-gray-400 text-sm mt-1">Create one to get started!</p>
        </div>
      `;
    }
  } catch (error) {
    gameList.innerHTML = `<p class="text-red-500 col-span-full text-center">Error loading games.</p>`;
  }
  
  createButton.onclick = async () => {
    try {
      const response = await fetch("/api/games", { method: "POST" });
      const data = await response.json();
      if (!response.ok) {
        alert(data.message || "Failed to create game");
        return;
      }
      const { gameId } = data;
      navigateTo(`/remote-game?gameId=${gameId}`);
    } catch (error) {
    }
  };
  
  return {
    component: container,
    cleanup: () => {
    },
  };
}
