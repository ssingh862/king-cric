import { apiSafe } from './api';

export async function updatePointsAfterMatch(matchId: string) {
  const { error } = await apiSafe(`/matches/${matchId}/finalize`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
  if (error) return { error };
  return { error: null };
}

export async function recalculateTournamentPoints(
  tournamentId: string
): Promise<{ error: string | null }> {
  // Points are recalculated server-side when a match is finalized.
  return { error: null };
}
