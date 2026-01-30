import { navigateTo } from "../router.js";
import { LocalTournament } from "../utils/localTournament.js";

export function LocalTournamentView() {
	const container = document.createElement("div");
	container.className = "flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4";

	// State
	let isLoggedIn = false;
	let loggedUserId: number | undefined;
	let loggedUserName: string = "";
	let playerNames: string[] = ["", "", "", ""];
	let tournamentCleanup: (() => void) | null = null;

	const render = async () => {
		container.innerHTML = "";

		// Check if user is logged in
		try {
			const res = await fetch("/db/auth/status", { credentials: "include" });
			let data;
			try {
				data = await res.json();
			} catch {
				data = { success: true, user: null };
			}

			if (data.user) {
				loggedUserId = data.user.id;
				loggedUserName = data.user.login;
				isLoggedIn = true;
				// If logged in, only need 3 additional players
				playerNames = ["", "", ""];
			} else {
				isLoggedIn = false;
			}
		} catch (err) {
			// User not logged in, continue with anonymous mode
			isLoggedIn = false;
		}

		const card = document.createElement("div");
		card.className = "bg-white p-8 rounded-xl shadow-md w-full max-w-md";

		const title = document.createElement("h2");
		title.className = "text-2xl font-bold mb-6 text-center text-gray-800"
		title.textContent = "Local Tournament (4 Players)";
		card.appendChild(title);

		const form = document.createElement("div");
		form.className = "flex flex-col gap-3 mb-6";

		// If logged in, show the logged user as Player 1
		if (isLoggedIn) {
			const loggedGroup = document.createElement("div");

			const loggedLabel = document.createElement("label");
			loggedLabel.className = "block text-gray-700 text-sm font-bold mb-1";
			loggedLabel.textContent = "Player 1 (You):";

			const loggedInput = document.createElement("input");
			loggedInput.type = "text";
			loggedInput.value = loggedUserName;
			loggedInput.disabled = true;
			loggedInput.className = "shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight bg-gray-100 cursor-not-allowed";

			loggedGroup.appendChild(loggedLabel);
			loggedGroup.appendChild(loggedInput);
			form.appendChild(loggedGroup);
		}

		playerNames.forEach((name, index) => {
			const group = document.createElement("div");

			const label = document.createElement("label");
			label.className = "block text-gray-700 text-sm font-bold mb-1";
			label.textContent = `Player ${isLoggedIn ? index + 2 : index + 1} Name:`;

			const input = document.createElement("input");
			input.type = "text";
			input.value = name;
			input.maxLength = 15;
			input.placeholder = "Max 15 characters";
			input.autocomplete = "off";
			input.className = "shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline";
			input.oninput = (e) => {
				playerNames[index] = (e.target as HTMLInputElement).value;
			};

			group.appendChild(label);
			group.appendChild(input);
			form.appendChild(group);
		});

		const btnGroup = document.createElement("div");
		btnGroup.className = "flex gap-4";

		const backBtn = document.createElement("button");
		backBtn.className = "flex-1 bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline transition";
		backBtn.textContent = "Back";
		backBtn.onclick = () => {
			navigateTo(isLoggedIn ? "/menu" : "/");
		};

		const startBtn = document.createElement("button");
		startBtn.className = "flex-1 bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline transition";
		startBtn.textContent = "Start Tournament";
		startBtn.onclick = () => {
			const trimmedNames = playerNames.map(name => name.trim());

			// Check for empty names
			if (trimmedNames.some(name => !name)) {
				alert("Please ensure all player names are filled out.");
				return;
			}

			// Combine with logged user name if logged in
			const allPlayers = isLoggedIn ? [loggedUserName, ...trimmedNames] : trimmedNames;

			// Check for duplicates
			const uniqueNames = new Set(allPlayers);
			if (uniqueNames.size !== allPlayers.length) {
				alert("Player names must be unique. Please choose different names.");
				return;
			}

			// Check for allowed characters
			const nameRegex = /^[a-zA-Z0-9\s-']+$/;
			const invalidName = trimmedNames.find(name => !nameRegex.test(name));
			if (invalidName) {
				alert(`Invalid name: "${invalidName}".\nNames can only contain letters, numbers, spaces, hyphens, and apostrophes.`);
				return;
			}

			// Reset container for game view
			container.innerHTML = "";
			container.className = "flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4";
			container.id = "local-tournament";

			container.innerHTML = `
			<div class="mb-4">
			<button id="back-to-main" class="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg transition shadow-sm">
			← Back to ${isLoggedIn ? "Menu" : "Home"}
			</button>
			</div>
			<canvas id="board" width="800" height="600" class="shadow-2xl bg-black"></canvas>
			`;

			const backButton = container.querySelector("#back-to-main");
			if (backButton) {
				backButton.addEventListener("click", (e) => {
					e.preventDefault();
					navigateTo(isLoggedIn ? "/menu" : "/");
				});
			}

			const canvas = container.querySelector<HTMLCanvasElement>("#board");
			if (!(canvas instanceof HTMLCanvasElement))
				throw new Error("Canvas not found");

			const ctx = canvas.getContext("2d");
			if (!ctx)
				throw new Error("Context not found");

			const tournament = new LocalTournament(canvas, ctx, allPlayers,
							       isLoggedIn ? { loggedUserId, loggedUserName } : undefined
							      );

							      const onKeyDown = (e: KeyboardEvent) => {
								      tournament.activeGame?.onKeyDown(e.key);
							      };

							      const onKeyUp = (e: KeyboardEvent) => {
								      tournament.activeGame?.onKeyUp(e.key);
							      };

							      const onCanvasClick = () => {
								      tournament.activeGame?.resetGame();
							      };

							      tournamentCleanup = () => {
								      tournament.stop();
								      document.removeEventListener("keydown", onKeyDown);
								      document.removeEventListener("keyup", onKeyUp);
								      canvas.removeEventListener("click", onCanvasClick);
							      };

							      // Adding event listeners
							      document.addEventListener("keydown", onKeyDown);
							      document.addEventListener("keyup", onKeyUp);
							      canvas.addEventListener("click", onCanvasClick);

							      tournament.start();
		};

		btnGroup.appendChild(backBtn);
		btnGroup.appendChild(startBtn);

		card.appendChild(form);
		card.appendChild(btnGroup);

		container.appendChild(card);
	};

	render();

	return {
		component: container,
		cleanup: () => {
			if (tournamentCleanup) tournamentCleanup();
		}
	};
}
