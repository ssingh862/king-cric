import { StyleSheet, Text, View } from 'react-native';
import type { Partnership } from '../../lib/cricket/types';
import { colors, radius } from '../../lib/theme';

interface PartnershipPanelProps {
  partnership: Partnership | null;
  playerNames: Map<string, string>;
}

export function PartnershipPanel({ partnership, playerNames }: PartnershipPanelProps) {
  if (!partnership || partnership.balls === 0) return null;

  const name = (id: string) => playerNames.get(id) ?? 'Batter';
  const boundaryParts: string[] = [];
  if (partnership.fours) boundaryParts.push(`${partnership.fours}×4`);
  if (partnership.sixes) boundaryParts.push(`${partnership.sixes}×6`);

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Partnership</Text>
      <Text style={styles.names}>
        {name(partnership.batterAId)} & {name(partnership.batterBId)}
      </Text>
      <Text style={styles.score}>
        {partnership.runs} ({partnership.balls})
      </Text>
      {boundaryParts.length > 0 && (
        <Text style={styles.boundaries}>{boundaryParts.join(' · ')}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 12,
    padding: 12,
    borderRadius: radius.lg,
    backgroundColor: 'rgba(123,44,191,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(123,44,191,0.35)',
  },
  title: { color: colors.purple, fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
  names: { color: colors.textMuted, fontSize: 13, marginTop: 4 },
  score: { color: colors.text, fontSize: 22, fontWeight: '800', marginTop: 4 },
  boundaries: { color: colors.textDim, fontSize: 12, marginTop: 4 },
});
