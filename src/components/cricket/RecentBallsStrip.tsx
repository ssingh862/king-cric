import { ScrollView, StyleSheet, Text, View } from 'react-native';
import type { ScoreEvent } from '../../types/database';
import { dedupeScoreEvents } from '../../lib/scoring';
import { colors } from '../../lib/theme';

interface RecentBallsStripProps {
  events: ScoreEvent[];
}

function ballLabel(e: ScoreEvent): string {
  if (e.is_wicket) return 'W';
  const total = e.runs_off_bat + e.extras;
  if (e.ball_type === 'wide') return `Wd+${e.extras}`;
  if (e.ball_type === 'no_ball') return `Nb+${e.extras}`;
  if (total === 0) return '•';
  return String(total);
}

export function RecentBallsStrip({ events }: RecentBallsStripProps) {
  const recent = dedupeScoreEvents(events).slice(-12).reverse();

  if (!recent.length) {
    return (
      <Text style={styles.empty}>Tap runs below to score ball-by-ball</Text>
    );
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>This over</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scroll}>
        {recent.map((e, index) => (
          <View
            key={`${e.id}-${index}`}
            style={[
              styles.ball,
              e.ball_type === 'six' && styles.six,
              e.ball_type === 'four' && styles.four,
              e.is_wicket && styles.wicket,
            ]}
          >
            <Text style={styles.ballText}>{ballLabel(e)}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 12 },
  title: { color: colors.textMuted, fontSize: 12, marginBottom: 8, fontWeight: '600' },
  empty: { color: colors.textDim, fontSize: 13, marginBottom: 12 },
  scroll: { flexDirection: 'row' },
  ball: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  ballText: { color: colors.text, fontWeight: '800', fontSize: 13 },
  four: { backgroundColor: 'rgba(0,180,216,0.25)', borderColor: colors.blue },
  six: { backgroundColor: 'rgba(255,107,0,0.35)', borderColor: colors.orange },
  wicket: { backgroundColor: 'rgba(255,23,68,0.35)', borderColor: colors.live },
});
