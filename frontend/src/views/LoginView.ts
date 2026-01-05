import { navigateTo } from "../router.js";

export function LoginView() {
  const container = document.createElement("div");
  container.className = "w-[400px] border-3 border-gray-400 rounded-2xl p-8 text-center bg-white mx-auto mt-20 shadow-lg";
  
  container.innerHTML = `
    <h2 class="text-2xl font-bold mb-6">Log In</h2>
    <form id="login-form" class="space-y-4 text-left">
      <div>
        <label class="block text-sm font-medium text-gray-700">Login</label>
        <input type="text" name="login" required class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500">
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700">Password</label>
        <input type="password" name="password" required class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500">
      </div>
      <button type="submit" class="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-800 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition">
        Sign In
      </button>
    </form>
    <p id="error-msg" class="text-red-500 mt-4 hidden"></p>
    <div class="mt-6 text-sm">
      <a href="/" id="back-to-home" class="text-blue-600 hover:underline">Back to Home</a>
    </div>
  `;

  const form = container.querySelector("#login-form") as HTMLFormElement;
  const errorMsg = container.querySelector("#error-msg") as HTMLParagraphElement;
  const backBtn = container.querySelector("#back-to-home") as HTMLAnchorElement;

  backBtn.onclick = (e) => {
    e.preventDefault();
    navigateTo("/");
  };

  form.onsubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());

    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (response.ok) {
        // Success! Fastify sets the 'token' cookie automatically (httpOnly)
        // Navigate to the main menu
        navigateTo("/menu");
      } else {
        errorMsg.textContent = result.message || "Login failed";
        errorMsg.classList.remove("hidden");
      }
    } catch (err) {
      errorMsg.textContent = "Network error. Please try again.";
      errorMsg.classList.remove("hidden");
    }
  };

  return { component: container };
}
