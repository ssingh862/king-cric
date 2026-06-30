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
import { colors, radius, shadows } from '../../src/lib/theme';
import { useAuthStore } from '../../src/stores/authStore';
import { useScoringStore, initMatchRulesFromOvers } from '../../src/stores/scoringStore';
import type { Player } from '../../types/database';

type PickField = 'striker' | 'non_striker' | 'bowler' | null;
type SetupStep = 'toss' | 'players';

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
  const [step, setStep] = useState<SetupStep>(inningsNumber === 2 ? 'players' : 'toss');
  const [battingTeamId, setBattingTeamId] = useState<string | null>(null);
  const [striker, setStriker] = useState<Player | null>(null);
  const [nonStriker, setNonStriker] = useState<Player | null>(null);
  const [bowler, setBowler] = useState<Player | null>(null);
  const [pickField, setPickField] = useState<PickField>(null);
  const [submitting, setSubmitting] = useState(false);

  const teamA = match?.team_a as { id: string; name: string; short_name?: string; primary_color?: string } | undefined;
  const teamB = match?.team_b as { id: string; name: string; short_name?: string; primary_color?: string } | undefined;
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
    if (inningsNumber !== 2 || battingTeamId) return;
    const first = existingInnings?.find((i) => i.innings_number === 1);
    if (first?.batting_team_id && teamA?.id && teamB?.id) {
      const secondBatting =
        first.batting_team_id === teamA.id ? teamB.id : teamA.id;
      setBattingTeamId(secondBatting);
      setStep('players');
    }
  }, [inningsNumber, existingInnings, teamA?.id, teamB?.id, battingTeamId]);

  const battingId = battingTeamId;
  const bowlingId = useMemo(() => {
    if (!battingId || !teamA?.id || !teamB?.id) return null;
    return battingId === teamA.id ? teamB.id : teamA.id;
  }, [battingId, teamA?.id, teamB?.id]);

  const battingTeam = battingId === teamA?.id ? teamA : teamB;
  const bowlingTeam = bowlingId === teamA?.id ? teamA : teamB;

  const { data: batters } = useTeamPlayers(battingId ?? '');
  const { data: bowlers } = useTeamPlayers(bowlingId ?? '');

  const pickPlayers = pickField === 'bowler' ? (bowlers ?? []) : (batters ?? []);

  const disabledPlayerIds = useMemo(() => {
    const ids: string[] = [];
    if (pickField === 'non_striker' && striker) ids.push(striker.id);
    if (pickField === 'striker' && nonStriker) ids.push(nonStriker.id);
    if (pickField === 'bowler' && striker) ids.push(striker.id);
    return ids;
  }, [pickField, striker, nonStriker]);

  const pickMeta = useMemo(() => {
    if (pickField === 'striker')
      return { title: 'Select striker', subtitle: `Batting: ${battingTeam?.name ?? '—'}`, icon: 'flash' as const };
    if (pickField === 'non_striker')
      return { title: 'Select non-striker', subtitle: `Batting: ${battingTeam?.name ?? '—'}`, icon: 'person' as const };
    if (pickField === 'bowler')
      return { title: 'Select bowler', subtitle: `Bowling: ${bowlingTeam?.name ?? '—'}`, icon: 'baseball' as const };
    return { title: '', subtitle: '', icon: 'person' as const };
  }, [pickField, battingTeam?.name, bowlingTeam?.name]);

  const chooseBattingTeam = (teamId: string) => {
    setBattingTeamId(teamId);
    setStriker(null);
    setNonStriker(null);
    setBowler(null);
  };

  const confirmToss = () => {
    if (!battingTeamId) {
      Alert.alert('Choose team', 'Select which team bats first.');
      return;
    }
    setStep('players');
  };

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
    const squadSize = batters?.length;
    store.setMatchRules(initMatchRulesFromOvers(match?.overs_per_innings ?? 20, squadSize));
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

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.flex}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </Pressable>
          <Text style={styles.title}>
            {inningsNumber === 2 ? 'Innings 2 Setup' : 'Match Setup'}
          </Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.stepBar}>
          {inningsNumber === 1 ? (
            <>
              <StepPill label="1. Toss" active={step === 'toss'} done={step === 'players'} />
              <View style={styles.stepLine} />
              <StepPill label="2. Players" active={step === 'players'} done={false} />
            </>
          ) : (
            <StepPill label="Select players" active done={false} />
          )}
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={[styles.matchCard, shadows.card]}>
            <Text style={styles.matchLabel}>Match</Text>
            <Text style={styles.matchTitle}>
              {teamA?.name ?? 'Team A'} <Text style={styles.vsText}>vs</Text> {teamB?.name ?? 'Team B'}
            </Text>
            {inningsNumber === 2 && targetRuns ? (
              <Text style={styles.target}>Target: {targetRuns} runs</Text>
            ) : null}
          </View>

          {step === 'toss' && inningsNumber === 1 ? (
            <>
              <Text style={styles.sectionTitle}>Who bats first?</Text>
              <Text style={styles.sectionHint}>The other team will bowl first innings.</Text>

              <View style={styles.tossRow}>
                {[teamA, teamB].filter(Boolean).map((t) => {
                  const selected = battingTeamId === t!.id;
                  return (
                    <Pressable
                      key={t!.id}
                      style={[styles.tossCard, selected && styles.tossCardOn]}
                      onPress={() => chooseBattingTeam(t!.id)}
                    >
                      <View
                        style={[
                          styles.tossAvatar,
                          { backgroundColor: t!.primary_color ?? colors.orange },
                        ]}
                      >
                        <Text style={styles.tossAvatarText}>
                          {(t!.short_name ?? t!.name).slice(0, 2).toUpperCase()}
                        </Text>
                      </View>
                      <Text style={[styles.tossName, selected && styles.tossNameOn]} numberOfLines={2}>
                        {t!.name}
                      </Text>
                      {selected ? (
                        <View style={styles.battingTag}>
                          <Text style={styles.battingTagText}>Bats first</Text>
                        </View>
                      ) : (
                        <Text style={styles.tapHint}>Tap to select</Text>
                      )}
                    </Pressable>
                  );
                })}
              </View>

              {battingTeamId && bowlingTeam ? (
                <View style={styles.summaryBox}>
                  <SummaryRow icon="baseball" label="Batting" value={battingTeam.name} />
                  <SummaryRow icon="shield" label="Bowling" value={bowlingTeam.name} />
                </View>
              ) : null}

              <GradientButton
                title="Next — Pick openers"
                onPress={confirmToss}
                style={{ marginTop: 24 }}
                disabled={!battingTeamId}
              />
            </>
          ) : (
            <>
              {battingTeam && bowlingTeam ? (
                <View style={[styles.summaryBox, { marginBottom: 16 }]}>
                  <SummaryRow icon="baseball" label="Batting" value={battingTeam.name} highlight />
                  <SummaryRow icon="shield" label="Bowling" value={bowlingTeam.name} />
                </View>
              ) : null}

              {inningsNumber === 1 ? (
                <Pressable style={styles.backStep} onPress={() => setStep('toss')}>
                  <Ionicons name="arrow-back" size={16} color={colors.orange} />
                  <Text style={styles.backStepText}>Change who bats first</Text>
                </Pressable>
              ) : null}

              <Text style={styles.sectionTitle}>Opening batsmen & bowler</Text>

              <PlayerSelectRow
                icon="flash"
                label="Striker"
                teamLabel={battingTeam?.name}
                player={striker}
                onPress={() => battingId && setPickField('striker')}
                disabled={!battingId}
              />
              <PlayerSelectRow
                icon="person"
                label="Non-striker"
                teamLabel={battingTeam?.name}
                player={nonStriker}
                onPress={() => battingId && setPickField('non_striker')}
                disabled={!battingId}
              />
              <PlayerSelectRow
                icon="baseball"
                label="Bowler"
                teamLabel={bowlingTeam?.name}
                player={bowler}
                onPress={() => bowlingId && setPickField('bowler')}
                disabled={!bowlingId}
              />

              <GradientButton
                title={submitting ? 'Starting…' : 'Start Scoring'}
                onPress={startScoring}
                style={{ marginTop: 24 }}
                disabled={submitting || !striker || !nonStriker || !bowler}
              />
            </>
          )}
        </ScrollView>

        <PlayerPickerModal
          visible={!!pickField}
          title={pickMeta.title}
          subtitle={pickMeta.subtitle}
          icon={pickMeta.icon}
          players={pickPlayers as Player[]}
          selectedId={
            pickField === 'striker'
              ? striker?.id
              : pickField === 'non_striker'
                ? nonStriker?.id
                : bowler?.id
          }
          disabledIds={disabledPlayerIds}
          onSelect={(p) => {
            if (pickField === 'striker') setStriker(p);
            if (pickField === 'non_striker') setNonStriker(p);
            if (pickField === 'bowler') setBowler(p);
            setPickField(null);
          }}
          onClose={() => setPickField(null)}
        />
      </SafeAreaView>
    </View>
  );
}

