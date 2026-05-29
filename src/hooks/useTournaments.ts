import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { Tournament } from '../types/database';

export function useTournaments(status?: string) {
  return useQuery({
    queryKey: ['tournaments', status],
    queryFn: async () => {
      let q = supabase.from('tournaments').select('*').order('created_at', { ascending: false });
      if (status) q = q.eq('status', status);
      const { data, error } = await q;
      if (error) throw error;
      return data as Tournament[];
    },
  });
}

export function useTournament(id: string) {
  return useQuery({
    queryKey: ['tournament', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tournaments')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data as Tournament;
    },
  });
}

const MATCH_LIST_SELECT = `
  *,
  team_a:teams!team_a_id(id, name, short_name, primary_color),
  team_b:teams!team_b_id(id, name, short_name, primary_color),
  tournament:tournaments(id, name, city)
`;

export function useLiveMatches() {
  return useQuery({
    queryKey: ['matches', 'live'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('matches')
        .select(MATCH_LIST_SELECT)
        .eq('status', 'live')
        .order('scheduled_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    refetchInterval: 15000,
  });
}

export function useCompletedMatches(tournamentId?: string) {
  return useQuery({
    queryKey: ['matches', 'completed', tournamentId ?? 'all'],
    enabled: tournamentId !== '',
    queryFn: async () => {
      let q = supabase
        .from('matches')
        .select(MATCH_LIST_SELECT)
        .eq('status', 'completed')
        .order('scheduled_at', { ascending: false });
      if (tournamentId) q = q.eq('tournament_id', tournamentId);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });
}

export function useMatch(matchId: string) {
  return useQuery({
    queryKey: ['match', matchId],
    enabled: !!matchId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('matches')
        .select(`
          *,
          team_a:teams!team_a_id(*),
          team_b:teams!team_b_id(*),
          tournament:tournaments(*)
        `)
        .eq('id', matchId)
        .single();
      if (error) throw error;
      return data;
    },
  });
}

export function usePointsTable(tournamentId: string) {
  return useQuery({
    queryKey: ['points', tournamentId],
    enabled: !!tournamentId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('points_table')
        .select('*, team:teams(*)')
        .eq('tournament_id', tournamentId)
        .order('points', { ascending: false })
        .order('net_run_rate', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useTournamentTeams(tournamentId: string) {
  return useQuery({
    queryKey: ['tournament-teams', tournamentId],
    enabled: !!tournamentId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('teams')
        .select('id, name, short_name, primary_color, is_approved')
        .eq('tournament_id', tournamentId)
        .order('name');
      if (error) throw error;
      return data;
    },
  });
}

export function useMyTeams(profileId: string | undefined) {
  return useQuery({
    queryKey: ['my-teams', profileId],
    enabled: Boolean(profileId) && Boolean(process.env.EXPO_PUBLIC_SUPABASE_URL),
    queryFn: async () => {
      if (!profileId) return [];

      const { data: captainTeams, error: e1 } = await supabase
        .from('teams')
        .select('*, tournament:tournaments(id, name, city)')
        .eq('captain_id', profileId);
      if (e1) throw e1;

      const { data: regs, error: e2 } = await supabase
        .from('tournament_registrations')
        .select('team_id')
        .eq('registered_by', profileId);
      if (e2) throw e2;

      const seen = new Set<string>();
      const out: NonNullable<typeof captainTeams> = [];

      for (const t of captainTeams ?? []) {
        if (t?.id && !seen.has(t.id)) {
          seen.add(t.id);
          out.push(t);
        }
      }

      const extraIds = (regs ?? [])
        .map((r) => r.team_id)
        .filter((id): id is string => Boolean(id) && !seen.has(id));

      if (extraIds.length) {
        const { data: more, error: e3 } = await supabase
          .from('teams')
          .select('*, tournament:tournaments(id, name, city)')
          .in('id', extraIds);
        if (e3) throw e3;
        for (const t of more ?? []) {
          if (t?.id && !seen.has(t.id)) {
            seen.add(t.id);
            out.push(t);
          }
        }
      }

      const { data: linkedPlayers, error: e3 } = await supabase
        .from('players')
        .select('team_id')
        .eq('profile_id', profileId);
      if (e3) throw e3;

      const linkedIds = (linkedPlayers ?? [])
        .map((p) => p.team_id)
        .filter((id): id is string => Boolean(id) && !seen.has(id));

      if (linkedIds.length) {
        const { data: linkedTeams, error: e4 } = await supabase
          .from('teams')
          .select('*, tournament:tournaments(id, name, city)')
          .in('id', linkedIds);
        if (e4) throw e4;
        for (const t of linkedTeams ?? []) {
          if (t?.id && !seen.has(t.id)) {
            seen.add(t.id);
            out.push(t);
          }
        }
      }

      return out.sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''));
    },
  });
}

export function useTeam(teamId: string) {
  return useQuery({
    queryKey: ['team', teamId],
    enabled: !!teamId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('teams')
        .select('*, players(*), tournament:tournaments(*)')
        .eq('id', teamId)
        .single();
      if (error) throw error;
      return data;
    },
  });
}
