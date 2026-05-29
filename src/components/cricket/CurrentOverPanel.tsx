import { Ionicons } from '@expo/vector-icons';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import type { ScoreEvent } from '../../types/database';
import { getBallsInCurrentOver } from '../../lib/inningsSync';
import { formatOverSummary } from '../../lib/cricket/overSummary';
import { colors, radius } from '../../lib/theme';

interface CurrentOverPanelProps {
  events: ScoreEvent[];
  onUndoLast: () => Promise<{ error: string | null }>;
  disabled?: boolean;
}

export function CurrentOverPanel({ events, onUndoLast, disabled }: CurrentOverPanelProps) {
  const overBalls = getBallsInCurrentOver(events);
  if (!overBalls.length) return null;

  const overNum = overBalls[0]?.over_number ?? 0;
  const summary = formatOverSummary(overBalls);

  const confirmUndo = () => {
    Alert.alert(
      'Undo last ball?',
      'This removes the last delivery and recalculates score, strike & stats.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Undo',
          style: 'destructive',
          onPress: async () => {
            const { error } = await onUndoLast();
            if (error) Alert.alert('Undo failed', error);
          },
        },
      ]
    );
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Text style={styles.title}>Over {overNum}</Text>
        <Pressable
          style={[styles.undoBtn, disabled && styles.disabled]}
          onPress={confirmUndo}
          disabled={disabled}
        >
          <Ionicons name="arrow-undo" size={16} color={colors.live} />
          <Text style={styles.undoText}>Undo last ball</Text>
        </Pressable>
      </View>
      <Text style={styles.summary}>{summary}</Text>
      <View style={styles.balls}>
        {overBalls.map((e, i) => (
          <View key={`${e.id}-${i}`} style={styles.ballChip}>
            <Text style={styles.ballNum}>
              {e.over_number}.{e.ball_in_over}
            </Text>
            <Text style={styles.ballVal}>
              {summary.split(' ')[i] ?? '•'}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 12,
    padding: 12,
    borderRadius: radius.lg,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: { color: colors.text, fontWeight: '700', fontSize: 14 },
  summary: {
    color: colors.orange,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 2,
    marginBottom: 10,
  },
  undoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.live,
  },
  undoText: { color: colors.live, fontSize: 12, fontWeight: '700' },
  disabled: { opacity: 0.4 },
  balls: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  ballChip: {
    alignItems: 'center',
    minWidth: 44,
    padding: 8,
    borderRadius: radius.sm,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  ballNum: { color: colors.textDim, fontSize: 10 },
  ballVal: { color: colors.text, fontWeight: '800', fontSize: 15, marginTop: 2 },
});
