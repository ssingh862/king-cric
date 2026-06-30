import type { BallType, ScoreEvent } from '../../types/database';
import { creditsBowlerWicket, runsCountToBatsman } from './rules';
import { dedupeScoreEvents, formatOvers } from './engine';
import type { Partnership, WicketType } from './types';

export interface BatterStats {
  playerId: string;
  runs: number;
  balls: number;
  dots: number;
  fours: number;
  sixes: number;
  isOut: boolean;
  strikeRate: string;
  /** Display: 45 (32) */
  scoreLine: string;
  /** e.g. 4 fours, 2 sixes */
  boundaryLine: string;
}

export interface BowlerStats {
  playerId: string;
  balls: number;
  overs: string;
  runs: number;
  wickets: number;
  maidens: number;
  wides: number;
  noBalls: number;
  economy: string;
  /** e.g. 4-0-25-3 */
  figures: string;
}

function strikeRate(runs: number, balls: number): string {
  if (balls === 0) return '0.00';
  return ((runs / balls) * 100).toFixed(2);
}

function economy(runs: number, balls: number): string {
  if (balls === 0) return '0.00';
  return ((runs / balls) * 6).toFixed(2);
}

function emptyBatter(playerId: string): BatterStats {
  return {
    playerId,
    runs: 0,
    balls: 0,
    dots: 0,
    fours: 0,
    sixes: 0,
    isOut: false,
    strikeRate: '0.00',
    scoreLine: '0 (0)',
    boundaryLine: '',
  };
}

function emptyBowler(playerId: string): BowlerStats {
  return {
    playerId,
    balls: 0,
    overs: '0.0',
    runs: 0,
    wickets: 0,
    maidens: 0,
    wides: 0,
    noBalls: 0,
    economy: '0.00',
    figures: '0-0-0-0',
  };
}

function finalizeBatter(s: BatterStats): BatterStats {
  s.strikeRate = strikeRate(s.runs, s.balls);
  s.scoreLine = `${s.runs} (${s.balls})`;
  const parts: string[] = [];
  if (s.fours) parts.push(`${s.fours} four${s.fours > 1 ? 's' : ''}`);
  if (s.sixes) parts.push(`${s.sixes} six${s.sixes > 1 ? 'es' : ''}`);
  s.boundaryLine = parts.join(', ');
  return s;
}

function finalizeBowler(s: BowlerStats): BowlerStats {
  s.overs = formatOvers(s.balls);
  s.economy = economy(s.runs, s.balls);
  s.figures = `${s.overs}-${s.maidens}-${s.runs}-${s.wickets}`;
  return s;
}

function countBoundary(s: BatterStats, type: BallType, runs: number) {
  if (type === 'four' || runs === 4) s.fours++;
  if (type === 'six' || runs === 6) s.sixes++;
}

export function computeBattingStats(events: ScoreEvent[]): BatterStats[] {
  const map = new Map<string, BatterStats>();

  for (const e of dedupeScoreEvents(events)) {
    const strikerId = e.striker_player_id;
    if (!strikerId) continue;

    let s = map.get(strikerId);
    if (!s) {
      s = emptyBatter(strikerId);
      map.set(strikerId, s);
    }

    const batRuns = runsCountToBatsman(e.ball_type, e.runs_off_bat);
    s.runs += batRuns;

    if (e.is_legal_delivery) {
      s.balls++;
      if (batRuns === 0 && !e.is_wicket) {
        if (['dot', 'bye', 'leg_bye'].includes(e.ball_type)) s.dots++;
      }
      if (!['wide', 'no_ball', 'bye', 'leg_bye', 'wicket'].includes(e.ball_type)) {
        countBoundary(s, e.ball_type, e.runs_off_bat);
      } else if (e.ball_type === 'wicket' && batRuns === 0) {
        s.dots++;
      }
    }

    if (e.is_wicket) {
      const outId = e.dismissed_player_id ?? strikerId;
      let out = map.get(outId);
      if (!out) {
        out = emptyBatter(outId);
        map.set(outId, out);
      }
      out.isOut = true;
    }
  }

  return Array.from(map.values())
    .map(finalizeBatter)
    .sort((a, b) => b.runs - a.runs || b.balls - a.balls);
}

