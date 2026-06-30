import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Player } from '../../types/database';
import type { MatchOutcome } from '../../lib/matchFlow';
import { colors, radius } from '../../lib/theme';

interface MotmPickerModalProps {
  visible: boolean;
  outcome: MatchOutcome | null;
  players: Player[];
  loading?: boolean;
  onSelect: (player: Player) => void;
  onClose?: () => void;
}

export function MotmPickerModal({
  visible,
  outcome,
  players,
  loading,
  onSelect,
  onClose,
}: MotmPickerModalProps) {
  const insets = useSafeAreaInsets();
  if (!visible || !outcome) return null;

  return (
    <Modal
      visible
      transparent
      animationType="slide"
      statusBarTranslucent
      presentationStyle="overFullScreen"
    >
      <View style={styles.overlay}>
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 24) }]}>
          <View style={styles.header}>
            <Ionicons name="star" size={32} color={colors.gold} />
            <Text style={styles.title}>PLAYER OF THE MATCH</Text>
            <Text style={styles.winner}>{outcome.winnerName} won</Text>
            <Text style={styles.scores}>{outcome.innings1Line}</Text>
            <Text style={styles.scores}>{outcome.innings2Line}</Text>
            <Text style={styles.hint}>Tap any player from either team</Text>
          </View>

          <ScrollView
            style={styles.list}
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="always"
          >
            {players.length === 0 ? (
              <Text style={styles.empty}>No players found for this match.</Text>
            ) : (
              players.map((p) => (
                <Pressable
                  key={p.id}
                  style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
                  onPress={() => onSelect(p)}
                  disabled={loading}
                >
                  <View style={styles.rowMain}>
                    <Text style={styles.name}>{p.full_name}</Text>
                    {p.jersey_number != null && (
                      <Text style={styles.jersey}>#{p.jersey_number}</Text>
                    )}
                  </View>
                  <Ionicons name="star-outline" size={22} color={colors.gold} />
                </Pressable>
              ))
            )}
          </ScrollView>

          {onClose && (
            <Pressable style={styles.skipBtn} onPress={onClose} disabled={loading}>
              <Text style={styles.skipText}>Cancel</Text>
            </Pressable>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.backgroundSecondary,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '90%',
    borderWidth: 1,
    borderColor: colors.cardBorder,
    overflow: 'hidden',
  },
  header: {
    padding: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
    backgroundColor: colors.warningLight,
  },
  title: { color: colors.gold, fontSize: 20, fontWeight: '800', marginTop: 8 },
  winner: { color: colors.text, fontSize: 18, fontWeight: '700', marginTop: 12 },
  scores: { color: colors.textMuted, fontSize: 13, marginTop: 4 },
  hint: { color: colors.orange, fontSize: 13, fontWeight: '600', marginTop: 14 },
  list: { maxHeight: 360 },
  listContent: { padding: 16 },
  empty: { color: colors.textMuted, textAlign: 'center', padding: 24 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    marginBottom: 10,
    borderRadius: radius.lg,
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  rowPressed: { backgroundColor: colors.warningLight, borderColor: colors.gold },
  rowMain: { flex: 1 },
  name: { color: colors.text, fontSize: 17, fontWeight: '700' },
  jersey: { color: colors.textMuted, fontSize: 13, marginTop: 2 },
  skipBtn: { padding: 16, alignItems: 'center' },
  skipText: { color: colors.textMuted, fontWeight: '600' },
});
