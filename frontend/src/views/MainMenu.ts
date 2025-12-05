export function MainMenu() {
  const mainMenu = document.createElement("div");
  mainMenu.classList.add("main-menu");
  mainMenu.innerHTML = `
    <h1>Welcome to Pong!</h1>
    <div id="game-mode-selector">
      <button id="local-game">Local Game</button>
      <button id="tournament">Tournament</button>
      <button id="remote-game">Remote Game</button>
    </div>
  `;
  return { component: mainMenu };
}
