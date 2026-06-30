import { api, apiSafe } from './api';

export interface UpdateTournamentInput {
  id: string;
  name: string;
  city?: string;
  venue?: string;
  format: string;
  oversPerInnings: number;
  maxTeams?: number;
  status?: string;
}

export interface CreateTournamentInput {
  name: string;
  city?: string;
  venue?: string;
  format: string;
  oversPerInnings: number;
  slug?: string;
  status?: string;
}

export async function createTournament(input: CreateTournamentInput) {
  const { data, error } = await apiSafe<{ id: string }>('/tournaments', {
    method: 'POST',
    body: JSON.stringify({
      name: input.name.trim(),
      city: input.city?.trim() || null,
      venue: input.venue?.trim() || null,
      format: input.format,
      overs_per_innings: input.oversPerInnings,
      slug: input.slug,
      status: input.status ?? 'registration',
    }),
  });
  return { tournamentId: data?.id, error };
}

export async function updateTournament(input: UpdateTournamentInput) {
  const { error } = await apiSafe(`/tournaments/${input.id}`, {
    method: 'PATCH',
    body: JSON.stringify({
      name: input.name.trim(),
      city: input.city?.trim() || null,
      venue: input.venue?.trim() || null,
      format: input.format,
      overs_per_innings: input.oversPerInnings,
      ...(input.maxTeams != null ? { max_teams: input.maxTeams } : {}),
      ...(input.status ? { status: input.status } : {}),
    }),
  });
  return { error };
}
