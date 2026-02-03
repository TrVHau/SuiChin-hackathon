// Game engine - main game loop and state management

import type {
  GameState,
  GameConfig,
  Chun,
  TurnPhase,
  MatchResult,
  Vector2D,
  FlickInput,
} from "./types";
import { DEFAULT_GAME_CONFIG } from "./types";
import {
  updateChunPhysics,
  checkChunCollision,
  resolveChunCollision,
  areAllChunsStationary,
  determineWinner,
  getInitialPositions,
  vec2,
  calculateFlickVelocity,
} from "./physics";
import { calculateBotMove, getBotDifficultyForTier } from "./bot-ai";
import { getTierColor } from "./renderer";

export type GameEventType =
  | "turn-start"
  | "flick"
  | "collision"
  | "turn-end"
  | "round-end"
  | "game-over";

export interface GameEvent {
  type: GameEventType;
  data?: unknown;
}

export type GameEventListener = (event: GameEvent) => void;

/**
 * Create initial game state
 */
export function createInitialGameState(
  selectedTier: number,
  config: GameConfig = DEFAULT_GAME_CONFIG,
): GameState {
  const positions = getInitialPositions(config);
  const difficulty = getBotDifficultyForTier(selectedTier);

  const playerChun: Chun = {
    id: "player",
    position: { ...positions.player },
    velocity: vec2.zero(),
    radius: config.chunRadius,
    color: getTierColor(selectedTier),
    label: "YOU",
    tier: selectedTier,
    isPlayer: true,
  };

  const botChun: Chun = {
    id: "bot",
    position: { ...positions.bot },
    velocity: vec2.zero(),
    radius: config.chunRadius,
    color: "#ef4444",
    label: "BOT",
    tier: selectedTier,
    isPlayer: false,
  };

  return {
    board: {
      width: config.boardWidth,
      height: config.boardHeight,
      friction: config.friction,
      wallBounce: config.wallBounce,
    },
    playerChun,
    botChun,
    turnPhase: "player-aim",
    currentTurn: "player",
    turnCount: 0,
    maxTurns: config.maxTurns,
    matchResult: null,
    selectedTier,
    isGameOver: false,
  };
}

/**
 * Game Engine class
 */
export class GameEngine {
  private state: GameState;
  private config: GameConfig;
  private listeners: Set<GameEventListener>;
  private animationFrameId: number | null = null;
  private lastTimestamp: number = 0;
  private botMoveTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor(selectedTier: number, config: Partial<GameConfig> = {}) {
    this.config = {
      ...DEFAULT_GAME_CONFIG,
      ...config,
      botDifficulty: getBotDifficultyForTier(selectedTier),
    };
    this.state = createInitialGameState(selectedTier, this.config);
    this.listeners = new Set();
  }

  /**
   * Get current game state
   */
  getState(): GameState {
    return this.state;
  }

  /**
   * Get game config
   */
  getConfig(): GameConfig {
    return this.config;
  }

