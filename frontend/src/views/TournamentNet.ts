export function TournamentNet() {

	let players = localStorage.getItem("argOfNavigateTo");
	//console.log(players);

	const tournamentNet = document.createElement("div");
	tournamentNet.classList.add("tournamentNet");
	
	//tournamentNet.innerHTML = `<h1>Here is the Tournament Net</h1>`;
	//tournamentNet.classList.add("tournamentNet");
	
	const title = document.createElement("h1");
	title.textContent = "Here is the Tournament Net";
	tournamentNet.appendChild(title);

	const bracket = document.createElement("div");
	//bracket.classList.add("bracket-column"); //adds css class to the element bra
	
	function renderBracket(players: string[]) {
		for (let i = 0;i < players.length; i += 2) {
			const p1 = players[i];
			const p2 = players[i + 1] ?? null;	

			const matchDiv = document.createElement("div");
			matchDiv.className = "match";

			// Player 1
			const player1Div = document.createElement("div");
			player1Div.className = "player";
			player1Div.textContent = p1;
			matchDiv.appendChild(player1Div);

			// Player 2
			const player2Div = document.createElement("div");
			player2Div.className = "player";
			player2Div.textContent = p2;
			matchDiv.appendChild(player2Div);

			// Draw connector line when both players exist
			if (p2) {
				const line = document.createElement("div");
				line.className = "connector";
				matchDiv.appendChild(line);
			}

			bracket.appendChild(matchDiv);
		}
	}



	tournamentNet.appendChild(bracket);

	return { component: tournamentNet };
}
