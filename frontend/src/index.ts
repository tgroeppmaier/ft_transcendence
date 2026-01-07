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
    } else if (target.id === "remote-game") {
      e.preventDefault();
      navigateTo("/remote-game");
      
    } else if (target.id === "game-lobby") {
          e.preventDefault();
          navigateTo("/game-lobby");
        } else if (target.id === "friends-menu") {
      e.preventDefault();
      navigateTo("/friends");
    } else if (target.id === "requests-menu") {
      e.preventDefault();
      navigateTo("/requests");
    } else if (target.id === "search-menu") {
      e.preventDefault();
      navigateTo("/search");
    }
  });
}



