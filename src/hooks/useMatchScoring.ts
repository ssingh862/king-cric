import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { isApiConfigured } from '../lib/api';
import { dedupeScoreEvents } from '../lib/scoring';
import type { ScoreEvent } from '../types/database';

export function useTournamentMatches(tournamentId: string) {
  return useQuery({
    queryKey: ['tournament-matches', tournamentId],
    enabled: !!tournamentId && isApiConfigured(),
    refetchOnMount: true,
    queryFn: async () => api<unknown[]>(`/matches/tournament/${tournamentId}`),
  });
}

export function useMatchInnings(matchId: string) {
  return useQuery({
    queryKey: ['match-innings', matchId],
    enabled: !!matchId && isApiConfigured(),
    queryFn: async () => api<unknown[]>(`/matches/${matchId}/innings`),
    refetchInterval: 5000,
  });
}

export function useMatchScoreEvents(matchId: string) {
  return useQuery({
    queryKey: ['match-score-events', matchId],
    enabled: !!matchId && isApiConfigured(),
    queryFn: async () => {
      const data = await api<{
        innings: Array<{ id: string; innings_number: number; batting_team_id: string; bowling_team_id: string }>;
        eventsByInnings: Record<string, ScoreEvent[]>;
      }>(`/matches/${matchId}/score-events`);

      const eventsByInnings: Record<string, ScoreEvent[]> = {};
      for (const id of Object.keys(data.eventsByInnings ?? {})) {
        eventsByInnings[id] = dedupeScoreEvents(data.eventsByInnings[id] ?? []);
      }

      return { innings: data.innings ?? [], eventsByInnings };
    },
    refetchInterval: 5000,
  });
}

export function useTeamPlayers(teamId: string) {
  return useQuery({
    queryKey: ['team-players', teamId],
    enabled: !!teamId && isApiConfigured(),
    queryFn: async () => api<unknown[]>(`/matches/teams/${teamId}/players`),
  });
}
