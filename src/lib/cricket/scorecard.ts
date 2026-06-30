import type { Player, ScoreEvent } from '../../types/database';
import { dedupeScoreEvents } from './engine';
import { computeBattingStats, computeBowlingStats } from './stats';
import { formatOvers, runRate } from '../scoring';

export interface ExtrasBreakdown {
  total: number;
  byes: number;
  legByes: number;
  wides: number;
  noBalls: number;
  penalty: number;
}

export interface InningsScorecardData {
  battingTeamName: string;
  bowlingTeamName: string;
  runs: number;
  wickets: number;
  legalBalls: number;
  oversLabel: string;
  runRate: string;
  batters: Array<{
    playerId: string;
    name: string;
    runs: number;
    balls: number;
    fours: number;
    sixes: number;
    strikeRate: string;
    isOut: boolean;
    dismissal: string;
  }>;
  bowlers: Array<{
    playerId: string;
    name: string;
    overs: string;
    maidens: number;
    runs: number;
    wickets: number;
    wides: number;
    noBalls: number;
    economy: string;
  }>;
  extras: ExtrasBreakdown;
  yetToBat: string[];
}

function wicketLabel(type: string | null): string {
  const map: Record<string, string> = {
    bowled: 'b',
    caught: 'c',
    lbw: 'lbw b',
    run_out: 'run out',
    stumped: 'st',
    hit_wicket: 'hit wicket b',
    retired: 'retired',
    obstructing: 'obstructing',
    timed_out: 'timed out',
    other: 'out',
  };
  return map[type ?? ''] ?? 'out';
}

export function getDismissalText(
  playerId: string,
  events: ScoreEvent[],
  playerNames: Map<string, string>,
  isOut: boolean
): string {
  if (!isOut) return 'batting';

  const wicketEvent = dedupeScoreEvents(events).find(
    (e) => e.is_wicket && (e.dismissed_player_id === playerId || e.striker_player_id === playerId)
  );
  if (!wicketEvent) return 'out';

  const bowler = wicketEvent.bowler_player_id
    ? playerNames.get(wicketEvent.bowler_player_id) ?? 'Bowler'
    : 'Bowler';
  const wt = wicketEvent.wicket_type;

  if (wt === 'run_out' || wt === 'retired' || wt === 'obstructing' || wt === 'timed_out') {
    return wicketLabel(wt);
  }
  if (wt === 'caught') return `c & b ${bowler}`;
  if (wt === 'stumped') return `st ${bowler} b ${bowler}`;
  if (wt === 'lbw') return `lbw b ${bowler}`;
  if (wt === 'bowled' || wt === 'hit_wicket') return `b ${bowler}`;
  return `${wicketLabel(wt)} ${bowler}`;
}

export function computeExtras(events: ScoreEvent[]): ExtrasBreakdown {
  const ex: ExtrasBreakdown = {
    total: 0,
    byes: 0,
    legByes: 0,
    wides: 0,
    noBalls: 0,
    penalty: 0,
  };

  for (const e of dedupeScoreEvents(events)) {
    if (e.ball_type === 'wide') ex.wides += e.extras + e.runs_off_bat;
    else if (e.ball_type === 'no_ball') ex.noBalls += e.extras + e.runs_off_bat;
    else if (e.ball_type === 'bye') ex.byes += e.extras + e.runs_off_bat;
    else if (e.ball_type === 'leg_bye') ex.legByes += e.extras + e.runs_off_bat;
    else ex.total += e.extras;
  }

  ex.total = ex.byes + ex.legByes + ex.wides + ex.noBalls + ex.penalty;
  return ex;
}

export function getBattingOrder(events: ScoreEvent[]): string[] {
  const order: string[] = [];
  const seen = new Set<string>();

  for (const e of dedupeScoreEvents(events)) {
    const striker = e.striker_player_id;
    if (striker && !seen.has(striker)) {
      order.push(striker);
      seen.add(striker);
    }
    if (e.is_wicket) {
      const out = e.dismissed_player_id ?? striker;
      if (out && !seen.has(out)) {
        order.push(out);
        seen.add(out);
      }
    }
  }
  return order;
}

export function getYetToBatNames(squad: Player[], events: ScoreEvent[]): string[] {
  const appeared = new Set<string>();
  for (const e of dedupeScoreEvents(events)) {
    if (e.striker_player_id) appeared.add(e.striker_player_id);
    if (e.non_striker_player_id) appeared.add(e.non_striker_player_id);
    if (e.dismissed_player_id) appeared.add(e.dismissed_player_id);
  }
  return squad.filter((p) => !appeared.has(p.id)).map((p) => p.full_name);
}

export function buildInningsScorecard(
  events: ScoreEvent[],
  battingSquad: Player[],
  playerNames: Map<string, string>,
  battingTeamName: string,
  bowlingTeamName: string,
  inningsTotals?: { runs: number; wickets: number; legalBalls: number }
): InningsScorecardData {
  const unique = dedupeScoreEvents(events);
  const battingMap = new Map(computeBattingStats(unique).map((b) => [b.playerId, b]));
  const order = getBattingOrder(unique);

  const batters = order.map((playerId) => {
    const s = battingMap.get(playerId) ?? {
      playerId,
      runs: 0,
      balls: 0,
      fours: 0,
      sixes: 0,
      isOut: false,
      strikeRate: '0.00',
      scoreLine: '0 (0)',
      dots: 0,
      boundaryLine: '',
    };
    return {
      playerId,
      name: playerNames.get(playerId) ?? 'Player',
      runs: s.runs,
      balls: s.balls,
      fours: s.fours,
      sixes: s.sixes,
      strikeRate: s.strikeRate,
      isOut: s.isOut,
      dismissal: getDismissalText(playerId, unique, playerNames, s.isOut),
    };
  });

  const bowlers = computeBowlingStats(unique).map((b) => ({
    playerId: b.playerId,
    name: playerNames.get(b.playerId) ?? 'Player',
    overs: b.overs,
    maidens: b.maidens,
    runs: b.runs,
    wickets: b.wickets,
    wides: b.wides,
    noBalls: b.noBalls,
    economy: b.economy,
  }));

  let runs = 0;
  let wickets = 0;
  let legalBalls = 0;
  for (const e of unique) {
    runs += e.runs_off_bat + e.extras;
    if (e.is_wicket) wickets++;
    if (e.is_legal_delivery) legalBalls++;
  }

  if (inningsTotals) {
    runs = inningsTotals.runs;
    wickets = inningsTotals.wickets;
    legalBalls = inningsTotals.legalBalls;
  }

  return {
    battingTeamName,
    bowlingTeamName,
    runs,
    wickets,
    legalBalls,
    oversLabel: formatOvers(legalBalls),
    runRate: runRate(runs, legalBalls),
    batters,
    bowlers,
    extras: computeExtras(unique),
    yetToBat: getYetToBatNames(battingSquad, unique),
  };
}
