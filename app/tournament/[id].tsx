import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useMemo } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PointsTable } from '../../src/components/cricket/PointsTable';
import { GlassCard } from '../../src/components/ui/GlassCard';
import { GradientButton } from '../../src/components/ui/GradientButton';
import { usePointsTable, useTournament, useTournamentTeams } from '../../src/hooks/useTournaments';
import { useTournamentMatches } from '../../src/hooks/useMatchScoring';
import { MOCK_TOURNAMENTS } from '../../src/lib/mockData';
import { deleteMatch } from '../../src/lib/matches';
import { recalculateTournamentPoints } from '../../src/lib/pointsTable';
import { canManageTournament } from '../../src/lib/permissions';
import { colors } from '../../src/lib/theme';
import { useAuthStore } from '../../src/stores/authStore';

const DEMO_POINTS = [
  { id: '1', tournament_id: 'd', team_id: 't1', played: 4, won: 3, lost: 1, tied: 0, points: 6, net_run_rate: 1.245, team: { name: 'Mumbai Strikers' } },
  { id: '2', tournament_id: 'd', team_id: 't2', played: 4, won: 2, lost: 2, tied: 0, points: 4, net_run_rate: 0.512, team: { name: 'Delhi Warriors' } },
];

export default function TournamentScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const profile = useAuthStore((s) => s.profile);
  const { data: tournament, isLoading } = useTournament(id ?? '');
  const { data: points } = usePointsTable(id ?? '');
  const { data: teams } = useTournamentTeams(id ?? '');
  const { data: matches } = useTournamentMatches(id ?? '');

  const activeMatches = useMemo(
    () => (matches ?? []).filter((m) => m.status !== 'completed'),
    [matches]
  );
  const completedMatches = useMemo(
    () => (matches ?? []).filter((m) => m.status === 'completed'),
    [matches]
  );

  const t = tournament ?? MOCK_TOURNAMENTS.find((x) => x.id === id) ?? MOCK_TOURNAMENTS[0];
  const table = process.env.EXPO_PUBLIC_SUPABASE_URL ? points : DEMO_POINTS;
  const canManage = canManageTournament(tournament ?? null, profile);

  useFocusEffect(
    useCallback(() => {
      if (!process.env.EXPO_PUBLIC_SUPABASE_URL || !id || !canManage) return;
      let cancelled = false;
      (async () => {
        const { error } = await recalculateTournamentPoints(id);
        if (!cancelled && !error) {
          await queryClient.invalidateQueries({ queryKey: ['points', id] });
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [id, canManage, queryClient])
  );

  const confirmDeleteMatch = (matchId: string, label: string) => {
    Alert.alert(
      'Delete match?',
      `Remove "${label}" and all scoring data? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const { error } = await deleteMatch(matchId);
            if (error) {
              Alert.alert('Could not delete', error);
              return;
            }
            await queryClient.invalidateQueries({ queryKey: ['tournament-matches', id] });
            await queryClient.invalidateQueries({ queryKey: ['points', id] });
            await queryClient.invalidateQueries({ queryKey: ['matches', 'live'] });
            await queryClient.invalidateQueries({ queryKey: ['matches', 'completed'] });
          },
        },
      ]
    );
  };

  return (
    <View style={styles.root}>
      <LinearGradient colors={['#1A0A2E', '#0A0612']} style={styles.header} />
      <SafeAreaView style={styles.flex}>
        <View style={styles.topBar}>
          <Pressable onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </Pressable>
          {canManage ? (
            <Pressable
              style={styles.editBtn}
              onPress={() => router.push({ pathname: '/tournament/edit', params: { id: id ?? '' } })}
            >
              <Ionicons name="create-outline" size={20} color={colors.orange} />
              <Text style={styles.editText}>Edit</Text>
            </Pressable>
          ) : (
            <View style={{ width: 56 }} />
          )}
        </View>

        {isLoading && process.env.EXPO_PUBLIC_SUPABASE_URL ? (
          <ActivityIndicator color={colors.orange} style={{ marginTop: 40 }} />
        ) : (
          <ScrollView contentContainerStyle={styles.scroll}>
            <Text style={styles.name}>{t.name}</Text>
            <Text style={styles.meta}>
              📍 {t.city ?? 'TBD'} • {t.format} • {t.overs_per_innings} overs • {t.venue ?? 'TBD'}
            </Text>

            <View style={styles.statsRow}>
              <GlassCard style={styles.statCard}>
                <Text style={styles.statVal}>{teams?.length ?? 0}</Text>
                <Text style={styles.statLabel}>Teams</Text>
              </GlassCard>
              <GlassCard style={styles.statCard}>
                <Text style={styles.statVal}>{t.status}</Text>
                <Text style={styles.statLabel}>Status</Text>
              </GlassCard>
            </View>

            {!canManage && process.env.EXPO_PUBLIC_SUPABASE_URL ? (
              <GlassCard style={{ marginBottom: 20 }}>
                <Text style={styles.viewerHint}>
                  You are viewing as a fan. Live scores, results, and points are public. Only the
                  tournament organizer can add teams, create matches, or score.
                </Text>
              </GlassCard>
            ) : null}

            {teams && teams.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>Registered teams</Text>
                {teams.map((team) => (
                  <Pressable
                    key={team.id}
                    onPress={() => router.push(`/team/${team.id}`)}
                    onLongPress={
                      canManage
                        ? () => router.push({ pathname: '/team/edit', params: { id: team.id } })
                        : undefined
                    }
                  >
                    <GlassCard style={{ marginBottom: 8 }}>
                      <View style={styles.teamRow}>
                        <View style={[styles.teamDot, { backgroundColor: team.primary_color ?? colors.orange }]} />
                        <Text style={styles.teamName}>{team.name}</Text>
                        <Ionicons name="chevron-forward" size={18} color={colors.textDim} />
                      </View>
                    </GlassCard>
                  </Pressable>
                ))}
              </>
            )}

            <PointsTable rows={table ?? []} />

            {process.env.EXPO_PUBLIC_SUPABASE_URL && teams && teams.length >= 2 && (
              <>
                {activeMatches.length > 0 && (
                  <>
                    <Text style={styles.sectionTitle}>Upcoming & live</Text>
                    {activeMatches.map((m) => {
                      const matchLabel = `${m.team_a?.short_name ?? m.team_a?.name} vs ${m.team_b?.short_name ?? m.team_b?.name}`;
                      const statusLabel =
                        m.status === 'live' ? 'Live' : m.status === 'scheduled' ? 'Scheduled' : m.status;
                      return (
                        <Pressable
                          key={m.id}
                          onPress={() => router.push(`/match/${m.id}`)}
                          onLongPress={
                            canManage
                              ? () => confirmDeleteMatch(m.id, matchLabel)
                              : undefined
                          }
                        >
                          <GlassCard style={{ marginBottom: 8 }}>
                            <View style={styles.teamRow}>
                              <Text style={styles.teamName}>{matchLabel}</Text>
                              <View style={styles.matchMeta}>
                                <Text
                                  style={[
                                    styles.matchStatus,
                                    m.status === 'live' && styles.matchStatusLive,
                                  ]}
                                >
                                  {statusLabel}
                                </Text>
                                {canManage && (
                                  <Pressable
                                    hitSlop={8}
                                    onPress={() => confirmDeleteMatch(m.id, matchLabel)}
                                  >
                                    <Ionicons name="trash-outline" size={18} color={colors.live} />
                                  </Pressable>
                                )}
                                <Ionicons name="chevron-forward" size={18} color={colors.textDim} />
                              </View>
                            </View>
                          </GlassCard>
                        </Pressable>
                      );
                    })}
                  </>
                )}

                {completedMatches.length > 0 && (
                  <>
                    <Text style={[styles.sectionTitle, styles.sectionTitleGap]}>Completed</Text>
                    {completedMatches.map((m) => {
                      const matchLabel = `${m.team_a?.short_name ?? m.team_a?.name} vs ${m.team_b?.short_name ?? m.team_b?.name}`;
                      return (
                        <Pressable
                          key={m.id}
                          onPress={() => router.push(`/match/${m.id}`)}
                          onLongPress={
                            canManage
                              ? () => confirmDeleteMatch(m.id, matchLabel)
                              : undefined
                          }
                        >
                          <GlassCard style={styles.completedCard}>
                            <View style={styles.teamRow}>
                              <Text style={styles.teamName}>{matchLabel}</Text>
                              <View style={styles.matchMeta}>
                                <View style={styles.completedPill}>
                                  <Ionicons name="checkmark-circle" size={14} color={colors.gold} />
                                  <Text style={styles.completedPillText}>Completed</Text>
                                </View>
                                <Ionicons name="chevron-forward" size={18} color={colors.textDim} />
                              </View>
                            </View>
                            {m.result_summary ? (
                              <Text style={styles.matchResult} numberOfLines={2}>
                                {m.result_summary}
                              </Text>
                            ) : null}
                          </GlassCard>
                        </Pressable>
                      );
                    })}
                  </>
                )}

                {activeMatches.length === 0 && completedMatches.length === 0 && (
                  <Text style={styles.noMatches}>
                    {canManage
                      ? 'No matches yet. Create one below.'
                      : 'No matches scheduled yet.'}
                  </Text>
                )}

                {canManage && (
                  <GradientButton
                    title="Create Match"
                    onPress={() =>
                      router.push({ pathname: '/match/create', params: { tournamentId: id ?? '' } })
                    }
                    style={{ marginTop: 12 }}
                  />
                )}
              </>
            )}

            {canManage && (
              <GradientButton
                title="Register Team"
                onPress={() =>
                  router.push({
                    pathname: '/register-team',
                    params: { tournamentId: id ?? '' },
                  })
                }
                style={{ marginTop: 20 }}
              />
            )}
            <GradientButton
              title="View all matches"
              onPress={() => router.push('/(tabs)/live')}
              variant="outline"
              style={{ marginTop: 12 }}
            />
          </ScrollView>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: { position: 'absolute', top: 0, left: 0, right: 0, height: 200 },
  flex: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  editBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  editText: { color: colors.orange, fontWeight: '600' },
  scroll: { padding: 20, paddingBottom: 40 },
  name: { color: colors.text, fontSize: 28, fontWeight: '800' },
  meta: { color: colors.textMuted, marginTop: 8, marginBottom: 24 },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  statCard: { flex: 1, alignItems: 'center' },
  statVal: { color: colors.orange, fontSize: 22, fontWeight: '800', textTransform: 'capitalize' },
  statLabel: { color: colors.textMuted, fontSize: 12, marginTop: 4 },
  sectionTitle: { color: colors.text, fontSize: 16, fontWeight: '700', marginBottom: 12 },
  sectionTitleGap: { marginTop: 20 },
  teamRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  teamDot: { width: 10, height: 10, borderRadius: 5 },
  teamName: { flex: 1, color: colors.text, fontSize: 16, fontWeight: '600' },
  matchMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  matchStatus: { color: colors.orange, fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
  matchStatusLive: { color: colors.live },
  completedCard: { marginBottom: 8, borderColor: 'rgba(255,215,0,0.25)' },
  completedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,215,0,0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  completedPillText: {
    color: colors.gold,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  matchResult: { color: colors.textMuted, fontSize: 13, marginTop: 10, lineHeight: 18 },
  noMatches: { color: colors.textMuted, marginBottom: 12, fontSize: 14 },
  viewerHint: { color: colors.textMuted, fontSize: 14, lineHeight: 20 },
});
