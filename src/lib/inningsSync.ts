import type { Innings, ScoreEvent } from '../types/database';
import { replayInnings } from './cricket';
import type { MatchRules } from './cricket/types';
import { supabase, isSupabaseConfigured } from './supabase';

export interface CreaseOverride {
  strikerId: string | null;
  nonStrikerId: string | null;
  bowlerId: string | null;
}

export async function syncInningsToDb(
  innings: Innings,
  events: ScoreEvent[],
  rules: MatchRules,
  creaseOverride?: CreaseOverride
): Promise<{
  error: string | null;
  snap: ReturnType<typeof replayInnings>;
}> {
  const snap = replayInnings(innings, events, rules);

  const strikerId = creaseOverride?.strikerId ?? snap.strikerId;
  const nonStrikerId = creaseOverride?.nonStrikerId ?? snap.nonStrikerId;
  const bowlerId = creaseOverride?.bowlerId ?? snap.bowlerId;

  if (!isSupabaseConfigured()) {
    return { error: null, snap };
  }

  const { error } = await supabase
    .from('innings')
    .update({
      total_runs: snap.totalRuns,
      total_wickets: snap.totalWickets,
      total_overs:
        Math.floor(snap.legalBalls / rules.ballsPerOver) +
        (snap.legalBalls % rules.ballsPerOver) * 0.1,
      status: snap.isInningsComplete ? 'completed' : 'in_progress',
      striker_player_id: strikerId,
      non_striker_player_id: nonStrikerId,
      current_bowler_id: bowlerId,
    })
    .eq('id', innings.id);

  return { error: error?.message ?? null, snap };
}

export function getCurrentOverNumber(events: ScoreEvent[]): number {
  if (!events.length) return 0;
  return events[events.length - 1].over_number;
}

export function getBallsInCurrentOver(events: ScoreEvent[]): ScoreEvent[] {
  if (!events.length) return [];
  const over = getCurrentOverNumber(events);
  return events.filter((e) => e.over_number === over);
}
