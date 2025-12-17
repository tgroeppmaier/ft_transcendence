export function mainMenu() {
  const mainMenu = document.createElement("div");
  mainMenu.innerHTML = `
    <h1>Welcome to Pong</h1>
    <div id="main-menu">
      <button id="local-game">Local Game</button>
    </div>
  `;

  return { component: mainMenu };
}