import { navigateTo } from "../router.js";

export function MainMenuView() {
  const mainMenu = document.createElement("div");
  mainMenu.classList.add("main-menu");
  mainMenu.innerHTML = `
    <h1>Welcome to Pong!</h1>
    <div id="game-mode-selector">
      <button id="game-lobby">Game Lobby</button>
      <button id="local-game">Local Game</button>
      <button id="tournament">Tournament</button>
      <button id="remote-game">Remote Game</button>
      <div class="separator" style="margin: 10px 0; border-top: 1px solid #ccc;"></div>
      <button id="friends-menu">Friends</button>
      <button id="requests-menu">Friend Requests</button>
      <button id="search-menu">Search Users</button>
      <div class="separator" style="margin: 10px 0; border-top: 1px solid #ccc;"></div>
      <button id="profile-menu">Profile</button>
    </div>
  `;

  mainMenu.querySelector("#game-lobby")?.addEventListener("click", () => navigateTo("/game-lobby"));
  mainMenu.querySelector("#local-game")?.addEventListener("click", () => navigateTo("/local-game"));
  mainMenu.querySelector("#tournament")?.addEventListener("click", () => navigateTo("/tournament"));
  mainMenu.querySelector("#remote-game")?.addEventListener("click", () => navigateTo("/remote-game"));
  mainMenu.querySelector("#friends-menu")?.addEventListener("click", () => navigateTo("/friends"));
  mainMenu.querySelector("#requests-menu")?.addEventListener("click", () => navigateTo("/requests"));
  mainMenu.querySelector("#search-menu")?.addEventListener("click", () => navigateTo("/search"));
  mainMenu.querySelector("#profile-menu")?.addEventListener("click", () => navigateTo("/profile"));

  return { component: mainMenu };
}
