import { Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { MatchOutcome } from '../../lib/matchFlow';
import { colors, radius, shadows } from '../../lib/theme';

interface MatchResultModalProps {
  visible: boolean;
  outcome: MatchOutcome | null;
  onDone: () => void;
}

export function MatchResultModal({ visible, outcome, onDone }: MatchResultModalProps) {
  const insets = useSafeAreaInsets();
  if (!visible || !outcome) return null;

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent presentationStyle="overFullScreen">
      <View style={styles.overlay}>
        <View style={[styles.card, shadows.cardLg, { marginBottom: insets.bottom + 16 }]}>
          <View style={styles.content}>
            <View style={styles.trophyRow}>
              <View style={styles.trophyIcon}>
                <Ionicons name="trophy" size={32} color={colors.gold} />
              </View>
              <Text style={styles.title}>Match complete</Text>
            </View>

            <Text style={styles.winner}>{outcome.winnerName || 'Match tied'}</Text>
            <Text style={styles.summary}>{outcome.summary.split('.')[0]}.</Text>

            <View style={styles.scoresBox}>
              <Text style={styles.scoreLine}>{outcome.innings1Line}</Text>
              <Text style={styles.scoreLine}>{outcome.innings2Line}</Text>
            </View>

            {outcome.motm && (
              <View style={styles.motmBox}>
                <Text style={styles.motmLabel}>Player of the Match</Text>
                <Text style={styles.motmName}>{outcome.motm.playerName}</Text>
                {outcome.motm.reason ? (
                  <Text style={styles.motmReason}>{outcome.motm.reason}</Text>
                ) : null}
              </View>
            )}

            <Pressable style={styles.doneBtn} onPress={onDone}>
              <Text style={styles.doneText}>View match</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    padding: 20,
    ...Platform.select({ android: { elevation: 30 } }),
  },
  card: {
    borderRadius: radius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.card,
  },
  content: { padding: 24 },
  trophyRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  trophyIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.warningLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { color: colors.textMuted, fontSize: 14, fontWeight: '600', textTransform: 'uppercase' },
  winner: { color: colors.gold, fontSize: 28, fontWeight: '800', marginBottom: 8 },
  summary: { color: colors.text, fontSize: 16, fontWeight: '600', marginBottom: 20 },
  scoresBox: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: 14,
    marginBottom: 16,
    gap: 6,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  scoreLine: { color: colors.textMuted, fontSize: 14 },
  motmBox: {
    borderWidth: 1,
    borderColor: colors.orange,
    borderRadius: radius.md,
    padding: 14,
    marginBottom: 20,
    backgroundColor: colors.orangeLight,
  },
  motmLabel: { color: colors.orange, fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  motmName: { color: colors.text, fontSize: 20, fontWeight: '800', marginTop: 4 },
  motmReason: { color: colors.textMuted, fontSize: 13, marginTop: 4 },
  doneBtn: {
    backgroundColor: colors.orange,
    paddingVertical: 16,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  doneText: { color: '#fff', fontWeight: '800', fontSize: 16 },
});
