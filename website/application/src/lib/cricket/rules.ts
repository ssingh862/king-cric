import type { BallType } from '../../types/database';
import type { BallInput, InningsState, MatchRules, WicketType, WicketTypeInput } from './types';

/** Odd runs off the bat (or total on extras) → strike changes. */
export function shouldRotateFromRuns(runs: number): boolean {
  return runs % 2 === 1;
}

export function runsFromBallType(type: BallType): number {
  const map: Record<BallType, number> = {
    dot: 0,
    one: 1,
    two: 2,
    three: 3,
    four: 4,
    six: 6,
    wide: 0,
    no_ball: 0,
    bye: 0,
    leg_bye: 0,
    wicket: 0,
  };
  return map[type] ?? 0;
}

export function isLegalDelivery(type: BallType, rules?: MatchRules): boolean {
  if (type === 'wide') return rules?.wideCountsAsBall ?? false;
  if (type === 'no_ball') return rules?.noBallCountsAsBall ?? false;
  return true;
}

export function shouldRotateStrike(
  type: BallType,
  runsOffBat: number,
  extras: number,
  rules?: MatchRules
): boolean {
  if (type === 'wide' || type === 'no_ball' || type === 'bye' || type === 'leg_bye') {
    const penalty = type === 'wide' ? (rules?.widePenaltyRuns ?? 1) : type === 'no_ball' ? (rules?.noBallPenaltyRuns ?? 1) : 0;
    const total = runsOffBat + extras - penalty;
    return shouldRotateFromRuns(total);
  }
  return shouldRotateFromRuns(runsOffBat);
}

export function normalizeWicketType(type?: WicketTypeInput | null): WicketType | null {
  if (!type) return null;
  if (type === 'retired_hurt') return 'retired';
  return type;
}

/** Bowler gets wicket credit for these dismissals only. */
export function creditsBowlerWicket(wicketType: WicketType | null | undefined): boolean {
  if (!wicketType) return true;
  return ['bowled', 'caught', 'lbw', 'stumped', 'hit_wicket'].includes(wicketType);
}

export function defaultExtras(type: BallType, override?: number): number {
  if (override != null) return override;
  if (type === 'wide' || type === 'no_ball') return 1;
  if (type === 'bye' || type === 'leg_bye') return 0;
  return 0;
}

export function resolveRunsOffBat(input: BallInput): number {
  if (input.runsOffBat != null) return input.runsOffBat;
  return runsFromBallType(input.ballType);
}

export function resolveExtras(input: BallInput, rules: MatchRules): number {
  if (input.extras != null) return input.extras;
  if (input.ballType === 'wide') return rules.widePenaltyRuns;
  if (input.ballType === 'no_ball') return rules.noBallPenaltyRuns;
  return defaultExtras(input.ballType);
}

export function runsCountToBatsman(type: BallType, runsOffBat: number): number {
  if (['bye', 'leg_bye', 'wide'].includes(type)) return 0;
  return runsOffBat;
}

export function maxLegalBalls(rules: MatchRules): number {
  return rules.oversPerInnings * rules.ballsPerOver;
}

/** Teams under 11: everyone can bat and get out. Standard 11+: all out at 10 wickets. */
export function maxWicketsForSquad(squadSize: number, lastBatterStands = false): number {
  return Math.max(1, squadSize - (lastBatterStands ? 0 : 1));
}

export function allOutWicketsLabel(squadSize?: number, maxWickets?: number): string {
  const max = maxWickets ?? (squadSize ? maxWicketsForSquad(squadSize) : 10);
  if (squadSize != null && squadSize < 11) {
    return `${squadSize}-player side · all out at ${max} wickets`;
  }
  return `all out at ${max} wickets`;
}

export function isInningsComplete(
  state: Pick<InningsState, 'totalWickets' | 'legalBalls' | 'totalRuns'>,
  rules: MatchRules,
  targetRuns?: number | null
): { complete: boolean; reason?: 'all_out' | 'overs_complete' | 'target_reached' } {
  if (state.totalWickets >= rules.maxWickets) {
    return { complete: true, reason: 'all_out' };
  }
  if (state.legalBalls >= maxLegalBalls(rules)) {
    return { complete: true, reason: 'overs_complete' };
  }
  if (targetRuns != null && targetRuns > 0 && state.totalRuns >= targetRuns) {
    return { complete: true, reason: 'target_reached' };
  }
  return { complete: false };
}

export function canDismissOnFreeHit(wicketType: WicketType | null): boolean {
  return wicketType === 'run_out' || wicketType === 'obstructing';
}
