import { api, apiSafe } from './api';

export async function createMatch(input: {
  tournamentId: string;
  teamAId: string;
  teamBId: string;
  venue?: string;
  scheduledAt?: string;
  oversPerInnings?: number;
}) {
  const { data, error } = await apiSafe<{ id: string }>('/matches', {
    method: 'POST',
    body: JSON.stringify({
      tournament_id: input.tournamentId,
      team_a_id: input.teamAId,
      team_b_id: input.teamBId,
      venue: input.venue ?? null,
      scheduled_at: input.scheduledAt ?? new Date().toISOString(),
      overs_per_innings: input.oversPerInnings ?? 20,
    }),
  });
  return { matchId: data?.id, error };
}

export async function startMatchLive(matchId: string) {
  const { error } = await apiSafe(`/matches/${matchId}`, {
    method: 'PATCH',
    body: JSON.stringify({ status: 'live' }),
  });
  return { error };
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
  const { data, error } = await apiSafe<Record<string, unknown>>(`/matches/${input.matchId}/innings`, {
    method: 'POST',
    body: JSON.stringify({
      batting_team_id: input.battingTeamId,
      bowling_team_id: input.bowlingTeamId,
      innings_number: input.inningsNumber,
      striker_player_id: input.strikerId,
      non_striker_player_id: input.nonStrikerId,
      current_bowler_id: input.bowlerId,
      target_runs: input.targetRuns ?? null,
    }),
  });
  return { innings: data, error };
}

export async function fetchMatchInnings(matchId: string) {
  const { data, error } = await apiSafe<Record<string, unknown>[]>(`/matches/${matchId}/innings`);
  return { innings: data ?? [], error };
}

export async function fetchTeamPlayers(teamId: string) {
  const { data, error } = await apiSafe<Record<string, unknown>[]>(`/matches/teams/${teamId}/players`);
  return { players: data ?? [], error };
}

export async function fetchActiveInnings(matchId: string) {
  const { data, error } = await apiSafe<Record<string, unknown> | null>(`/matches/${matchId}/active-innings`);
  return { innings: data, error };
}

export async function completeInnings(inningsId: string) {
  const { error } = await apiSafe(`/matches/innings/${inningsId}`, {
    method: 'PATCH',
    body: JSON.stringify({ status: 'completed' }),
  });
  return { error };
}

export async function completeMatch(matchId: string, winnerTeamId: string | null, summary: string) {
  const { error } = await apiSafe(`/matches/${matchId}`, {
    method: 'PATCH',
    body: JSON.stringify({
      status: 'completed',
      winner_team_id: winnerTeamId,
      result_summary: summary,
    }),
  });
  return { error };
}

export async function deleteMatch(matchId: string) {
  const { error } = await apiSafe(`/matches/${matchId}`, { method: 'DELETE' });
  return { error };
}
