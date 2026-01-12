import { FastifyInstance } from "fastify";
import { randomUUID } from "crypto";
import { Tournament } from "../tournament.js";
import { tournaments } from "../state.js";
import { db } from "../db.js";

export async function tournamentRoutes(backend: FastifyInstance) {
  // Create Tournament
  backend.post("/api/tournament/create", { preHandler: [backend.authenticate] }, async (request, reply) => {
      const creatorId = (request as any).user.id;
      const { tournament_name, player_ids } = request.body as { tournament_name: string, player_ids: number[] };

      if (!tournament_name || !player_ids || !Array.isArray(player_ids)) {
          return reply.code(400).send({ message: "Tournament name and player IDs required" });
      }
      if (player_ids.length < 2 || player_ids.length > 5) {
          return reply.code(400).send({ message: "Tournament must have 2-5 players" });
      }

      for (const playerId of player_ids) {
          if (playerId === creatorId) continue;
          try {
              const areFriends = await db.checkFriendship(creatorId, playerId);
              if (!areFriends) {
                  return reply.code(403).send({ message: `User ${playerId} is not your friend` });
              }
          } catch (err) {
              return reply.code(500).send({ message: "Friendship check failed" });
          }
      }

      const tId = randomUUID();
      const tournament = new Tournament(tId, tournament_name, creatorId);
      
      if (!player_ids.includes(creatorId)) {
          // Creator added in constructor
      }
      
      for (const pid of player_ids) {
          if (pid !== creatorId) tournament.invitePlayer(pid);
      }

      tournaments.set(tId, tournament);
      return { tournament_id: tId, message: "Tournament created" };
  });

  // List Invitations
  backend.get("/api/tournament/invitations", { preHandler: [backend.authenticate] }, async (request, reply) => {
      const userId = (request as any).user.id;
      const invitations = [];
      for (const t of tournaments.values()) {
          const player = t.players.get(userId);
          if (player && player.status === 'invited' && t.status === 'waiting') {
              invitations.push({
                  id: t.id,
                  tournament_name: t.name,
                  creator_id: t.creatorId
              });
          }
      }
      return { invitations };
  });

  // Get Details
  backend.get("/api/tournament/:id", { preHandler: [backend.authenticate] }, async (request, reply) => {
      const { id } = request.params as { id: string };
      const t = tournaments.get(id);
      if (!t) return reply.code(404).send({ message: "Tournament not found" });
      
      const userId = (request as any).user.id;
      if (!t.players.has(userId)) return reply.code(403).send({ message: "Access denied" });

      return {
          id: t.id,
          name: t.name,
          creatorId: t.creatorId,
          status: t.status,
          players: Array.from(t.players.values()),
          currentRound: t.currentRound,
          history: t.history
      };
  });

  // Accept
  backend.post("/api/tournament/:id/accept", { preHandler: [backend.authenticate] }, async (request, reply) => {
      const { id } = request.params as { id: string };
      const userId = (request as any).user.id;
      const t = tournaments.get(id);
      
      if (!t) return reply.code(404).send({ message: "Tournament not found" });
      t.respondInvite(userId, true);
      return { message: "Accepted" };
  });

  // Decline
  backend.post("/api/tournament/:id/decline", { preHandler: [backend.authenticate] }, async (request, reply) => {
      const { id } = request.params as { id: string };
      const userId = (request as any).user.id;
      const t = tournaments.get(id);
      
      if (!t) return reply.code(404).send({ message: "Tournament not found" });
      t.respondInvite(userId, false);
      return { message: "Declined" };
  });

  // Start
  backend.post("/api/tournament/:id/start", { preHandler: [backend.authenticate] }, async (request, reply) => {
      const { id } = request.params as { id: string };
      const userId = (request as any).user.id;
      const t = tournaments.get(id);
      
      if (!t) return reply.code(404).send({ message: "Tournament not found" });
      if (t.creatorId !== userId) return reply.code(403).send({ message: "Only creator can start" });
      
      const success = t.start();
      if (!success) return reply.code(400).send({ message: "Cannot start tournament (check players)" });
      
      return { message: "Tournament started" };
  });
}
