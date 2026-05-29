import type { BallType, Innings, ScoreEvent } from '../../types/database';
import {
  creditsBowlerWicket,
  isInningsComplete,
  isLegalDelivery,
  normalizeWicketType,
  resolveExtras,
  resolveRunsOffBat,
  shouldRotateStrike,
} from './rules';
import type {
  BallInput,
  CreaseState,
  InningsState,
  InningsTotals,
  LiveInningsSnapshot,
  MatchRules,
  Partnership,
} from './types';
import { formatOverSummary } from './overSummary';
import { computePartnershipFromReplay } from './stats';

export function dedupeScoreEvents(events: ScoreEvent[]): ScoreEvent[] {
  const seen = new Set<string>();
  const out: ScoreEvent[] = [];
  for (const e of events) {
    if (seen.has(e.id)) continue;
    seen.add(e.id);
    out.push(e);
  }
  return out;
}

export function mergeScoreEvents(...groups: ScoreEvent[][]): ScoreEvent[] {
  return dedupeScoreEvents(groups.flat());
}

export function formatOvers(legalBalls: number, ballsPerOver = 6): string {
  const overs = Math.floor(legalBalls / ballsPerOver);
  const balls = legalBalls % ballsPerOver;
  return `${overs}.${balls}`;
}

export function rotateStrike(
  strikerId: string | null,
  nonStrikerId: string | null
): CreaseState {
  return { strikerId: nonStrikerId, nonStrikerId: strikerId, bowlerId: null };
}

export function computeNextBall(
  state: Pick<InningsState, 'ballInOver' | 'overNumber'>,
  rules: MatchRules
): { overNumber: number; ballNumber: number; ballInOver: number } {
  const perOver = rules.ballsPerOver;
  const currentOver = state.overNumber || 1;
  const currentBall = state.ballInOver || 0;

  if (currentBall >= perOver) {
    return { overNumber: currentOver + 1, ballNumber: 1, ballInOver: 1 };
  }
  const nextBall = currentBall + 1;
  return { overNumber: currentOver, ballNumber: nextBall, ballInOver: nextBall };
}

export function applyPostBallCrease(
  strikerId: string | null,
  nonStrikerId: string | null,
  input: {
    ballType: BallType;
    runsOffBat: number;
    extras: number;
    isWicket: boolean;
    dismissedPlayerId?: string | null;
  },
  ballInOverAfter: number,
  isLegal: boolean,
  ballsPerOver: number
): { strikerId: string | null; nonStrikerId: string | null; endOfOver: boolean } {
  let striker = strikerId;
  let nonStriker = nonStrikerId;
  const endOfOver = isLegal && ballInOverAfter === ballsPerOver;

  if (shouldRotateStrike(input.ballType, input.runsOffBat, input.extras)) {
    const r = rotateStrike(striker, nonStriker);
    striker = r.strikerId;
    nonStriker = r.nonStrikerId;
  }

  if (endOfOver) {
    const r = rotateStrike(striker, nonStriker);
    striker = r.strikerId;
    nonStriker = r.nonStrikerId;
  }

  if (input.isWicket) {
    const outId = input.dismissedPlayerId ?? strikerId;
    if (outId === striker) striker = null;
    else if (outId === nonStriker) nonStriker = null;
  }

  return { strikerId: striker, nonStrikerId: nonStriker, endOfOver };
}

function emptyTotals(): InningsTotals {
  return {
    totalRuns: 0,
    totalWickets: 0,
    legalBalls: 0,
    overNumber: 0,
    ballInOver: 0,
    extrasWide: 0,
    extrasNoBall: 0,
    extrasBye: 0,
    extrasLegBye: 0,
  };
}

function applyEventToTotals(t: InningsTotals, e: ScoreEvent): InningsTotals {
  const next = { ...t };
  next.totalRuns += e.runs_off_bat + e.extras;
  if (e.is_wicket) next.totalWickets++;
  if (e.is_legal_delivery) {
    next.legalBalls++;
    next.ballInOver = e.ball_in_over;
    next.overNumber = e.over_number;
  }
  if (e.ball_type === 'wide') next.extrasWide += e.extras;
  else if (e.ball_type === 'no_ball') next.extrasNoBall += e.extras;
  else if (e.ball_type === 'bye') next.extrasBye += e.extras + e.runs_off_bat;
  else if (e.ball_type === 'leg_bye') next.extrasLegBye += e.extras + e.runs_off_bat;
  return next;
}

