import { Game } from "./game.js";
import type { Tournament } from "./tournament.js";

export interface Invite {
  id: string;
  creatorId: number;
  targetId: number;
  gameId: string;
  createdAt: number;
}

export const games = new Map<string, Game>();
export const invites = new Map<string, Invite>();
export const tournaments = new Map<string, Tournament>();
