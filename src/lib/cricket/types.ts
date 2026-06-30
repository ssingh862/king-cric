import type { BallType, ScoreEvent } from '../../types/database';

export type WicketType =
  | 'bowled'
  | 'caught'
  | 'lbw'
  | 'run_out'
  | 'stumped'
  | 'hit_wicket'
  | 'retired'
  | 'obstructing'
  | 'timed_out'
  | 'other';

/** Display label for retired hurt maps to DB `retired`. */
export type WicketTypeInput = WicketType | 'retired_hurt';

export type MatchFormatKind = 't20' | 'odi' | 'local' | 'tennis' | 'custom';

export interface MatchRules {
  kind: MatchFormatKind;
  oversPerInnings: number;
  maxWickets: number;
  ballsPerOver: number;
  widePenaltyRuns: number;
  noBallPenaltyRuns: number;
  freeHitOnNoBall: boolean;
  superOverOvers: number;
  /** Batting squad size — drives all-out wicket cap. */
  battingSquadSize?: number;
}

export interface BallInput {
  ballType: BallType;
  runsOffBat?: number;
  extras?: number;
  isWicket?: boolean;
  wicketType?: WicketTypeInput;
  dismissedPlayerId?: string;
}

export interface CreaseState {
  strikerId: string | null;
  nonStrikerId: string | null;
  bowlerId: string | null;
}

export interface InningsTotals {
  totalRuns: number;
  totalWickets: number;
  legalBalls: number;
  overNumber: number;
  ballInOver: number;
  extrasWide: number;
  extrasNoBall: number;
  extrasBye: number;
  extrasLegBye: number;
}

export interface InningsState extends InningsTotals, CreaseState {}

export interface Partnership {
  batterAId: string;
  batterBId: string;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
}

export interface LiveInningsSnapshot extends InningsState {
  currentOverBalls: ScoreEvent[];
  currentOverSummary: string;
  partnership: Partnership | null;
  freeHitNext: boolean;
  isInningsComplete: boolean;
  completionReason?: 'all_out' | 'overs_complete' | 'target_reached';
}

export type MatchResultKind =
  | 'won_by_runs'
  | 'won_by_wickets'
  | 'tie'
  | 'super_over'
  | 'no_result'
  | 'in_progress';

export interface MatchResult {
  kind: MatchResultKind;
  winnerTeamId: string | null;
  summary: string;
}
