import { useQuery } from '@tanstack/react-query';
import { api, isApiConfigured } from '../lib/api';
import type { Tournament } from '../types/database';

const queryDefaults = {
  enabled: isApiConfigured(),
  refetchOnMount: true as const,
};

export function useTournaments(status?: string) {
  return useQuery({
    ...queryDefaults,
    queryKey: ['tournaments', status ?? 'all'],
    queryFn: async () => {
      const path = status ? `/tournaments?status=${encodeURIComponent(status)}` : '/tournaments';
      return api<Tournament[]>(path);
    },
  });
}

export function useActiveTournaments() {
  return useQuery({
    ...queryDefaults,
    queryKey: ['tournaments', 'active'],
    queryFn: async () => {
      const all = await api<Tournament[]>('/tournaments');
      return all.filter((t) => t.status === 'registration' || t.status === 'ongoing');
    },
  });
}

export function useTournament(id: string) {
  return useQuery({
    ...queryDefaults,
    queryKey: ['tournament', id],
    enabled: !!id && isApiConfigured(),
    queryFn: async () => api<Tournament>(`/tournaments/${id}`),
  });
}

export function useLiveMatches() {
  return useQuery({
    ...queryDefaults,
    queryKey: ['matches', 'live'],
    queryFn: async () => api<unknown[]>('/matches/live'),
    refetchInterval: 15000,
  });
}

export function useUpcomingMatches(tournamentId?: string) {
  return useQuery({
    ...queryDefaults,
    queryKey: ['matches', 'upcoming', tournamentId ?? 'all'],
    queryFn: async () => {
      const path = tournamentId
        ? `/matches/upcoming?tournament_id=${encodeURIComponent(tournamentId)}`
        : '/matches/upcoming';
      return api<unknown[]>(path);
    },
    refetchInterval: 15000,
  });
}

export function useCompletedMatches(tournamentId?: string) {
  return useQuery({
    ...queryDefaults,
    queryKey: ['matches', 'completed', tournamentId ?? 'all'],
    enabled: tournamentId !== '' && isApiConfigured(),
    queryFn: async () => {
      const path = tournamentId
        ? `/matches/completed?tournament_id=${encodeURIComponent(tournamentId)}`
        : '/matches/completed';
      return api<unknown[]>(path);
    },
  });
}

export function useMatch(matchId: string) {
  return useQuery({
    ...queryDefaults,
    queryKey: ['match', matchId],
    enabled: !!matchId && isApiConfigured(),
    queryFn: async () => api<unknown>(`/matches/${matchId}`),
  });
}

export function usePointsTable(tournamentId: string) {
  return useQuery({
    ...queryDefaults,
    queryKey: ['points', tournamentId],
    enabled: !!tournamentId && isApiConfigured(),
    queryFn: async () => api<unknown[]>(`/players/tournament/${tournamentId}/points`),
  });
}

export function useTournamentTeams(tournamentId: string) {
  return useQuery({
    ...queryDefaults,
    queryKey: ['tournament-teams', tournamentId],
    enabled: !!tournamentId && isApiConfigured(),
    queryFn: async () => api<unknown[]>(`/players/tournament/${tournamentId}`),
  });
}

export function useMyTeams(profileId: string | undefined) {
  return useQuery({
    ...queryDefaults,
    queryKey: ['my-teams', profileId],
    enabled: Boolean(profileId) && isApiConfigured(),
    queryFn: async () => api<unknown[]>('/teams/my'),
  });
}

export function useTeam(teamId: string) {
  return useQuery({
    ...queryDefaults,
    queryKey: ['team', teamId],
    enabled: !!teamId && isApiConfigured(),
    queryFn: async () => api<unknown>(`/teams/${teamId}`),
  });
}
