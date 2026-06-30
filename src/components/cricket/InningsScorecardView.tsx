import { ScrollView, StyleSheet, Text, View } from 'react-native';
import type { InningsScorecardData } from '../../lib/cricket/scorecard';
import { colors } from '../../lib/theme';

interface InningsScorecardViewProps {
  data: InningsScorecardData;
}

function TableHeader({ cols }: { cols: { label: string; width: number; align?: 'left' | 'center' }[] }) {
  return (
    <View style={styles.tableHeader}>
      {cols.map((c) => (
        <Text
          key={c.label}
          style={[
            styles.th,
            { width: c.width },
            c.align === 'left' ? styles.thLeft : styles.thCenter,
          ]}
        >
          {c.label}
        </Text>
      ))}
    </View>
  );
}

export function InningsScorecardView({ data }: InningsScorecardViewProps) {
  const { extras } = data;

  return (
    <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
      <View style={styles.teamBar}>
        <Text style={styles.teamBarName} numberOfLines={1}>
          {data.battingTeamName}
        </Text>
        <Text style={styles.teamBarScore}>
          {data.runs}-{data.wickets} ({data.oversLabel} Ov)
        </Text>
      </View>

      <View style={styles.section}>
        <TableHeader
          cols={[
            { label: 'Batter', width: 148, align: 'left' },
            { label: 'R', width: 32 },
            { label: 'B', width: 32 },
            { label: '4s', width: 28 },
            { label: '6s', width: 28 },
            { label: 'SR', width: 44 },
          ]}
        />

        {data.batters.map((b) => (
          <View key={b.playerId} style={styles.row}>
            <View style={[styles.batterCell, { width: 148 }]}>
              <Text style={styles.batterName}>{b.name}</Text>
              <Text style={[styles.dismissal, !b.isOut && styles.battingTag]} numberOfLines={2}>
                {b.dismissal}
              </Text>
            </View>
            <Text style={[styles.cell, { width: 32 }]}>{b.runs}</Text>
            <Text style={[styles.cell, { width: 32 }]}>{b.balls}</Text>
            <Text style={[styles.cell, { width: 28 }]}>{b.fours}</Text>
            <Text style={[styles.cell, { width: 28 }]}>{b.sixes}</Text>
            <View style={[styles.srCell, { width: 44 }]}>
              <Text style={styles.cell}>{b.strikeRate}</Text>
            </View>
          </View>
        ))}

        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Extras</Text>
          <Text style={styles.summaryValue}>
            {extras.total} (b {extras.byes}, lb {extras.legByes}, w {extras.wides}, nb {extras.noBalls})
          </Text>
        </View>

        <View style={[styles.summaryRow, styles.totalRow]}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>
            {data.runs}-{data.wickets} ({data.oversLabel} Overs, RR: {data.runRate})
          </Text>
        </View>
      </View>

      {data.yetToBat.length > 0 ? (
        <View style={styles.yetToBat}>
          <Text style={styles.yetToBatTitle}>Yet to Bat</Text>
          <Text style={styles.yetToBatNames}>{data.yetToBat.join(', ')}</Text>
        </View>
      ) : null}

      <View style={styles.section}>
        <Text style={styles.bowlTitle}>Bowling</Text>
        <TableHeader
          cols={[
            { label: 'Bowler', width: 100, align: 'left' },
            { label: 'O', width: 36 },
            { label: 'M', width: 28 },
            { label: 'R', width: 32 },
            { label: 'W', width: 28 },
            { label: 'NB', width: 28 },
            { label: 'WD', width: 28 },
            { label: 'ECO', width: 40 },
          ]}
        />

        {data.bowlers.length === 0 ? (
          <Text style={styles.emptyBowling}>No bowling data</Text>
        ) : (
          data.bowlers.map((b) => (
            <View key={b.playerId} style={styles.row}>
              <Text style={[styles.bowlerName, { width: 100 }]} numberOfLines={1}>
                {b.name}
              </Text>
              <Text style={[styles.cell, { width: 36 }]}>{b.overs}</Text>
              <Text style={[styles.cell, { width: 28 }]}>{b.maidens}</Text>
              <Text style={[styles.cell, { width: 32 }]}>{b.runs}</Text>
              <Text style={[styles.cellBold, { width: 28 }]}>{b.wickets}</Text>
              <Text style={[styles.cell, { width: 28 }]}>{b.noBalls}</Text>
              <Text style={[styles.cell, { width: 28 }]}>{b.wides}</Text>
              <Text style={[styles.cell, { width: 40 }]}>{b.economy}</Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: 32 },
  teamBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.green,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  teamBarName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    flex: 1,
    marginRight: 8,
  },
  teamBarScore: { color: '#fff', fontSize: 15, fontWeight: '700' },
  section: {
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  th: { color: colors.textMuted, fontSize: 12, fontWeight: '700' },
  thLeft: { textAlign: 'left' },
  thCenter: { textAlign: 'center' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.cardBorder,
  },
  batterCell: { paddingRight: 6 },
  batterName: { color: colors.blue, fontSize: 14, fontWeight: '700' },
  dismissal: { color: colors.textMuted, fontSize: 11, marginTop: 3, lineHeight: 15 },
  battingTag: { color: colors.green, fontWeight: '600' },
  cell: { color: colors.text, fontSize: 13, textAlign: 'center', fontWeight: '600' },
  cellBold: { color: colors.text, fontSize: 13, textAlign: 'center', fontWeight: '800' },
  srCell: { alignItems: 'center', justifyContent: 'center' },
  bowlerName: { color: colors.blue, fontSize: 13, fontWeight: '700', textAlign: 'left' },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.cardBorder,
  },
  summaryLabel: { color: colors.text, fontWeight: '700', fontSize: 13 },
  summaryValue: { color: colors.textMuted, fontSize: 12, flex: 1, textAlign: 'right', marginLeft: 8 },
  totalRow: { backgroundColor: colors.surface },
  totalLabel: { color: colors.text, fontWeight: '800', fontSize: 14 },
  totalValue: { color: colors.text, fontWeight: '700', fontSize: 13, flex: 1, textAlign: 'right' },
  yetToBat: {
    padding: 14,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  yetToBatTitle: { color: colors.text, fontWeight: '800', fontSize: 14, marginBottom: 6 },
  yetToBatNames: { color: colors.blue, fontSize: 13, lineHeight: 20 },
  bowlTitle: {
    color: colors.text,
    fontWeight: '800',
    fontSize: 15,
    paddingHorizontal: 12,
    paddingTop: 14,
    paddingBottom: 4,
    backgroundColor: colors.card,
  },
  emptyBowling: { color: colors.textDim, padding: 16, textAlign: 'center' },
});
