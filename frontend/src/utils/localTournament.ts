import { drawMessage } from "./gameRenderer.js";
import { LocalGame } from "./localGame.js";

interface Match {
  p1: string;
  p2: string;
}

export class LocalTournament {
  public tournamentOver: boolean = false;
  public activeGame: LocalGame | null = null;

  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private matches: Match[];
  private currentMatchIndex: number = 0;

  constructor(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, players: string[]) {
    this.canvas = canvas;
    this.ctx = ctx;

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

  private onMatchEnd(winner: string) {
    // If this was the Final (Index 2)
    if (this.currentMatchIndex === 2) {
      drawMessage(this.ctx, this.canvas, `Tournament Winner: ${winner}`);
      this.tournamentOver = true;
      this.activeGame = null;
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
}
