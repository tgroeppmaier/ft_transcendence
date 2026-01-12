import { FastifyInstance } from "fastify";
import { randomUUID } from "crypto";
import { Game } from "../game.js";
import { games, invites } from "../state.js";

export async function gameRoutes(fastify: FastifyInstance) {
  // Create Game
  fastify.post("/api/games", { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const gameId = randomUUID();
    const newGame = new Game(gameId, () => {
      games.delete(gameId);
      // Cleanup invites associated with this game
      for (const [inviteId, invite] of invites.entries()) {
        if (invite.gameId === gameId) {
          invites.delete(inviteId);
        }
      }
      console.log(`Game ${gameId} deleted`);
    });
    games.set(gameId, newGame);
    console.log({ gameId }, "New game created");

    return { gameId };
  });

  // List Waiting Games
  fastify.get("/api/games", { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const availableGames = Array.from(games.values())
      .filter(g => g.getState() === "waiting")
      .map(g => g.gameId);
    return { games: availableGames };
  });

  // Get Game State (Polling)
  fastify.get("/api/games/:id/state", { preHandler: [fastify.authenticate] }, async (request, reply) => {
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
  fastify.post("/api/games/:id/action", { preHandler: [fastify.authenticate] }, async (request, reply) => {
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
