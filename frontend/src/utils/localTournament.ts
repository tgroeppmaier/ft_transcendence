import { drawMessage } from "./gameRenderer.js";
import { LocalGame } from "./localGame.js";

interface Match {
  p1: string;
  p2: string;
}

interface TournamentOptions {
  loggedUserId?: number;
  loggedUserName?: string;
}

export class LocalTournament {
  public tournamentOver: boolean = false;
  public activeGame: LocalGame | null = null;

  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private matches: Match[];
  private currentMatchIndex: number = 0;
  private loggedUserId?: number;
  private loggedUserName?: string;

  constructor(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, players: string[], options?: TournamentOptions) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.loggedUserId = options?.loggedUserId;
    this.loggedUserName = options?.loggedUserName;

    // Fixed bracket for 4 players:
    // Match 0: P1 vs P2
    // Match 1: P3 vs P4
    // Match 2: Winner 0 vs Winner 1
    this.matches = [
      { p1: players[0], p2: players[1] },
      { p1: players[2], p2: players[3] },
      { p1: "", p2: "" }
    ];
  }

  public start() {
    this.startNextMatch();
  }

  public stop() {
    if (this.activeGame) {
      this.activeGame.stop();
    }
  }

  private startNextMatch() {
    // Stop the previous game if it exists
    if (this.activeGame) {
      this.activeGame.stop();
    }

    const match = this.matches[this.currentMatchIndex];
    console.log(`Starting Match ${this.currentMatchIndex + 1}: ${match.p1} vs ${match.p2}`);

    this.activeGame = new LocalGame(
      this.canvas,
      this.ctx,
      match.p1,
      match.p2,
      true,
      (winner) => this.onMatchEnd(winner)
    );
    this.activeGame.start();
  }

  private async onMatchEnd(winner: string) {
    // Stop the current game
    if (this.activeGame) {
      this.activeGame.stop();
    }

    // If this was the Final (Index 2)
    if (this.currentMatchIndex === 2) {
      drawMessage(this.ctx, this.canvas, `Tournament Winner: ${winner}`);
      this.tournamentOver = true;
      this.activeGame = null;
      
      // Save tournament result if user is logged in
      await this.saveTournamentResult(winner);
      return;
    }

    drawMessage(this.ctx, this.canvas, `Match ${this.currentMatchIndex + 1} ended. Winner: ${winner}`);

    setTimeout(() => {
      const finalMatch = this.matches[2];
      if (this.currentMatchIndex === 0) {
        finalMatch.p1 = winner;
      } else {
        finalMatch.p2 = winner;
      }

      this.currentMatchIndex++;
      this.startNextMatch();
    }, 2000);
  }

  private async saveTournamentResult(winner: string) {
    // Only save if user is logged in
    if (!this.loggedUserId || !this.loggedUserName) {
      return;
    }

    try {
      // Determine placement
      let placement: number;
      
      if (winner === this.loggedUserName) {
        // User won the tournament
        placement = 1;
      } else {
        // User didn't win - check if they made it to finals
        const finalMatch = this.matches[2];
        if (finalMatch.p1 === this.loggedUserName || finalMatch.p2 === this.loggedUserName) {
          // User was in finals but lost
          placement = 2;
        } else {
          // User lost in semifinals (3rd or 4th place)
          // Determine which semifinal winner they lost to
          const match0 = this.matches[0];
          const match1 = this.matches[1];
          
          let userWasInMatch0 = match0.p1 === this.loggedUserName || match0.p2 === this.loggedUserName;
          
          if (userWasInMatch0) {
            // User was in match 0 - check if winner of match 0 won the tournament
            let match0Winner = finalMatch.p1; // Winner of match 0 becomes finalMatch.p1
            placement = (match0Winner === winner) ? 3 : 4;
          } else {
            // User was in match 1 - check if winner of match 1 won the tournament
            let match1Winner = finalMatch.p2; // Winner of match 1 becomes finalMatch.p2
            placement = (match1Winner === winner) ? 3 : 4;
          }
        }
      }

      console.log(`Saving tournament result: User ${this.loggedUserName} placed ${placement}`);

      const response = await fetch('/db/tournament-result', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ placement })
      });

      if (!response.ok) {
        console.error('Failed to save tournament result');
      } else {
        console.log('Tournament result saved successfully');
      }
    } catch (err) {
      console.error('Error saving tournament result:', err);
    }
  }
}
