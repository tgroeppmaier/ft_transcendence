import { FastifyInstance } from "fastify";
import { validate as uuidValidate } from "uuid";
import { ErrorMessage } from "../../../shared/types.js";
import { games } from "../state.js";

export async function wsRoutes(backend: FastifyInstance) {
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
