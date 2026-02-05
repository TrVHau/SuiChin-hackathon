
import type { Chun, GameConfig, Vector2D } from "./types";
import { vec2, calculateFlickVelocity } from "./physics";

export type BotDifficulty = "easy" | "medium" | "hard";

interface BotDecision {
  targetVelocity: Vector2D;
  thinkTime: number; 
}

export function calculateBotMove(
  botChun: Chun,
  playerChun: Chun,
  config: GameConfig,
): BotDecision {
  const difficulty = config.botDifficulty;

  switch (difficulty) {
    case "easy":
      return easyBotStrategy(botChun, playerChun, config);
    case "medium":
      return mediumBotStrategy(botChun, playerChun, config);
    case "hard":
      return hardBotStrategy(botChun, playerChun, config);
    default:
      return mediumBotStrategy(botChun, playerChun, config);
  }
}

function easyBotStrategy(
  botChun: Chun,
  playerChun: Chun,
  config: GameConfig,
): BotDecision {
  const toPlayer = vec2.normalize(
    vec2.sub(playerChun.position, botChun.position),
  );

  const randomAngle = (Math.random() - 0.5) * Math.PI; 
  const randomDirection: Vector2D = {
    x: toPlayer.x * Math.cos(randomAngle) - toPlayer.y * Math.sin(randomAngle),
    y: toPlayer.x * Math.sin(randomAngle) + toPlayer.y * Math.cos(randomAngle),
  };

  const power = (0.3 + Math.random() * 0.3) * config.maxFlickPower;

  return {
    targetVelocity: vec2.scale(vec2.normalize(randomDirection), power),
    thinkTime: 800 + Math.random() * 400,
  };
}


function mediumBotStrategy(
  botChun: Chun,
  playerChun: Chun,
  config: GameConfig,
): BotDecision {
  const toPlayer = vec2.normalize(
    vec2.sub(playerChun.position, botChun.position),
  );

  const errorAngle = (Math.random() - 0.5) * (Math.PI / 3);
  const aimDirection: Vector2D = {
    x: toPlayer.x * Math.cos(errorAngle) - toPlayer.y * Math.sin(errorAngle),
    y: toPlayer.x * Math.sin(errorAngle) + toPlayer.y * Math.cos(errorAngle),
  };

  const distance = vec2.distance(botChun.position, playerChun.position);
  const normalizedDistance = distance / config.boardWidth;

  const basePower = 0.4 + normalizedDistance * 0.4;
  const power =
    (basePower + (Math.random() - 0.5) * 0.1) * config.maxFlickPower;

  return {
    targetVelocity: vec2.scale(vec2.normalize(aimDirection), power),
    thinkTime: 600 + Math.random() * 300,
  };
}

function hardBotStrategy(
  botChun: Chun,
  playerChun: Chun,
  config: GameConfig,
): BotDecision {
  const toPlayer = vec2.sub(playerChun.position, botChun.position);
  const distance = vec2.length(toPlayer);

  const frictionCompensation = 1.15;

  const errorAngle = (Math.random() - 0.5) * (Math.PI / 9);
  const direction = vec2.normalize(toPlayer);

  const aimDirection: Vector2D = {
    x: direction.x * Math.cos(errorAngle) - direction.y * Math.sin(errorAngle),
    y: direction.x * Math.sin(errorAngle) + direction.y * Math.cos(errorAngle),
  };

  const optimalPower = Math.min(
    (distance / config.boardWidth) *
      config.maxFlickPower *
      frictionCompensation,
    config.maxFlickPower * 0.9,
  );

  const aboveOffset: Vector2D = { x: 0, y: -20 };
  const adjustedTarget = vec2.add(playerChun.position, aboveOffset);
  const adjustedDirection = vec2.normalize(
    vec2.sub(adjustedTarget, botChun.position),
  );

  const blendFactor = 0.7;
  const finalDirection: Vector2D = {
    x: aimDirection.x * (1 - blendFactor) + adjustedDirection.x * blendFactor,
    y: aimDirection.y * (1 - blendFactor) + adjustedDirection.y * blendFactor,
  };

  return {
    targetVelocity: vec2.scale(vec2.normalize(finalDirection), optimalPower),
    thinkTime: 400 + Math.random() * 200,
  };
}

export function getDifficultyLabel(difficulty: BotDifficulty): string {
  switch (difficulty) {
    case "easy":
      return "Dễ";
    case "medium":
      return "Trung Bình";
    case "hard":
      return "Khó";
    default:
      return "Trung Bình";
  }
}

export function getBotDifficultyForTier(tier: number): BotDifficulty {
  return "medium";
}
