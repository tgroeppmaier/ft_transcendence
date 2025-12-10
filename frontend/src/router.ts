import { MainMenu } from "./views/MainMenu.js";
import { LocalGame } from "./views/LocalGame.js";
import { Tournament } from "./views/Tournament.js";
import { Remote1v1 } from "./views/Remote1v1.js";

// Each view now returns a component and a cleanup function.
type View = {
  component: HTMLElement;
  cleanup?: () => void;
};

const routes: { [key: string]: () => View } = {
  "/": MainMenu,
  "/local-game": LocalGame,
  "/tournament": Tournament,
  "/remote-game": Remote1v1
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
  
  try {
    const view = routes[pathname] ? routes[pathname]() : routes["/"]();
    root.appendChild(view.component);
    currentCleanup = view.cleanup;
  } catch (error) {
    console.error("Failed to render view:", error);
    root.innerHTML = "<p>Error loading page. <a href=\"/\">Return to home</a></p>";
  }
}

window.onpopstate = () => {
  render(window.location.pathname);
};

// Initial render with current URL, could be something else than main menu
render(window.location.pathname);
