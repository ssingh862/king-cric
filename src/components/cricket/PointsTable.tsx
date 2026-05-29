import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { GlassCard } from '../ui/GlassCard';
import { colors } from '../../lib/theme';
import type { PointsTableRow } from '../../types/database';

interface PointsTableProps {
  rows: PointsTableRow[];
}

export function PointsTable({ rows }: PointsTableProps) {
  const sorted = [...rows].sort(
    (a, b) => b.points - a.points || Number(b.net_run_rate) - Number(a.net_run_rate)
  );

  return (
    <GlassCard>
      <Text style={styles.title}>Points Table</Text>
      <Text style={styles.subtitle}>Win = 2 pts · NRR updated after each completed match</Text>

      {sorted.length === 0 ? (
        <Text style={styles.empty}>
          No teams yet. Register teams and complete matches to see standings.
        </Text>
      ) : (
        <>
          <View style={styles.headerRow}>
            <Text style={[styles.hdr, styles.teamCol]}># Team</Text>
            <Text style={styles.hdr}>P</Text>
            <Text style={styles.hdr}>W</Text>
            <Text style={styles.hdr}>L</Text>
            <Text style={styles.hdr}>Pts</Text>
            <Text style={styles.hdr}>NRR</Text>
          </View>
          <ScrollView style={styles.scroll} nestedScrollEnabled>
            {sorted.map((row, i) => (
              <View key={row.id} style={[styles.row, i === 0 && row.points > 0 && styles.topRow]}>
                <Text style={[styles.cell, styles.teamCol]} numberOfLines={1}>
                  {i + 1}{' '}
                  {(row.team as { name?: string; short_name?: string })?.short_name ??
                    (row.team as { name?: string })?.name ??
                    'Team'}
                </Text>
                <Text style={styles.cell}>{row.played}</Text>
                <Text style={styles.cell}>{row.won}</Text>
                <Text style={styles.cell}>{row.lost}</Text>
                <Text style={[styles.cell, styles.pts]}>{row.points}</Text>
                <Text style={styles.cell}>{Number(row.net_run_rate).toFixed(3)}</Text>
              </View>
            ))}
          </ScrollView>
        </>
      )}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  title: { color: colors.text, fontSize: 18, fontWeight: '700', marginBottom: 4 },
  subtitle: { color: colors.textDim, fontSize: 11, marginBottom: 12 },
  empty: { color: colors.textMuted, fontSize: 14, paddingVertical: 16, lineHeight: 20 },
  headerRow: {
    flexDirection: 'row',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  scroll: { maxHeight: 280 },
  row: {
    flexDirection: 'row',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  topRow: { backgroundColor: 'rgba(255,107,0,0.08)' },
  hdr: { flex: 1, color: colors.textDim, fontSize: 11, fontWeight: '600', textAlign: 'center' },
  cell: { flex: 1, color: colors.textMuted, fontSize: 12, textAlign: 'center' },
  teamCol: { flex: 3, textAlign: 'left' },
  pts: { color: colors.gold, fontWeight: '700' },
});
