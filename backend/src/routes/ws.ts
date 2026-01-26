import { FastifyInstance } from "fastify";
import { validate as uuidValidate } from "uuid";
import { ErrorMessage } from "../../../shared/types.js";
import { games } from "../state.js";

const MAX_WS_PER_IP = 20;
const MAX_WS_PER_USER = 2;
const HEARTBEAT_INTERVAL_MS = 30000;

const ipConnections = new Map<string, number>();
const userConnections = new Map<number, number>();

function incrementCount<T>(map: Map<T, number>, key: T): void {
  const currentCount = map.get(key) ?? 0;
  map.set(key, currentCount + 1);
}

function decrementCount<T>(map: Map<T, number>, key: T): void {
  const currentCount = map.get(key) ?? 0;
  const newCount = currentCount - 1;
  if (newCount <= 0) {
    map.delete(key);
  } else {
    map.set(key, newCount);
  }
}

export async function wsRoutes(backend: FastifyInstance) {
  backend.get("/api/ws/:id", { websocket: true }, (socket, req) => {
    const token = req.cookies?.token;
    if (!token) {
      socket.close();
      return;
    }
    let decoded: { id: number };
    try {
      decoded = backend.jwt.verify(token) as { id: number };
    } catch {
      socket.close();
      return;
    }

    const userId = decoded.id;
    const ip = req.ip || "unknown";

    const ipCount = ipConnections.get(ip) ?? 0;
    if (ipCount >= MAX_WS_PER_IP) {
      socket.send(
        JSON.stringify({ type: "error", message: "Too many connections from this IP" } as ErrorMessage),
      );
      socket.close();
      return;
    }

    const userCount = userConnections.get(userId) ?? 0;
    if (userCount >= MAX_WS_PER_USER) {
      socket.send(
        JSON.stringify({ type: "error", message: "Too many active connections for this user" } as ErrorMessage),
      );
      socket.close();
      return;
    }

    incrementCount(ipConnections, ip);
    incrementCount(userConnections, userId);
    let tracked = true;
    let isAlive = true;

    const heartbeat = setInterval(() => {
      if (!isAlive) {
        if (socket.readyState === 1) {
          socket.send(JSON.stringify({ type: "error", message: "Connection timed out" } as ErrorMessage));
        }
        socket.close();
        return;
      }
      isAlive = false;
      if (socket.readyState === 1) socket.ping();
    }, HEARTBEAT_INTERVAL_MS);

    const cleanup = () => {
      clearInterval(heartbeat);
      if (tracked) {
        tracked = false;
        decrementCount(ipConnections, ip);
        decrementCount(userConnections, userId);
      }
    };

    socket.on("pong", () => {
      isAlive = true;
    });
    socket.on("message", () => {
      isAlive = true;
    });
    socket.on("close", cleanup);
    socket.on("error", cleanup);

    const params = req.params as { id: string };
    const gameId = params.id;
    if (!uuidValidate(gameId)) {
      console.warn({ gameId }, "Invalid game ID attempted");
      socket.send(
        JSON.stringify({ type: "error", message: "Invalid game ID format" } as ErrorMessage),
      );
      socket.close();
      return;
    }
    const game = games.get(gameId);
    console.log({ gameId }, "Attempting to join game");

    if (!game) {
      console.warn({ gameId }, "Game not found");
      socket.send(JSON.stringify({ type: "error", message: "Game not found" } as ErrorMessage));
      socket.close();
      return;
    }
    if (game.getState() !== "waiting") {
      console.log(
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
}
