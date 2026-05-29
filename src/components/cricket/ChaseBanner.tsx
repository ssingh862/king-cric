import { StyleSheet, Text, View } from 'react-native';
import type { ChaseStatus } from '../../lib/cricket/chase';
import { colors, radius } from '../../lib/theme';

interface ChaseBannerProps {
  chase: ChaseStatus | null;
}

export function ChaseBanner({ chase }: ChaseBannerProps) {
  if (!chase) return null;

  return (
    <View style={styles.wrap}>
      <Text style={styles.line}>{chase.chaseLine}</Text>
      <Text style={styles.rr}>Required RR {chase.requiredRR}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 12,
    padding: 14,
    borderRadius: radius.lg,
    backgroundColor: 'rgba(0,200,83,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0,200,83,0.35)',
  },
  line: { color: colors.text, fontSize: 16, fontWeight: '800' },
  rr: { color: colors.textMuted, fontSize: 13, marginTop: 4 },
});
