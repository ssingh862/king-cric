import type { ScoreEvent } from '../../types/database';
import { dedupeScoreEvents } from './engine';
import { computeBattingStats, computeBowlingStats } from './stats';

export interface MotmCandidate {
  playerId: string;
  playerName: string;
  score: number;
  reason: string;
}

/** Simple MVP points: runs + 25 per wicket + small bonuses. */
export function pickManOfTheMatch(
  events: ScoreEvent[],
  playerNames: Map<string, string>
): MotmCandidate | null {
  if (!events.length) return null;

  const unique = dedupeScoreEvents(events);
  const batters = computeBattingStats(unique);
  const bowlers = computeBowlingStats(unique);

  const scores = new Map<string, { score: number; parts: string[] }>();

  const add = (playerId: string, pts: number, part: string) => {
    const cur = scores.get(playerId) ?? { score: 0, parts: [] };
    cur.score += pts;
    if (part) cur.parts.push(part);
    scores.set(playerId, cur);
  };

  for (const b of batters) {
    add(b.playerId, b.runs, `${b.runs} runs`);
    if (!b.isOut && b.balls > 0) add(b.playerId, 8, 'not out');
    if (b.fours) add(b.playerId, b.fours * 2, `${b.fours}×4`);
    if (b.sixes) add(b.playerId, b.sixes * 4, `${b.sixes}×6`);
  }

  for (const bw of bowlers) {
    if (bw.wickets > 0) {
      add(bw.playerId, bw.wickets * 25, `${bw.wickets} wkts`);
    }
    if (bw.balls >= 6 && bw.runs <= 12 && bw.wickets >= 1) {
      add(bw.playerId, 10, 'tight spell');
    }
  }

  let best: MotmCandidate | null = null;
  for (const [playerId, { score, parts }] of scores) {
    if (!best || score > best.score) {
      best = {
        playerId,
        playerName: playerNames.get(playerId) ?? 'Player',
        score,
        reason: parts.slice(0, 3).join(', '),
      };
    }
  }

  return best;
}
