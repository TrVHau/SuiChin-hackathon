
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

  // Random power (30-60% of max)
  const power = (0.3 + Math.random() * 0.3) * config.maxFlickPower;

  return {
    targetVelocity: vec2.scale(vec2.normalize(randomDirection), power),
    thinkTime: 800 + Math.random() * 400,
  };
}

/**
 * Medium bot - aims towards player with moderate accuracy
 */
function mediumBotStrategy(
  botChun: Chun,
  playerChun: Chun,
  config: GameConfig,
): BotDecision {
  // Direction towards player with some error
  const toPlayer = vec2.normalize(
    vec2.sub(playerChun.position, botChun.position),
  );

  // Add small error angle (-30 to +30 degrees)
  const errorAngle = (Math.random() - 0.5) * (Math.PI / 3);
  const aimDirection: Vector2D = {
    x: toPlayer.x * Math.cos(errorAngle) - toPlayer.y * Math.sin(errorAngle),
    y: toPlayer.x * Math.sin(errorAngle) + toPlayer.y * Math.cos(errorAngle),
  };

  // Calculate distance-based power
  const distance = vec2.distance(botChun.position, playerChun.position);
  const normalizedDistance = distance / config.boardWidth;

  // Power based on distance (40-80% of max)
  const basePower = 0.4 + normalizedDistance * 0.4;
  const power =
    (basePower + (Math.random() - 0.5) * 0.1) * config.maxFlickPower;

  return {
    targetVelocity: vec2.scale(vec2.normalize(aimDirection), power),
    thinkTime: 600 + Math.random() * 300,
  };
}

/**
 * Hard bot - precise aiming with optimal power
 */
function hardBotStrategy(
  botChun: Chun,
  playerChun: Chun,
  config: GameConfig,
): BotDecision {
  // Predict where to aim considering physics
  const toPlayer = vec2.sub(playerChun.position, botChun.position);
  const distance = vec2.length(toPlayer);

  // Account for friction by overshooting slightly
  const frictionCompensation = 1.15;

  // Small random error (-10 to +10 degrees) to not be perfect
  const errorAngle = (Math.random() - 0.5) * (Math.PI / 9);
  const direction = vec2.normalize(toPlayer);

  const aimDirection: Vector2D = {
    x: direction.x * Math.cos(errorAngle) - direction.y * Math.sin(errorAngle),
    y: direction.x * Math.sin(errorAngle) + direction.y * Math.cos(errorAngle),
  };

  // Optimal power calculation
  const optimalPower = Math.min(
    (distance / config.boardWidth) *
      config.maxFlickPower *
      frictionCompensation,
    config.maxFlickPower * 0.9,
  );

  // Try to land on top of player (aim slightly above)
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

/**
 * Get bot difficulty label
 */
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

/**
 * Determine bot difficulty based on tier
 * Updated: All tiers now use medium difficulty for balanced gameplay
 */
export function getBotDifficultyForTier(tier: number): BotDifficulty {
  // All tiers now have the same medium difficulty
  return "medium";
}
