import { MainMenu } from "./views/MainMenu.js";
import { LocalGame } from "./views/LocalGame.js";
import { Tournament } from "./views/Tournament.js";

// Each view now returns a component and a cleanup function.
type View = {
  component: HTMLElement;
  cleanup?: () => void;
};

const routes: { [key: string]: () => View } = {
  "/": MainMenu,
  "/local-game": LocalGame,
  "/tournament": Tournament,
};

const root = document.getElementById("app");
let currentCleanup: (() => void) | undefined;

export function navigateTo(pathname: string) {
  window.history.pushState({}, pathname, window.location.origin + pathname);
  render(pathname);
}

function render(pathname: string) {
  if (currentCleanup) {
    currentCleanup();
    currentCleanup = undefined;
  }

  if (!root) {
    return;
  }
  root.innerHTML = "";
  const view = routes[pathname] ? routes[pathname]() : routes["/"]();
  root.appendChild(view.component);
  currentCleanup = view.cleanup;
}

window.onpopstate = () => {
  render(window.location.pathname);
};

// Initial render
render(window.location.pathname);
