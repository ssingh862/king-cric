import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Text } from '../src/i18n';
import { colors, createThemedStyles } from '../src/lib/theme';

const BALLS = 6;
const BEST_KEY = 'street_cricket_best_v2';

type Level = 'normal' | 'medium' | 'hard';
type Phase = 'ready' | 'live' | 'gap' | 'over';

const LEVELS: Record<Level, { label: string; speed: number; width: number; sweet: number; low: number; high: number }> = {
  normal: { label: 'Normal', speed: 1.55, width: 28, sweet: 7, low: 8, high: 16 },
  medium: { label: 'Medium', speed: 2.45, width: 18, sweet: 4, low: 12, high: 22 },
  hard: { label: 'Hard', speed: 3.5, width: 12, sweet: 2.4, low: 18, high: 30 },
};

function targetFor(level: Level) {
  const { low, high } = LEVELS[level];
  return low + Math.floor(Math.random() * (high - low + 1));
}

function zoneFor(level: Level) {
  const width = LEVELS[level].width;
  const start = 8 + Math.floor(Math.random() * (84 - width));
  return { start, end: start + width };
}

export default function PlayScreen() {
  const [level, setLevel] = useState<Level>('normal');
  const [phase, setPhase] = useState<Phase>('ready');
  const [target, setTarget] = useState(12);
  const [runs, setRuns] = useState(0);
  const [balls, setBalls] = useState(0);
  const [wickets, setWickets] = useState(0);
  const [marker, setMarker] = useState(0);
  const [zone, setZone] = useState({ start: 36, end: 64 });
  const [call, setCall] = useState('Pick a level, then play.');
  const [bests, setBests] = useState<Record<Level, number>>({ normal: 0, medium: 0, hard: 0 });
  const [celebrate, setCelebrate] = useState<number | null>(null);
  const markerRef = useRef(0);
  const zoneRef = useRef(zone);
  const levelRef = useRef(level);
  const locked = useRef(false);
  const bestsRef = useRef(bests);
  bestsRef.current = bests;
  const burst = useRef(new Animated.Value(0)).current;
  levelRef.current = level;

  useEffect(() => {
    void AsyncStorage.getItem(BEST_KEY).then((value) => {
      if (!value) return;
      try {
        const parsed = JSON.parse(value) as Partial<Record<Level, number>>;
        setBests({ normal: parsed.normal ?? 0, medium: parsed.medium ?? 0, hard: parsed.hard ?? 0 });
      } catch {
        const n = Number(value);
        if (Number.isFinite(n)) setBests({ normal: n, medium: 0, hard: 0 });
      }
    });
  }, []);

  useEffect(() => {
    if (phase !== 'live') return;
    const nextZone = zoneFor(levelRef.current);
    zoneRef.current = nextZone;
    setZone(nextZone);
    locked.current = false;
    markerRef.current = 0;
    setMarker(0);
    let frame = 0;
    const speed = LEVELS[levelRef.current].speed;
    const id = setInterval(() => {
      frame += speed;
      if (frame >= 100) {
        clearInterval(id);
        settle('miss');
        return;
      }
      markerRef.current = frame;
      setMarker(frame);
    }, 16);
    return () => clearInterval(id);
  }, [phase, balls]);

  function showBest(score: number) {
    setCelebrate(score);
    burst.setValue(0);
    Animated.spring(burst, { toValue: 1, friction: 5, tension: 80, useNativeDriver: true }).start();
  }

  function remember(score: number) {
    const key = levelRef.current;
    if (score <= bestsRef.current[key]) return;
    const next = { ...bestsRef.current, [key]: score };
    bestsRef.current = next;
    setBests(next);
    void AsyncStorage.setItem(BEST_KEY, JSON.stringify(next));
    showBest(score);
  }

  function settle(kind: 'miss' | 'shot') {
    if (locked.current) return;
    locked.current = true;
    const spot = markerRef.current;
    const band = zoneRef.current;
    const rules = LEVELS[levelRef.current];
    const mid = (band.start + band.end) / 2;
    let add = 0;
    let out = false;
    let text = 'Dot ball';
    if (kind === 'miss') {
      out = true;
      text = 'Too late — bowled!';
    } else if (Math.abs(spot - mid) <= rules.sweet) {
      add = 6;
      text = 'SIX! Into the trees.';
    } else if (spot >= band.start && spot <= band.end) {
      add = 4;
      text = 'FOUR! Along the ground.';
    } else if (Math.abs(spot - mid) <= rules.width) {
      add = spot < mid ? 1 : 2;
      text = add === 2 ? 'Quick two.' : 'Single.';
    } else if (Math.abs(spot - mid) <= rules.width + 10) {
      text = 'Beaten. Dot ball.';
    } else {
      out = true;
      text = 'Swung too early — caught!';
    }
    const nextRuns = runs + add;
    const nextBalls = balls + 1;
    const nextWickets = wickets + (out ? 1 : 0);
    setRuns(nextRuns);
    setBalls(nextBalls);
    setWickets(nextWickets);
    setCall(text);
    const done = nextWickets > 0 || nextBalls >= BALLS;
    if (done) remember(nextRuns);
    setPhase('gap');
    setTimeout(() => setPhase(done ? 'over' : 'live'), 900);
  }

  function play() {
    setCelebrate(null);
    setTarget(targetFor(level));
    setRuns(0);
    setBalls(0);
    setWickets(0);
    setCall('Watch the ball. Tap Shot in the green.');
    setPhase('live');
  }

  const won = runs >= target && wickets === 0;
  const need = Math.max(target - runs, 0);
  const best = bests[level];

  return (
    <View style={s.root}>
      <SafeAreaView style={s.flex}>
        <View style={s.top}>
          <Pressable accessibilityLabel="Back" onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </Pressable>
          <Text style={s.title}>Gully Sixes</Text>
          <Text style={s.best}>Best {best}</Text>
        </View>

        <View style={s.levels}>
          {(Object.keys(LEVELS) as Level[]).map((key) => {
            const on = key === level;
            return (
              <Pressable
                key={key}
                disabled={phase === 'live' || phase === 'gap'}
                onPress={() => { setLevel(key); setCall(`${LEVELS[key].label} selected.`); }}
                style={[s.level, on && s.levelOn]}
              >
                <Text style={[s.levelText, on && s.levelTextOn]}>{LEVELS[key].label}</Text>
              </Pressable>
            );
          })}
        </View>

        {phase === 'ready' ? (
          <ScrollView style={s.grow} contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
            <View style={s.poster}>
              <Text style={s.posterKicker}>ONE OVER</Text>
              <Text style={s.posterTitle}>Time the shot</Text>
              <View style={s.steps}>
                <Text style={s.step}>1  The ball runs across the pitch</Text>
                <Text style={s.step}>2  Tap Shot on the green for a four</Text>
                <Text style={s.step}>3  Hit the bright stripe for a six</Text>
              </View>
              <Text style={s.posterSub}>6 balls. One wicket. Beat the target.</Text>
            </View>
          </ScrollView>
        ) : (
          <>
            <View style={s.board}>
              <Text style={s.targetLabel}>Target</Text>
              <Text style={s.target}>{target}</Text>
              <Text style={s.score}>{runs}<Text style={s.scoreSmall}>/{wickets}</Text></Text>
              <Text style={s.meta}>{phase === 'over' ? (won ? 'Chase complete' : 'Innings over') : `${need} needed · ${BALLS - balls} balls left`}</Text>
              <View style={s.balls}>
                {Array.from({ length: BALLS }, (_, i) => (
                  <View key={i} style={[s.ball, i < balls && s.ballDone]} />
                ))}
              </View>
            </View>
            <View style={s.pitch}>
              <Text style={s.call}>{call}</Text>
              <View style={s.track}>
                <View style={[s.green, { left: `${zone.start}%`, width: `${zone.end - zone.start}%` }]} />
                <View style={[s.sweet, { left: `${(zone.start + zone.end) / 2 - 2}%` }]} />
                <View style={[s.marker, { left: `${Math.min(marker, 98)}%` }]} />
              </View>
              <Text style={s.hint}>Green is a four. The bright stripe is a six.</Text>
            </View>
          </>
        )}

        {phase === 'over' ? (
          <View style={s.footer}>
            <Text style={s.result}>{won ? 'You won the street.' : 'The bowler had the last laugh.'}</Text>
            <Pressable style={s.shot} onPress={play}>
              <Text style={s.shotText}>Play again</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable
            style={[s.shot, phase === 'gap' && s.shotOff]}
            disabled={phase === 'gap'}
            onPress={() => (phase === 'ready' ? play() : settle('shot'))}
          >
            <Text style={s.shotText}>{phase === 'ready' ? 'Play' : 'Shot'}</Text>
          </Pressable>
        )}

        {celebrate != null ? (
          <Animated.View
            pointerEvents="none"
            style={[s.burst, { opacity: burst, transform: [{ scale: burst.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) }] }]}
          >
            <Ionicons name="star" size={28} color={colors.lime} />
            <Text style={s.burstTitle}>New best</Text>
            <Text style={s.burstScore}>{celebrate}</Text>
            <Text style={s.burstLevel}>{LEVELS[level].label}</Text>
          </Animated.View>
        ) : null}
      </SafeAreaView>
    </View>
  );
}

