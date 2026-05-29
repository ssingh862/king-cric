import { supabase } from './supabase';
import type { SquadPlayerDraft } from '../components/forms/PlayerSquadEditor';

export interface PlayerInput {
  fullName: string;
  jerseyNumber?: string;
  role?: string;
  isCaptain?: boolean;
  isWicketKeeper?: boolean;
}

export async function insertPlayers(teamId: string, players: PlayerInput[]) {
  const rows = players
    .filter((p) => p.fullName.trim())
    .map((p) => ({
      team_id: teamId,
      full_name: p.fullName.trim(),
      jersey_number: p.jerseyNumber ? parseInt(p.jerseyNumber, 10) : null,
      role: p.role ?? 'all_rounder',
      is_captain: p.isCaptain ?? false,
      is_wicket_keeper: p.isWicketKeeper ?? false,
    }));

  if (!rows.length) return { error: null };

  const { error } = await supabase.from('players').insert(rows);
  return { error: error?.message ?? null };
}

export function draftsToPlayerInput(drafts: SquadPlayerDraft[]): PlayerInput[] {
  return drafts
    .filter((d) => d.fullName.trim())
    .map((d) => ({
      fullName: d.fullName,
      jerseyNumber: d.jerseyNumber,
      role: d.role,
      isCaptain: d.isCaptain,
      isWicketKeeper: d.isWicketKeeper,
    }));
}

export async function upsertPlayersFromDrafts(
  teamId: string,
  drafts: SquadPlayerDraft[],
  existingIds: Map<string, string>
) {
  for (const d of drafts) {
    if (!d.fullName.trim()) continue;

    const payload = {
      team_id: teamId,
      full_name: d.fullName.trim(),
      jersey_number: d.jerseyNumber ? parseInt(d.jerseyNumber, 10) : null,
      role: d.role,
      is_captain: d.isCaptain,
      is_wicket_keeper: d.isWicketKeeper,
    };

    const existingId = existingIds.get(d.key);
    if (existingId) {
      const { error } = await supabase.from('players').update(payload).eq('id', existingId);
      if (error) return { error: error.message };
    } else {
      const { error } = await supabase.from('players').insert(payload);
      if (error) return { error: error.message };
    }
  }
  return { error: null };
}

export async function deletePlayer(playerId: string) {
  const { error } = await supabase.from('players').delete().eq('id', playerId);
  return { error: error?.message ?? null };
}
