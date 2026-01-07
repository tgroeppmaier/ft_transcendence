import { navigateTo } from "../router.js";

export async function gameLobby() {
  const container = document.createElement("div");
  container.innerHTML = "<h2>Available Games</h2><div id='game-list'></div><button id='create-game'>Create New Game</button>";
  
  const gameList = container.querySelector("#game-list") as HTMLDivElement;
  const createButton = container.querySelector("#create-game") as HTMLButtonElement;
  
  try {
    const response = await fetch("/api/games", { method: "GET" });
    if (!response.ok) throw new Error("Failed to fetch games");
    const data = await response.json();
    
    if (data.games && data.games.length > 0) {
      data.games.forEach((gameId: string) => {
        const gameButton = document.createElement("button");
        gameButton.textContent = `Join Game ${gameId}`;
        gameButton.onclick = () => navigateTo(`/remote-game?gameId=${gameId}`);
        gameList.appendChild(gameButton);
      });
    } else {
      gameList.textContent = "No games available.";
    }
  } catch (error) {
    gameList.textContent = "Error loading games.";
    console.error(error);
  }
  
  createButton.onclick = async () => {
    try {
      const response = await fetch("/api/games", { method: "POST" });
      if (!response.ok) throw new Error("Failed to create game");
      const { gameId } = await response.json();
      navigateTo(`/remote-game?gameId=${gameId}`);
    } catch (error) {
      alert("Failed to create game");
      console.error(error);
    }
  };
  
  return {
    component: container,
    cleanup: () => {
    },
  };
}
