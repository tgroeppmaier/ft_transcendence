import { mainMenu } from "./main-menu.js";
import { localGame } from "./local-game.js";


type View = {
  component: HTMLElement;
  cleanup?: () => void;
}

const routes: Record<string, () => View> = {
  "/": mainMenu,
  "/local-game": localGame
}

const root = document.getElementById("app");
let currentCleanup: (() => void) | undefined;


export function navigateTo(pathname: string) {
  // currentCleanup 
  window.history.pushState({}, pathname, window.location.origin + pathname);
  render(pathname);
}

function render(pathname: string) {
  if (!root) 
    return;

  if (currentCleanup) {
    currentCleanup();
    currentCleanup = undefined;
  }
  root.innerHTML = "";

  const view = routes[pathname] ? routes[pathname]() : routes["/"]();
  root.appendChild(view.component);
  currentCleanup = view.cleanup;

  window.onpopstate = () => {
    render(window.location.pathname);
  };

}

render(window.location.pathname);


