import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState } from 'react';
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
import { ActivePlayersBar } from '../../src/components/cricket/ActivePlayersBar';
import { ChaseBanner } from '../../src/components/cricket/ChaseBanner';
import { InningsFormatBanner } from '../../src/components/cricket/InningsFormatBanner';
import { MatchResultModal } from '../../src/components/cricket/MatchResultModal';
import { MotmPickerModal } from '../../src/components/cricket/MotmPickerModal';
import { MatchPlayerStats } from '../../src/components/cricket/MatchPlayerStats';
import { PartnershipPanel } from '../../src/components/cricket/PartnershipPanel';
import { PlayerPickerModal, type PickerRole } from '../../src/components/cricket/PlayerPickerModal';
import { CurrentOverPanel } from '../../src/components/cricket/CurrentOverPanel';
import { RecentBallsStrip } from '../../src/components/cricket/RecentBallsStrip';
import { RemainingSquadBar } from '../../src/components/cricket/RemainingSquadBar';
import { ScoreboardHeader } from '../../src/components/cricket/ScoreboardHeader';
import { ScoringPad } from '../../src/components/cricket/ScoringPad';
import {
  WicketPickerModal,
  type WicketSelection,
} from '../../src/components/cricket/WicketPickerModal';
import { useMatch } from '../../src/hooks/useTournaments';
import { useTeamPlayers } from '../../src/hooks/useMatchScoring';
import { computeChaseStatus } from '../../src/lib/cricket/chase';
import {
  applyNewBatsmanToCrease,
  getRemainingBatters,
  vacantCreaseSlot,
} from '../../src/lib/inningsPlayers';
import { dedupeScoreEvents } from '../../src/lib/scoring';
import {
  afterInningsCompleted,
  finalizeMatchWithMotm,
  type MatchOutcome,
} from '../../src/lib/matchFlow';
import { canManageTournament } from '../../src/lib/permissions';
import {
  useScoringStore,
  initMatchRulesFromOvers,
  type RecordBallFollowUp,
  type RecordBallResult,
} from '../../src/stores/scoringStore';
import { colors } from '../../src/lib/theme';
import type { BallType, Player } from '../../src/types/database';
import { isSupabaseConfigured, supabase } from '../../src/lib/supabase';
import { useAuthStore } from '../../src/stores/authStore';

