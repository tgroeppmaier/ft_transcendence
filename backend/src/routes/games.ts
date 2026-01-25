import { FastifyInstance } from "fastify";
import { randomUUID } from "crypto";
import { Game } from "../game.js";
import { games } from "../state.js";

export async function gameRoutes(backend: FastifyInstance) {
  // Create Game
  backend.post("/api/games", { preHandler: [backend.authenticate] }, async (request, reply) => {
    const gameId = randomUUID();
    const newGame = new Game(gameId, () => {
      games.delete(gameId);
      backend.log.info(`Game ${gameId} deleted`);
    });
    games.set(gameId, newGame);
    backend.log.info({ gameId }, "New game created");

    return { gameId };
  });

  // List Waiting Games
  backend.get("/api/games", { preHandler: [backend.authenticate] }, async (request, reply) => {
    const availableGames = Array.from(games.values())
      .filter(g => g.getState() === "waiting")
      .map(g => g.gameId);
    return { games: availableGames };
  });

  // Get Game State (Polling)
  backend.get("/api/games/:id/state", { preHandler: [backend.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const game = games.get(id);

    if (!game) {
      return reply.status(404).send({ type: "error", message: "Game not found" });
    }

    const snapshot = game.createGameState();
    if (snapshot) {
        return { ...snapshot, status: game.getState() };
    }
    return { status: game.getState() };
  });

  // Send Action
  backend.post("/api/games/:id/action", { preHandler: [backend.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = (request as any).user.id;

    const body = request.body as {
      side: "left" | "right";
      move: "start" | "stop";
      direction: "up" | "down";
    };

    const game = games.get(id);

    if (!game) {
      return reply.status(404).send({ type: "error", message: "Game not found" });
    }

    const success = game.handleAction(userId, body.side, body.move, body.direction);

    if (success) {
      return { success: true, side: body.side, action: body.move, direction: body.direction };
    } else {
      return reply.status(403).send({ type: "error", message: "Forbidden: You cannot control this paddle" });
    }
  });
}
