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
import { maxLegalBalls } from '../lib/cricket/rules';
import { canDismissOnFreeHit, normalizeWicketType } from '../lib/cricket/rules';
import type { MatchRules } from '../lib/cricket/types';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { computeOnCreaseFromEvents } from '../lib/inningsPlayers';
import { syncInningsToDb } from '../lib/inningsSync';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

export type RecordBallFollowUp = 'new_batsman' | 'new_bowler' | 'innings_complete';

export interface RecordBallResult {
  error: string | null;
  followUp?: RecordBallFollowUp;
  endOfOverPending?: boolean;
  inningsCompleteReason?: 'all_out' | 'overs_complete' | 'target_reached';
}

let activeChannel: RealtimeChannel | null = null;
let activeInningsId: string | null = null;
let realtimeRefCount = 0;

function teardownRealtime() {
  if (activeChannel) {
    void supabase.removeChannel(activeChannel);
    activeChannel = null;
    activeInningsId = null;
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

    if (isSupabaseConfigured() && !last.id.startsWith('demo-')) {
      const { error } = await supabase.from('score_events').delete().eq('id', last.id);
      if (error) return { error: error.message };
    }

    const remaining = unique.filter((e) => e.id !== last.id);
    const crease = applyCreaseFromEvents(innings, remaining, matchRules);
    const snap = replayInnings(innings, remaining, matchRules);

    if (isSupabaseConfigured()) {
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
    if (!isSupabaseConfigured()) return;
    const { data } = await supabase
      .from('score_events')
      .select('*')
      .eq('innings_id', inningsId)
      .order('created_at', { ascending: true });
    const events = dedupeScoreEvents(data ?? []);
    const { innings, matchRules } = get();
    set({ events, ...applyCreaseFromEvents(innings, events, matchRules) });
  },

  subscribeRealtime: (inningsId) => {
    if (!isSupabaseConfigured()) return () => {};

    if (activeInningsId === inningsId && activeChannel) {
      realtimeRefCount += 1;
      return () => {
        realtimeRefCount -= 1;
        if (realtimeRefCount <= 0) teardownRealtime();
      };
    }

    teardownRealtime();

    const channelName = `innings:${inningsId}`;
    activeInningsId = inningsId;
    realtimeRefCount = 1;

    activeChannel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'score_events',
          filter: `innings_id=eq.${inningsId}`,
        },
        (payload) => {
          const event = payload.new as ScoreEvent;
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
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'score_events',
          filter: `innings_id=eq.${inningsId}`,
        },
        (payload) => {
          const removed = payload.old as ScoreEvent;
          set((s) => {
            const merged = s.events.filter((e) => e.id !== removed.id);
            return { events: merged, ...applyCreaseFromEvents(s.innings, merged, s.matchRules) };
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'innings',
          filter: `id=eq.${inningsId}`,
        },
        (payload) => {
          const inn = payload.new as Innings;
          set((s) => ({
            innings: {
              ...inn,
              striker_player_id: s.strikerId ?? inn.striker_player_id,
              non_striker_player_id: s.nonStrikerId ?? inn.non_striker_player_id,
              current_bowler_id: s.bowlerId ?? inn.current_bowler_id,
            },
          }));
        }
      )
      .subscribe();

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
    if (!strikerId || !nonStrikerId || !bowlerId) {
      return { error: 'Select striker, non-striker and bowler first' };
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

    const crease = applyPostBallCrease(
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
    );

    const nextFreeHit =
      input.ballType === 'no_ball' && matchRules.freeHitOnNoBall
        ? true
        : legal
          ? false
          : freeHitActive;

    if (!isSupabaseConfigured()) {
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
      return followUpAfterBall(isWicket, crease.endOfOver, snap, matchRules);
    }

    const { data, error } = await supabase
      .from('score_events')
      .insert({ innings_id: innings.id, ...payload })
      .select()
      .single();

    if (error) return { error: error.message };

    const newEvents = data
      ? mergeScoreEvents(get().events, [data as ScoreEvent])
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

    return followUpAfterBall(isWicket, crease.endOfOver, snap, matchRules);
  },
}));

function followUpAfterBall(
  isWicket: boolean,
  endOfOver: boolean,
  snap: ReturnType<typeof replayInnings>,
  rules: MatchRules
): RecordBallResult {
  if (snap.isInningsComplete || snap.totalWickets >= rules.maxWickets) {
    return {
      error: null,
      followUp: 'innings_complete',
      inningsCompleteReason: snap.completionReason,
    };
  }
  if (isWicket) {
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

/** Use tournament/match overs exactly (e.g. 8 overs = 48 balls). */
export function initMatchRulesFromOvers(oversPerInnings: number) {
  return rulesForFormat('custom', oversPerInnings);
}
