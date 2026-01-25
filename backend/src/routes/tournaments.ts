import { FastifyInstance } from "fastify";
import { randomUUID } from "crypto";
import { Tournament } from "../tournament.js";
import { tournaments } from "../state.js";

export async function tournamentRoutes(backend: FastifyInstance) {
  // Create Tournament
  backend.post("/api/tournament/create", { preHandler: [backend.authenticate] }, async (request, reply) => {
      const creatorId = (request as any).user.id;
      const { tournament_name } = request.body as { tournament_name: string };

      if (!tournament_name) {
          return reply.code(400).send({ message: "Tournament name required" });
      }

      const tId = randomUUID();
      const tournament = new Tournament(tId, tournament_name, creatorId);
      
      tournaments.set(tId, tournament);
      return { tournament_id: tId, message: "Tournament created" };
  });

  // Join Tournament
  backend.post("/api/tournament/:id/join", { preHandler: [backend.authenticate] }, async (request, reply) => {
      const { id } = request.params as { id: string };
      const userId = (request as any).user.id;
      const t = tournaments.get(id);

      if (!t) return reply.code(404).send({ message: "Tournament not found" });
      if (t.status !== 'waiting') return reply.code(400).send({ message: "Tournament already started or finished" });
      if (t.players.has(userId)) return reply.code(400).send({ message: "Already joined" });
      if (t.players.size >= 4) return reply.code(400).send({ message: "Tournament is full (max 4)" });

      t.addPlayer(userId);
      return { message: "Joined tournament" };
  });

  // List Tournaments (for Lobby)
  backend.get("/api/tournaments", { preHandler: [backend.authenticate] }, async (request, reply) => {
      const list = Array.from(tournaments.values())
          .filter(t => t.status === 'waiting')
          .map(t => ({
              id: t.id,
              name: t.name,
              creatorId: t.creatorId,
              playerCount: t.players.size,
              maxPlayers: 4 
          }));
      return { tournaments: list };
  });

  // Get Details
  backend.get("/api/tournament/:id", { preHandler: [backend.authenticate] }, async (request, reply) => {
      const { id } = request.params as { id: string };
      const t = tournaments.get(id);
      if (!t) return reply.code(404).send({ message: "Tournament not found" });
      
      // Removed access check: public joinable tournaments

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