/** Replay all events — single source of truth for crease, totals, partnership. */
export function replayInnings(
  innings: Innings | null,
  events: ScoreEvent[],
  rules: MatchRules
): LiveInningsSnapshot {
  const ordered = dedupeScoreEvents(events);
  const ballsPerOver = rules.ballsPerOver;

  let striker: string | null = null;
  let nonStriker: string | null = null;
  let bowler = innings?.current_bowler_id ?? null;
  let totals = emptyTotals();
  let freeHitNext = false;

  if (ordered.length === 0) {
    striker = innings?.striker_player_id ?? null;
    nonStriker = innings?.non_striker_player_id ?? null;
  }

  for (const e of ordered) {
    // Each event stores who was on strike when the ball was bowled.
    striker = e.striker_player_id ?? striker;
    nonStriker = e.non_striker_player_id ?? nonStriker;

    const runsOffBat = e.runs_off_bat;
    const extras = e.extras;
    const endOfOver = e.is_legal_delivery && e.ball_in_over === ballsPerOver;

    if (e.ball_type === 'no_ball' && rules.freeHitOnNoBall) {
      freeHitNext = true;
    }
    if (e.is_legal_delivery) {
      freeHitNext = false;
    }

    if (shouldRotateStrike(e.ball_type, runsOffBat, extras)) {
      const r = rotateStrike(striker, nonStriker);
      striker = r.strikerId;
      nonStriker = r.nonStrikerId;
    }

    if (endOfOver) {
      const r = rotateStrike(striker, nonStriker);
      striker = r.strikerId;
      nonStriker = r.nonStrikerId;
    }

    if (e.is_wicket) {
      const outId = e.dismissed_player_id ?? e.striker_player_id;
      if (outId === striker) striker = null;
      else if (outId === nonStriker) nonStriker = null;
    }

    bowler = e.bowler_player_id ?? bowler;
    totals = applyEventToTotals(totals, e);
  }

  const lastEvent = ordered[ordered.length - 1];
  if (!striker && lastEvent?.is_wicket && innings?.striker_player_id) {
    striker = innings.striker_player_id;
    nonStriker = innings.non_striker_player_id ?? nonStriker;
  }

  const currentOverBalls = ordered.filter((e) => e.over_number === totals.overNumber);
  const completion = isInningsComplete(totals, rules, innings?.target_runs);

  const state: InningsState = {
    ...totals,
    strikerId: striker,
    nonStrikerId: nonStriker,
    bowlerId: bowler,
  };

  return {
    ...state,
    currentOverBalls,
    currentOverSummary: formatOverSummary(currentOverBalls),
    partnership: computePartnershipFromReplay(ordered, striker, nonStriker),
    freeHitNext,
    isInningsComplete: completion.complete,
    completionReason: completion.reason,
  };
}

export function aggregateInningsFromEvents(
  events: ScoreEvent[],
  ballsPerOver = 6
): InningsTotals & Pick<CreaseState, 'strikerId' | 'nonStrikerId'> {
  let totals = emptyTotals();
  for (const e of dedupeScoreEvents(events)) {
    totals = applyEventToTotals(totals, e);
  }
  const last = dedupeScoreEvents(events)[events.length - 1];
  return {
    ...totals,
    strikerId: last?.striker_player_id ?? null,
    nonStrikerId: last?.non_striker_player_id ?? null,
  };
}

export function buildBallPayload(
  state: InningsState,
  input: BallInput,
  playerIds: CreaseState,
  rules: MatchRules
) {
  const runsOffBat = resolveRunsOffBat(input);
  const extras = resolveExtras(input, rules);
  const legal = isLegalDelivery(input.ballType);
  const wicketType = normalizeWicketType(input.wicketType);
  const isWicket = input.isWicket ?? input.ballType === 'wicket';

  const next = legal
    ? computeNextBall(state, rules)
    : {
        overNumber: state.overNumber || 1,
        ballNumber: state.ballInOver || 1,
        ballInOver: state.ballInOver || 1,
      };

  const ballInOver = legal ? next.ballInOver : state.ballInOver || 1;

  return {
    over_number: legal ? next.overNumber : state.overNumber || 1,
    ball_number: ballInOver,
    ball_in_over: ballInOver,
    ball_type: input.ballType,
    runs_off_bat: runsOffBat,
    extras,
    is_wicket: isWicket,
    wicket_type: isWicket ? wicketType : null,
    dismissed_player_id: isWicket ? input.dismissedPlayerId ?? null : null,
    bowler_player_id: playerIds.bowlerId,
    striker_player_id: playerIds.strikerId,
    non_striker_player_id: playerIds.nonStrikerId,
    is_legal_delivery: legal,
    commentary: formatCommentary(input.ballType, runsOffBat, extras, isWicket, wicketType),
  };
}

function formatCommentary(
  type: BallType,
  runs: number,
  extras: number,
  isWicket?: boolean,
  wicketType?: string | null
): string {
  if (isWicket || type === 'wicket') {
    return wicketType ? `WICKET! ${wicketType.replace('_', ' ')}` : 'WICKET!';
  }
  if (type === 'six') return 'SIX! Maximum!';
  if (type === 'four') return 'FOUR! Boundary!';
  if (type === 'wide') return `Wide (+${extras})`;
  if (type === 'no_ball') return `No ball (+${extras})`;
  if (type === 'bye') return runs > 0 ? `${runs} bye${runs > 1 ? 's' : ''}` : 'Bye';
  if (type === 'leg_bye') return runs > 0 ? `${runs} leg bye${runs > 1 ? 's' : ''}` : 'Leg bye';
  if (runs === 0) return 'Dot ball';
  return `${runs} run${runs > 1 ? 's' : ''}`;
}

export function runRate(runs: number, legalBalls: number): string {
  if (legalBalls === 0) return '0.00';
  return ((runs / legalBalls) * 6).toFixed(2);
}

export function requiredRunRate(
  target: number,
  current: number,
  ballsRemaining: number
): string {
  if (ballsRemaining <= 0) return '—';
  const needed = target - current;
  if (needed <= 0) return '0.00';
  return ((needed / ballsRemaining) * 6).toFixed(2);
}

export { creditsBowlerWicket };
