import { navigateTo } from "../router.js";

export function RegisterView() {
	const container = document.createElement("div");
	container.className = "w-[400px] border-3 border-gray-400 rounded-2xl p-8 text-center bg-white mx-auto mt-20 shadow-lg";

	container.innerHTML = `
	<h2 class="text-2xl font-bold mb-6">Register</h2>
	<form id="register-form" class="space-y-4 text-left">
	<div>
	<label class="block text-sm font-medium text-gray-700">Login</label>
	<input type="text" name="login" required class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500">
	</div>
	<div>
	<label class="block text-sm font-medium text-gray-700">Email</label>
	<input type="email" name="email" required 
	pattern="[^\s@]+@[^\s@]+\.[^\s@]+" 
	title="Please enter a valid email address"
	class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500">
	</div>
	<div>
	<label class="block text-sm font-medium text-gray-700">Password</label>
	<input type="password" name="password" minlength="6" maxlength="10" title="Password must be 6-10 characters" required class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500">
	</div>
	<button type="submit" class="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-800 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition">
	Register
	</button>
	</form>
	<p id="error-msg" class="text-red-500 mt-4 hidden"></p>
	<p id="success-msg" class="text-green-500 mt-4 hidden"></p>
	<div class="mt-6 text-sm">
	<a href="/" id="back-to-home" class="text-blue-600 hover:underline">Back to Home</a>
	</div>
	`;

	const form = container.querySelector("#register-form") as HTMLFormElement;
	const errorMsg = container.querySelector("#error-msg") as HTMLParagraphElement;
	const successMsg = container.querySelector("#success-msg") as HTMLParagraphElement;
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
			const response = await fetch("/db/registration", {
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
				successMsg.textContent = "Registration successful! You can now log in.";
				successMsg.classList.remove("hidden");
				errorMsg.classList.add("hidden");
				form.reset();
				setTimeout(() => navigateTo("/login"), 2000);
			} else {
				errorMsg.textContent = result.message || "Registration failed";
				errorMsg.classList.remove("hidden");
				successMsg.classList.add("hidden");
			}
		} catch (err) {
			errorMsg.textContent = "Network error. Please try again.";
			errorMsg.classList.remove("hidden");
		}
	};

	return { component: container };
}
