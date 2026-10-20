/**
 * Scoring API — re-exports the cricket match engine for app-wide use.
 */
export {
  dedupeScoreEvents,
  mergeScoreEvents,
  formatOvers,
  rotateStrike,
  computeNextBall,
  applyPostBallCrease,
  buildBallPayload,
  aggregateInningsFromEvents,
  runRate,
  requiredRunRate,
  replayInnings,
  runsFromBallType,
  isLegalDelivery,
  shouldRotateStrike,
} from './cricket';

export type { BallInput, InningsState } from './cricket';
