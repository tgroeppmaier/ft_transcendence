export interface Ball {
  x: number;
  y: number;
  radius: number;
  vx: number;
  vy: number;
}

export interface Paddle {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Score {
  left: number;
  right: number;
}

export type State = "connecting" | "waiting" | "gameRunning" | "gameOver" | "gameFull";

export interface InitMessage {
  type: "init";
  side: "left" | "right";
}

export type GameMessage = {
  ball: Ball;
  leftPaddle: Paddle;
  rightPaddle: Paddle;
  state: State;
  score: Score;
} | InitMessage;

export interface ErrorMessage {
  error: string;
}

export interface Action {
  move: "start" | "stop";
  direction: "up" | "down";
}