function StepPill({ label, active, done }: { label: string; active: boolean; done: boolean }) {
  return (
    <View style={[styles.stepPill, (active || done) && styles.stepPillActive]}>
      {done ? (
        <Ionicons name="checkmark" size={14} color={colors.green} />
      ) : null}
      <Text style={[styles.stepPillText, (active || done) && styles.stepPillTextActive]}>{label}</Text>
    </View>
  );
}

function SummaryRow({
  icon,
  label,
  value,
  highlight,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <View style={styles.summaryRow}>
      <Ionicons name={icon} size={18} color={highlight ? colors.orange : colors.textMuted} />
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={[styles.summaryValue, highlight && styles.summaryValueHi]}>{value}</Text>
    </View>
  );
}

function PlayerSelectRow({
  icon,
  label,
  teamLabel,
  player,
  onPress,
  disabled,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  teamLabel?: string;
  player: Player | null;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      style={[styles.playerRow, player && styles.playerRowFilled, disabled && styles.playerRowDisabled]}
      onPress={onPress}
      disabled={disabled}
    >
      <View style={[styles.playerIcon, player && styles.playerIconFilled]}>
        <Ionicons name={icon} size={20} color={player ? colors.orange : colors.textDim} />
      </View>
      <View style={styles.playerBody}>
        <Text style={styles.playerLabel}>{label}</Text>
        {teamLabel ? <Text style={styles.playerTeam}>{teamLabel}</Text> : null}
        <Text style={[styles.playerName, !player && styles.playerPlaceholder]}>
          {player?.full_name ?? 'Tap to select player'}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.textDim} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  center: { alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  title: { color: colors.text, fontSize: 18, fontWeight: '800' },
  stepBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
    gap: 8,
  },
  stepPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  stepPillActive: { backgroundColor: colors.orangeLight, borderColor: colors.orange },
  stepPillText: { color: colors.textDim, fontSize: 12, fontWeight: '700' },
  stepPillTextActive: { color: colors.orange },
  stepLine: { width: 24, height: 2, backgroundColor: colors.cardBorder },
  scroll: { padding: 16, paddingBottom: 40 },
  matchCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  matchLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  matchTitle: { color: colors.text, fontSize: 22, fontWeight: '800', marginTop: 4 },
  vsText: { color: colors.textDim, fontWeight: '600', fontSize: 16 },
  target: { color: colors.orange, fontWeight: '700', marginTop: 8, fontSize: 15 },
  sectionTitle: { color: colors.text, fontSize: 16, fontWeight: '800', marginBottom: 6 },
  sectionHint: { color: colors.textMuted, fontSize: 14, marginBottom: 16 },
  tossRow: { flexDirection: 'row', gap: 12 },
  tossCard: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: colors.cardBorder,
    backgroundColor: colors.card,
    minHeight: 160,
    justifyContent: 'center',
  },
  tossCardOn: {
    borderColor: colors.orange,
    backgroundColor: colors.orangeLight,
  },
  tossAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  tossAvatarText: { color: '#fff', fontWeight: '800', fontSize: 18 },
  tossName: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 8,
  },
  tossNameOn: { color: colors.orange },
  battingTag: {
    backgroundColor: colors.orange,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  battingTagText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  tapHint: { color: colors.textDim, fontSize: 12 },
  summaryBox: {
    marginTop: 16,
    padding: 14,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    gap: 8,
  },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  summaryLabel: { color: colors.textMuted, fontSize: 13, width: 64 },
  summaryValue: { flex: 1, color: colors.text, fontWeight: '600', fontSize: 14 },
  summaryValueHi: { color: colors.orange, fontWeight: '800' },
  backStep: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  backStepText: { color: colors.orange, fontWeight: '600', fontSize: 14 },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: radius.lg,
    marginBottom: 10,
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
    gap: 12,
  },
  playerRowFilled: {
    borderColor: 'rgba(234, 88, 12, 0.35)',
    backgroundColor: colors.orangeLight,
  },
  playerRowDisabled: { opacity: 0.5 },
  playerIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  playerIconFilled: { backgroundColor: '#fff', borderColor: colors.orange },
  playerBody: { flex: 1 },
  playerLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  playerTeam: { color: colors.textDim, fontSize: 11, marginTop: 2 },
  playerName: { color: colors.text, fontSize: 16, fontWeight: '700', marginTop: 2 },
  playerPlaceholder: { color: colors.textDim, fontWeight: '500' },
});
