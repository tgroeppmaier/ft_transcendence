import Fastify from "fastify";
import websocket from "@fastify/websocket";
import cookie from "@fastify/cookie";
import jwt from "@fastify/jwt";
import rateLimit from "@fastify/rate-limit";
import { gameRoutes } from "./routes/games.js";
import { inviteRoutes } from "./routes/invites.js";
import { tournamentRoutes } from "./routes/tournaments.js";
import { wsRoutes } from "./routes/ws.js";

declare module "fastify" {
  interface FastifyInstance {
    authenticate: any;
  }
}

const backend = Fastify({ 
  logger: true,
  trustProxy: true 
});
await backend.register(websocket);
await backend.register(rateLimit, {
  max: 100,
  timeWindow: '1 minute'
});

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error("FATAL: JWT_SECRET environment variable is required.");
  process.exit(1);
}

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

// Register Routes
backend.register(gameRoutes);
backend.register(inviteRoutes);
backend.register(tournamentRoutes);
backend.register(wsRoutes);

await backend.listen({ host: "0.0.0.0", port: 3000 });
