import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { dedupeScoreEvents } from '../lib/scoring';
import type { ScoreEvent } from '../types/database';

export function useTournamentMatches(tournamentId: string) {
  return useQuery({
    queryKey: ['tournament-matches', tournamentId],
    enabled: !!tournamentId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('matches')
        .select(`
          *,
          team_a:teams!matches_team_a_id_fkey(id, name, short_name),
          team_b:teams!matches_team_b_id_fkey(id, name, short_name)
        `)
        .eq('tournament_id', tournamentId)
        .order('scheduled_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useMatchInnings(matchId: string) {
  return useQuery({
    queryKey: ['match-innings', matchId],
    enabled: !!matchId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('innings')
        .select(`
          *,
          batting_team:teams!batting_team_id(id, name, short_name, primary_color),
          bowling_team:teams!bowling_team_id(id, name, short_name)
        `)
        .eq('match_id', matchId)
        .order('innings_number');
      if (error) throw error;
      return data;
    },
    refetchInterval: 5000,
  });
}

export function useMatchScoreEvents(matchId: string) {
  return useQuery({
    queryKey: ['match-score-events', matchId],
    enabled: !!matchId,
    queryFn: async () => {
      const { data: innings, error: innErr } = await supabase
        .from('innings')
        .select('id, innings_number, batting_team_id, bowling_team_id')
        .eq('match_id', matchId)
        .order('innings_number');
      if (innErr) throw innErr;
      if (!innings?.length) return { innings: [], eventsByInnings: {} as Record<string, ScoreEvent[]> };

      const ids = innings.map((i) => i.id);
      const { data: events, error } = await supabase
        .from('score_events')
        .select('*')
        .in('innings_id', ids)
        .order('created_at', { ascending: true });
      if (error) throw error;

      const eventsByInnings: Record<string, ScoreEvent[]> = {};
      for (const id of ids) eventsByInnings[id] = [];
      for (const e of dedupeScoreEvents((events ?? []) as ScoreEvent[])) {
        eventsByInnings[e.innings_id].push(e);
      }
      return { innings, eventsByInnings };
    },
    refetchInterval: 5000,
  });
}

export function useTeamPlayers(teamId: string) {
  return useQuery({
    queryKey: ['team-players', teamId],
    enabled: !!teamId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('players')
        .select('*')
        .eq('team_id', teamId)
        .order('full_name');
      if (error) throw error;
      return data;
    },
  });
}
