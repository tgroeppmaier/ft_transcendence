export type GameStatus = "connecting" | "waiting" | "gameRunning" | "gameOver" | "gameFull";

export interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export interface Paddle {
  x: number;
  y: number;
}

export interface Score {
  left: number;
  right: number;
}

export interface InitMessage {
  type: "init";
  side: "left" | "right";
}

export interface ErrorMessage {
  type: "error";
  message: string;
}

// High frequency update (Ball and Paddles)
export interface GameStateSnapshot {
  t: number;             // timestamp
  b: [number, number];   // ball [x, y]
  p: [number, number];   // paddles [leftY, rightY]
}

// Low frequency update (Score and Game Status)
export interface StateSnapshot {
  type: "state";
  status: GameStatus;
  score: [number, number]; // [left, right]
}

export type ServerMessage = InitMessage | GameStateSnapshot | StateSnapshot | ErrorMessage;

export interface Action {
  move: "start" | "stop";
  direction: "up" | "down";
}