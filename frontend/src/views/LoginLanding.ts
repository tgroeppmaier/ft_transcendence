import { navigateTo } from "../router.js";

export function LoginLanding() {
  const container = document.createElement("div");
  container.className = "w-[500px] border-3 border-gray-400 rounded-2xl p-5 text-center bg-white mx-auto mt-20";
  
  container.innerHTML = `
    <h2 class="text-2xl font-semibold mb-4">Log in or register</h2>
    
    <button id="login-btn" class="bg-blue-800 text-white py-2 px-4 rounded-lg block w-full max-w-[200px] mx-auto mb-2 hover:opacity-50 transition">
        Log in
    </button>

    <button id="register-btn" class="bg-blue-800 text-white py-2 px-4 rounded-lg block w-full max-w-[200px] mx-auto mb-4 hover:opacity-50 transition">
        Register
    </button>
    
    <a href="/api/auth/google" class="bg-red-600 text-white py-2 px-4 rounded-lg block w-full max-w-[200px] mx-auto mb-4 hover:opacity-50 transition no-underline">
        Login with Google
    </a>

    <div class="border-t border-gray-300 my-4"></div>

    <button id="local-game-btn" class="bg-green-600 text-white py-2 px-4 rounded-lg block w-full max-w-[200px] mx-auto mb-2 hover:opacity-50 transition">
        Play Local Game (No Login)
    </button>
  `;

  const loginBtn = container.querySelector("#login-btn") as HTMLButtonElement;
  const registerBtn = container.querySelector("#register-btn") as HTMLButtonElement;
  const localGameBtn = container.querySelector("#local-game-btn") as HTMLButtonElement;

  loginBtn.onclick = () => navigateTo("/login");
  registerBtn.onclick = () => navigateTo("/register");
  
  localGameBtn.onclick = (e) => {
    e.preventDefault();
    navigateTo("/local-game");
  };

  return { component: container };
}
