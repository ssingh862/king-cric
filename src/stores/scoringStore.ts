import { create } from 'zustand';
import type { Innings, ScoreEvent } from '../types/database';
import {
  applyPostBallCrease,
  buildBallPayload,
  dedupeScoreEvents,
  mergeScoreEvents,
  replayInnings,
  resolveRunsOffBat,
  resolveExtras,
  isLegalDelivery,
  type BallInput,
  type InningsState,
} from '../lib/cricket';
import { rulesForFormat } from '../lib/cricket/formats';
import { maxLegalBalls, maxWicketsForSquad } from '../lib/cricket/rules';
import { vacantCreaseSlot, consolidateLoneBatter, countRemainingBatters } from '../lib/inningsPlayers';
import { canDismissOnFreeHit, normalizeWicketType } from '../lib/cricket/rules';
import type { MatchRules } from '../lib/cricket/types';
import { syncInningsToDb } from '../lib/inningsSync';
import { api, apiSafe, isApiConfigured } from '../lib/api';
import { getSocket, joinInningsRoom, leaveInningsRoom } from '../lib/socket';

export type RecordBallFollowUp = 'new_batsman' | 'new_bowler' | 'innings_complete';

export interface RecordBallResult {
  error: string | null;
  followUp?: RecordBallFollowUp;
  endOfOverPending?: boolean;
  inningsCompleteReason?: 'all_out' | 'overs_complete' | 'target_reached';
}

let activeInningsId: string | null = null;
let realtimeRefCount = 0;
let scoreEventHandler: ((payload: { type: string; data: ScoreEvent }) => void) | null = null;
let inningsUpdateHandler: ((inn: Innings) => void) | null = null;

function teardownRealtime() {
  if (activeInningsId) {
    leaveInningsRoom(activeInningsId);
    const socket = getSocket();
    if (socket && scoreEventHandler) socket.off('score_event', scoreEventHandler);
    if (socket && inningsUpdateHandler) socket.off('innings_updated', inningsUpdateHandler);
    activeInningsId = null;
    scoreEventHandler = null;
    inningsUpdateHandler = null;
  }
  realtimeRefCount = 0;
}

interface ScoringState {
  innings: Innings | null;
  events: ScoreEvent[];
  matchRules: MatchRules;
  freeHitActive: boolean;
  isScoring: boolean;
  strikerId: string | null;
  nonStrikerId: string | null;
  bowlerId: string | null;
  setInnings: (innings: Innings) => void;
  setMatchRules: (rules: MatchRules) => void;
  setPlayers: (striker: string, nonStriker: string, bowler: string) => void;
  initFromInnings: (innings: Innings) => void;
  loadEvents: (inningsId: string) => Promise<void>;
  subscribeRealtime: (inningsId: string) => () => void;
  recordBall: (input: BallInput) => Promise<RecordBallResult>;
  syncPlayersToDb: () => Promise<void>;
  undoLastBall: () => Promise<{ error: string | null }>;
  getSnapshot: () => ReturnType<typeof replayInnings>;
  getState: () => InningsState;
  reset: () => void;
}

const defaultRules = rulesForFormat('t20', 20);

const empty = {
  innings: null as Innings | null,
  events: [] as ScoreEvent[],
  matchRules: defaultRules,
  freeHitActive: false,
  isScoring: false,
  strikerId: null as string | null,
  nonStrikerId: null as string | null,
  bowlerId: null as string | null,
};

function applyCreaseFromEvents(
  innings: Innings | null,
  events: ScoreEvent[],
  rules: MatchRules
) {
  const snap = replayInnings(innings, dedupeScoreEvents(events), rules);
  return {
    strikerId: snap.strikerId,
    nonStrikerId: snap.nonStrikerId,
    bowlerId: snap.bowlerId,
    freeHitActive: snap.freeHitNext,
  };
}

