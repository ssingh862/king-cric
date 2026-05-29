import { supabase } from './supabase';

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

export async function updateTournament(input: UpdateTournamentInput) {
  const { error } = await supabase
    .from('tournaments')
    .update({
      name: input.name.trim(),
      city: input.city?.trim() || null,
      venue: input.venue?.trim() || null,
      format: input.format,
      overs_per_innings: input.oversPerInnings,
      ...(input.maxTeams != null ? { max_teams: input.maxTeams } : {}),
      ...(input.status ? { status: input.status } : {}),
    })
    .eq('id', input.id);

  return { error: error?.message ?? null };
}