export default function ScoringScreen() {
  const { matchId } = useLocalSearchParams<{ matchId: string }>();
  const queryClient = useQueryClient();
  const profile = useAuthStore((s) => s.profile);
  const { data: match } = useMatch(matchId ?? '');
  const {
    innings,
    events,
    recordBall,
    loadEvents,
    subscribeRealtime,
    initFromInnings,
    setPlayers,
    setMatchRules,
    syncPlayersToDb,
    undoLastBall,
    getSnapshot,
    strikerId,
    nonStrikerId,
    bowlerId,
    matchRules,
    freeHitActive,
  } = useScoringStore();

  const [loading, setLoading] = useState(true);
  const [pickerRole, setPickerRole] = useState<PickerRole | null>(null);
  const [followUp, setFollowUp] = useState<RecordBallFollowUp | null>(null);
  const [pendingBowlerAfterBatsman, setPendingBowlerAfterBatsman] = useState(false);
  const [scoringBusy, setScoringBusy] = useState(false);
  const [wicketPickerOpen, setWicketPickerOpen] = useState(false);
  const [matchOutcome, setMatchOutcome] = useState<MatchOutcome | null>(null);
  const [pendingOutcome, setPendingOutcome] = useState<MatchOutcome | null>(null);
  const [motmPickerOpen, setMotmPickerOpen] = useState(false);
  const [motmSaving, setMotmSaving] = useState(false);
  const [endingInnings, setEndingInnings] = useState(false);

  const battingTeamId = innings?.batting_team_id ?? '';
  const bowlingTeamId = innings?.bowling_team_id ?? '';
  const { data: batters } = useTeamPlayers(battingTeamId);
  const { data: bowlers } = useTeamPlayers(bowlingTeamId);
  const { data: teamAPlayers } = useTeamPlayers(match?.team_a_id ?? '');
  const { data: teamBPlayers } = useTeamPlayers(match?.team_b_id ?? '');

  const motmPlayers = useMemo(() => {
    const byId = new Map<string, Player>();
    [...(teamAPlayers ?? []), ...(teamBPlayers ?? [])].forEach((p) => byId.set(p.id, p));
    return [...byId.values()].sort((a, b) => a.full_name.localeCompare(b.full_name));
  }, [teamAPlayers, teamBPlayers]);

  const canOrganize = useMemo(
    () => (match && profile ? canManageTournament(match.tournament, profile) : true),
    [match, profile]
  );

  useEffect(() => {
    if (!match || !profile || canOrganize) return;
    Alert.alert('Organizer only', 'Only the tournament organizer can score this match.', [
      { text: 'OK', onPress: () => router.replace(`/match/${matchId}`) },
    ]);
  }, [match, profile, canOrganize, matchId]);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    let cancelled = false;

    (async () => {
      setLoading(true);
      if (!matchId) {
        setLoading(false);
        return;
      }
      const { data: inn } = await supabase
        .from('innings')
        .select('*')
        .eq('match_id', matchId)
        .eq('status', 'in_progress')
        .maybeSingle();
      if (cancelled) return;
      if (inn) {
        initFromInnings(inn);
        await loadEvents(inn.id);
        unsubscribe = subscribeRealtime(inn.id);
      }
      setLoading(false);
    })();

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [matchId]);

  useEffect(() => {
    if (match?.overs_per_innings) {
      setMatchRules(initMatchRulesFromOvers(match.overs_per_innings));
    }
  }, [match?.overs_per_innings, setMatchRules]);

  const uniqueEvents = useMemo(() => dedupeScoreEvents(events), [events]);
  const snapshot = getSnapshot();
  const runs = innings?.total_runs ?? snapshot.totalRuns;
  const wickets = innings?.total_wickets ?? snapshot.totalWickets;
  const chase = useMemo(
    () =>
      computeChaseStatus(
        runs,
        snapshot.legalBalls,
        innings?.target_runs,
        matchRules
      ),
    [runs, snapshot.legalBalls, innings?.target_runs, matchRules]
  );

  const playerMap = useMemo(() => {
    const m = new Map<string, Player>();
    [...(batters ?? []), ...(bowlers ?? [])].forEach((p) => m.set(p.id, p));
    return m;
  }, [batters, bowlers]);

  const playerNames = useMemo(() => {
    const m = new Map<string, string>();
    playerMap.forEach((p, id) => m.set(id, p.full_name));
    return m;
  }, [playerMap]);

  const remainingBatters = useMemo(
    () => getRemainingBatters(batters ?? [], uniqueEvents, { strikerId, nonStrikerId }),
    [batters, uniqueEvents, strikerId, nonStrikerId]
  );

  const newBatsmanSlot = vacantCreaseSlot({ strikerId, nonStrikerId });
  const newBatsmanPickerSubtitle =
    newBatsmanSlot === 'non_striker'
      ? 'Non-striker is out — choose who comes in at the non-striker end'
      : 'Striker is out — choose who comes in to face';

  const battingName =
    match?.team_a?.id === battingTeamId
      ? match.team_a.name
      : match?.team_b?.name ?? 'Batting';

  const bowlingName =
    match?.team_a?.id === bowlingTeamId
      ? match.team_a.name
      : match?.team_b?.name ?? 'Bowling';

  const finishInningsFlow = useCallback(
    async (reason?: string) => {
      if (!innings || !matchId || endingInnings) return;
      setEndingInnings(true);
      await syncPlayersToDb();
      const { error, next } = await afterInningsCompleted(matchId, innings);
      setEndingInnings(false);
      useScoringStore.getState().reset();

      if (error) {
        Alert.alert('Error', error);
        return;
      }

      if (next.step === 'start_innings_2') {
        Alert.alert(
          reason ?? 'Innings 1 complete',
          `Target: ${next.target} runs. Start the 2nd innings.`,
          [
            {
              text: 'Start 2nd innings',
              onPress: () =>
                router.replace({
                  pathname: '/match/setup',
                  params: { matchId, innings: '2', target: String(next.target) },
                }),
            },
          ]
        );
        return;
      }

      if (next.step === 'pick_motm') {
        setPendingOutcome(next.outcome);
        setMotmPickerOpen(true);
        return;
      }

      router.replace(`/match/${matchId}`);
    },
    [innings, matchId, endingInnings, syncPlayersToDb]
  );

  const onMotmSelect = useCallback(
    async (player: Player) => {
      if (!pendingOutcome || !matchId) return;
      setMotmSaving(true);
      const { error, outcome } = await finalizeMatchWithMotm(
        matchId,
        pendingOutcome,
        player.id,
        player.full_name
      );
      setMotmSaving(false);

      if (error) {
        Alert.alert('Could not save match', error);
        return;
      }

      setMotmPickerOpen(false);
      setPendingOutcome(null);
      await queryClient.invalidateQueries({
        queryKey: ['points', pendingOutcome.tournamentId],
      });
      await queryClient.invalidateQueries({
        queryKey: ['tournament-matches', pendingOutcome.tournamentId],
      });
      await queryClient.invalidateQueries({ queryKey: ['match', matchId] });
      await queryClient.invalidateQueries({ queryKey: ['matches', 'completed'] });
      await queryClient.invalidateQueries({ queryKey: ['matches', 'live'] });
      setMatchOutcome(outcome);
    },
    [pendingOutcome, matchId, queryClient]
  );

  const handleInningsComplete = useCallback(
    (result: RecordBallResult) => {
      const reason =
        result.inningsCompleteReason === 'overs_complete'
          ? `${matchRules.oversPerInnings} overs complete`
          : result.inningsCompleteReason === 'target_reached'
            ? 'Target reached'
            : 'All out';

      Alert.alert('Innings over', `${reason}. End this innings now?`, [
        { text: 'Continue', style: 'cancel' },
        { text: 'End innings', onPress: () => finishInningsFlow(reason) },
      ]);
    },
    [finishInningsFlow, matchRules.oversPerInnings]
  );

  const endInnings = useCallback(() => {
    Alert.alert('End innings?', 'Mark this innings as completed.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'End innings', onPress: () => finishInningsFlow() },
    ]);
  }, [finishInningsFlow]);

  const onBall = async (type: BallType, opts?: { isWicket?: boolean }) => {
    if (scoringBusy || followUp) return;
    if (!strikerId || !nonStrikerId || !bowlerId) {
      Alert.alert('Select players', 'Choose striker, non-striker and bowler before scoring.');
      return;
    }
    if (opts?.isWicket || type === 'wicket') {
      setWicketPickerOpen(true);
      return;
    }
    setScoringBusy(true);
    const result = await recordBall({ ballType: type });
    setScoringBusy(false);

    if (result.error) {
      Alert.alert('Cannot score', result.error);
      return;
    }

    if (result.followUp === 'innings_complete') {
      handleInningsComplete(result);
      return;
    }

    if (result.followUp === 'new_batsman') {
      const { events: ev, strikerId: s, nonStrikerId: ns } = useScoringStore.getState();
      const remaining = getRemainingBatters(batters ?? [], ev, {
        strikerId: s,
        nonStrikerId: ns,
      });
      if (remaining.length === 0) {
        Alert.alert('All out', 'No batters left. End this innings?', [
          { text: 'Continue', style: 'cancel' },
          { text: 'End innings', onPress: () => finishInningsFlow('All out') },
        ]);
        return;
      }
    }

    if (result.followUp) {
      if (result.followUp === 'new_batsman' && result.endOfOverPending) {
        setPendingBowlerAfterBatsman(true);
      }
      setFollowUp(result.followUp);
    }
  };

  const onFollowUpSelect = async (p: Player) => {
    if (followUp === 'new_batsman') {
      const crease = useScoringStore.getState();
      const next = applyNewBatsmanToCrease(p.id, {
        strikerId: crease.strikerId,
        nonStrikerId: crease.nonStrikerId,
        bowlerId: crease.bowlerId,
      });
      if (!next) {
        Alert.alert('Cannot set batter', 'Crease is full or bowler is missing.');
        return;
      }
      setPlayers(next.strikerId, next.nonStrikerId, next.bowlerId);
      await syncPlayersToDb();
      if (pendingBowlerAfterBatsman) {
        setPendingBowlerAfterBatsman(false);
        setFollowUp('new_bowler');
        return;
      }
      setFollowUp(null);
      return;
    }
    if (followUp === 'new_bowler') {
      const { strikerId: s, nonStrikerId: ns } = useScoringStore.getState();
      if (!ns) return;
      const striker = s ?? p.id;
      setPlayers(striker, ns, p.id);
      await syncPlayersToDb();
      setFollowUp(null);
    }
  };

  const onChangePlayers = () => {
    if (followUp) return;
    Alert.alert('Change players', 'What do you want to update?', [
      { text: 'Striker', onPress: () => setPickerRole('striker') },
      { text: 'Non-striker', onPress: () => setPickerRole('non_striker') },
      { text: 'Bowler', onPress: () => setPickerRole('bowler') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const onWicketConfirm = async (selection: WicketSelection) => {
    setWicketPickerOpen(false);
    if (scoringBusy || followUp) return;
    setScoringBusy(true);
    const result = await recordBall({
      ballType: 'wicket',
      isWicket: true,
      wicketType: selection.wicketType,
      dismissedPlayerId: selection.dismissedPlayerId,
    });
    setScoringBusy(false);
    if (result.error) {
      Alert.alert('Cannot score', result.error);
      return;
    }
    if (result.followUp === 'innings_complete') {
      handleInningsComplete(result);
      return;
    }
    if (result.followUp) {
      if (result.followUp === 'new_batsman' && result.endOfOverPending) {
        setPendingBowlerAfterBatsman(true);
      }
      setFollowUp(result.followUp);
    }
  };

  const onPickerSelect = async (p: Player) => {
    if (!pickerRole) return;
    const nextStriker = pickerRole === 'striker' ? p.id : strikerId;
    const nextNon = pickerRole === 'non_striker' ? p.id : nonStrikerId;
    const nextBowler = pickerRole === 'bowler' ? p.id : bowlerId;
    if (!nextStriker || !nextNon || !nextBowler) {
      Alert.alert('Select all players', 'Striker, non-striker and bowler are all required.');
      return;
    }
    setPlayers(nextStriker, nextNon, nextBowler);
    await syncPlayersToDb();
    setPickerRole(null);
  };

  if (match && profile && !canOrganize) {
    return (
      <View style={[styles.root, styles.center]}>
        <ActivityIndicator color={colors.orange} size="large" />
      </View>
    );
  }

  if (loading) {
    return (
      <View style={[styles.root, styles.center]}>
        <ActivityIndicator color={colors.orange} size="large" />
      </View>
    );
  }

  if (!innings) {
    return (
      <View style={[styles.root, styles.center]}>
        <Text style={styles.noInnings}>No active innings</Text>
        {canOrganize ? (
          <Pressable
            style={styles.setupBtn}
            onPress={() => router.replace({ pathname: '/match/setup', params: { matchId } })}
          >
            <Text style={styles.setupBtnText}>Start match setup</Text>
          </Pressable>
        ) : (
          <Pressable style={styles.setupBtn} onPress={() => router.replace(`/match/${matchId}`)}>
            <Text style={styles.setupBtnText}>Back to match</Text>
          </Pressable>
        )}
      </View>
    );
  }

  const pickerPlayers = pickerRole === 'bowler' ? bowlers ?? [] : batters ?? [];
  const playersReady = !!(strikerId && nonStrikerId && bowlerId);
  const padDisabled = scoringBusy || !!followUp || !playersReady;

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.flex}>
        <View style={styles.header}>
          <Pressable onPress={() => router.replace(`/match/${matchId}`)}>
            <Ionicons name="chevron-down" size={28} color={colors.text} />
          </Pressable>
          <Text style={styles.headerTitle}>Scoring</Text>
          <Pressable onPress={endInnings}>
            <Text style={styles.endText}>End</Text>
          </Pressable>
        </View>

        {followUp && (
          <View style={styles.followUpBanner}>
            <Ionicons name="alert-circle" size={18} color={colors.orange} />
            <Text style={styles.followUpText}>
              {followUp === 'new_batsman'
                ? newBatsmanSlot === 'non_striker'
                  ? 'Wicket — pick the new non-striker below'
                  : 'Wicket — pick the new striker below'
                : 'Over complete — pick the next bowler below'}
            </Text>
          </View>
        )}

        {freeHitActive && (
          <View style={styles.freeHitBanner}>
            <Text style={styles.freeHitText}>FREE HIT — next legal delivery</Text>
          </View>
        )}

        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <ScoreboardHeader
            battingTeam={battingName}
            bowlingTeam={bowlingName}
            runs={runs}
            wickets={wickets}
            legalBalls={snapshot.legalBalls}
            target={innings.target_runs}
            requiredRR={chase?.requiredRR}
            runsNeeded={chase?.runsNeeded}
            ballsRemaining={chase?.ballsRemaining}
            matchRules={matchRules}
            isLive
          />

          <ChaseBanner chase={chase} />

          <InningsFormatBanner rules={matchRules} legalBalls={snapshot.legalBalls} />

          {!playersReady && (
            <View style={styles.missingPlayers}>
              <Text style={styles.missingText}>
                Openers not loaded — tap Change to set striker, non-striker & bowler
              </Text>
              <Pressable style={styles.missingBtn} onPress={() => setPickerRole('striker')}>
                <Text style={styles.missingBtnText}>Set players</Text>
              </Pressable>
            </View>
          )}

          <ActivePlayersBar
            striker={strikerId ? playerMap.get(strikerId) : null}
            nonStriker={nonStrikerId ? playerMap.get(nonStrikerId) : null}
            bowler={bowlerId ? playerMap.get(bowlerId) : null}
            highlightVacant={followUp === 'new_batsman' ? newBatsmanSlot : null}
            onChangePlayers={followUp ? undefined : onChangePlayers}
          />

          <RemainingSquadBar label="Still to bat" players={remainingBatters} />

          <PartnershipPanel
            partnership={snapshot.partnership}
            playerNames={playerNames}
          />

          <CurrentOverPanel
            events={uniqueEvents}
            onUndoLast={async () => {
              setFollowUp(null);
              setPendingBowlerAfterBatsman(false);
              return undoLastBall();
            }}
            disabled={scoringBusy}
          />

          <RecentBallsStrip events={uniqueEvents} />

          {uniqueEvents.length > 0 && (
            <MatchPlayerStats
              events={uniqueEvents}
              playerNames={playerNames}
              title="Player stats (this innings)"
            />
          )}

          <ScoringPad onBall={onBall} disabled={padDisabled} />
        </ScrollView>

      </SafeAreaView>

      <PlayerPickerModal
        visible={followUp === 'new_batsman'}
        title={
          newBatsmanSlot === 'non_striker'
            ? 'Wicket — new non-striker'
            : 'Wicket — new striker'
        }
        subtitle={newBatsmanPickerSubtitle}
        players={remainingBatters}
        required
        onSelect={onFollowUpSelect}
      />

      <PlayerPickerModal
        visible={followUp === 'new_bowler'}
        title="Over complete"
        subtitle="Who bowls the next over?"
        players={bowlers ?? []}
        required
        onSelect={onFollowUpSelect}
      />

      <WicketPickerModal
        visible={wicketPickerOpen}
        striker={strikerId ? playerMap.get(strikerId) ?? null : null}
        nonStriker={nonStrikerId ? playerMap.get(nonStrikerId) ?? null : null}
        onConfirm={onWicketConfirm}
        onClose={() => setWicketPickerOpen(false)}
      />

      <MotmPickerModal
        visible={motmPickerOpen}
        outcome={pendingOutcome}
        players={motmPlayers}
        loading={motmSaving}
        onSelect={onMotmSelect}
        onClose={() => {
          if (motmSaving) return;
          Alert.alert(
            'Man of the Match required',
            'Pick a player to finish the match and update the points table.'
          );
        }}
      />

      <MatchResultModal
        visible={!!matchOutcome}
        outcome={matchOutcome}
        onDone={() => {
          setMatchOutcome(null);
          router.replace(`/match/${matchId}`);
        }}
      />

      <PlayerPickerModal
        visible={!!pickerRole}
        title={`Select ${pickerRole?.replace('_', ' ')}`}
        players={pickerPlayers}
        selectedId={
          pickerRole === 'striker'
            ? strikerId
            : pickerRole === 'non_striker'
              ? nonStrikerId
              : bowlerId
        }
        onSelect={onPickerSelect}
        onClose={() => setPickerRole(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center', padding: 24 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  headerTitle: { color: colors.text, fontSize: 17, fontWeight: '700' },
  endText: { color: colors.live, fontWeight: '700', fontSize: 14 },
  followUpBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255,107,0,0.15)',
    borderWidth: 1,
    borderColor: colors.orange,
  },
  followUpText: { flex: 1, color: colors.text, fontSize: 13, fontWeight: '600' },
  freeHitBanner: {
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(255,193,7,0.2)',
    borderWidth: 1,
    borderColor: '#ffc107',
  },
  freeHitText: { color: '#ffc107', fontWeight: '800', fontSize: 13, textAlign: 'center' },
  scroll: { padding: 16, paddingBottom: 32 },
  noInnings: { color: colors.textMuted, fontSize: 16, marginBottom: 16 },
  setupBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: colors.orange,
    borderRadius: 12,
  },
  setupBtnText: { color: '#fff', fontWeight: '700' },
  missingPlayers: {
    marginBottom: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255,23,68,0.12)',
    borderWidth: 1,
    borderColor: colors.live,
  },
  missingText: { color: colors.textMuted, fontSize: 13, marginBottom: 8 },
  missingBtn: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: colors.orange,
  },
  missingBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
});
