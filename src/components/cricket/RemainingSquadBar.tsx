import { StyleSheet, Text, View } from 'react-native';
import type { Player } from '../../types/database';
import { colors, radius } from '../../lib/theme';

interface RemainingSquadBarProps {
  label: string;
  players: Player[];
}

export function RemainingSquadBar({ label, players }: RemainingSquadBarProps) {
  if (!players.length) return null;

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.chips}>
        {players.map((p) => (
          <View key={p.id} style={styles.chip}>
            <Text style={styles.chipText} numberOfLines={1}>
              {p.full_name}
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
    borderRadius: radius.md,
    backgroundColor: 'rgba(0,180,216,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(0,180,216,0.25)',
  },
  label: {
    color: colors.blue,
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: colors.surface,
    maxWidth: '48%',
  },
  chipText: { color: colors.textMuted, fontSize: 12, fontWeight: '600' },
});
