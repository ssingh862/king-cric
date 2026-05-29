import type { Innings, Player, ScoreEvent } from '../types/database';
import { dedupeScoreEvents, replayInnings } from './cricket';
import { rulesForFormat, inferFormatFromOvers } from './cricket/formats';
import type { MatchRules } from './cricket/types';

export function getDismissedPlayerIds(events: ScoreEvent[]): Set<string> {
  const out = new Set<string>();
  for (const e of events) {
    if (!e.is_wicket) continue;
    const id = e.dismissed_player_id ?? e.striker_player_id;
    if (id) out.add(id);
  }
  return out;
}

export function getRemainingBatters(
  squad: Player[],
  events: ScoreEvent[],
  onCrease: { strikerId: string | null; nonStrikerId: string | null }
): Player[] {
  const dismissed = getDismissedPlayerIds(events);
  const onCreaseIds = new Set(
    [onCrease.strikerId, onCrease.nonStrikerId].filter(Boolean) as string[]
  );
  return squad.filter((p) => !dismissed.has(p.id) && !onCreaseIds.has(p.id));
}

export function matchRulesForInnings(
  innings: Innings | null,
  matchOvers?: number
): MatchRules {
  const overs = matchOvers ?? 20;
  const kind = inferFormatFromOvers(overs);
  return rulesForFormat(kind, overs);
}

export function computeOnCreaseFromEvents(
  innings: Innings | null,
  events: ScoreEvent[],
  rules?: MatchRules
): {
  strikerId: string | null;
  nonStrikerId: string | null;
  bowlerId: string | null;
} {
  if (!innings) {
    return { strikerId: null, nonStrikerId: null, bowlerId: null };
  }

  const r = rules ?? matchRulesForInnings(innings);
  const snap = replayInnings(innings, events, r);
  return {
    strikerId: snap.strikerId,
    nonStrikerId: snap.nonStrikerId,
    bowlerId: snap.bowlerId,
  };
}

/** Which crease position needs a new batter after a wicket. */
export function vacantCreaseSlot(crease: {
  strikerId: string | null;
  nonStrikerId: string | null;
}): 'striker' | 'non_striker' | null {
  if (!crease.strikerId && crease.nonStrikerId) return 'striker';
  if (crease.strikerId && !crease.nonStrikerId) return 'non_striker';
  if (!crease.strikerId && !crease.nonStrikerId) return 'striker';
  return null;
}

export function applyNewBatsmanToCrease(
  newBatsmanId: string,
  crease: {
    strikerId: string | null;
    nonStrikerId: string | null;
    bowlerId: string | null;
  }
): { strikerId: string; nonStrikerId: string; bowlerId: string } | null {
  const { bowlerId } = crease;
  if (!bowlerId) return null;

  const slot = vacantCreaseSlot(crease);
  if (slot === 'striker' && crease.nonStrikerId) {
    return { strikerId: newBatsmanId, nonStrikerId: crease.nonStrikerId, bowlerId };
  }
  if (slot === 'non_striker' && crease.strikerId) {
    return { strikerId: crease.strikerId, nonStrikerId: newBatsmanId, bowlerId };
  }
  return null;
}

/** @deprecated use computeOnCreaseFromEvents */
export function resolveOnCreasePlayers(innings: Innings | null, events: ScoreEvent[]) {
  return computeOnCreaseFromEvents(innings, events);
}
