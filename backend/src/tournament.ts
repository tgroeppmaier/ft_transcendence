import { randomUUID } from "crypto";
import { Game } from "./game.js";
import { games, invites } from "./state.js";

export interface TournamentPlayer {
    id: number;
    status: 'invited' | 'accepted' | 'declined';
    login?: string; // Optional for display
}

export interface TournamentMatch {
    id: string; // Game UUID
    p1: number;
    p2: number;
    winner: number | null;
}

export class Tournament {
    public id: string;
    public name: string;
    public creatorId: number;
    public players: Map<number, TournamentPlayer>;
    public status: 'waiting' | 'active' | 'finished';
    public currentRound: TournamentMatch[];
    public history: TournamentMatch[];

    constructor(id: string, name: string, creatorId: number) {
        this.id = id;
        this.name = name;
        this.creatorId = creatorId;
        this.players = new Map();
        this.status = 'waiting';
        this.currentRound = [];
        this.history = [];
        
        // Add creator
        this.players.set(creatorId, { id: creatorId, status: 'accepted' });
    }

    public invitePlayer(playerId: number) {
        if (!this.players.has(playerId)) {
            this.players.set(playerId, { id: playerId, status: 'invited' });
        }
    }

    public respondInvite(playerId: number, accepted: boolean) {
        const player = this.players.get(playerId);
        if (player && player.status === 'invited') {
            player.status = accepted ? 'accepted' : 'declined';
        }
    }

    public start() {
        if (this.status !== 'waiting') return false;
        
        const acceptedPlayers = Array.from(this.players.values())
            .filter(p => p.status === 'accepted')
            .map(p => p.id);
            
        if (acceptedPlayers.length < 2) return false;

        this.status = 'active';
        this.generateRound(acceptedPlayers);
        return true;
    }

    private generateRound(playerIds: number[]) {
        this.currentRound = [];
        // Simple pairing: 0 vs 1, 2 vs 3...
        // If odd, one gets bye? (Not implemented for simplicity, assume even or handle leftovers)
        // Or simple round robin? Or knockout?
        // Let's implement single elimination.
        
        // Shuffle
        const shuffled = playerIds.sort(() => Math.random() - 0.5);
        
        while (shuffled.length >= 2) {
            const p1 = shuffled.pop();
            const p2 = shuffled.pop();
            
            // Create Game
            const gameId = randomUUID();
            const match: TournamentMatch = { id: gameId, p1, p2, winner: null };
            this.currentRound.push(match);
            
            const game = new Game(gameId, () => {
                games.delete(gameId);
                console.log(`Tournament Game ${gameId} deleted`);
            }, (winnerId) => {
                this.handleMatchResult(gameId, winnerId);
            });
            games.set(gameId, game);
            
            // Create Invite for these players? 
            // Or just let them join?
            // They need to know the Game ID.
            // We can create invites for them.
            const inv1 = randomUUID();
            invites.set(inv1, { id: inv1, creatorId: this.creatorId, targetId: p1, gameId, createdAt: Date.now() });
            const inv2 = randomUUID();
            invites.set(inv2, { id: inv2, creatorId: this.creatorId, targetId: p2, gameId, createdAt: Date.now() });
        }
        
        // If one left (Bye), they advance automatically?
        if (shuffled.length === 1) {
            // Advance logic...
            // For now, let's just handle 2, 4 players.
        }
    }

    private handleMatchResult(gameId: string, winnerId: number) {
        const match = this.currentRound.find(m => m.id === gameId);
        if (!match) return;
        match.winner = winnerId;
        this.history.push(match);
        
        // Check if round complete
        const allFinished = this.currentRound.every(m => m.winner !== null);
        if (allFinished) {
            const winners = this.currentRound.map(m => m.winner);
            if (winners.length === 1) {
                this.finish(winners[0]);
            } else {
                this.generateRound(winners);
            }
        }
    }

    private finish(winnerId: number) {
        this.status = 'finished';
        // Save to DB?
    }
}