export const useScoringStore = create<ScoringState>((set, get) => ({
  ...empty,

  setInnings: (innings) => set({ innings }),

  setMatchRules: (matchRules) => set({ matchRules }),

  initFromInnings: (innings) => {
    const { events, matchRules } = get();
    set({
      innings,
      ...applyCreaseFromEvents(innings, events, matchRules),
    });
  },

  setPlayers: (strikerId, nonStrikerId, bowlerId) =>
    set({ strikerId, nonStrikerId, bowlerId }),

  syncPlayersToDb: async () => {
    const { innings, events, matchRules, strikerId, nonStrikerId, bowlerId } = get();
    if (!innings) return;
    const unique = dedupeScoreEvents(events);
    const result = await syncInningsToDb(innings, unique, matchRules, {
      strikerId,
      nonStrikerId,
      bowlerId,
    });
    if (result.error) return;
    const { snap } = result;
    set({
      innings: {
        ...innings,
        total_runs: snap.totalRuns,
        total_wickets: snap.totalWickets,
        striker_player_id: strikerId,
        non_striker_player_id: nonStrikerId,
        current_bowler_id: bowlerId,
      },
      strikerId,
      nonStrikerId,
      bowlerId,
      freeHitActive: snap.freeHitNext,
    });
  },

  undoLastBall: async () => {
    const { innings, events, matchRules } = get();
    if (!innings || !events.length) return { error: 'No ball to undo' };

    const unique = dedupeScoreEvents(events);
    const last = unique[unique.length - 1];

    if (isApiConfigured() && !last.id.startsWith('demo-')) {
      const { error } = await apiSafe(`/matches/score-events/${last.id}`, { method: 'DELETE' });
      if (error) return { error };
    }

    const remaining = unique.filter((e) => e.id !== last.id);
    const crease = applyCreaseFromEvents(innings, remaining, matchRules);
    const snap = replayInnings(innings, remaining, matchRules);

    if (isApiConfigured()) {
      await syncInningsToDb(innings, remaining, matchRules);
    }

    set({
      events: remaining,
      ...crease,
      innings: {
        ...innings,
        total_runs: snap.totalRuns,
        total_wickets: snap.totalWickets,
      },
    });

    return { error: null };
  },

  reset: () => {
    teardownRealtime();
    set(empty);
  },

  loadEvents: async (inningsId) => {
    if (!isApiConfigured()) return;
    const data = await api<ScoreEvent[]>(`/matches/innings/${inningsId}/score-events`);
    const events = dedupeScoreEvents(data ?? []);
    const { innings, matchRules } = get();
    set({ events, ...applyCreaseFromEvents(innings, events, matchRules) });
  },

  subscribeRealtime: (inningsId) => {
    if (!isApiConfigured()) return () => {};

    if (activeInningsId === inningsId) {
      realtimeRefCount += 1;
      return () => {
        realtimeRefCount -= 1;
        if (realtimeRefCount <= 0) teardownRealtime();
      };
    }

    teardownRealtime();
    activeInningsId = inningsId;
    realtimeRefCount = 1;

    const socket = getSocket();
    if (!socket) return () => {};

    scoreEventHandler = (payload: { type: string; data: ScoreEvent }) => {
      if (payload.type === 'INSERT') {
        const event = payload.data;
        set((s) => {
          if (s.events.some((e) => e.id === event.id)) return s;
          const merged = mergeScoreEvents(s.events, [event]);
          const crease = applyCreaseFromEvents(s.innings, merged, s.matchRules);
          return {
            events: merged,
            strikerId: crease.strikerId ?? s.strikerId,
            nonStrikerId: crease.nonStrikerId ?? s.nonStrikerId,
            bowlerId: crease.bowlerId ?? s.bowlerId,
            freeHitActive: crease.freeHitActive,
          };
        });
      } else if (payload.type === 'DELETE') {
        const removed = payload.data;
        set((s) => {
          const merged = s.events.filter((e) => e.id !== removed.id);
          return { events: merged, ...applyCreaseFromEvents(s.innings, merged, s.matchRules) };
        });
      }
    };

    inningsUpdateHandler = (inn: Innings) => {
      set((s) => ({
        innings: {
          ...inn,
          striker_player_id: s.strikerId ?? inn.striker_player_id,
          non_striker_player_id: s.nonStrikerId ?? inn.non_striker_player_id,
          current_bowler_id: s.bowlerId ?? inn.current_bowler_id,
        },
      }));
    };

    socket.on('score_event', scoreEventHandler);
    socket.on('innings_updated', inningsUpdateHandler);
    joinInningsRoom(inningsId);

    return () => {
      realtimeRefCount -= 1;
      if (realtimeRefCount <= 0) teardownRealtime();
    };
  },

  getSnapshot: () => {
    const { innings, events, matchRules } = get();
    return replayInnings(innings, dedupeScoreEvents(events), matchRules);
  },

  getState: () => {
    const snap = get().getSnapshot();
    return snap;
  },

  recordBall: async (input) => {
    const {
      innings,
      strikerId,
      nonStrikerId,
      bowlerId,
      events,
      matchRules,
      freeHitActive,
    } = get();
    if (!innings) return { error: 'No innings — start match setup first' };
    if (!strikerId || !bowlerId) {
      return { error: 'Select striker and bowler first' };
    }
    if (!nonStrikerId && !events.length) {
      return { error: 'Select non-striker before the first ball' };
    }

    const isWicket = input.isWicket ?? input.ballType === 'wicket';
    const wicketType = normalizeWicketType(input.wicketType);

    if (isWicket && freeHitActive && !canDismissOnFreeHit(wicketType)) {
      return { error: 'On a free hit only run out (or obstructing) is allowed' };
    }

    const unique = dedupeScoreEvents(events);
    const state = get().getSnapshot();
    const legal = isLegalDelivery(input.ballType);
    const maxBalls = maxLegalBalls(matchRules);

    if (legal && state.legalBalls >= maxBalls) {
      return {
        error: `Innings over (${matchRules.oversPerInnings} overs). End this innings.`,
      };
    }

    const runsOffBat = resolveRunsOffBat(input);
    const extras = resolveExtras(input, matchRules);

    const ballInput: BallInput = {
      ...input,
      isWicket,
      dismissedPlayerId: isWicket
        ? (input.dismissedPlayerId ?? strikerId)
        : input.dismissedPlayerId,
    };

    const payload = buildBallPayload(state, ballInput, {
      strikerId,
      nonStrikerId,
      bowlerId,
    }, matchRules);

    const crease = consolidateLoneBatter(
      applyPostBallCrease(
        strikerId,
        nonStrikerId,
        {
          ballType: input.ballType,
          runsOffBat,
          extras,
          isWicket,
          dismissedPlayerId: ballInput.dismissedPlayerId,
        },
        payload.ball_in_over,
        legal,
        matchRules.ballsPerOver
      )
    );

    const endOfOver = isLegalDelivery(input.ballType) && payload.ball_in_over === matchRules.ballsPerOver;

    const nextFreeHit =
      input.ballType === 'no_ball' && matchRules.freeHitOnNoBall
        ? true
        : legal
          ? false
          : freeHitActive;

    if (!isApiConfigured()) {
      const demoEvent: ScoreEvent = {
        id: `demo-${Date.now()}`,
        innings_id: innings.id,
        ...payload,
        created_at: new Date().toISOString(),
      };
      const newEvents = mergeScoreEvents(events, [demoEvent]);
      const snap = replayInnings(innings, newEvents, matchRules);
      set({
        events: newEvents,
        innings: {
          ...innings,
          total_runs: snap.totalRuns,
          total_wickets: snap.totalWickets,
        },
        strikerId: crease.strikerId,
        nonStrikerId: crease.nonStrikerId,
        freeHitActive: snap.freeHitNext,
      });
      return followUpAfterBall(isWicket, endOfOver, snap, matchRules, crease);
    }

    const { data, error } = await apiSafe<ScoreEvent>(
      `/matches/innings/${innings.id}/score-events`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );

    if (error) return { error };

    const newEvents = data
      ? mergeScoreEvents(get().events, [data])
      : get().events;

    const snap = replayInnings(innings, newEvents, matchRules);

    set({
      events: newEvents,
      strikerId: crease.strikerId,
      nonStrikerId: crease.nonStrikerId,
      bowlerId,
      freeHitActive: snap.freeHitNext,
    });

    await get().syncPlayersToDb();

    return followUpAfterBall(isWicket, endOfOver, snap, matchRules, crease);
  },
}));