const s = createThemedStyles({
  root: { flex: 1, backgroundColor: colors.forest },
  flex: { flex: 1, paddingHorizontal: 20, paddingTop: 8 },
  grow: { flex: 1 },
  scroll: { paddingBottom: 8 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { color: '#fff', fontSize: 18, fontWeight: '800' },
  best: { color: colors.lime, fontWeight: '800' },
  levels: { flexDirection: 'row', gap: 8, marginTop: 18 },
  level: { flex: 1, paddingVertical: 10, paddingHorizontal: 6, borderRadius: 14, borderWidth: 1, borderColor: '#3D6B52', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0C2A1E' },
  levelOn: { backgroundColor: colors.lime, borderColor: colors.lime },
  levelText: { color: '#C6D8C9', fontWeight: '800', fontSize: 13, textAlign: 'center' },
  levelTextOn: { color: colors.forest },
  poster: { marginTop: 22, padding: 22, borderRadius: 28, borderWidth: 1, borderColor: '#3D6B52', backgroundColor: '#1D563B' },
  posterKicker: { color: colors.lime, fontSize: 12, fontWeight: '800', letterSpacing: 0.4 },
  posterTitle: { color: '#fff', fontSize: 32, lineHeight: 42, fontWeight: '800', marginTop: 8 },
  steps: { marginTop: 22, gap: 12 },
  step: { color: '#fff', fontSize: 16, lineHeight: 24, fontWeight: '700' },
  posterSub: { color: '#C6D8C9', marginTop: 22, fontSize: 15, lineHeight: 22 },
  board: { alignItems: 'center', marginTop: 14, backgroundColor: '#0C2A1E', borderRadius: 24, paddingVertical: 18, paddingHorizontal: 16 },
  targetLabel: { color: '#C6D8C9', fontSize: 12, fontWeight: '700', letterSpacing: 1 },
  target: { color: colors.lime, fontSize: 22, fontWeight: '900', marginTop: 2 },
  score: { color: '#fff', fontSize: 64, fontWeight: '900' },
  scoreSmall: { fontSize: 28, color: '#C6D8C9' },
  meta: { color: '#C6D8C9', marginTop: 2, fontSize: 14 },
  balls: { flexDirection: 'row', gap: 8, marginTop: 14 },
  ball: { width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: colors.lime },
  ballDone: { backgroundColor: colors.lime },
  pitch: { flex: 1, justifyContent: 'center' },
  call: { color: '#fff', fontSize: 22, fontWeight: '800', textAlign: 'center', marginBottom: 22 },
  track: { height: 36, borderRadius: 18, backgroundColor: '#081910', overflow: 'hidden', justifyContent: 'center', borderWidth: 1, borderColor: '#3D6B52' },
  green: { position: 'absolute', top: 0, bottom: 0, backgroundColor: '#2F7D49' },
  sweet: { position: 'absolute', top: 0, bottom: 0, width: '4%', backgroundColor: colors.lime },
  marker: { position: 'absolute', width: 22, height: 22, borderRadius: 11, backgroundColor: '#fff', borderWidth: 3, borderColor: colors.lime, marginLeft: -11 },
  hint: { color: '#C6D8C9', textAlign: 'center', marginTop: 12, fontSize: 13 },
  footer: { marginBottom: 8 },
  result: { color: '#fff', textAlign: 'center', fontSize: 16, fontWeight: '700', marginBottom: 12 },
  shot: { backgroundColor: colors.lime, borderRadius: 18, paddingVertical: 18, alignItems: 'center', marginTop: 16, marginBottom: 16 },
  shotOff: { opacity: 0.45 },
  shotText: { color: colors.forest, fontSize: 22, fontWeight: '900' },
  burst: { position: 'absolute', left: 36, right: 36, top: '32%', backgroundColor: '#123D2B', borderRadius: 28, borderWidth: 2, borderColor: colors.lime, paddingVertical: 28, alignItems: 'center', gap: 6 },
  burstTitle: { color: colors.lime, fontSize: 28, fontWeight: '900' },
  burstScore: { color: '#fff', fontSize: 56, fontWeight: '900' },
  burstLevel: { color: '#C6D8C9', fontWeight: '700' },
});
