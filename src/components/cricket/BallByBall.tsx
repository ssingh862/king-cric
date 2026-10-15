import { Text } from '../../i18n';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../lib/api';
import { colors, createThemedStyles, radius } from '../../lib/theme';
import type { ScoreEvent } from '../../types/database';
import { useTeamPlayers } from '../../hooks/useMatchScoring';

function deliveryLabel(over: number, ball: number) {
  return `${over > 0 ? over - 1 : 0}.${ball}`;
}

function outcome(ball: ScoreEvent): { label: string; extra: number; tone: 'four' | 'six' | 'wide' | 'wicket' | 'run' | 'dot' } {
  if (ball.ball_type === 'wide') {
    const extra = Math.max(0, ball.extras - 1);
    return { label: 'Wide', extra, tone: 'wide' };
  }
  if (ball.ball_type === 'no_ball') {
    return { label: 'No ball', extra: ball.runs_off_bat, tone: 'wide' };
  }
  if (ball.ball_type === 'bye' || ball.ball_type === 'leg_bye') {
    return { label: ball.ball_type === 'bye' ? 'Bye' : 'Leg bye', extra: ball.extras, tone: 'run' };
  }
  if (ball.is_wicket) return { label: 'W', extra: 0, tone: 'wicket' };
  if (ball.ball_type === 'four' || ball.runs_off_bat === 4) return { label: '4', extra: 0, tone: 'four' };
  if (ball.ball_type === 'six' || ball.runs_off_bat === 6) return { label: '6', extra: 0, tone: 'six' };
  const runs = ball.runs_off_bat || (ball.ball_type === 'one' ? 1 : ball.ball_type === 'two' ? 2 : ball.ball_type === 'three' ? 3 : 0);
  return { label: String(runs), extra: 0, tone: runs === 0 ? 'dot' : 'run' };
}

export function BallByBall({ matchId, teamAId, teamBId }: { matchId: string; teamAId?: string; teamBId?: string }) {
  const events = useQuery({
    queryKey: ['match-score-events', matchId],
    enabled: !!matchId,
    queryFn: () => api<{ eventsByInnings: Record<string, ScoreEvent[]> }>(`/matches/${matchId}/score-events`),
    refetchInterval: 8000,
  });
  const teamA = useTeamPlayers(teamAId ?? '');
  const teamB = useTeamPlayers(teamBId ?? '');
  const [shown, setShown] = useState(10);
  const names = new Map<string, string>();
  for (const player of [...(teamA.data ?? []), ...(teamB.data ?? [])]) names.set(player.id, player.full_name);
  const balls = Object.values(events.data?.eventsByInnings ?? {}).flat().reverse();
  if (!balls.length) return null;
  const visible = balls.slice(0, shown);
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.mark}><Ionicons name="baseball" size={18} color="#fff" /></View>
        <View style={{ flex: 1 }}>
          <Text style={styles.kicker}>Commentary</Text>
          <Text style={styles.title}>Ball by ball</Text>
        </View>
        <Text style={styles.count}>{balls.length}</Text>
      </View>
      {visible.map((ball, index) => {
        const result = outcome(ball);
        const dismissal = ball.is_wicket ? (ball.wicket_type ?? 'wicket').replace('_', ' ') : '';
        return (
          <View key={ball.id ?? `${ball.over_number}-${ball.ball_in_over}-${index}`} style={styles.line}>
            <View style={styles.badge}><Text style={styles.badgeText}>{deliveryLabel(ball.over_number, ball.ball_in_over)}</Text></View>
            <View style={[styles.result, styles[result.tone]]}>
              <Text style={[styles.resultText, styles[`${result.tone}Text`]]}>{result.label}{result.extra > 0 ? `+${result.extra}` : ''}</Text>
            </View>
            <Text style={styles.detail}>
              {names.get(ball.bowler_player_id) ?? 'Bowler'} <Text>to</Text> {names.get(ball.striker_player_id) ?? 'Batter'}
              {dismissal ? <> · <Text>{dismissal}</Text></> : null}
            </Text>
          </View>
        );
      })}
      {shown < balls.length ? (
        <Pressable onPress={() => setShown((count) => count + 10)} accessibilityRole="button">
          <Text style={styles.more}>More</Text>
        </Pressable>
      ) : shown > 10 ? (
        <Pressable onPress={() => setShown(10)} accessibilityRole="button">
          <Text style={styles.more}>Show less</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = createThemedStyles({
  card: { marginTop: 16, borderRadius: radius.lg, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.cardBorder, overflow: 'hidden' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, backgroundColor: colors.forest },
  mark: { width: 36, height: 36, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center' },
  kicker: { color: colors.lime, fontSize: 11, fontWeight: '800', letterSpacing: 0.6 },
  title: { color: '#fff', fontWeight: '800', fontSize: 18 },
  count: { color: '#fff', fontWeight: '800', fontSize: 16 },
  line: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.cardBorder },
  badge: { minWidth: 46, paddingVertical: 4, borderRadius: 8, backgroundColor: colors.orangeLight, alignItems: 'center' },
  badgeText: { color: colors.orange, fontWeight: '800', fontSize: 13 },
  result: { minWidth: 54, paddingVertical: 4, paddingHorizontal: 8, borderRadius: 8, alignItems: 'center' },
  resultText: { fontWeight: '800', fontSize: 13 },
  four: { backgroundColor: '#E0F2FE' },
  fourText: { color: colors.blue },
  six: { backgroundColor: '#FEF3C7' },
  sixText: { color: colors.gold },
  wide: { backgroundColor: colors.warningLight },
  wideText: { color: colors.gold },
  wicket: { backgroundColor: colors.liveLight },
  wicketText: { color: colors.live },
  run: { backgroundColor: colors.surface },
  runText: { color: colors.text },
  dot: { backgroundColor: colors.surface },
  dotText: { color: colors.textMuted },
  detail: { flex: 1, color: colors.text, fontSize: 13, lineHeight: 18 },
  more: { color: colors.orange, fontWeight: '800', margin: 14 },
});
