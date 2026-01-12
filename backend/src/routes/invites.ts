import { FastifyInstance } from "fastify";
import { randomUUID } from "crypto";
import { Game } from "../game.js";
import { games, invites } from "../state.js";
import { db } from "../db.js";

export async function inviteRoutes(fastify: FastifyInstance) {
  // Create Invite
  fastify.post("/api/invite", { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const creatorId = (request as any).user.id;
    const { targetId, gameId: providedGameId } = request.body as { targetId: number, gameId?: string };
    
    if (!targetId) return reply.code(400).send({ message: "Target ID required" });
    if (creatorId === targetId) return reply.code(400).send({ message: "Cannot invite yourself" });

    try {
        const areFriends = await db.checkFriendship(creatorId, targetId);
        if (!areFriends) {
            return reply.code(403).send({ message: "You can only invite friends" });
        }
    } catch (err) {
        return reply.code(500).send({ message: "Friendship check failed" });
    }

    let gameId = providedGameId;

    if (gameId) {
        const game = games.get(gameId);
        if (!game) return reply.code(404).send({ message: "Game not found" });
        if (game.getState() !== "waiting") return reply.code(400).send({ message: "Game already started" });
    } else {
        gameId = randomUUID();
        const newGame = new Game(gameId, () => {
          games.delete(gameId!);
          for (const [inviteId, invite] of invites.entries()) {
              if (invite.gameId === gameId) invites.delete(inviteId);
          }
          console.log(`Game ${gameId} deleted`);
        });
        games.set(gameId, newGame);
    }

    const inviteId = randomUUID();
    invites.set(inviteId, {
        id: inviteId,
        creatorId,
        targetId,
        gameId: gameId,
        createdAt: Date.now()
    });

    return { message: "Invite sent", gameId };
  });

  // List Invites
  fastify.get("/api/invites", { preHandler: [fastify.authenticate] }, async (request, reply) => {
      const userId = (request as any).user.id;
      const myInvites = Array.from(invites.values()).filter(i => i.targetId === userId);
      return { invites: myInvites };
  });

  // Accept Invite
  fastify.post("/api/invite/accept", { preHandler: [fastify.authenticate] }, async (request, reply) => {
      const userId = (request as any).user.id;
      const { inviteId } = request.body as { inviteId: string };
      
      const invite = invites.get(inviteId);
      if (!invite) return reply.code(404).send({ message: "Invite not found" });
      if (invite.targetId !== userId) return reply.code(403).send({ message: "Not your invite" });
      
      const game = games.get(invite.gameId);
      if (!game) {
          invites.delete(inviteId);
          return reply.code(404).send({ message: "Game no longer exists" });
      }
      
      invites.delete(inviteId);
      return { gameId: invite.gameId };
  });
}
