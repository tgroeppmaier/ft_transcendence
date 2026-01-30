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
	<div class="mt-6 border-t pt-6">
	<p class="text-sm text-gray-600 mb-3">Or continue with:</p>
	<a href="/db/auth/google" class="w-full py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition flex items-center justify-center gap-2">
	<svg class="w-5 h-5" viewBox="0 0 24 24">
	<path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
	<path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
	<path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
	<path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
	</svg>
	Google
	</a>
	</div>
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
			const response = await fetch("/db/login", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(data),
			});
			let result;
			try {
				result = await response.json();
			} catch {
				result = { success: false, message: "Server error" };
			}

			if (result.success) {
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
