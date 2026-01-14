import { navigateTo } from "../router.js";
import { checkAndShowInvites } from "../utils/inviteHandler.js";

export function MainMenuView() {
  const mainMenu = document.createElement("div");
  mainMenu.className = "flex flex-col items-center justify-center min-h-screen bg-gray-100 p-8";

  // Check for invites when menu loads
  checkAndShowInvites();

  mainMenu.innerHTML = `
    <h1 class="text-5xl font-extrabold text-blue-900 mb-12 drop-shadow-sm">Welcome to Pong</h1>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
      <!-- Game Modes Column -->
      <div class="bg-white p-6 rounded-2xl shadow-lg flex flex-col gap-4">
        <h2 class="text-2xl font-bold text-gray-800 mb-2 border-b pb-2">🕹️ Game Modes</h2>
        <button id="game-lobby" class="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-xl transition shadow-sm flex items-center justify-center gap-2">
          <span>🌐</span> Game Lobby
        </button>
        <button id="tournament" class="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-4 rounded-xl transition shadow-sm flex items-center justify-center gap-2">
          <span>🏆</span> Tournament
        </button>
        <button id="remote-game" class="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-4 rounded-xl transition shadow-sm flex items-center justify-center gap-2">
          <span>🎮</span> Remote 1v1
        </button>
      </div>

      <!-- Social & Profile Column -->
      <div class="bg-white p-6 rounded-2xl shadow-lg flex flex-col gap-4">
        <h2 class="text-2xl font-bold text-gray-800 mb-2 border-b pb-2">👥 Social & Profile</h2>
        <button id="friends-menu" class="bg-teal-500 hover:bg-teal-600 text-white font-semibold py-3 px-4 rounded-xl transition shadow-sm flex items-center justify-center gap-2">
          <span>👫</span> Friends
        </button>
        <button id="requests-menu" class="bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 px-4 rounded-xl transition shadow-sm flex items-center justify-center gap-2">
          <span>📩</span> Requests
        </button>
        <button id="search-menu" class="bg-cyan-500 hover:bg-cyan-600 text-white font-semibold py-3 px-4 rounded-xl transition shadow-sm flex items-center justify-center gap-2">
          <span>🔍</span> Search Users
        </button>

        <div class="mt-auto pt-4">
          <button id="profile-menu" class="w-full bg-gray-800 hover:bg-black text-white font-semibold py-3 px-4 rounded-xl transition shadow-sm flex items-center justify-center gap-2">
            <span>👤</span> My Profile
          </button>
        </div>
      </div>
    </div>
  `;

  mainMenu.querySelector("#game-lobby")?.addEventListener("click", () => navigateTo("/game-lobby"));
  mainMenu.querySelector("#tournament")?.addEventListener("click", () => navigateTo("/tournament"));
  mainMenu.querySelector("#remote-game")?.addEventListener("click", () => navigateTo("/remote-game"));
  mainMenu.querySelector("#friends-menu")?.addEventListener("click", () => navigateTo("/friends"));
  mainMenu.querySelector("#requests-menu")?.addEventListener("click", () => navigateTo("/requests"));
  mainMenu.querySelector("#search-menu")?.addEventListener("click", () => navigateTo("/search"));
  mainMenu.querySelector("#profile-menu")?.addEventListener("click", () => navigateTo("/profile"));

  return { component: mainMenu };
}
