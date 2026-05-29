import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../../lib/theme';

interface PlayerInfo {
  id: string;
  full_name: string;
}

interface ActivePlayersBarProps {
  striker?: PlayerInfo | null;
  nonStriker?: PlayerInfo | null;
  bowler?: PlayerInfo | null;
  highlightVacant?: 'striker' | 'non_striker' | null;
  onChangePlayers?: () => void;
}

function PlayerChip({
  label,
  name,
  vacant,
}: {
  label: string;
  name: string;
  vacant?: boolean;
}) {
  return (
    <View style={[styles.chip, vacant && styles.chipVacant]}>
      <Text style={[styles.chipLabel, vacant && styles.chipLabelVacant]}>{label}</Text>
      <Text style={[styles.chipName, vacant && styles.chipNameVacant]} numberOfLines={1}>
        {vacant ? 'Pick batter' : name}
      </Text>
    </View>
  );
}

export function ActivePlayersBar({
  striker,
  nonStriker,
  bowler,
  highlightVacant,
  onChangePlayers,
}: ActivePlayersBarProps) {
  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <PlayerChip
          label="Striker"
          name={striker?.full_name ?? '—'}
          vacant={highlightVacant === 'striker'}
        />
        <PlayerChip
          label="Non-striker"
          name={nonStriker?.full_name ?? '—'}
          vacant={highlightVacant === 'non_striker'}
        />
      </View>
      <View style={styles.row}>
        <PlayerChip label="Bowler" name={bowler?.full_name ?? '—'} />
        {onChangePlayers && (
          <Pressable style={styles.changeBtn} onPress={onChangePlayers}>
            <Ionicons name="swap-horizontal" size={16} color={colors.orange} />
            <Text style={styles.changeText}>Change</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: radius.lg,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  row: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  chip: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: radius.md,
    padding: 10,
  },
  chipLabel: { color: colors.textDim, fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  chipName: { color: colors.text, fontSize: 14, fontWeight: '600', marginTop: 4 },
  chipVacant: {
    borderWidth: 1,
    borderColor: colors.orange,
    backgroundColor: 'rgba(255,107,0,0.12)',
  },
  chipLabelVacant: { color: colors.orange },
  chipNameVacant: { color: colors.orange, fontWeight: '700' },
  changeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.orange,
  },
  changeText: { color: colors.orange, fontSize: 12, fontWeight: '600' },
});
