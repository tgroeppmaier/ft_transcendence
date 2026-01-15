import { navigateTo } from "../router.js";

export function LandingView() {
  const landing = document.createElement("div");
  landing.className = "flex flex-col items-center justify-center min-h-screen bg-gray-100 p-8";
  landing.innerHTML = `
    <h1 class="text-6xl font-extrabold text-blue-900 mb-8 drop-shadow-lg">PONG</h1>
    <div class="flex flex-col gap-4 w-full max-w-xs">
      <button id="local-game-btn" class="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-xl shadow-md transition duration-200 transform hover:scale-105">
        Play Local 1v1
      </button>
      <button id="local-tournament-btn" class="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-xl shadow-md transition duration-200 transform hover:scale-105">
        Play Local Tournament
      </button>
      <div class="flex gap-4">
        <button id="login-btn" class="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl shadow-md transition duration-200 transform hover:scale-105">
          Login
        </button>
        <button id="register-btn" class="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-6 rounded-xl shadow-md transition duration-200 transform hover:scale-105">
          Register
        </button>
      </div>
    </div>
  `;

  landing.querySelector("#local-game-btn")?.addEventListener("click", () => navigateTo("/local-game"));
  landing.querySelector("#local-tournament-btn")?.addEventListener("click", () => navigateTo("/local-tournament"));
  landing.querySelector("#login-btn")?.addEventListener("click", () => navigateTo("/login"));
  landing.querySelector("#register-btn")?.addEventListener("click", () => navigateTo("/register"));

  return { component: landing };
}
