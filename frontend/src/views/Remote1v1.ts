import { navigateTo } from "../router.js";

export function Remote1v1() {
  const remoteGame = document.createElement("div");
  remoteGame.classList.add("remote-game");
  remoteGame.innerHTML = `
   <button id="back-to-main">Back to Main Menu</button>
    <canvas id="board" height="600" width="800" style="border: 1px solid #000000; background-color: #000;"></canvas>
  `;

    const backButton = remoteGame.querySelector("#back-to-main");
    if (backButton) {
      backButton.addEventListener("click", (e) => {
        e.preventDefault();
        navigateTo("/");
      });
    }

  return { component: remoteGame};
}