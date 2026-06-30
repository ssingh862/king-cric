import type { Profile, Tournament } from '../types/database';

export function canManageTournament(
  tournament: Pick<Tournament, 'organizer_id'> | null | undefined,
  profile: Profile | null | undefined
): boolean {
  if (!tournament || !profile) return false;
  if (profile.role === 'admin') return true;
  return String(tournament.organizer_id) === String(profile.id);
}
