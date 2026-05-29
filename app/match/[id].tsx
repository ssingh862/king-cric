import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn } from 'react-native-reanimated';
import { LiveBadge } from '../../src/components/ui/LiveBadge';
import { GlassCard } from '../../src/components/ui/GlassCard';
import { useMatch } from '../../src/hooks/useTournaments';
import { useMatchInnings, useMatchScoreEvents, useTeamPlayers } from '../../src/hooks/useMatchScoring';
import { MatchPlayerStats } from '../../src/components/cricket/MatchPlayerStats';
import { dedupeScoreEvents, formatOvers, mergeScoreEvents, runRate } from '../../src/lib/scoring';
import { colors } from '../../src/lib/theme';
import { useScoringStore } from '../../src/stores/scoringStore';
import { deleteMatch } from '../../src/lib/matches';
import { canManageTournament } from '../../src/lib/permissions';
import { supabase, isSupabaseConfigured } from '../../src/lib/supabase';
import { useAuthStore } from '../../src/stores/authStore';

export default function MatchScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const profile = useAuthStore((s) => s.profile);
  const { data: match, isLoading } = useMatch(id ?? '');
  const { data: allInnings } = useMatchInnings(id ?? '');
  const { data: scoreData } = useMatchScoreEvents(id ?? '');
  const { data: teamAPlayers } = useTeamPlayers(match?.team_a_id ?? '');
  const { data: teamBPlayers } = useTeamPlayers(match?.team_b_id ?? '');
  const { innings, events, loadEvents, subscribeRealtime, initFromInnings } = useScoringStore();

  const playerNames = useMemo(() => {
    const m = new Map<string, string>();
    [...(teamAPlayers ?? []), ...(teamBPlayers ?? [])].forEach((p) => m.set(p.id, p.full_name));
    return m;
  }, [teamAPlayers, teamBPlayers]);

  const activeInnings = allInnings?.find((i) => i.status === 'in_progress') ?? innings;
  const firstInnings = allInnings?.find((i) => i.innings_number === 1);
  const secondInnings = allInnings?.find((i) => i.innings_number === 2);

  useEffect(() => {
    if (!id || !isSupabaseConfigured()) return;

    let unsubscribe: (() => void) | undefined;
    let cancelled = false;

    (async () => {
      const { data: inn } = await supabase
        .from('innings')
        .select('*')
        .eq('match_id', id)
        .eq('status', 'in_progress')
        .maybeSingle();
      if (cancelled || !inn) return;
      initFromInnings(inn);
      await loadEvents(inn.id);
      unsubscribe = subscribeRealtime(inn.id);
    })();

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [id]);

  const displayEvents = useMemo(
    () => dedupeScoreEvents(events).slice().reverse(),
    [events]
  );

  const teamA = match?.team_a?.short_name ?? match?.team_a?.name ?? 'Team A';
  const teamB = match?.team_b?.short_name ?? match?.team_b?.name ?? 'Team B';
  const state = useScoringStore.getState().getSnapshot();

  const inn1Runs = firstInnings?.total_runs ?? 0;
  const inn1Wkts = firstInnings?.total_wickets ?? 0;
  const inn2Runs = secondInnings?.total_runs ?? (activeInnings?.innings_number === 2 ? activeInnings.total_runs : null);
  const inn2Wkts = secondInnings?.total_wickets ?? 0;

  const battingNow = activeInnings?.batting_team_id;
  const teamABatting = battingNow === match?.team_a_id || (!battingNow && !secondInnings);

  if (isLoading && isSupabaseConfigured()) {
    return (
      <View style={[styles.root, styles.center]}>
        <ActivityIndicator color={colors.orange} size="large" />
      </View>
    );
  }

  const hasInnings = (allInnings?.length ?? 0) > 0;
  const canSetup = match?.status !== 'completed' && !activeInnings;
  const canOrganize = canManageTournament(match?.tournament ?? null, profile);
  const canDelete = isSupabaseConfigured() && canOrganize;

  const confirmDeleteMatch = () => {
    if (!id || !match) return;
    const label = `${match.team_a?.short_name ?? match.team_a?.name} vs ${match.team_b?.short_name ?? match.team_b?.name}`;
    Alert.alert(
      'Delete match?',
      `This permanently removes "${label}" and all ball-by-ball data.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const { error } = await deleteMatch(id);
            if (error) {
              Alert.alert('Could not delete', error);
              return;
            }
            useScoringStore.getState().reset();
            const tournamentId = match.tournament_id;
            await queryClient.invalidateQueries({ queryKey: ['match', id] });
            await queryClient.invalidateQueries({ queryKey: ['tournament-matches', tournamentId] });
            await queryClient.invalidateQueries({ queryKey: ['matches', 'live'] });
            await queryClient.invalidateQueries({ queryKey: ['matches', 'completed'] });
            if (tournamentId) {
              router.replace(`/tournament/${tournamentId}`);
            } else {
              router.back();
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.root}>
      <LinearGradient colors={['#1A0A2E', '#0A0612', '#0A0612']} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={styles.flex}>
        <View style={styles.topBar}>
          <Pressable style={styles.back} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </Pressable>
          {canDelete && (
            <Pressable style={styles.deleteBtn} onPress={confirmDeleteMatch}>
              <Ionicons name="trash-outline" size={22} color={colors.live} />
              <Text style={styles.deleteText}>Delete</Text>
            </Pressable>
          )}
        </View>

        <Animated.View entering={FadeIn} style={styles.scoreboard}>
          <View style={styles.scoreHeader}>
            {(match?.status === 'live' || activeInnings) && <LiveBadge />}
            <Text style={styles.tournament}>{match?.tournament?.name ?? 'Match'}</Text>
          </View>

          <View style={styles.scoreMain}>
            <View style={styles.teamScore}>
              <Text style={styles.teamLabel}>{teamA}</Text>
              {teamABatting || !hasInnings ? (
                <>
                  <Text style={styles.runs}>
                    {activeInnings?.batting_team_id === match?.team_a_id || !hasInnings
                      ? `${innings?.total_runs ?? inn1Runs}/${innings?.total_wickets ?? inn1Wkts}`
                      : `${inn1Runs}/${inn1Wkts}`}
                  </Text>
                  {(activeInnings?.batting_team_id === match?.team_a_id || (!secondInnings && hasInnings)) && (
                    <Text style={styles.overs}>
                      ({formatOvers(state.legalBalls)} ov) RR{' '}
                      {runRate(innings?.total_runs ?? inn1Runs, state.legalBalls || 1)}
                    </Text>
                  )}
                </>
              ) : (
                <Text style={styles.runs}>{inn1Runs}/{inn1Wkts}</Text>
              )}
            </View>
            <Text style={styles.vs}>vs</Text>
            <View style={[styles.teamScore, styles.alignEnd]}>
              <Text style={styles.teamLabel}>{teamB}</Text>
              {!teamABatting && activeInnings ? (
                <>
                  <Text style={styles.runs}>
                    {inn2Runs ?? innings?.total_runs ?? 0}/{inn2Wkts ?? innings?.total_wickets ?? 0}
                  </Text>
                  <Text style={styles.overs}>
                    ({formatOvers(state.legalBalls)} ov) RR{' '}
                    {runRate(inn2Runs ?? innings?.total_runs ?? 0, state.legalBalls || 1)}
                  </Text>
                </>
              ) : secondInnings ? (
                <Text style={styles.runs}>{inn2Runs}/{inn2Wkts}</Text>
              ) : (
                <Text style={styles.runsMuted}>Yet to bat</Text>
              )}
            </View>
          </View>

          {match?.result_summary && (
            <Text style={styles.result}>{match.result_summary}</Text>
          )}
        </Animated.View>

        <ScrollView style={styles.scroll}>
          {scoreData?.innings.map((inn) => {
            let innEvents = scoreData.eventsByInnings[inn.id] ?? [];
            if (activeInnings?.id === inn.id) {
              innEvents = mergeScoreEvents(innEvents, events);
            }
            if (!innEvents.length) return null;
            const innLabel = `Innings ${inn.innings_number} — player stats`;
            return (
              <MatchPlayerStats
                key={inn.id}
                events={innEvents}
                playerNames={playerNames}
                title={innLabel}
              />
            );
          })}

          <Text style={styles.sectionTitle}>Ball by ball</Text>
          {displayEvents.length === 0 ? (
            <Text style={styles.emptyEvents}>No balls scored yet</Text>
          ) : (
            displayEvents.map((e, index) => (
                <GlassCard key={`${e.id}-${index}`} style={{ marginBottom: 8 }}>
                  <View style={styles.eventRow}>
                    <Text style={styles.over}>
                      {e.over_number}.{e.ball_in_over}
                    </Text>
                    <Text
                      style={[
                        styles.ballType,
                        e.ball_type === 'six' && styles.six,
                        e.is_wicket && styles.wicket,
                      ]}
                    >
                      {e.is_wicket ? 'W' : e.ball_type === 'dot' ? '•' : e.runs_off_bat + e.extras}
                    </Text>
                    <Text style={styles.commentary}>{e.commentary}</Text>
                  </View>
                </GlassCard>
              ))
          )}
        </ScrollView>

        {canOrganize && canSetup && (
          <Pressable
            style={styles.scoreBtn}
            onPress={() => router.push({ pathname: '/match/setup', params: { matchId: id, innings: '1' } })}
          >
            <LinearGradient colors={[colors.purple, colors.blue]} style={styles.scoreBtnGrad}>
              <Ionicons name="play" size={20} color="#fff" />
              <Text style={styles.scoreBtnText}>Start Match & Score</Text>
            </LinearGradient>
          </Pressable>
        )}

        {canOrganize && firstInnings?.status === 'completed' && !secondInnings && match?.status !== 'completed' && (
          <Pressable
            style={styles.scoreBtn}
            onPress={() =>
              router.push({
                pathname: '/match/setup',
                params: { matchId: id, innings: '2', target: String((firstInnings.total_runs ?? 0) + 1) },
              })
            }
          >
            <LinearGradient colors={[colors.purple, colors.blue]} style={styles.scoreBtnGrad}>
              <Ionicons name="play-forward" size={20} color="#fff" />
              <Text style={styles.scoreBtnText}>Start 2nd Innings</Text>
            </LinearGradient>
          </Pressable>
        )}

        {canOrganize && activeInnings && (
          <Pressable style={styles.scoreBtn} onPress={() => router.push(`/score/${id}`)}>
            <LinearGradient colors={[colors.orange, colors.pink]} style={styles.scoreBtnGrad}>
              <Ionicons name="create" size={20} color="#fff" />
              <Text style={styles.scoreBtnText}>Open Scoring Pad</Text>
            </LinearGradient>
          </Pressable>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  center: { alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingRight: 16,
  },
  back: { padding: 16 },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  deleteText: { color: colors.live, fontWeight: '700', fontSize: 14 },
  scoreboard: {
    marginHorizontal: 16,
    padding: 20,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  scoreHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  tournament: { color: colors.textMuted, fontSize: 13 },
  scoreMain: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  teamScore: { flex: 1 },
  alignEnd: { alignItems: 'flex-end' },
  teamLabel: { color: colors.textMuted, fontSize: 14 },
  runs: { color: colors.text, fontSize: 36, fontWeight: '800', marginTop: 4 },
  runsMuted: { color: colors.textDim, fontSize: 16, marginTop: 8 },
  overs: { color: colors.textMuted, fontSize: 12, marginTop: 4 },
  vs: { color: colors.textDim, marginHorizontal: 16, fontSize: 14 },
  result: { color: colors.gold, textAlign: 'center', marginTop: 16, fontWeight: '600' },
  scroll: { flex: 1, padding: 16 },
  sectionTitle: { color: colors.text, fontSize: 16, fontWeight: '700', marginBottom: 12 },
  emptyEvents: { color: colors.textDim, marginBottom: 20 },
  eventRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  over: { color: colors.textDim, width: 36, fontSize: 12 },
  ballType: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    textAlign: 'center',
    lineHeight: 32,
    color: colors.text,
    fontWeight: '700',
    overflow: 'hidden',
  },
  six: { backgroundColor: 'rgba(255,107,0,0.3)', color: colors.orange },
  wicket: { backgroundColor: 'rgba(255,23,68,0.3)', color: colors.live },
  commentary: { flex: 1, color: colors.textMuted, fontSize: 13 },
  scoreBtn: { marginHorizontal: 16, marginBottom: 8, borderRadius: 14, overflow: 'hidden' },
  scoreBtnGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  scoreBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
