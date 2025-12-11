import { navigateTo } from "../router.js";

/*type Player = string;

interface Match {
	id: number;
	player1?: Player | "Bye";
	player2?: Player | "Bye";
}

interface Round {
	roundNumber: number;
	matches: Match[];
}

function generateBracket(players: Player[]): Round[] {
	const shuffled = [...players];
	const nextPow2 = 1 << Math.ceil(Math.log2(shiffled.length));
	while (shuffled.length < nextPow2) shuffled.push("Bye");

	const rounds: Round[] = [];
	let current = shuffled;

	let roundNumber = 1;
	while (current.length > 1) {
		const matches: Match[] = [];

		for (let i = 0; i < current.length; i += 2) {
			matches.push({
				id: i / 2 + 1,
				player1: current[i],
				player2: current[i + 1],
			});
		}

		rounds.push({ roundNumber, matches });
		current = matches.map(() => "Winner");
		roundNumber++;
	}

	return rounds;
}*/



////////////////////////////////////////////////

export function TournamentNet() {

	let input: string = localStorage.getItem("argOfNavigateTo") ?? "";
	let players: string[] = input.split(",") ?? ([] as string[]);

	const tournamentNet = document.createElement("div");
	tournamentNet.classList.add("tournamentNet");
	
	//tournamentNet.innerHTML = `<h1>Here is the Tournament Net</h1>`;
	//tournamentNet.classList.add("tournamentNet");
	
	const title = document.createElement("h1");
	title.textContent = "Here is the Tournament Net";
	tournamentNet.appendChild(title);

	/*players.forEach((player, index) => {
		const item = document.createElement("div");
		item.classList.add("player");
		item.textContent = player;
		tournamentNet.appendChild(item);

		const isEndOfPair = index % 2 === 1;
		if (isEndOfPair) {
			const connector = document.createElement("div");
			connector.classList.add("connector");
			tournamentNet.appendChild(connector);
		}
	})*/


	/*const bracket = document.createElement("div");
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
	}*/


	/*const pairWrapper = document.createElement("div");
	pairWrapper.classList.add("pairWrapper");


	const player1 = document.createElement("div");
	player1.classList.add("player");
	player1.textContent = "Cool Player1";

	const player2 = document.createElement("div");
	player2.classList.add("player");
	player2.textContent = "Player 2";

	const vert_line = document.createElement("div");
	vert_line.classList.add("vertical-line");

	const hor_line = document.createElement("div");
	hor_line.classList.add("horizontal-line");

	pairWrapper.appendChild(player1);
	pairWrapper.appendChild(player2);
	pairWrapper.appendChild(vert_line);
	pairWrapper.appendChild(hor_line);
	tournamentNet.appendChild(pairWrapper);
	*/

	for (let i = 0; i < players.length; i += 2) {
		const pairWrapper = document.createElement("div");
		pairWrapper.classList.add("pairWrapper");

		const p1 = document.createElement("div");
		p1.classList.add("player");
		p1.textContent = players[i];
		pairWrapper.appendChild(p1);

		const p2 = document.createElement("div");
		p2.classList.add("player");
		p2.textContent = players[i + 1] ?? "";
		if ("" !== p2.textContent) {
			pairWrapper.appendChild(p2);
		}

		if (2 === i && "" !== p2.textContent) {
			setTimeout(() => {
				p1.classList.add("toPlay");
				p2.classList.add("toPlay");
				}, 2000);

			setTimeout(() => { navigateTo("/local-game") }, 5000);
		}

		//const connector = document.createElement("div");
		//connector.classList.add("connector");
		//pairWrapper.appendChild(connector);

		tournamentNet.appendChild(pairWrapper);

	}

	//tournamentNet.appendChild(bracket);

	return { component: tournamentNet };
}
