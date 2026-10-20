import type { MatchRules } from './types';
import { maxLegalBalls } from './rules';
import { formatOvers, requiredRunRate } from './engine';

export interface ChaseStatus {
  target: number;
  runsNeeded: number;
  ballsRemaining: number;
  oversRemaining: string;
  requiredRR: string;
  /** e.g. "Need 20 runs from 12 balls" */
  chaseLine: string;
  isChasing: boolean;
}

export function computeChaseStatus(
  currentRuns: number,
  legalBalls: number,
  targetRuns: number | null | undefined,
  rules: MatchRules
): ChaseStatus | null {
  if (targetRuns == null || targetRuns <= 0) return null;

  const maxBalls = maxLegalBalls(rules);
  const ballsRemaining = Math.max(0, maxBalls - legalBalls);
  const runsNeeded = Math.max(0, targetRuns - currentRuns);

  return {
    target: targetRuns,
    runsNeeded,
    ballsRemaining,
    oversRemaining: formatOvers(ballsRemaining, rules.ballsPerOver),
    requiredRR: requiredRunRate(targetRuns, currentRuns, ballsRemaining),
    chaseLine: `Need ${runsNeeded} run${runsNeeded === 1 ? '' : 's'} from ${ballsRemaining} ball${ballsRemaining === 1 ? '' : 's'}`,
    isChasing: true,
  };
}
