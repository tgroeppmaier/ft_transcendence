import { navigateTo } from "../router.js";

export function LandingView() {
  const landing = document.createElement("div");
  landing.classList.add("landing-page");
  landing.innerHTML = `
    <h1>Pong</h1>
    <div id="auth-options">
      <button id="login-btn">Login</button>
      <button id="register-btn">Register</button>
    </div>
  `;

  landing.querySelector("#login-btn")?.addEventListener("click", () => navigateTo("/login"));
  landing.querySelector("#register-btn")?.addEventListener("click", () => navigateTo("/register"));

  return { component: landing };
}
