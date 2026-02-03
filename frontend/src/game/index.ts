// Game module exports

export * from "./types";
export * from "./physics";
export * from "./collision";
export * from "./bot-ai";
export * from "./renderer";
export * from "./engine";

// Juicy Physics (NEW) - exported as namespace to avoid conflicts
export {
  PHYSICS_CONFIG as JUICY_CONFIG,
  createChun as createJuicyChun,
  calculateLaunchVelocity,
  getPullInfo,
  updateChunPhysics as updateJuicyPhysics,
  resolveChunCollision as resolveJuicyCollision,
  checkSettledWin,
  isChunSettled,
  areBothSettled,
  calculateBotLaunch,
  getBotThinkTime,
  getSquashScale,
  getMotionStretch,
  BOT_DIFFICULTY,
  vec2 as juicyVec2,
  type Chun as JuicyChun,
  type GameEvent as JuicyGameEvent,
  type GameEventType as JuicyGameEventType,
  type StompResult,
  type CollisionResult as JuicyCollisionResult,
  type WorldBounds,
  type BotConfig,
} from "./juicy-physics";

// Components
export { default as SuiChinGameCanvas } from "./SuiChinGameCanvas";
export { default as GameCanvas } from "./GameCanvas";
export type {
  GameCanvasProps,
  GameCanvasHandle,
  CanvasGameState,
  RoundResult,
  Turn,
  GamePhase,
} from "./GameCanvas";

// Juicy Game Canvas (NEW)
export { default as JuicyGameCanvas } from "./JuicyGameCanvas";
export type {
  JuicyGameCanvasProps,
  JuicyGameCanvasHandle,
} from "./JuicyGameCanvas";

// Flick Game Canvas (HIGH-SKILL VERSION)
export { default as FlickGameCanvas } from "./FlickGameCanvas";
export type {
  FlickGameCanvasProps,
  FlickGameCanvasHandle,
} from "./FlickGameCanvas";

// Flick Physics Engine - explicit exports to avoid conflicts
export {
  FLICK_CONFIG,
  vec2 as flickVec2,
  createChun as createFlickChun,
  dragToFlick,
  calculateFlickVelocity as calculateFlick,
  updateChunPhysics as updateFlickPhysics,
  resolveChunCollision as resolveFlickCollision,
  isChunSettled as isFlickChunSettled,
  areBothSettled as areFlickChunsBothSettled,
  checkSettledWin as checkFlickSettledWin,
  calculateBotFlick,
  getBotThinkTime as getFlickBotThinkTime,
  getPowerColor,
  getPowerZone,
  type Chun as FlickChun,
  type WinResult,
  type FlickInput as FlickInputData,
  type FlickResult,
} from "./flick-physics";