function followUpAfterBall(
  isWicket: boolean,
  endOfOver: boolean,
  snap: ReturnType<typeof replayInnings>,
  rules: MatchRules,
  crease: { strikerId: string | null; nonStrikerId: string | null }
): RecordBallResult {
  if (snap.isInningsComplete || snap.totalWickets >= rules.maxWickets) {
    return {
      error: null,
      followUp: 'innings_complete',
      inningsCompleteReason: snap.completionReason,
    };
  }
  if (isWicket) {
    const vacant = vacantCreaseSlot(crease);
    if (!vacant) {
      if (endOfOver) return { error: null, followUp: 'new_bowler' };
      return { error: null };
    }
    const squadSize = rules.battingSquadSize;
    if (squadSize) {
      const remaining = countRemainingBatters(squadSize, snap.totalWickets, crease);
      if (remaining <= 0) {
        if (endOfOver) return { error: null, followUp: 'new_bowler' };
        return { error: null };
      }
    }
    return {
      error: null,
      followUp: 'new_batsman',
      endOfOverPending: endOfOver,
    };
  }
  if (endOfOver) {
    return { error: null, followUp: 'new_bowler' };
  }
  return { error: null };
}

/** Use tournament/match overs; squad size sets when the innings is all out. */
export function initMatchRulesFromOvers(oversPerInnings: number, squadSize?: number) {
  const rules = rulesForFormat('custom', oversPerInnings);
  if (squadSize != null && squadSize > 0) {
    return {
      ...rules,
      maxWickets: maxWicketsForSquad(squadSize),
      battingSquadSize: squadSize,
    };
  }
  return rules;
}
