import { MainMenuView } from "./views/MainMenuView.js";
import { LocalGameView } from "./views/LocalGameView.js";
import { AgentGameView } from "./views/AgentGameView.js";
import { RemoteTournamentView } from "./views/TournamentView.js";
import { RemoteGameView } from "./views/RemoteGameView.js";
import { gameLobby } from "./views/LobbyView.js";
import { LandingView } from "./views/LandingView.js";
import { LoginView } from "./views/LoginView.js";
import { RegisterView } from "./views/RegisterView.js";
import { FriendsView } from "./views/FriendsView.js";
import { RequestsView } from "./views/RequestsView.js";
import { SearchView } from "./views/SearchView.js";
import { ProfileView } from "./views/ProfileView.js";
import { LocalTournamentView } from "./views/LocalTournamentView.js";

type View = {
  component: HTMLElement;
  cleanup?: () => void;
}

const routes: Record<string, (existingGameId?: string) => View | Promise<View>> = {
  "/": LandingView,
  "/login": LoginView,
  "/register": RegisterView,
  "/menu": MainMenuView,
  "/local-game": LocalGameView,
  "/local-tournament": LocalTournamentView,
  "/agent-game": AgentGameView,
  "/remote-game": RemoteGameView,
  "/game-lobby": gameLobby,
  "/tournament": RemoteTournamentView,
  "/friends": FriendsView,
  "/requests": RequestsView,
  "/search": SearchView,
  "/profile": ProfileView
}

const root = document.getElementById("app");
let currentCleanup: (() => void) | undefined;


export function navigateTo(pathname: string) {
  window.history.pushState({}, pathname, window.location.origin + pathname);
  render(pathname);
}

async function checkAuth(): Promise<boolean> {
  try {
    const res = await fetch("/db/profile", { credentials: "include" });
    return res.ok;
  } catch {
    return false;
  }
}

async function render(fullPath: string) {
  if (!root)
    return;

  const pathname = fullPath.split('?')[0];
  const publicRoutes = ["/", "/login", "/register", "/local-game", "/agent-game", "/local-tournament"];

  if (!publicRoutes.includes(pathname)) {
    const isAuth = await checkAuth();
    if (!isAuth) {
      if (currentCleanup) {
        currentCleanup();
        currentCleanup = undefined;
      }
      navigateTo("/login");
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
