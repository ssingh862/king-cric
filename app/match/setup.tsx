import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PlayerPickerModal } from '../../src/components/cricket/PlayerPickerModal';
import { GradientButton } from '../../src/components/ui/GradientButton';
import { useMatch } from '../../src/hooks/useTournaments';
import { useMatchInnings, useTeamPlayers } from '../../src/hooks/useMatchScoring';
import { startInnings, startMatchLive } from '../../src/lib/matches';
import { canManageTournament } from '../../src/lib/permissions';
import { colors } from '../../src/lib/theme';
import { useAuthStore } from '../../src/stores/authStore';
import { useScoringStore, initMatchRulesFromOvers } from '../../src/stores/scoringStore';
import type { Player } from '../../src/types/database';

type PickField = 'striker' | 'non_striker' | 'bowler' | null;

export default function MatchSetupScreen() {
  const { matchId, innings: inningsParam, target } = useLocalSearchParams<{
    matchId: string;
    innings?: string;
    target?: string;
  }>();
  const profile = useAuthStore((s) => s.profile);
  const inningsNumber = (inningsParam === '2' ? 2 : 1) as 1 | 2;
  const targetRuns = target ? parseInt(target, 10) : undefined;
  const { data: match, isLoading } = useMatch(matchId ?? '');
  const { data: existingInnings } = useMatchInnings(matchId ?? '');
  const [battingTeamId, setBattingTeamId] = useState<string | null>(null);
  const [striker, setStriker] = useState<Player | null>(null);
  const [nonStriker, setNonStriker] = useState<Player | null>(null);
  const [bowler, setBowler] = useState<Player | null>(null);
  const [pickField, setPickField] = useState<PickField>(null);
  const [submitting, setSubmitting] = useState(false);

  const teamA = match?.team_a;
  const teamB = match?.team_b;
  const canManage = canManageTournament(match?.tournament ?? null, profile);

  useEffect(() => {
    if (isLoading || !match || !profile) return;
    if (!canManageTournament(match.tournament, profile)) {
      Alert.alert('Organizer only', 'Only the tournament organizer can start or set up a match.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    }
  }, [isLoading, match, profile]);

  useEffect(() => {
    if (inningsNumber === 1 && teamA?.id && !battingTeamId) {
      setBattingTeamId(teamA.id);
    }
  }, [inningsNumber, teamA?.id, battingTeamId]);

  useEffect(() => {
    if (inningsNumber !== 2 || battingTeamId) return;
    const first = existingInnings?.find((i) => i.innings_number === 1);
    if (first?.batting_team_id && teamA?.id && teamB?.id) {
      const secondBatting =
        first.batting_team_id === teamA.id ? teamB.id : teamA.id;
      setBattingTeamId(secondBatting);
    }
  }, [inningsNumber, existingInnings, teamA?.id, teamB?.id, battingTeamId]);

  const battingId = battingTeamId ?? (inningsNumber === 1 ? teamA?.id ?? null : null);
  const bowlingId = useMemo(() => {
    if (!battingId || !teamA?.id || !teamB?.id) return null;
    return battingId === teamA.id ? teamB.id : teamA.id;
  }, [battingId, teamA?.id, teamB?.id]);

  const { data: batters } = useTeamPlayers(battingId ?? '');
  const { data: bowlers } = useTeamPlayers(bowlingId ?? '');

  const startScoring = async () => {
    if (!canManage) return;
    if (!matchId || !battingId || !bowlingId || !striker || !nonStriker || !bowler) {
      Alert.alert('Complete setup', 'Choose batting team and all three players.');
      return;
    }
    if (striker.id === nonStriker.id) {
      Alert.alert('Invalid', 'Striker and non-striker must be different.');
      return;
    }

    setSubmitting(true);
    if (inningsNumber === 1) await startMatchLive(matchId);
    const { innings, error } = await startInnings({
      matchId,
      battingTeamId: battingId,
      bowlingTeamId: bowlingId,
      inningsNumber,
      strikerId: striker.id,
      nonStrikerId: nonStriker.id,
      bowlerId: bowler.id,
      targetRuns: inningsNumber === 2 ? targetRuns : undefined,
    });
    setSubmitting(false);

    if (error || !innings) {
      Alert.alert('Error', error ?? 'Could not start innings');
      return;
    }

    const store = useScoringStore.getState();
    store.setMatchRules(initMatchRulesFromOvers(match?.overs_per_innings ?? 20));
    store.initFromInnings(innings);
    await store.loadEvents(innings.id);
    router.replace(`/score/${matchId}`);
  };

  if (isLoading) {
    return (
      <View style={[styles.root, styles.center]}>
        <ActivityIndicator color={colors.orange} size="large" />
      </View>
    );
  }

  if (match && profile && !canManage) {
    return (
      <View style={[styles.root, styles.center]}>
        <ActivityIndicator color={colors.orange} size="large" />
      </View>
    );
  }

  const pickPlayers = pickField === 'bowler' ? bowlers ?? [] : batters ?? [];
  const pickTitle =
    pickField === 'striker'
      ? 'Select striker'
      : pickField === 'non_striker'
        ? 'Select non-striker'
        : pickField === 'bowler'
          ? 'Select bowler'
          : '';

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.flex}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </Pressable>
          <Text style={styles.title}>Start Match</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={styles.matchTitle}>
            {teamA?.name ?? 'Team A'} vs {teamB?.name ?? 'Team B'}
          </Text>

          {inningsNumber === 1 ? (
            <>
              <Text style={styles.section}>Who bats first?</Text>
              <View style={styles.row}>
                {[teamA, teamB].filter(Boolean).map((t) => (
                  <Pressable
                    key={t!.id}
                    style={[styles.teamBtn, battingId === t!.id && styles.teamBtnOn]}
                    onPress={() => {
                      setBattingTeamId(t!.id);
                      setStriker(null);
                      setNonStriker(null);
                    }}
                  >
                    <Text style={[styles.teamBtnText, battingId === t!.id && styles.teamBtnTextOn]}>
                      {t!.short_name ?? t!.name}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </>
          ) : (
            <Text style={styles.targetHint}>
              Target: {targetRuns ?? '—'} runs • Innings 2
            </Text>
          )}

          <Text style={styles.section}>Openers & bowler</Text>
          <PlayerRow label="Striker" player={striker} onPress={() => setPickField('striker')} />
          <PlayerRow label="Non-striker" player={nonStriker} onPress={() => setPickField('non_striker')} />
          <PlayerRow label="Bowler" player={bowler} onPress={() => setPickField('bowler')} />

          <GradientButton
            title={submitting ? 'Starting…' : 'Open Scoreboard'}
            onPress={startScoring}
            style={{ marginTop: 24 }}
            disabled={submitting}
          />
        </ScrollView>

        <PlayerPickerModal
          visible={!!pickField}
          title={pickTitle}
          players={pickPlayers}
          selectedId={
            pickField === 'striker'
              ? striker?.id
              : pickField === 'non_striker'
                ? nonStriker?.id
                : bowler?.id
          }
          onSelect={(p) => {
            if (pickField === 'striker') setStriker(p);
            if (pickField === 'non_striker') setNonStriker(p);
            if (pickField === 'bowler') setBowler(p);
          }}
          onClose={() => setPickField(null)}
        />
      </SafeAreaView>
    </View>
  );
}

function PlayerRow({
  label,
  player,
  onPress,
}: {
  label: string;
  player: Player | null;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.playerRow} onPress={onPress}>
      <Text style={styles.playerLabel}>{label}</Text>
      <Text style={styles.playerName}>{player?.full_name ?? 'Tap to select'}</Text>
      <Ionicons name="chevron-forward" size={18} color={colors.textDim} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  center: { alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  title: { color: colors.text, fontSize: 18, fontWeight: '700' },
  scroll: { padding: 16, paddingBottom: 40 },
  matchTitle: { color: colors.text, fontSize: 22, fontWeight: '800', marginBottom: 24 },
  section: { color: colors.textMuted, fontSize: 13, fontWeight: '600', marginBottom: 10, marginTop: 8 },
  row: { flexDirection: 'row', gap: 10 },
  teamBtn: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignItems: 'center',
  },
  teamBtnOn: { borderColor: colors.orange, backgroundColor: 'rgba(255,107,0,0.15)' },
  teamBtnText: { color: colors.textMuted, fontWeight: '600' },
  teamBtnTextOn: { color: colors.orange, fontWeight: '800' },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  playerLabel: { color: colors.textDim, width: 100, fontSize: 12, fontWeight: '700' },
  playerName: { flex: 1, color: colors.text, fontSize: 16, fontWeight: '600' },
  targetHint: { color: colors.gold, fontSize: 15, fontWeight: '600', marginBottom: 16 },
});
