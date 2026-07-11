import { useMemo } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { ScoreEvent } from "../../types/database";
import {
  battingStatsForDisplay,
  bowlingStatsForDisplay,
} from "../../lib/playerStats";
import { dedupeScoreEvents } from "../../lib/scoring";
import { colors, radius } from "../../lib/theme";

interface MatchPlayerStatsProps {
  events: ScoreEvent[];
  playerNames: Map<string, string>;
  title?: string;
  strikerId?: string | null;
  nonStrikerId?: string | null;
  bowlerId?: string | null;
}

type ColDef = { label: string; width: number };

const BATTING_COLS: ColDef[] = [
  { label: "Batsman", width: 108 },
  { label: "Score", width: 64 },
  { label: "4s", width: 28 },
  { label: "6s", width: 28 },
  { label: "SR", width: 56 },
  { label: "", width: 32 },
];

const BOWLING_COLS: ColDef[] = [
  { label: "Bowler", width: 88 },
  { label: "O", width: 40 },
  { label: "M", width: 28 },
  { label: "R", width: 32 },
  { label: "W", width: 28 },
  { label: "Econ", width: 44 },
  { label: "Wd", width: 28 },
  { label: "Nb", width: 28 },
];

function tableWidth(cols: ColDef[]) {
  return cols.reduce((s, c) => s + c.width, 0);
}

function StatHeader({ cols }: { cols: ColDef[] }) {
  return (
    <View style={styles.headerRow}>
      {cols.map((c) => (
        <Text
          key={c.label}
          style={[styles.headerCell, { width: c.width }]}
          numberOfLines={1}
        >
          {c.label}
        </Text>
      ))}
    </View>
  );
}

function Cell({
  width,
  children,
  bold,
  alignLeft,
}: {
  width: number;
  children: string;
  bold?: boolean;
  alignLeft?: boolean;
}) {
  return (
    <Text
      style={[
        styles.cell,
        { width },
        bold && styles.cellBold,
        alignLeft && styles.cellLeft,
      ]}
      numberOfLines={1}
    >
      {children}
    </Text>
  );
}

function BatsmanCell({
  width,
  name,
  isStriker,
  isOut,
}: {
  width: number;
  name: string;
  isStriker: boolean;
  isOut: boolean;
}) {
  return (
    <View style={[styles.batsmanCell, { width }]}>
      {isStriker ? (
        <View style={styles.batIcon}>
          <MaterialCommunityIcons name="cricket" size={12} color="#fff" />
        </View>
      ) : (
        <View style={styles.batSpacer} />
      )}
      <Text
        style={[
          styles.cell,
          styles.cellBold,
          styles.cellLeft,
          styles.batsmanName,
        ]}
        numberOfLines={1}
      >
        {`${name}${isOut ? "" : " *"}`}
      </Text>
    </View>
  );
}

export function MatchPlayerStats({
  events,
  playerNames,
  title,
  strikerId,
  nonStrikerId,
  bowlerId,
}: MatchPlayerStatsProps) {
  const uniqueEvents = dedupeScoreEvents(events);
  const batters = battingStatsForDisplay(uniqueEvents, {
    strikerId,
    nonStrikerId,
  });
  const bowlersRaw = bowlingStatsForDisplay(uniqueEvents, bowlerId);
  const bowlers = useMemo(() => {
    if (!bowlerId) return bowlersRaw;
    if (bowlersRaw.some((b) => b.playerId === bowlerId)) return bowlersRaw;
    return [
      ...bowlersRaw,
      {
        playerId: bowlerId,
        overs: "0.0",
        maidens: 0,
        runs: 0,
        wickets: 0,
        economy: "0.00",
        wides: 0,
        noBalls: 0,
      },
    ];
  }, [bowlersRaw, bowlerId]);
  const hasCrease = !!(strikerId || nonStrikerId || bowlerId);
  if (!uniqueEvents.length && !hasCrease) return null;

  const name = (id: string) => playerNames.get(id) ?? "Player";

  return (
    <View style={styles.wrap}>
      {title ? <Text style={styles.title}>{title}</Text> : null}

      <Text style={styles.section}>Batting</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={{ width: tableWidth(BATTING_COLS) }}>
          <StatHeader cols={BATTING_COLS} />
          {batters.map((b) => (
            <View key={b.playerId} style={styles.dataRow}>
              <BatsmanCell
                width={BATTING_COLS[0].width}
                name={name(b.playerId)}
                isStriker={b.playerId === strikerId}
                isOut={b.isOut}
              />
              <Cell width={BATTING_COLS[1].width} bold>
                {b.scoreLine}
              </Cell>
              <Cell width={BATTING_COLS[2].width}>{String(b.fours)}</Cell>
              <Cell width={BATTING_COLS[3].width}>{String(b.sixes)}</Cell>
              <Cell width={BATTING_COLS[4].width}>{b.strikeRate}</Cell>
              <Cell width={BATTING_COLS[5].width}>{b.isOut ? "out" : ""}</Cell>
            </View>
          ))}
        </View>
      </ScrollView>

      <Text style={[styles.section, { marginTop: 20 }]}>Bowling</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={{ width: tableWidth(BOWLING_COLS) }}>
          <StatHeader cols={BOWLING_COLS} />
          {bowlers.map((b) => (
            <View key={b.playerId} style={styles.dataRow}>
              <Cell width={BOWLING_COLS[0].width} alignLeft bold>
                {name(b.playerId)}
              </Cell>
              <Cell width={BOWLING_COLS[1].width} bold>
                {b.overs}
              </Cell>
              <Cell width={BOWLING_COLS[2].width}>{String(b.maidens)}</Cell>
              <Cell width={BOWLING_COLS[3].width}>{String(b.runs)}</Cell>
              <Cell width={BOWLING_COLS[4].width}>{String(b.wickets)}</Cell>
              <Cell width={BOWLING_COLS[5].width}>{b.economy}</Cell>
              <Cell width={BOWLING_COLS[6].width}>{String(b.wides)}</Cell>
              <Cell width={BOWLING_COLS[7].width}>{String(b.noBalls)}</Cell>
            </View>
          ))}
        </View>
      </ScrollView>

      <Text style={styles.legend}>
        O = overs.balls · * not out · orange bat = facing the ball
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 20,
    padding: 14,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  title: {
    color: colors.orange,
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 12,
  },
  section: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 10,
  },
  headerRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
    paddingBottom: 8,
    marginBottom: 4,
  },
  dataRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.cardBorder,
  },
  headerCell: {
    color: colors.textDim,
    fontSize: 11,
    fontWeight: "700",
    textAlign: "center",
  },
  cell: {
    color: colors.textMuted,
    fontSize: 13,
    textAlign: "center",
  },
  cellBold: { color: colors.text, fontWeight: "700" },
  cellLeft: { textAlign: "left" },
  batsmanCell: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingRight: 4,
  },
  batIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.orange,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  batSpacer: { width: 20, flexShrink: 0 },
  batsmanName: { flex: 1, minWidth: 0 },
  legend: { color: colors.textDim, fontSize: 10, marginTop: 12 },
});
