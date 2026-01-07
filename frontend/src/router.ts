import { MainMenu } from "./views/MainMenu.js";
import { LocalGame } from "./views/LocalGame.js";
import { Tournament } from "./views/Tournament.js";
import { remoteGame } from "./views/Remote1v1.js";
import { gameLobby } from "./views/lobby.js";
import { LoginLanding } from "./views/LoginLanding.js";
import { LoginView } from "./views/LoginView.js";
import { RegisterView } from "./views/RegisterView.js";
import { FriendsView } from "./views/FriendsView.js";
import { RequestsView } from "./views/RequestsView.js";
import { SearchView } from "./views/SearchView.js";

type View = {
  component: HTMLElement;
  cleanup?: () => void;
}

const routes: Record<string, (existingGameId?: string) => View | Promise<View>> = {
  "/": LoginLanding,
  "/login": LoginView,
  "/register": RegisterView,
  "/menu": MainMenu,
  "/local-game": LocalGame,
  "/remote-game": remoteGame,
  "/game-lobby": gameLobby,
  "/tournament": Tournament,
  "/friends": FriendsView,
  "/requests": RequestsView,
  "/search": SearchView
}

const root = document.getElementById("app");
let currentCleanup: (() => void) | undefined;


export function navigateTo(pathname: string) {
  window.history.pushState({}, pathname, window.location.origin + pathname);
  render(pathname);
}

async function checkAuth(): Promise<boolean> {
  try {
    const res = await fetch("/api/profile", { credentials: "include" });
    return res.ok;
  } catch {
    return false;
  }
}

async function render(fullPath: string) {
  if (!root) 
    return;

  const pathname = fullPath.split('?')[0];
  const publicRoutes = ["/", "/login", "/register"];

  if (!publicRoutes.includes(pathname)) {
    const isAuth = await checkAuth();
    if (!isAuth) {
      if (pathname !== "/login") {
         navigateTo("/login");
      }
      return;
    }
  }

  if (currentCleanup) {
    currentCleanup();
    currentCleanup = undefined;
  }
  root.innerHTML = "";

  const view = await (routes[pathname] ? routes[pathname]() : routes["/"]());
  root.appendChild(view.component);
  currentCleanup = view.cleanup;

  window.onpopstate = () => {
    render(window.location.pathname + window.location.search);
  };
}

render(window.location.pathname);


