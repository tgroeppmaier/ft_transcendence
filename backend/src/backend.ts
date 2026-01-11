import Fastify from "fastify";
import websocket from "@fastify/websocket";
import cookie from "@fastify/cookie";
import jwt from "@fastify/jwt";
import { randomUUID } from "crypto";
import { validate as uuidValidate } from "uuid";
import { ErrorMessage } from "../../shared/types.js";
import { Game } from "./game.js";
import { Tournament } from "./tournament.js";
import { games, invites, tournaments } from "./state.js";

declare module "fastify" {
  interface FastifyInstance {
    authenticate: any;
  }
}

const backend = Fastify({ logger: true });
await backend.register(websocket);

const JWT_SECRET = process.env.JWT_SECRET || 'change_this_to_a_strong_secret';
await backend.register(cookie, { secret: JWT_SECRET });
await backend.register(jwt, { secret: JWT_SECRET });

backend.decorate("authenticate", async (request: any, reply: any) => {
  try {
    const token = request.cookies?.token;
    if (!token) return reply.code(401).send({ message: 'Not authenticated' });
    const decoded = backend.jwt.verify(token);
    request.user = decoded;
  } catch (err) {
    return reply.code(401).send({ message: 'Authentication error' });
  }
});



// 1. API Endpoint for Game Creation
backend.post("/api/games", { preHandler: [backend.authenticate] }, async (request, reply) => {
  const gameId = randomUUID();
  const newGame = new Game(gameId, () => {
    games.delete(gameId);
    // Cleanup invites associated with this game
    for (const [inviteId, invite] of invites.entries()) {
      if (invite.gameId === gameId) {
        invites.delete(inviteId);
      }
    }
    backend.log.info(`Game ${gameId} deleted`);
  });
  games.set(gameId, newGame);
  backend.log.info({ gameId }, "New game created");

  return { gameId };
});

// Invite Endpoints
backend.post("/api/invite", { preHandler: [backend.authenticate] }, async (request, reply) => {
  const creatorId = (request as any).user.id;
  const { targetId, gameId: providedGameId } = request.body as { targetId: number, gameId?: string };
  
  if (!targetId) return reply.code(400).send({ message: "Target ID required" });
  if (creatorId === targetId) return reply.code(400).send({ message: "Cannot invite yourself" });

  // 1. Check friendship via Database Service
  try {
      const res = await fetch("http://database:3000/internal/check-friendship", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user1_id: creatorId, user2_id: targetId })
      });
      const data = await res.json() as { areFriends: boolean };
      if (!data.areFriends) {
          return reply.code(403).send({ message: "You can only invite friends" });
      }
  } catch (err) {
      backend.log.error(err);
      return reply.code(500).send({ message: "Friendship check failed" });
  }

  let gameId = providedGameId;

  // 2. Use existing or Create Game
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
        backend.log.info(`Game ${gameId} deleted`);
      });
      games.set(gameId, newGame);
  }

  // 3. Create Invite
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

backend.get("/api/invites", { preHandler: [backend.authenticate] }, async (request, reply) => {
    const userId = (request as any).user.id;
    // Return invites where user is target
    const myInvites = Array.from(invites.values()).filter(i => i.targetId === userId);
    
    // Enrich with creator info? Ideally yes, but for now sending raw invites. 
    // The frontend might need to fetch user details.
    // Or we can do a quick lookup if we had a cache. 
    // Let's send the ID and let frontend handle display or fetch profile.
    
    // Actually, to make it usable, we might need the creator's login.
    // But since backend doesn't store users, we'd need to ask DB.
    // Optimization: Frontend usually has friend list loaded, so it can map ID -> Name.
    
    return { invites: myInvites };
});

backend.post("/api/invite/accept", { preHandler: [backend.authenticate] }, async (request, reply) => {
    const userId = (request as any).user.id;
    const { inviteId } = request.body as { inviteId: string };
    
    const invite = invites.get(inviteId);
    if (!invite) return reply.code(404).send({ message: "Invite not found" });
    if (invite.targetId !== userId) return reply.code(403).send({ message: "Not your invite" });
    
    const game = games.get(invite.gameId);
    if (!game) {
        invites.delete(inviteId); // Cleanup stale invite
        return reply.code(404).send({ message: "Game no longer exists" });
    }
    
    invites.delete(inviteId); // Consumed
    return { gameId: invite.gameId };
});

