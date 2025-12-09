import { navigateTo } from "../router.js";

export function Tournament() {
  const tournament = document.createElement("div");
  tournament.classList.add("tournament");
  
	//tournament.innerHTML = `
  //    <h1>Welcome to the Lobby!</h1>
  //`;
	//tournament.innerHTML += `<h3>Enter the name of the player: </h3>`;

	const title = document.createElement("h1");
	title.textContent = "Welcome to the Lobby!";
	tournament.appendChild(title);

	const subtitle  = document.createElement("h3");
	subtitle.textContent = "Enter the name of a player:";
	tournament.appendChild(subtitle);

	const inputContainer = document.createElement("div");
	inputContainer.style.display = "flex";
	inputContainer.style.flexDirection = "column";
	inputContainer.style.gap = "10px";
	tournament.appendChild(inputContainer);

	const proceedButton = document.createElement("button");
	proceedButton.textContent = "Proceed to the tournament";
	proceedButton.style.display = "none"; // hide initially
	tournament.appendChild(proceedButton);

	const playerNames: string[] = [];
	let playerCount = 0;

	createInput();

	function createInput() {
		playerCount++;

		const row = document.createElement("div");
		row.style.display = "flex";
		row.style.alignItems = "center";
		row.style.gap = "5px";

		const numberLabel = document.createElement("span");
		numberLabel.textContent = playerCount + ".";

		const input = document.createElement("input");
		input.type = "text";
		input.placeholder = "Enter the name of a player and press Enter";

		input.addEventListener("keydown", (e) => {
			if (e.key === "Enter")
			{
				input.disabled = true;
				playerNames.push(input.value.trim());
				createInput();
				if (playerCount > 3) {
					proceedButton.style.display = "inline-block";
				}
			}
		});

		row.appendChild(numberLabel);
		row.appendChild(input);
		inputContainer.appendChild(row);
		input.focus();
	}

	proceedButton.addEventListener("click", () => {
		//console.log("Player names: ", playerNames);
		//alert("Proceeding to the tournament with players: " + playerNames.join(", "));
		//alert("Proceeding to the tournament with players: " + playerNames);
		navigateTo("/tournamentNet", playerNames);
	});

  return { component: tournament };
}
