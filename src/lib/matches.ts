import { supabase } from './supabase';

export async function createMatch(input: {
  tournamentId: string;
  teamAId: string;
  teamBId: string;
  venue?: string;
  scheduledAt?: string;
  oversPerInnings?: number;
}) {
  const { data, error } = await supabase
    .from('matches')
    .insert({
      tournament_id: input.tournamentId,
      team_a_id: input.teamAId,
      team_b_id: input.teamBId,
      venue: input.venue ?? null,
      scheduled_at: input.scheduledAt ?? new Date().toISOString(),
      status: 'scheduled',
      overs_per_innings: input.oversPerInnings ?? 20,
    })
    .select('id')
    .single();

  return { matchId: data?.id, error: error?.message ?? null };
}

export async function startMatchLive(matchId: string) {
  const { error } = await supabase
    .from('matches')
    .update({ status: 'live' })
    .eq('id', matchId);
  return { error: error?.message ?? null };
}

export async function startInnings(input: {
  matchId: string;
  battingTeamId: string;
  bowlingTeamId: string;
  inningsNumber: 1 | 2;
  strikerId: string;
  nonStrikerId: string;
  bowlerId: string;
  targetRuns?: number;
}) {
  const { data, error } = await supabase
    .from('innings')
    .insert({
      match_id: input.matchId,
      batting_team_id: input.battingTeamId,
      bowling_team_id: input.bowlingTeamId,
      innings_number: input.inningsNumber,
      status: 'in_progress',
      striker_player_id: input.strikerId,
      non_striker_player_id: input.nonStrikerId,
      current_bowler_id: input.bowlerId,
      target_runs: input.targetRuns ?? null,
    })
    .select('*')
    .single();

  if (!error) {
    await supabase
      .from('matches')
      .update({ status: 'live', current_innings_number: input.inningsNumber })
      .eq('id', input.matchId);
  }

  return { innings: data, error: error?.message ?? null };
}

export async function fetchMatchInnings(matchId: string) {
  const { data, error } = await supabase
    .from('innings')
    .select('*, batting_team:teams!innings_batting_team_id_fkey(id, name, short_name), bowling_team:teams!innings_bowling_team_id_fkey(id, name, short_name)')
    .eq('match_id', matchId)
    .order('innings_number');

  return { innings: data ?? [], error: error?.message ?? null };
}

export async function fetchTeamPlayers(teamId: string) {
  const { data, error } = await supabase
    .from('players')
    .select('id, full_name, jersey_number, role, is_captain, is_wicket_keeper')
    .eq('team_id', teamId)
    .order('jersey_number');

  return { players: data ?? [], error: error?.message ?? null };
}

export async function completeInnings(inningsId: string) {
  const { error } = await supabase
    .from('innings')
    .update({ status: 'completed' })
    .eq('id', inningsId);
  return { error: error?.message ?? null };
}

export async function completeMatch(matchId: string, winnerTeamId: string | null, summary: string) {
  const { error } = await supabase
    .from('matches')
    .update({
      status: 'completed',
      winner_team_id: winnerTeamId,
      result_summary: summary,
    })
    .eq('id', matchId);
  return { error: error?.message ?? null };
}

/** Deletes a match and cascades innings, score events, and player match stats. */
export async function deleteMatch(matchId: string) {
  const { error } = await supabase.from('matches').delete().eq('id', matchId);
  return { error: error?.message ?? null };
}
