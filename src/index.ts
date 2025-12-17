import { navigateTo } from "./router.js";
import "./router.js";

const app = document.getElementById("app");

if (app) {
  app.addEventListener("click", (e) => {
    const target = e.target as HTMLElement;
    if (target.id === "local-game") {
      e.preventDefault();
      navigateTo("/local-game");
    }
  });
}