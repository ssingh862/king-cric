import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import { SafeAreaView } from "react-native-safe-area-context";
import { LiveBadge } from "../../src/components/ui/LiveBadge";
import {
  MatchCompleteCard,
  type TeamInningsSummary,
} from "../../src/components/cricket/MatchCompleteCard";
import { MatchResultModal } from "../../src/components/cricket/MatchResultModal";
import { useMatch } from "../../src/hooks/useTournaments";
import {
  useMatchInnings,
  useTeamPlayers,
} from "../../src/hooks/useMatchScoring";
import { formatOvers, runRate } from "../../src/lib/scoring";
import { maxWicketsForSquad } from "../../src/lib/cricket/rules";
import {
  autoFinalizeMatch,
  matchNeedsMotm,
  type MatchOutcome,
} from "../../src/lib/matchFlow";
import { colors, radius } from "../../src/lib/theme";
import { useScoringStore } from "../../src/stores/scoringStore";
import {
  completeInnings,
  deleteMatch,
  fetchActiveInnings,
} from "../../src/lib/matches";
import { canManageTournament } from "../../src/lib/permissions";
import { isApiConfigured } from "../../src/lib/api";
import { useAuthStore } from "../../src/stores/authStore";
import type { Innings } from "../../src/types/database";

export default function MatchScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const profile = useAuthStore((s) => s.profile);
  const { data: match, isLoading, refetch: refetchMatch } = useMatch(id ?? "");
  const { data: allInnings, refetch: refetchInnings } = useMatchInnings(
    id ?? "",
  );
  const { data: teamAPlayers } = useTeamPlayers(match?.team_a_id ?? "");
  const { data: teamBPlayers } = useTeamPlayers(match?.team_b_id ?? "");
  const { innings, events, loadEvents, subscribeRealtime, initFromInnings } =
    useScoringStore();

  const [matchOutcome, setMatchOutcome] = useState<MatchOutcome | null>(null);
  const [syncingInnings, setSyncingInnings] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const finalizeAttempted = useRef(false);

  const playerNames = useMemo(() => {
    const m = new Map<string, string>();
    [...(teamAPlayers ?? []), ...(teamBPlayers ?? [])].forEach((p) =>
      m.set(p.id, p.full_name),
    );
    return m;
  }, [teamAPlayers, teamBPlayers]);

  const activeInnings =
    allInnings?.find((i) => i.status === "in_progress") ?? innings;

  const refreshMatchView = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        refetchMatch(),
        refetchInnings(),
        queryClient.invalidateQueries({ queryKey: ["match", id] }),
        queryClient.invalidateQueries({ queryKey: ["match-innings", id] }),
        queryClient.invalidateQueries({ queryKey: ["match-score-events", id] }),
        queryClient.invalidateQueries({ queryKey: ["matches", "live"] }),
        queryClient.invalidateQueries({ queryKey: ["matches", "completed"] }),
      ]);
      if (activeInnings?.id) {
        await loadEvents(activeInnings.id);
      }
    } finally {
      setRefreshing(false);
    }
  }, [
    activeInnings?.id,
    id,
    loadEvents,
    queryClient,
    refetchInnings,
    refetchMatch,
  ]);

  const onRefresh = useCallback(async () => {
    await refreshMatchView();
  }, [refreshMatchView]);
  const firstInnings = allInnings?.find((i) => i.innings_number === 1);
  const secondInnings = allInnings?.find((i) => i.innings_number === 2);
  const isMatchComplete = match?.status === "completed";
  const needsMotm = matchNeedsMotm(match, allInnings as Innings[] | undefined);

  const motmName = useMemo(() => {
    const motmId = match?.man_of_the_match_player_id;
    if (!motmId) return null;
    return playerNames.get(motmId) ?? null;
  }, [match?.man_of_the_match_player_id, playerNames]);

  const motmReason = useMemo(() => {
    const summary = match?.result_summary ?? "";
    const parsed = summary.match(
      /Player of the Match:\s*[^(\n]+(?:\(([^)]+)\))?/i,
    );
    return parsed?.[1]?.trim() ?? null;
  }, [match?.result_summary]);

  const playerTeamIds = useMemo(() => {
    const m = new Map<string, string>();
    [...(teamAPlayers ?? [])].forEach((p) =>
      m.set(p.id, match?.team_a_id ?? ""),
    );
    [...(teamBPlayers ?? [])].forEach((p) =>
      m.set(p.id, match?.team_b_id ?? ""),
    );
    return m;
  }, [teamAPlayers, teamBPlayers, match?.team_a_id, match?.team_b_id]);

  const winnerName = useMemo(() => {
    if (!match?.winner_team_id)
      return match?.result_summary?.includes("tied") ? "Match tied" : "";
    if (match.winner_team_id === match.team_a_id) {
      return match.team_a?.name ?? "Team A";
    }
    return match.team_b?.name ?? "Team B";
  }, [match]);

  useEffect(() => {
    if (!id || !isApiConfigured()) return;

    let unsubscribe: (() => void) | undefined;
    let cancelled = false;

    (async () => {
      const { innings: inn } = await fetchActiveInnings(id);
      if (cancelled || !inn) return;
      initFromInnings(inn as never);
      await loadEvents(inn.id);
      unsubscribe = subscribeRealtime(inn.id);
    })();

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [id]);

  const syncStuckInnings = useCallback(async () => {
    if (!match || !allInnings?.length || syncingInnings) return;
    setSyncingInnings(true);

    for (const inn of allInnings) {
      if (inn.status === "completed") continue;
      const squad =
        inn.batting_team_id === match.team_a_id
          ? (teamAPlayers?.length ?? 0)
          : (teamBPlayers?.length ?? 0);
      if (squad <= 0) continue;
      const maxWkts = maxWicketsForSquad(squad);
      const maxBalls = (match.overs_per_innings ?? 20) * 6;
      const wholeOvers = Math.floor(inn.total_overs ?? 0);
      const ballsInPartial = Math.round(
        ((inn.total_overs ?? 0) - wholeOvers) * 10,
      );
      const legalBalls = wholeOvers * 6 + ballsInPartial;
      const allOut = inn.total_wickets >= maxWkts;
      const oversDone = legalBalls >= maxBalls;
      const targetReached =
        inn.innings_number === 2 &&
        inn.target_runs != null &&
        inn.total_runs >= inn.target_runs;

      if (allOut || oversDone || targetReached) {
        await completeInnings(inn.id);
      }
    }

    await refetchInnings();
    await refetchMatch();
    setSyncingInnings(false);
  }, [
    match,
    allInnings,
    teamAPlayers?.length,
    teamBPlayers?.length,
    syncingInnings,
    refetchInnings,
    refetchMatch,
  ]);

  useEffect(() => {
    if (!match?.id || !allInnings?.length) return;
    void syncStuckInnings();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run when innings list loads/updates
  }, [
    match?.id,
    allInnings?.map((i) => `${i.id}:${i.status}:${i.total_wickets}`).join("|"),
  ]);

  const runAutoFinalize = useCallback(async () => {
    if (!id || finalizing) return;
    setFinalizing(true);
    const { error, outcome } = await autoFinalizeMatch(
      id,
      playerNames,
      playerTeamIds,
    );
    setFinalizing(false);

    if (error) {
      Alert.alert("Could not finish match", error);
      return;
    }
    if (!outcome) return;

    await queryClient.invalidateQueries({ queryKey: ["match", id] });
    await queryClient.invalidateQueries({
      queryKey: ["tournament-matches", outcome.tournamentId],
    });
    await queryClient.invalidateQueries({ queryKey: ["matches", "completed"] });
    await queryClient.invalidateQueries({ queryKey: ["matches", "live"] });
    await queryClient.invalidateQueries({
      queryKey: ["points", outcome.tournamentId],
    });
    setMatchOutcome(outcome);
    await refetchMatch();
  }, [id, finalizing, playerNames, playerTeamIds, queryClient, refetchMatch]);

  useEffect(() => {
    if (!needsMotm || !canManageTournament(match?.tournament ?? null, profile))
      return;
    if (finalizeAttempted.current || finalizing) return;
    finalizeAttempted.current = true;
    void runAutoFinalize();
  }, [needsMotm, match, profile, finalizing, runAutoFinalize]);

  const teamA = match?.team_a?.short_name ?? match?.team_a?.name ?? "Team A";
  const teamB = match?.team_b?.short_name ?? match?.team_b?.name ?? "Team B";
  const state = useScoringStore.getState().getSnapshot();

  const inn1Runs = firstInnings?.total_runs ?? 0;
  const inn1Wkts = firstInnings?.total_wickets ?? 0;
  const inn2Runs =
    secondInnings?.total_runs ??
    (activeInnings?.innings_number === 2 ? activeInnings.total_runs : null);
  const inn2Wkts = secondInnings?.total_wickets ?? 0;

  const battingNow = activeInnings?.batting_team_id;
  const teamABatting =
    battingNow === match?.team_a_id || (!battingNow && !secondInnings);

  const teamAFull = match?.team_a?.name ?? "Team A";
  const teamBFull = match?.team_b?.name ?? "Team B";

  const legalBallsFromOvers = (totalOvers: number) => {
    const whole = Math.floor(totalOvers);
    const balls = Math.round((totalOvers - whole) * 10);
    return whole * 6 + balls;
  };

  const buildTeamSummary = useCallback(
    (
      teamId: string | undefined,
      code: string,
      name: string,
      color?: string,
    ): TeamInningsSummary => {
      if (!teamId) {
        return {
          code,
          name,
          color,
          runs: null,
          wickets: 0,
          overs: null,
          runRate: null,
          inningsLabel: null,
        };
      }
      const inn =
        firstInnings?.batting_team_id === teamId
          ? firstInnings
          : secondInnings?.batting_team_id === teamId
            ? secondInnings
            : null;
      if (!inn) {
        return {
          code,
          name,
          color,
          runs: null,
          wickets: 0,
          overs: null,
          runRate: null,
          inningsLabel: null,
        };
      }
      const overs = inn.total_overs ?? 0;
      const legalBalls = legalBallsFromOvers(overs);
      return {
        code,
        name,
        color,
        runs: inn.total_runs ?? 0,
        wickets: inn.total_wickets ?? 0,
        overs,
        runRate: runRate(inn.total_runs ?? 0, legalBalls || 1),
        inningsLabel: inn.innings_number === 1 ? "1st Inn" : "2nd Inn",
      };
    },
    [firstInnings, secondInnings],
  );

  const teamASummary = useMemo(
    () =>
      buildTeamSummary(
        match?.team_a_id,
        teamA,
        teamAFull,
        match?.team_a?.primary_color,
      ),
    [
      buildTeamSummary,
      match?.team_a_id,
      match?.team_a?.primary_color,
      teamA,
      teamAFull,
    ],
  );

  const teamBSummary = useMemo(
    () =>
      buildTeamSummary(
        match?.team_b_id,
        teamB,
        teamBFull,
        match?.team_b?.primary_color,
      ),
    [
      buildTeamSummary,
      match?.team_b_id,
      match?.team_b?.primary_color,
      teamB,
      teamBFull,
    ],
  );

  if (isLoading && isApiConfigured()) {
    return (
      <View style={[styles.root, styles.center]}>
        <ActivityIndicator color={colors.orange} size="large" />
      </View>
    );
  }

  const hasInnings = (allInnings?.length ?? 0) > 0;
  const canSetup = match?.status !== "completed" && !hasInnings;
  const canOrganize = canManageTournament(match?.tournament ?? null, profile);
  const canDelete = isApiConfigured() && canOrganize;
  const showLive =
    !isMatchComplete && (match?.status === "live" || !!activeInnings);

  const openScorecard = () => {
    if (!id || !hasInnings) return;
    router.push({
      pathname: "/match/scorecard/[matchId]",
      params: { matchId: id, innings: "1" },
    });
  };

  const confirmDeleteMatch = () => {
    if (!id || !match) return;
    const label = `${match.team_a?.short_name ?? match.team_a?.name} vs ${match.team_b?.short_name ?? match.team_b?.name}`;
    Alert.alert(
      "Delete match?",
      `This permanently removes "${label}" and all ball-by-ball data.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            const { error } = await deleteMatch(id);
            if (error) {
              Alert.alert("Could not delete", error);
              return;
            }
            useScoringStore.getState().reset();
            const tournamentId = match.tournament_id;
            await queryClient.invalidateQueries({ queryKey: ["match", id] });
            await queryClient.invalidateQueries({
              queryKey: ["tournament-matches", tournamentId],
            });
            await queryClient.invalidateQueries({
              queryKey: ["matches", "live"],
            });
            await queryClient.invalidateQueries({
              queryKey: ["matches", "completed"],
            });
            if (tournamentId) {
              router.replace(`/tournament/${tournamentId}`);
            } else {
              router.back();
            }
          },
        },
      ],
    );
  };

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.flex}>
        <View style={styles.topBar}>
          <Pressable style={styles.back} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </Pressable>
          <View style={styles.topRightActions}>
            {canDelete && (
              <Pressable style={styles.deleteBtn} onPress={confirmDeleteMatch}>
                <Ionicons name="trash-outline" size={22} color={colors.live} />
                <Text style={styles.deleteText}>Delete</Text>
              </Pressable>
            )}
          </View>
        </View>

        <ScrollView
          style={styles.flex}
          contentContainerStyle={
            isMatchComplete ? styles.completeScroll : styles.liveScroll
          }
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.orange}
              colors={[colors.orange]}
            />
          }
        >
          {isMatchComplete ? (
            <MatchCompleteCard
              winnerName={winnerName}
              resultSummary={match?.result_summary}
              teamA={teamASummary}
              teamB={teamBSummary}
              tournamentName={match?.tournament?.name}
              motmName={motmName}
              motmReason={motmReason}
              onPressScorecard={hasInnings ? openScorecard : undefined}
            />
          ) : null}

          {needsMotm && canOrganize && (
            <View style={styles.finalizeBanner}>
              <ActivityIndicator color={colors.orange} />
              <View style={styles.finalizeText}>
                <Text style={styles.finalizeTitle}>Match finished</Text>
                <Text style={styles.finalizeSub}>
                  Calculating Player of the Match…
                </Text>
              </View>
            </View>
          )}

          {!isMatchComplete ? (
            <Pressable
              onPress={openScorecard}
              disabled={!hasInnings}
              style={({ pressed }) => [
                styles.scoreboard,
                pressed && hasInnings && styles.scoreboardPressed,
              ]}
            >
              <View style={styles.scoreHeader}>
                <View style={styles.scoreHeaderLeft}>
                  {showLive && <LiveBadge />}
                  <Text style={styles.tournament}>
                    {match?.tournament?.name ?? "Match"}
                  </Text>
                </View>
                {hasInnings && (
                  <Pressable
                    style={styles.scorecardBtn}
                    onPress={openScorecard}
                  >
                    <Ionicons
                      name="document-text"
                      size={20}
                      color={colors.orange}
                    />
                    <Text style={styles.scorecardBtnText}>Scorecard</Text>
                  </Pressable>
                )}
              </View>

              <View style={styles.scoreMain}>
                <View style={styles.teamScore}>
                  <Text
                    style={styles.teamLabel}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {teamA}
                  </Text>
                  {teamABatting || !hasInnings ? (
                    <>
                      <Text style={styles.runs}>
                        {activeInnings?.batting_team_id === match?.team_a_id ||
                        !hasInnings
                          ? `${innings?.total_runs ?? teamASummary.runs ?? 0}/${innings?.total_wickets ?? teamASummary.wickets ?? 0}`
                          : `${teamASummary.runs ?? 0}/${teamASummary.wickets ?? 0}`}
                      </Text>
                      {(activeInnings?.batting_team_id === match?.team_a_id ||
                        (!secondInnings && hasInnings)) &&
                        activeInnings && (
                          <Text style={styles.overs}>
                            ({formatOvers(state.legalBalls)} ov) RR{" "}
                            {runRate(
                              innings?.total_runs ?? teamASummary.runs ?? 0,
                              state.legalBalls || 1,
                            )}
                          </Text>
                        )}
                    </>
                  ) : (
                    <Text style={styles.runs}>
                      {teamASummary.runs ?? 0}/{teamASummary.wickets ?? 0}
                    </Text>
                  )}
                </View>
                <Text style={styles.vs}>vs</Text>
                <View style={[styles.teamScore, styles.alignEnd]}>
                  <Text
                    style={styles.teamLabel}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {teamB}
                  </Text>
                  {!teamABatting && activeInnings ? (
                    <>
                      <Text style={styles.runs}>
                        {inn2Runs ?? innings?.total_runs ?? 0}/
                        {inn2Wkts ?? innings?.total_wickets ?? 0}
                      </Text>
                      <Text style={styles.overs}>
                        ({formatOvers(state.legalBalls)} ov) RR{" "}
                        {runRate(
                          inn2Runs ?? innings?.total_runs ?? 0,
                          state.legalBalls || 1,
                        )}
                      </Text>
                    </>
                  ) : secondInnings ? (
                    <Text style={styles.runs}>
                      {teamBSummary.runs ?? 0}/{teamBSummary.wickets ?? 0}
                    </Text>
                  ) : (
                    <Text style={styles.runsMuted}>Yet to bat</Text>
                  )}
                </View>
              </View>
            </Pressable>
          ) : null}

          <View style={styles.actions}>
            {canOrganize && canSetup && (
              <Pressable
                style={styles.scoreBtn}
                onPress={() =>
                  router.push({
                    pathname: "/match/setup",
                    params: { matchId: id, innings: "1" },
                  })
                }
              >
                <LinearGradient
                  colors={[colors.purple, colors.blue]}
                  style={styles.scoreBtnGrad}
                >
                  <Ionicons name="play" size={20} color="#fff" />
                  <Text style={styles.scoreBtnText}>Start Match & Score</Text>
                </LinearGradient>
              </Pressable>
            )}

            {canOrganize &&
              firstInnings?.status === "completed" &&
              !secondInnings &&
              match?.status !== "completed" && (
                <Pressable
                  style={styles.scoreBtn}
                  onPress={() =>
                    router.push({
                      pathname: "/match/setup",
                      params: {
                        matchId: id,
                        innings: "2",
                        target: String((firstInnings.total_runs ?? 0) + 1),
                      },
                    })
                  }
                >
                  <LinearGradient
                    colors={[colors.purple, colors.blue]}
                    style={styles.scoreBtnGrad}
                  >
                    <Ionicons name="play-forward" size={20} color="#fff" />
                    <Text style={styles.scoreBtnText}>Start 2nd Innings</Text>
                  </LinearGradient>
                </Pressable>
              )}

            {canOrganize && activeInnings && !isMatchComplete && (
              <Pressable
                style={styles.scoreBtn}
                onPress={() => router.push(`/score/${id}`)}
              >
                <LinearGradient
                  colors={[colors.orange, colors.pink]}
                  style={styles.scoreBtnGrad}
                >
                  <Ionicons name="create" size={20} color="#fff" />
                  <Text style={styles.scoreBtnText}>Open Scoring Pad</Text>
                </LinearGradient>
              </Pressable>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>

      <MatchResultModal
        visible={!!matchOutcome}
        outcome={matchOutcome}
        onDone={() => {
          setMatchOutcome(null);
          refetchMatch();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  center: { alignItems: "center", justifyContent: "center" },
  flex: { flex: 1 },
  completeScroll: { flexGrow: 1, paddingTop: 4, paddingBottom: 32 },
  liveScroll: { flexGrow: 1, paddingBottom: 32 },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 8,
  },
  topRightActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginRight: 4,
  },
  back: { padding: 16 },
  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  deleteText: { color: colors.live, fontWeight: "700", fontSize: 14 },
  scorecardBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: colors.card,
  },
  scorecardBtnText: { color: colors.orange, fontWeight: "700", fontSize: 14 },
  finalizeBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 14,
    borderRadius: 14,
    backgroundColor: colors.warningLight,
    borderWidth: 1,
    borderColor: colors.gold,
  },
  finalizeText: { flex: 1 },
  finalizeTitle: { color: colors.text, fontWeight: "800", fontSize: 15 },
  finalizeSub: {
    color: colors.orange,
    fontSize: 13,
    fontWeight: "600",
    marginTop: 2,
  },
  scoreboard: {
    marginHorizontal: 24,
    marginBottom: 12,
    padding: 22,
    borderRadius: radius.lg,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  scoreboardPressed: {
    backgroundColor: colors.orangeLight,
    borderColor: colors.orange,
  },
  scorecardHintText: { color: colors.orange, fontSize: 13, fontWeight: "700" },
  actions: { paddingHorizontal: 16, marginTop: 12 },
  scoreHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between", // new — pushes right group to the edge
    marginBottom: 16,
    paddingHorizontal: 12,
  },

  scoreHeaderLeft: {
    // new
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1, // takes remaining space, so button doesn't get squeezed left
    minWidth: 0,
  },
  tournament: {
    color: colors.textMuted,
    fontSize: 13,
    flexShrink: 1, // new — long tournament names truncate instead of pushing button off
  },
  scoreMain: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
  },
  teamScore: { flex: 1, minWidth: 2, paddingHorizontal: 4 },
  alignEnd: { alignItems: "flex-end" },
  teamLabel: { color: colors.textMuted, fontSize: 14 },
  runs: { color: colors.text, fontSize: 36, fontWeight: "800", marginTop: 4 },
  runsMuted: { color: colors.textDim, fontSize: 16, marginTop: 8 },
  overs: { color: colors.textMuted, fontSize: 12, marginTop: 4 },
  vs: { color: colors.textDim, marginHorizontal: 16, fontSize: 14 },
  scoreBtn: { marginBottom: 8, borderRadius: 14, overflow: "hidden" },
  scoreBtnGrad: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
  },
  scoreBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
