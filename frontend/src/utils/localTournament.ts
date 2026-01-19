import { drawMessage } from "./gameRenderer.js";
import { LocalGame } from "./localGame.js";

export class LocalTournament {
  public  tournamentOver: boolean = false;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private remainingPlayers: string[];
  private nextRoundPlayers: string[] = [];
  private activeGame: LocalGame | null = null;
  private roundNumber: number = 1;
  private onTournamentEnd: () => void;

  constructor(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, players: string[], cb: () => void) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.remainingPlayers = [...players]; // Copy to avoid mutations
    this.onTournamentEnd = cb;
  }

  public start() {
    this.startNextMatch();
  }

 public onKeyDown(key: string) {
    this.activeGame?.onKeyDown(key);
  }

  public onKeyUp(key: string) {
    this.activeGame?.onKeyUp(key);
  }

  public handleClick() {
    this.activeGame?.resetGame();
  }

  private startNextMatch() {
    // Check if current round is complete
    if (this.remainingPlayers.length === 0) {
      // Move to next round
      if (this.nextRoundPlayers.length === 1) {
        drawMessage(this.ctx, this.canvas, `Tournament Winner: ${this.nextRoundPlayers[0]}`)
        this.onTournamentEnd();
        this.tournamentOver = true;
        this.activeGame = null;
        return;
      }

      if (this.nextRoundPlayers.length > 0) {
        this.remainingPlayers = [...this.nextRoundPlayers];
        this.nextRoundPlayers = [];
        this.roundNumber++;
        this.startNextMatch();
        return;
      }

      console.log("Round complete, but no players left - error!");
      return;
    }

    // Handle bye if odd number of players
    if (this.remainingPlayers.length === 1) {
      const byePlayer = this.remainingPlayers.shift()!;
      console.log(`${byePlayer} gets a bye and advances.`);
      this.nextRoundPlayers.push(byePlayer);
      this.startNextMatch(); // Check if round is complete
      return;
    }

    // Start next match with first two players
    const player1 = this.remainingPlayers.shift()!;
    const player2 = this.remainingPlayers.shift()!;

    console.log(`Round ${this.roundNumber}: ${player1} vs ${player2}`);

    this.activeGame = new LocalGame(this.canvas, this.ctx, player1, player2, true, this.onMatchEnd.bind(this));
    this.activeGame.start();
  }

  public onMatchEnd(winner: string) {
    console.log(`Match ended. Winner: ${winner}`);
    this.nextRoundPlayers.push(winner); // Add winner to next round
    this.startNextMatch();
  }

  public stop() {
    if (this.activeGame) {
      this.activeGame.stop();
    }
  }
}