export function computeBowlingStats(events: ScoreEvent[]): BowlerStats[] {
  const map = new Map<string, BowlerStats>();
  const overRuns = new Map<string, number>();

  for (const e of dedupeScoreEvents(events)) {
    const bowlerId = e.bowler_player_id;
    if (!bowlerId) continue;

    let s = map.get(bowlerId);
    if (!s) {
      s = emptyBowler(bowlerId);
      map.set(bowlerId, s);
    }

    const conceded = e.runs_off_bat + e.extras;
    s.runs += conceded;

    if (e.ball_type === 'wide') s.wides++;
    if (e.ball_type === 'no_ball') s.noBalls++;

    if (e.is_legal_delivery) {
      s.balls++;
      const key = `${bowlerId}-${e.over_number}`;
      overRuns.set(key, (overRuns.get(key) ?? 0) + conceded);
      if (e.ball_in_over === 6) {
        const overTotal = overRuns.get(key) ?? 0;
        if (overTotal === 0) s.maidens++;
      }
    }

    if (e.is_wicket) {
      const wt = e.wicket_type as WicketType | null;
      if (creditsBowlerWicket(wt)) s.wickets++;
    }
  }

  return Array.from(map.values())
    .map(finalizeBowler)
    .sort((a, b) => b.wickets - a.wickets || a.runs - b.runs);
}

function creaseSortKey(
  playerId: string,
  strikerId?: string | null,
  nonStrikerId?: string | null
): number {
  if (playerId === strikerId) return 0;
  if (playerId === nonStrikerId) return 1;
  return 2;
}

/** Includes on-crease batters with 0 (0) before they face a ball. */
export function battingStatsForDisplay(
  events: ScoreEvent[],
  crease?: { strikerId?: string | null; nonStrikerId?: string | null }
): BatterStats[] {
  const map = new Map(computeBattingStats(events).map((s) => [s.playerId, s]));
  if (crease) {
    for (const id of [crease.strikerId, crease.nonStrikerId].filter(Boolean) as string[]) {
      if (!map.has(id)) map.set(id, finalizeBatter(emptyBatter(id)));
    }
  }
  return Array.from(map.values()).sort((a, b) => {
    const oa = creaseSortKey(a.playerId, crease?.strikerId, crease?.nonStrikerId);
    const ob = creaseSortKey(b.playerId, crease?.strikerId, crease?.nonStrikerId);
    if (oa !== ob) return oa - ob;
    return b.runs - a.runs || b.balls - a.balls;
  });
}

/** Includes current bowler with 0.0 figures before they bowl. */
export function bowlingStatsForDisplay(
  events: ScoreEvent[],
  bowlerId?: string | null
): BowlerStats[] {
  const list = computeBowlingStats(events);
  if (bowlerId && !list.some((b) => b.playerId === bowlerId)) {
    return [finalizeBowler(emptyBowler(bowlerId)), ...list];
  }
  return list;
}

/** Active partnership for current two batters on crease. */
export function computePartnershipFromReplay(
  events: ScoreEvent[],
  strikerId: string | null,
  nonStrikerId: string | null
): Partnership | null {
  if (!strikerId || !nonStrikerId) return null;

  const ordered = dedupeScoreEvents(events);
  let partnershipStart = 0;

  for (let i = ordered.length - 1; i >= 0; i--) {
    const e = ordered[i];
    if (e.is_wicket) {
      partnershipStart = i + 1;
      break;
    }
  }

  const ids = [strikerId, nonStrikerId].sort();
  const p: Partnership = {
    batterAId: ids[0]!,
    batterBId: ids[1]!,
    runs: 0,
    balls: 0,
    fours: 0,
    sixes: 0,
  };

  const pair = new Set(ids);

  for (let i = partnershipStart; i < ordered.length; i++) {
    const e = ordered[i];
    const crease = new Set(
      [e.striker_player_id, e.non_striker_player_id].filter(Boolean) as string[]
    );
    if (![...pair].every((id) => crease.has(id))) continue;

    p.runs += e.runs_off_bat + e.extras;
    if (e.is_legal_delivery) p.balls++;
    if (pair.has(e.striker_player_id ?? '')) {
      if (e.ball_type === 'four' || e.runs_off_bat === 4) p.fours++;
      if (e.ball_type === 'six' || e.runs_off_bat === 6) p.sixes++;
    }
  }

  return p;
}
