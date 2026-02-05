export interface Vector2D {
  x: number;
  y: number;
} 

export interface Chun {
  id: string;
  position: Vector2D;
  velocity: Vector2D;
  radius: number;
  color: string;
  label: string;
  tier: number;
  isPlayer: boolean;
}

export interface GameBoard {
  width: number;
  height: number;
  friction: number;
  wallBounce: number;
}

export type TurnPhase =
  | "player-aim"
  | "player-flick"
  | "bot-aim"
  | "bot-flick"
  | "checking"
  | "round-end";

export type MatchResult = "win" | "lose" | "draw" | null;

export interface GameState {
  board: GameBoard;
  playerChun: Chun;
  botChun: Chun;
  turnPhase: TurnPhase;
  currentTurn: "player" | "bot";
  turnCount: number;
  maxTurns: number;
  matchResult: MatchResult;
  selectedTier: number;
  isGameOver: boolean;
}

export interface FlickInput {
  startPosition: Vector2D;
  endPosition: Vector2D;
  power: number;
}

export interface GameConfig {
  boardWidth: number;
  boardHeight: number;
  chunRadius: number;
  friction: number;
  wallBounce: number;
  maxFlickPower: number;
  velocityThreshold: number;
  maxTurns: number;
  botDifficulty: "easy" | "medium" | "hard";
}

export const DEFAULT_GAME_CONFIG: GameConfig = {
  boardWidth: 900,
  boardHeight: 460,
  chunRadius: 32,
  friction: 0.985,
  wallBounce: 0.7,
  maxFlickPower: 25,
  velocityThreshold: 0.3,
  maxTurns: 10,
  botDifficulty: "medium",
};

export interface SessionStats {
  tier1: number;
  tier2: number;
  tier3: number;
  currentStreak: number;
  maxStreak: number;
  gamesPlayed: number;
  wins: number;
  losses: number;
}

export interface PlayerProfile {
  address: string;
  tier1: number;
  tier2: number;
  tier3: number;
  maxStreak: number;
  currentStreak: number;
  faucetLastClaim: number;
  claimedAchievements: number[];
  totalGamesPlayed: number;
  totalWins: number;
}
