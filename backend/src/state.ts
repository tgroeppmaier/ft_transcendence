import { Game } from "./game.js";
import type { Tournament } from "./tournament.js";

export const games = new Map<string, Game>();
export const tournaments = new Map<string, Tournament>();
