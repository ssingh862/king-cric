import { insertPlayers, type PlayerInput } from './players';
import { supabase } from './supabase';

export interface RegisterTeamInput {
  tournamentId: string;
  teamName: string;
  shortName?: string;
  captainId: string;
  players?: PlayerInput[];
}

export async function registerTeam({
  tournamentId,
  teamName,
  shortName,
  captainId,
  players = [],
}: RegisterTeamInput) {
  const name = teamName.trim();
  const short = (shortName?.trim() || name.slice(0, 3)).toUpperCase().slice(0, 4);

  const captainPlayer = players.find((p) => p.isCaptain);

  const { data: team, error: teamError } = await supabase
    .from('teams')
    .insert({
      tournament_id: tournamentId,
      captain_id: captainId,
      name,
      short_name: short,
      is_approved: true,
    })
    .select('id')
    .single();

  if (teamError) {
    if (teamError.code === '23505') {
      return { error: 'A team with this name already exists in this tournament.' };
    }
    return { error: teamError.message };
  }

  const { error: regError } = await supabase.from('tournament_registrations').insert({
    tournament_id: tournamentId,
    team_id: team.id,
    registered_by: captainId,
    status: 'approved',
  });

  if (regError) {
    await supabase.from('teams').delete().eq('id', team.id);
    return { error: regError.message };
  }

  const { error: playersError } = await insertPlayers(team.id, players);
  if (playersError) {
    return { error: playersError };
  }

  await supabase
    .from('players')
    .update({ profile_id: captainId })
    .eq('team_id', team.id)
    .eq('is_captain', true);

  if (captainPlayer) {
    const { data: cap } = await supabase
      .from('players')
      .select('id')
      .eq('team_id', team.id)
      .eq('is_captain', true)
      .maybeSingle();
    if (cap?.id) {
      await supabase.from('teams').update({ captain_id: captainId }).eq('id', team.id);
    }
  }

  return { teamId: team.id, error: null };
}

export interface UpdateTeamInput {
  teamId: string;
  name: string;
  shortName?: string;
  primaryColor?: string;
}

export async function updateTeam({
  teamId,
  name,
  shortName,
  primaryColor,
}: UpdateTeamInput) {
  const { error } = await supabase
    .from('teams')
    .update({
      name: name.trim(),
      short_name: (shortName?.trim() || name.slice(0, 3)).toUpperCase().slice(0, 4),
      ...(primaryColor ? { primary_color: primaryColor } : {}),
    })
    .eq('id', teamId);

  return { error: error?.message ?? null };
}
