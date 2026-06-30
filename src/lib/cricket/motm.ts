import type { ScoreEvent } from '../../types/database';
import { dedupeScoreEvents } from './engine';
import { computeBattingStats, computeBowlingStats } from './stats';

export interface MotmCandidate {
  playerId: string;
  playerName: string;
  score: number;
  reason: string;
}

export interface PickMotmOptions {
  winnerTeamId?: string | null;
  /** playerId → teamId */
  playerTeamIds?: Map<string, string>;
}

/**
 * Cricket-style MVP points across the full match:
 * - Batting: runs, boundaries, milestones, strike rate, not-out
 * - Bowling: wickets, hauls, economy
 * - Small bonus if player is on the winning team
 */
export function pickManOfTheMatch(
  events: ScoreEvent[],
  playerNames: Map<string, string>,
  opts?: PickMotmOptions
): MotmCandidate | null {
  if (!events.length) return null;

  const unique = dedupeScoreEvents(events);
  const batters = computeBattingStats(unique);
  const bowlers = computeBowlingStats(unique);

  const scores = new Map<string, { score: number; parts: string[] }>();

  const add = (playerId: string, pts: number, part: string) => {
    if (pts <= 0) return;
    const cur = scores.get(playerId) ?? { score: 0, parts: [] };
    cur.score += pts;
    if (part && !cur.parts.includes(part)) cur.parts.push(part);
    scores.set(playerId, cur);
  };

  for (const b of batters) {
    add(b.playerId, b.runs, b.runs > 0 ? `${b.runs} runs` : '');
    if (b.fours) add(b.playerId, b.fours * 4, `${b.fours} fours`);
    if (b.sixes) add(b.playerId, b.sixes * 6, `${b.sixes} sixes`);
    if (b.runs >= 100) add(b.playerId, 40, 'century');
    else if (b.runs >= 50) add(b.playerId, 20, 'fifty');
    if (!b.isOut && b.balls >= 10) add(b.playerId, 10, 'not out');
    const sr = parseFloat(b.strikeRate);
    if (b.balls >= 6 && sr >= 150) add(b.playerId, 8, 'quick scoring');
  }

  for (const bw of bowlers) {
    if (bw.wickets > 0) {
      add(bw.playerId, bw.wickets * 25, `${bw.wickets} wickets`);
      if (bw.wickets >= 5) add(bw.playerId, 35, '5-wicket haul');
      else if (bw.wickets >= 3) add(bw.playerId, 15, '3-wicket haul');
    }
    const econ = parseFloat(bw.economy);
    if (bw.balls >= 12 && econ <= 6 && bw.wickets >= 1) {
      add(bw.playerId, 12, 'economical spell');
    }
    if (bw.maidens > 0) add(bw.playerId, bw.maidens * 8, `${bw.maidens} maiden${bw.maidens > 1 ? 's' : ''}`);
  }

  if (opts?.winnerTeamId && opts.playerTeamIds) {
    for (const [playerId, entry] of scores) {
      if (opts.playerTeamIds.get(playerId) === opts.winnerTeamId) {
        entry.score += 5;
      }
    }
  }

  let best: MotmCandidate | null = null;
  for (const [playerId, { score, parts }] of scores) {
    if (score <= 0) continue;
    if (!best || score > best.score) {
      best = {
        playerId,
        playerName: playerNames.get(playerId) ?? 'Player',
        score,
        reason: parts.filter(Boolean).slice(0, 4).join(', '),
      };
    }
  }

  return best;
}
