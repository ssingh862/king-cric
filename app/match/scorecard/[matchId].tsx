import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { InningsScorecardView } from '../../../src/components/cricket/InningsScorecardView';
import { useMatch } from '../../../src/hooks/useTournaments';
import { useMatchInnings, useMatchScoreEvents, useTeamPlayers } from '../../../src/hooks/useMatchScoring';
import { buildInningsScorecard } from '../../../src/lib/cricket/scorecard';
import { replayInnings } from '../../../src/lib/cricket';
import { rulesForFormat } from '../../../src/lib/cricket/formats';
import { colors, radius } from '../../../src/lib/theme';
import { isApiConfigured } from '../../../src/lib/api';
import type { Innings, Player, ScoreEvent } from '../../../src/types/database';

export default function MatchScorecardScreen() {
  const { matchId, innings: inningsParam } = useLocalSearchParams<{
    matchId: string;
    innings?: string;
  }>();

  const initialInnings = inningsParam === '2' ? 2 : 1;
  const [selectedInnings, setSelectedInnings] = useState<1 | 2>(initialInnings);

  const { data: match, isLoading: matchLoading } = useMatch(matchId ?? '');
  const { data: allInnings, isLoading: inningsLoading } = useMatchInnings(matchId ?? '');
  const { data: scoreData, isLoading: eventsLoading } = useMatchScoreEvents(matchId ?? '');

  const firstInnings = (allInnings as Innings[] | undefined)?.find((i) => i.innings_number === 1);
  const secondInnings = (allInnings as Innings[] | undefined)?.find((i) => i.innings_number === 2);

  const battingTeamId =
    selectedInnings === 1 ? firstInnings?.batting_team_id : secondInnings?.batting_team_id;

  const { data: battingSquad } = useTeamPlayers(battingTeamId ?? '');
  const { data: teamAPlayers } = useTeamPlayers(match?.team_a_id ?? '');
  const { data: teamBPlayers } = useTeamPlayers(match?.team_b_id ?? '');

  const playerNames = useMemo(() => {
    const m = new Map<string, string>();
    [...(teamAPlayers ?? []), ...(teamBPlayers ?? []), ...(battingSquad ?? [])].forEach(
      (p: Player) => m.set(p.id, p.full_name)
    );
    return m;
  }, [teamAPlayers, teamBPlayers, battingSquad]);

  const teamA = match?.team_a?.short_name ?? match?.team_a?.name ?? 'A';
  const teamB = match?.team_b?.short_name ?? match?.team_b?.name ?? 'B';

  const scorecard = useMemo(() => {
    if (!match || !scoreData) return null;

    const inn = selectedInnings === 1 ? firstInnings : secondInnings;
    if (!inn) return null;

    const events: ScoreEvent[] = scoreData.eventsByInnings[inn.id] ?? [];
    const rules = rulesForFormat('custom', match.overs_per_innings ?? 20);
    const snap = replayInnings(inn as Innings, events, rules);

    const battingName =
      inn.batting_team_id === match.team_a_id
        ? match.team_a?.name ?? teamA
        : match.team_b?.name ?? teamB;
    const bowlingName =
      inn.bowling_team_id === match.team_a_id
        ? match.team_a?.name ?? teamA
        : match.team_b?.name ?? teamB;

    return buildInningsScorecard(
      events,
      (battingSquad ?? []) as Player[],
      playerNames,
      battingName,
      bowlingName,
      {
        runs: inn.total_runs ?? snap.totalRuns,
        wickets: inn.total_wickets ?? snap.totalWickets,
        legalBalls: snap.legalBalls,
      }
    );
  }, [
    match,
    scoreData,
    selectedInnings,
    firstInnings,
    secondInnings,
    battingSquad,
    playerNames,
    teamA,
    teamB,
  ]);

  const loading = isApiConfigured() && (matchLoading || inningsLoading || eventsLoading);

  const firstBattingShort =
    firstInnings?.batting_team_id === match?.team_a_id ? teamA : teamB;
  const secondBattingShort = secondInnings
    ? secondInnings.batting_team_id === match?.team_a_id
      ? teamA
      : teamB
    : null;

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.flex}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </Pressable>
          <Text style={styles.headerTitle}>Scorecard</Text>
          <View style={{ width: 32 }} />
        </View>

        {secondInnings ? (
          <View style={styles.tabs}>
            <Pressable
              style={[styles.tab, selectedInnings === 1 && styles.tabActive]}
              onPress={() => setSelectedInnings(1)}
            >
              <Text style={[styles.tabText, selectedInnings === 1 && styles.tabTextActive]}>
                {firstBattingShort} (1st Inn)
              </Text>
            </Pressable>
            <Pressable
              style={[styles.tab, selectedInnings === 2 && styles.tabActive]}
              onPress={() => setSelectedInnings(2)}
            >
              <Text style={[styles.tabText, selectedInnings === 2 && styles.tabTextActive]}>
                {secondBattingShort} (2nd Inn)
              </Text>
            </Pressable>
          </View>
        ) : firstInnings ? (
          <View style={styles.singleTab}>
            <Text style={styles.singleTabText}>{firstBattingShort} — 1st Innings</Text>
          </View>
        ) : null}

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.orange} size="large" />
          </View>
        ) : !scorecard ? (
          <View style={styles.center}>
            <Text style={styles.empty}>No scorecard data yet</Text>
          </View>
        ) : (
          <InningsScorecardView data={scorecard} />
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  backBtn: { padding: 4 },
  headerTitle: { color: colors.text, fontSize: 18, fontWeight: '800' },
  tabs: {
    flexDirection: 'row',
    gap: 10,
    padding: 12,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  tabActive: {
    backgroundColor: colors.green,
    borderColor: colors.green,
  },
  tabText: { color: colors.text, fontSize: 12, fontWeight: '700', textAlign: 'center' },
  tabTextActive: { color: '#fff' },
  singleTab: {
    padding: 12,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  singleTabText: { color: colors.textMuted, fontSize: 13, fontWeight: '700', textAlign: 'center' },
  empty: { color: colors.textDim, fontSize: 15 },
});