// Tournament Endpoints
backend.post("/api/tournament/create", { preHandler: [backend.authenticate] }, async (request, reply) => {
    const creatorId = (request as any).user.id;
    const { tournament_name, player_ids } = request.body as { tournament_name: string, player_ids: number[] };

    if (!tournament_name || !player_ids || !Array.isArray(player_ids)) {
        return reply.code(400).send({ message: "Tournament name and player IDs required" });
    }
    if (player_ids.length < 2 || player_ids.length > 5) {
        return reply.code(400).send({ message: "Tournament must have 2-5 players" });
    }

    // Verify friendships
    for (const playerId of player_ids) {
        if (playerId === creatorId) continue;
        try {
            const res = await fetch("http://database:3000/internal/check-friendship", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ user1_id: creatorId, user2_id: playerId })
            });
            const data = await res.json() as { areFriends: boolean };
            if (!data.areFriends) {
                return reply.code(403).send({ message: `User ${playerId} is not your friend` });
            }
        } catch (err) {
            return reply.code(500).send({ message: "Friendship check failed" });
        }
    }

    const tId = randomUUID();
    const tournament = new Tournament(tId, tournament_name, creatorId);
    
    // Add players (including creator if not in list, but UI usually handles it. Assuming player_ids excludes creator? Or includes?
    // Let's assume list might include creator. 
    if (!player_ids.includes(creatorId)) {
        // Creator is already added in constructor
    }
    
    for (const pid of player_ids) {
        if (pid !== creatorId) tournament.invitePlayer(pid);
    }

    tournaments.set(tId, tournament);
    return { tournament_id: tId, message: "Tournament created" };
});

backend.get("/api/tournament/invitations", { preHandler: [backend.authenticate] }, async (request, reply) => {
    const userId = (request as any).user.id;
    const invitations = [];
    for (const t of tournaments.values()) {
        const player = t.players.get(userId);
        if (player && player.status === 'invited' && t.status === 'waiting') {
            invitations.push({
                id: t.id,
                tournament_name: t.name,
                creator_id: t.creatorId // Frontend might need to fetch name
            });
        }
    }
    return { invitations };
});

backend.get("/api/tournament/:id", { preHandler: [backend.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const t = tournaments.get(id);
    if (!t) return reply.code(404).send({ message: "Tournament not found" });
    
    // Check access? Participants only?
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

backend.post("/api/tournament/:id/accept", { preHandler: [backend.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = (request as any).user.id;
    const t = tournaments.get(id);
    
    if (!t) return reply.code(404).send({ message: "Tournament not found" });
    t.respondInvite(userId, true);
    return { message: "Accepted" };
});

backend.post("/api/tournament/:id/decline", { preHandler: [backend.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = (request as any).user.id;
    const t = tournaments.get(id);
    
    if (!t) return reply.code(404).send({ message: "Tournament not found" });
    t.respondInvite(userId, false);
    return { message: "Declined" };
});

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

backend.get("/api/games", { preHandler: [backend.authenticate] }, async (request, reply) => {
  const availableGames = Array.from(games.values())
    .filter(g => g.getState() === "waiting")
    .map(g => g.gameId);
  return { games: availableGames };
});

// 2. WebSocket Endpoint for Gameplay
backend.get("/api/ws/:id", { websocket: true }, (socket, req) => {
  const token = req.cookies?.token;
  if (!token) {
    socket.close();
    return;
  }
  let decoded;
  try {
    decoded = backend.jwt.verify(token) as { id: number };
  } catch {
    socket.close();
    return;
  }

  const userId = decoded.id;
  const params = req.params as { id: string };
  const gameId = params.id;
  if (!uuidValidate(gameId)) {
    backend.log.warn({ gameId }, "Invalid game ID attempted");
    socket.send(
      JSON.stringify({ type: "error", message: "Invalid game ID format" } as ErrorMessage),
    );
    socket.close();
    return;
  }
  const game = games.get(gameId);
  backend.log.info({ gameId }, "Attempting to join game");

  if (!game) {
    backend.log.warn({ gameId }, "Game not found");
    socket.send(JSON.stringify({ type: "error", message: "Game not found" } as ErrorMessage));
    socket.close();
    return;
  }
  if (game.getState() !== "waiting") {
    backend.log.info(
      { gameId, state: game.getState() },
      "Game not accepting players",
    );
    socket.send(
      JSON.stringify({
        type: "error",
        message: "Game is not accepting players",
      } as ErrorMessage),
    );
    socket.close();
    return;
  }

  game.addPlayer(userId, socket);
});

// 3. REST API for Server-Side Pong Module (CLI Interop)

// Get Game State (Polling)
backend.get("/api/games/:id/state", { preHandler: [backend.authenticate] }, async (request, reply) => {
  const { id } = request.params as { id: string };
  const game = games.get(id);

  if (!game) {
    return reply.status(404).send({ type: "error", message: "Game not found" });
  }

  // Return the latest snapshot (or create one if null)
  const snapshot = game.createGameState();
  if (snapshot) {
      return { ...snapshot, status: game.getState() };
  }
  return { status: game.getState() };
});

// Send Action (Control Paddle)
backend.post("/api/games/:id/action", { preHandler: [backend.authenticate] }, async (request, reply) => {
  const { id } = request.params as { id: string };
  // Get userId from authenticated request
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

await backend.listen({ host: "0.0.0.0", port: 3000 });