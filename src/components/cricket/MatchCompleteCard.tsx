import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, shadows } from '../../lib/theme';

export interface TeamInningsSummary {
  code: string;
  name: string;
  color?: string;
  runs: number | null;
  wickets: number;
  overs: number | null;
  runRate: string | null;
  inningsLabel: string | null;
}

interface MatchCompleteCardProps {
  winnerName: string;
  resultSummary?: string | null;
  teamA: TeamInningsSummary;
  teamB: TeamInningsSummary;
  tournamentName?: string;
  motmName?: string | null;
  motmReason?: string | null;
  onPressScorecard?: () => void;
  compact?: boolean;
}

function formatScoreLine(runs: number | null, wickets: number, overs: number | null) {
  if (runs == null) return '—';
  const score = `${runs}-${wickets}`;
  if (overs == null) return score;
  return `${score} (${overs} Ov)`;
}

function TeamScoreRow({ team }: { team: TeamInningsSummary }) {
  const accent = team.color ?? colors.orange;

  return (
    <View style={styles.scoreRow}>
      <View style={[styles.teamBadge, { backgroundColor: accent }]}>
        <Text style={styles.teamBadgeText}>{team.code.slice(0, 3)}</Text>
      </View>

      <View style={styles.teamMeta}>
        <Text style={styles.teamName} numberOfLines={1}>
          {team.name}
        </Text>
        {team.inningsLabel ? <Text style={styles.inningsTag}>{team.inningsLabel}</Text> : null}
      </View>

      <View style={styles.scoreMeta}>
        <Text style={styles.scoreText}>{formatScoreLine(team.runs, team.wickets, team.overs)}</Text>
        {team.runRate != null && team.runs != null ? (
          <Text style={styles.runRate}>RR {team.runRate}</Text>
        ) : null}
      </View>
    </View>
  );
}

export function MatchCompleteCard({
  winnerName,
  resultSummary,
  teamA,
  teamB,
  tournamentName,
  motmName,
  motmReason,
  onPressScorecard,
  compact,
}: MatchCompleteCardProps) {
  const cleanSummary = resultSummary
    ? resultSummary.replace(/\s*Player of the Match:.*$/i, '').trim()
    : '';
  const resultLine = cleanSummary || (winnerName ? `${winnerName} won` : 'Match tied');

  return (
    <View style={[styles.wrap, compact && styles.wrapCompact]}>
      <View style={styles.resultBar}>
        <View style={styles.resultTop}>
          <View style={styles.finalPill}>
            <Text style={styles.finalPillText}>FINAL</Text>
          </View>
          {tournamentName ? (
            <Text style={styles.league} numberOfLines={1}>
              {tournamentName}
            </Text>
          ) : null}
        </View>
        <Text style={styles.resultLine} numberOfLines={2}>
          {resultLine}
        </Text>
      </View>

      <Pressable
        onPress={onPressScorecard}
        disabled={!onPressScorecard}
        style={({ pressed }) => [styles.scoreCard, shadows.card, pressed && styles.scoreCardPressed]}
      >
        <TeamScoreRow team={teamA} />
        <View style={styles.divider} />
        <TeamScoreRow team={teamB} />

        {onPressScorecard ? (
          <View style={styles.scorecardBtn}>
            <Text style={styles.scorecardBtnText}>Full Scorecard</Text>
          </View>
        ) : null}
      </Pressable>

      {motmName ? (
        <View style={[styles.motmCard, shadows.card]}>
          <View style={styles.motmHeader}>
            <View style={styles.motmIcon}>
              <Ionicons name="star" size={14} color={colors.gold} />
            </View>
            <Text style={styles.motmLabel}>Player of the Match</Text>
          </View>
          <Text style={styles.motmName}>{motmName}</Text>
          {motmReason ? <Text style={styles.motmReason}>{motmReason}</Text> : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: 16,
    gap: 12,
  },
  wrapCompact: { marginHorizontal: 0 },
  resultBar: {
    backgroundColor: colors.green,
    borderRadius: radius.lg,
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  resultTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  finalPill: {
    backgroundColor: 'rgba(255,255,255,0.22)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  finalPillText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  league: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  resultLine: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '800',
    lineHeight: 26,
    letterSpacing: -0.3,
  },
  scoreCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingHorizontal: 14,
    paddingTop: 6,
    paddingBottom: 12,
  },
  scoreCardPressed: {
    backgroundColor: colors.surface,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
  },
  teamBadge: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  teamBadgeText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  teamMeta: {
    flex: 1,
    minWidth: 0,
  },
  teamName: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
  },
  inningsTag: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  scoreMeta: {
    alignItems: 'flex-end',
    maxWidth: '46%',
  },
  scoreText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    textAlign: 'right',
  },
  runRate: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
    marginTop: 3,
    textAlign: 'right',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.cardBorder,
    marginLeft: 54,
  },
  scorecardBtn: {
    marginTop: 6,
    paddingVertical: 11,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.green,
    alignItems: 'center',
  },
  scorecardBtnText: {
    color: colors.green,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  motmCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 16,
  },
  motmHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  motmIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.warningLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  motmLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  motmName: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  motmReason: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 4,
    lineHeight: 19,
  },
});
