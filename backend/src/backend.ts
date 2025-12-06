import Fastify from "fastify";
import websocket from "@fastify/websocket";
import type * as FastifyWebsocket from "@fastify/websocket";
import { WebSocket } from "ws";

const backend = Fastify({ logger: true });

await backend.register(websocket);

let waitingPlayer: WebSocket | null = null;
let gameIsRunning = false;
let players: WebSocket[] = [];

const engineSocket = new WebSocket("ws://engine:4000/ws");

engineSocket.on("open", () => backend.log.info("Connected to engine WS"));
engineSocket.on("close", () => {
	backend.log.warn("Engine WS closed");
	gameIsRunning = false;
	players.forEach(p => p.close(1013, "Engine connection lost"));
	players = [];
	if (waitingPlayer) {
		waitingPlayer.close(1013, "Engine connection lost");
		waitingPlayer = null;
	}
});
engineSocket.on("error", (err) => backend.log.error({ err }, "Engine WS error"));

engineSocket.on("message", (data) => {
	const message = JSON.parse(Buffer.from(data as any).toString("utf8"));

	if (message.type === 'gameOver') {
		gameIsRunning = false;
		players.forEach(p => p.send(JSON.stringify({ type: 'gameOver', winner: message.winner, scores: message.scores })));
		players = [];
		return;
	}

	if(gameIsRunning) {
		players.forEach(p => p.send(JSON.stringify(message)));
	}
});

backend.get("/api/ws", { websocket: true }, (connection: FastifyWebsocket.SocketStream) => {
	const clientSocket = connection.socket;
	backend.log.info("New client connection received.");

	if (gameIsRunning) {
		backend.log.info("Game in progress, rejecting client.");
		clientSocket.send(JSON.stringify({ type: "error", message: "Game is already in progress." }));
		clientSocket.close();
		return;
	}

	if (!waitingPlayer) {
		backend.log.info("No waiting player, this client is now waiting.");
		waitingPlayer = clientSocket;
		waitingPlayer.send(JSON.stringify({ type: "waiting" }));

		waitingPlayer.on("close", () => {
			if (waitingPlayer === clientSocket) {
				backend.log.info("Waiting player disconnected.");
				waitingPlayer = null;
			}
		});
	} else {
		backend.log.info("Waiting player found, starting game.");
		players = [waitingPlayer, clientSocket];
		waitingPlayer = null;
		gameIsRunning = true;

		players.forEach((player, index) => {
			backend.log.info(`Sending countdown to player ${index + 1}`);
			player.send(JSON.stringify({ type: "countdown", player: index + 1 }));

			player.on("message", (data) => {
				const message = JSON.parse(data.toString());
				if (engineSocket.readyState === WebSocket.OPEN) {
					engineSocket.send(JSON.stringify({ ...message, player: index + 1 }));
				}
			});

			player.on("close", () => {
				if (gameIsRunning) {
					gameIsRunning = false;
					const otherPlayer = players.find(p => p !== player);
					if (otherPlayer) {
						otherPlayer.send(JSON.stringify({ type: "opponentDisconnected" }));
						otherPlayer.close();
					}
					players = [];
					if (engineSocket.readyState === WebSocket.OPEN) {
						engineSocket.send(JSON.stringify({ type: "reset" }));
					}
				}
			});
		});

		setTimeout(() => {
			if (!gameIsRunning) return;
			
			backend.log.info("Starting game.");
			players.forEach((player) => {
				player.send(JSON.stringify({ type: "gameStart" }));
			});

			if (engineSocket.readyState === WebSocket.OPEN) {
				engineSocket.send(JSON.stringify({ type: "start" }));
			}
		}, 5000);
	}
});

await backend.listen({ host: "0.0.0.0", port: 3000 });