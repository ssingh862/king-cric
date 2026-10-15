import { Alert } from '../../src/i18n';
import { createThemedStyles } from '../../src/lib/theme';
import { Text } from '../../src/i18n';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { ActivityIndicator, Image, Linking, Pressable, ScrollView, StyleSheet,  View } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
import { api, isApiConfigured } from '../../src/lib/api';
import { ballTypeLabel, formatTournamentDate } from '../../src/lib/tournaments';
import { groupMatchesByDate, matchDayParts } from '../../src/lib/matchDays';
import { CompletedMatchRow } from '../../src/components/cricket/CompletedMatchRow';
import { colors } from '../../src/lib/theme';
import { useAuthStore } from '../../src/stores/authStore';

function DayLabel({ day }: { day: string }) {
  const parts = matchDayParts(day);
  return (
    <Text style={styles.dayLabel}>
      {parts.prefix ? <>{parts.prefix}{' · '}{parts.date}</> : parts.date}
    </Text>
  );
}

type Leader = { id: string; name: string; team: string; runs: number; strikeRate: string; wickets: number; economy: string };

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
  const leaders = useQuery({
    queryKey: ['leaders', id],
    enabled: !!id && isApiConfigured(),
    queryFn: () => api<{ batting: Leader[]; bowling: Leader[]; awards: { batter: Leader | null; bowler: Leader | null; player: Leader | null } }>(`/tournaments/${id}/leaders`),
  });

  const activeMatches = useMemo(
    () => (matches ?? []).filter((m) => m.status !== 'completed'),
    [matches]
  );
  const completedMatches = useMemo(
    () => (matches ?? []).filter((m) => m.status === 'completed'),
    [matches]
  );

  const t = tournament ?? (isApiConfigured() ? null : MOCK_TOURNAMENTS.find((x) => x.id === id) ?? MOCK_TOURNAMENTS[0]);
  const table = isApiConfigured() ? points : DEMO_POINTS;
  const canManage = canManageTournament(tournament ?? null, profile);

  useFocusEffect(
    useCallback(() => {
      if (!isApiConfigured() || !id) return;
      void queryClient.invalidateQueries({ queryKey: ['tournament', id] });
      void queryClient.invalidateQueries({ queryKey: ['tournament-matches', id] });
      void queryClient.invalidateQueries({ queryKey: ['tournament-teams', id] });
      void queryClient.invalidateQueries({ queryKey: ['points', id] });
    }, [id, queryClient])
  );

  useFocusEffect(
    useCallback(() => {
      if (!isApiConfigured() || !id || !canManage) return;
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

        {isLoading && isApiConfigured() ? (
          <ActivityIndicator color={colors.orange} style={{ marginTop: 40 }} />
        ) : !t ? (
          <View style={styles.centered}>
            <Text style={styles.viewerHint}>Tournament not found</Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.scroll}>
            <View style={styles.identity}>
              {t.logo_url ? (
                <Image source={{ uri: t.logo_url }} style={styles.logo} />
              ) : (
                <View style={styles.logoFallback}>
                  <Ionicons name="trophy" size={28} color={colors.orange} />
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{t.name}</Text>
                <Text style={styles.meta}>
                  {t.city ?? 'TBD'} • {t.format} • {t.overs_per_innings} overs
                  {ballTypeLabel(t.ball_type) ? ` • ${ballTypeLabel(t.ball_type)} ball` : ''}
                </Text>
              </View>
            </View>
            <View style={styles.details}>
              <Text style={styles.detailLine}>{t.venue ?? 'Venue not set'}</Text>
              {formatTournamentDate(t.start_date) ? (
                <Text style={styles.detailLine}>{formatTournamentDate(t.start_date)}</Text>
              ) : null}
              {t.organizer_name ? (
                <Text style={styles.detailLine}>Organizer: {t.organizer_name}</Text>
              ) : null}
              {t.organizer_phone ? (
                <Pressable onPress={() => Linking.openURL(`tel:${t.organizer_phone}`)}>
                  <Text style={styles.phone}>{t.organizer_phone}</Text>
                </Pressable>
              ) : null}
            </View>

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

            {!canManage && isApiConfigured() ? (
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

            {leaders.data?.awards.player || leaders.data?.batting.length ? (
              <>
                <Text style={[styles.sectionTitle, styles.sectionTitleGap]}>Awards</Text>
                {([['Best batter', leaders.data?.awards.batter, 'runs'], ['Best bowler', leaders.data?.awards.bowler, 'wickets'], ['Best player', leaders.data?.awards.player, 'runs']] as const).map(([label, row]) => row ? (
                  <Pressable key={label} onPress={() => router.push(`/player/${row.id}`)}>
                    <GlassCard style={{ marginBottom: 8 }}>
                      <Text style={styles.detailLine}>{label}</Text>
                      <Text style={styles.teamName}>{row.name} · {row.team}</Text>
                    </GlassCard>
                  </Pressable>
                ) : null)}
                <Text style={[styles.sectionTitle, styles.sectionTitleGap]}>Most runs</Text>
                {leaders.data?.batting.slice(0, 5).map((row, index) => (
                  <Pressable key={row.id} onPress={() => router.push(`/player/${row.id}`)}>
                    <GlassCard style={{ marginBottom: 8 }}><Text style={styles.teamName}>{index + 1}. {row.name} · {row.runs} ({row.strikeRate})</Text></GlassCard>
                  </Pressable>
                ))}
                <Text style={[styles.sectionTitle, styles.sectionTitleGap]}>Most wickets</Text>
                {leaders.data?.bowling.slice(0, 5).map((row, index) => (
                  <Pressable key={row.id} onPress={() => router.push(`/player/${row.id}`)}>
                    <GlassCard style={{ marginBottom: 8 }}><Text style={styles.teamName}>{index + 1}. {row.name} · {row.wickets} wkts ({row.economy})</Text></GlassCard>
                  </Pressable>
                ))}
              </>
            ) : null}

            {isApiConfigured() && (
              <>
                {activeMatches.length > 0 && (
                  <>
                    <Text style={styles.sectionTitle}>Upcoming & live</Text>
                    {groupMatchesByDate(activeMatches, 'asc').map(([day, dayMatches]) => (
                    <View key={`up-${day}`}>
                    <DayLabel day={day} />
                    {dayMatches.map((m) => {
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
                    </View>
                    ))}
                  </>
                )}

                {completedMatches.length > 0 && (
                  <>
                    <Text style={[styles.sectionTitle, styles.sectionTitleGap]}>Completed</Text>
                    {[...completedMatches].sort((a, b) => new Date(b.scheduled_at ?? 0).getTime() - new Date(a.scheduled_at ?? 0).getTime()).map((m) => (
                      <CompletedMatchRow
                        key={m.id}
                        match={m}
                        onLongPress={canManage ? () => confirmDeleteMatch(m.id, `${m.team_a?.short_name ?? m.team_a?.name} vs ${m.team_b?.short_name ?? m.team_b?.name}`) : undefined}
                      />
                    ))}
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
            {canManage && (
              <GradientButton
                title="Scorers, approvals & history"
                variant="outline"
                onPress={() =>
                  router.push({ pathname: '/organizer-settings', params: { id: id ?? '' } })
                }
                style={{ marginTop: 12 }}
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

const styles = createThemedStyles({
  root: { flex: 1, backgroundColor: colors.background },
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
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  identity: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 12 },
  logo: { width: 72, height: 72, borderRadius: 16 },
  logoFallback: {
    width: 72,
    height: 72,
    borderRadius: 16,
    backgroundColor: colors.orangeLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: { color: colors.text, fontSize: 24, fontWeight: '800' },
  meta: { color: colors.textMuted, marginTop: 6 },
  details: { marginBottom: 20 },
  detailLine: { color: colors.textMuted, fontSize: 14, marginTop: 4 },
  phone: { color: colors.orange, fontSize: 15, fontWeight: '700', marginTop: 6 },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  statCard: { flex: 1, alignItems: 'center' },
  statVal: { color: colors.orange, fontSize: 22, fontWeight: '800', textTransform: 'capitalize' },
  statLabel: { color: colors.textMuted, fontSize: 12, marginTop: 4 },
  sectionTitle: { color: colors.text, fontSize: 16, fontWeight: '700', marginBottom: 12 },
  sectionTitleGap: { marginTop: 20 },
  dayLabel: { color: colors.textMuted, fontSize: 13, fontWeight: '800', marginBottom: 8 },
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
