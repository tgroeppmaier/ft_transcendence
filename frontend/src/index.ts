import { navigateTo } from "./router.js";
import "./router.js"; // This will initialize the router

const app = document.getElementById("app");
if (app) {
  app.addEventListener("click", (e) => {
    const target = e.target as HTMLElement;
    if (target.id === "local-game") {
      e.preventDefault();
      navigateTo("/local-game");
    } else if (target.id === "tournament") {
      e.preventDefault();
      navigateTo("/tournament");
    } else if (target.id === "local-game-lobby")
    {
      e.preventDefault();
      navigateTo("/local-game-lobby");
    }
    else if (target.id === "LobbyButton")
    {
      e.preventDefault();
      navigateTo("/local-game");
    }
  });
}



