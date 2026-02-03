// Hook for managing the game engine

import { useRef, useEffect, useCallback, useState } from "react";
import {
  GameEngine,
  createGameEngine,
  type GameEvent,
  type GameEventType,
} from "@/game/engine";
import type {
  GameState,
  GameConfig,
  FlickInput,
  MatchResult,
} from "@/game/types";

interface UseGameEngineOptions {
  selectedTier: number;
  config?: Partial<GameConfig>;
  onGameOver?: (result: MatchResult) => void;
  onTurnStart?: (isPlayer: boolean) => void;
  onCollision?: () => void;
}

interface UseGameEngineReturn {
  gameState: GameState | null;
  isRunning: boolean;
  startGame: () => void;
  stopGame: () => void;
  resetGame: () => void;
  playerFlick: (input: FlickInput) => void;
}

export function useGameEngine(
  options: UseGameEngineOptions,
): UseGameEngineReturn {
  const { selectedTier, config, onGameOver, onTurnStart, onCollision } =
    options;

  const engineRef = useRef<GameEngine | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  // Create engine on mount
  useEffect(() => {
    engineRef.current = createGameEngine(selectedTier, config);
    setGameState(engineRef.current.getState());

    return () => {
      if (engineRef.current) {
        engineRef.current.destroy();
        engineRef.current = null;
      }
    };
  }, [selectedTier, config]);

  // Subscribe to events
  useEffect(() => {
    if (!engineRef.current) return;

    const handleEvent = (event: GameEvent) => {
      // Update state on every event
      if (engineRef.current) {
        setGameState({ ...engineRef.current.getState() });
      }

      switch (event.type) {
        case "game-over":
          setIsRunning(false);
          if (onGameOver && event.data) {
            const { result } = event.data as { result: MatchResult };
            onGameOver(result);
          }
          break;

        case "turn-start":
          if (onTurnStart && event.data) {
            const { player } = event.data as { player: boolean };
            onTurnStart(player);
          }
          break;

        case "collision":
          if (onCollision) {
            onCollision();
          }
          break;
      }
    };

    const unsubscribe = engineRef.current.subscribe(handleEvent);
    return unsubscribe;
  }, [onGameOver, onTurnStart, onCollision]);

  // Sync state with engine on each frame
  useEffect(() => {
    if (!isRunning || !engineRef.current) return;

    let frameId: number;

    const syncState = () => {
      if (engineRef.current) {
        setGameState({ ...engineRef.current.getState() });
      }
      if (isRunning) {
        frameId = requestAnimationFrame(syncState);
      }
    };

    frameId = requestAnimationFrame(syncState);

    return () => {
      cancelAnimationFrame(frameId);
    };
  }, [isRunning]);

  const startGame = useCallback(() => {
    if (engineRef.current && !isRunning) {
      engineRef.current.start();
      setIsRunning(true);
    }
  }, [isRunning]);

  const stopGame = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.stop();
      setIsRunning(false);
    }
  }, []);

  const resetGame = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.reset();
      setGameState(engineRef.current.getState());
      setIsRunning(false);
    }
  }, []);

  const playerFlick = useCallback(
    (input: FlickInput) => {
      if (engineRef.current && isRunning) {
        engineRef.current.playerFlick(input);
      }
    },
    [isRunning],
  );

  return {
    gameState,
    isRunning,
    startGame,
    stopGame,
    resetGame,
    playerFlick,
  };
}