  /**
   * Subscribe to game events
   */
  subscribe(listener: GameEventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Emit game event to all listeners
   */
  private emit(event: GameEvent): void {
    this.listeners.forEach((listener) => listener(event));
  }

  /**
   * Update state and notify listeners
   */
  private setState(updates: Partial<GameState>): void {
    this.state = { ...this.state, ...updates };
  }

  /**
   * Handle player flick input
   */
  playerFlick(input: FlickInput): void {
    if (this.state.turnPhase !== "player-aim" || this.state.isGameOver) {
      return;
    }

    const velocity = calculateFlickVelocity(
      input.startPosition,
      input.endPosition,
      this.config.maxFlickPower,
    );

    const updatedPlayerChun = {
      ...this.state.playerChun,
      velocity,
    };

    this.setState({
      playerChun: updatedPlayerChun,
      turnPhase: "player-flick",
    });

    this.emit({ type: "flick", data: { player: true, velocity } });
  }

  /**
   * Execute bot's turn
   */
  private executeBotTurn(): void {
    if (this.state.isGameOver) return;

    this.setState({ turnPhase: "bot-aim" });
    this.emit({ type: "turn-start", data: { player: false } });

    const decision = calculateBotMove(
      this.state.botChun,
      this.state.playerChun,
      this.config,
    );

    this.botMoveTimeout = setTimeout(() => {
      const updatedBotChun = {
        ...this.state.botChun,
        velocity: decision.targetVelocity,
      };

      this.setState({
        botChun: updatedBotChun,
        turnPhase: "bot-flick",
      });

      this.emit({
        type: "flick",
        data: { player: false, velocity: decision.targetVelocity },
      });
    }, decision.thinkTime);
  }

  /**
   * Check if round should end
   */
  private checkRoundEnd(): void {
    const { playerChun, botChun, turnCount, maxTurns } = this.state;

    // Check collision and determine winner
    if (checkChunCollision(playerChun, botChun)) {
      const winner = determineWinner(playerChun, botChun);
      const result: MatchResult =
        winner === "player" ? "win" : winner === "bot" ? "lose" : "draw";

      this.setState({
        matchResult: result,
        turnPhase: "round-end",
        isGameOver: true,
      });

      this.emit({ type: "round-end", data: { result } });
      this.emit({ type: "game-over", data: { result } });
      return;
    }

    // Check max turns
    if (turnCount >= maxTurns) {
      // Determine winner by position
      const winner = determineWinner(playerChun, botChun);
      const result: MatchResult =
        winner === "player" ? "win" : winner === "bot" ? "lose" : "draw";

      this.setState({
        matchResult: result,
        turnPhase: "round-end",
        isGameOver: true,
      });

      this.emit({ type: "round-end", data: { result } });
      this.emit({ type: "game-over", data: { result } });
      return;
    }

    // Switch turns
    if (this.state.currentTurn === "player") {
      this.setState({
        currentTurn: "bot",
        turnCount: turnCount + 1,
      });
      this.executeBotTurn();
    } else {
      this.setState({
        currentTurn: "player",
        turnPhase: "player-aim",
      });
      this.emit({ type: "turn-start", data: { player: true } });
    }
  }

  /**
   * Main game loop update
   */
  update(deltaTime: number = 1): void {
    if (this.state.isGameOver) return;

    const { turnPhase, playerChun, botChun, board } = this.state;

    // Only update physics during flick phases
    if (turnPhase !== "player-flick" && turnPhase !== "bot-flick") {
      return;
    }

    // Update player chun physics
    let updatedPlayerChun = updateChunPhysics(playerChun, board, deltaTime);
    let updatedBotChun = updateChunPhysics(botChun, board, deltaTime);

    // Check for chun-chun collision
    if (checkChunCollision(updatedPlayerChun, updatedBotChun)) {
      [updatedPlayerChun, updatedBotChun] = resolveChunCollision(
        updatedPlayerChun,
        updatedBotChun,
      );
      this.emit({ type: "collision" });
    }

    this.setState({
      playerChun: updatedPlayerChun,
      botChun: updatedBotChun,
    });

    // Check if both chuns have stopped
    if (
      areAllChunsStationary(
        [updatedPlayerChun, updatedBotChun],
        this.config.velocityThreshold,
      )
    ) {
      this.setState({ turnPhase: "checking" });
      this.emit({
        type: "turn-end",
        data: { player: this.state.currentTurn === "player" },
      });

      // Small delay before checking round end
      setTimeout(() => this.checkRoundEnd(), 300);
    }
  }

  /**
   * Start the game loop
   */
  start(): void {
    this.emit({ type: "turn-start", data: { player: true } });

    const loop = (timestamp: number) => {
      if (this.lastTimestamp === 0) {
        this.lastTimestamp = timestamp;
      }

      const deltaTime = Math.min((timestamp - this.lastTimestamp) / 16.67, 2);
      this.lastTimestamp = timestamp;

      this.update(deltaTime);

      if (!this.state.isGameOver) {
        this.animationFrameId = requestAnimationFrame(loop);
      }
    };

    this.animationFrameId = requestAnimationFrame(loop);
  }

  /**
   * Stop the game loop
   */
  stop(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    if (this.botMoveTimeout !== null) {
      clearTimeout(this.botMoveTimeout);
      this.botMoveTimeout = null;
    }
  }

  /**
   * Reset game to initial state
   */
  reset(): void {
    this.stop();
    this.state = createInitialGameState(this.state.selectedTier, this.config);
    this.lastTimestamp = 0;
  }

  /**
   * Destroy engine and clean up
   */
  destroy(): void {
    this.stop();
    this.listeners.clear();
  }
}

/**
 * Create a new game engine instance
 */
export function createGameEngine(
  selectedTier: number,
  config?: Partial<GameConfig>,
): GameEngine {
  return new GameEngine(selectedTier, config);
}
