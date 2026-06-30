import { insertPlayers, type PlayerInput } from './players';
import { apiSafe } from './api';

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
  const { data, error } = await apiSafe<{ id: string }>('/teams/register', {
    method: 'POST',
    body: JSON.stringify({
      tournament_id: tournamentId,
      team_name: teamName.trim(),
      short_name: shortName,
      captain_id: captainId,
      players,
    }),
  });

  if (error?.includes('already exists')) {
    return { error: 'A team with this name already exists in this tournament.' };
  }
  if (error) return { error };

  return { teamId: data?.id, error: null };
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
  const { error } = await apiSafe(`/teams/${teamId}`, {
    method: 'PATCH',
    body: JSON.stringify({
      name: name.trim(),
      short_name: (shortName?.trim() || name.slice(0, 3)).toUpperCase().slice(0, 4),
      ...(primaryColor ? { primary_color: primaryColor } : {}),
    }),
  });
  return { error };
}
