import { StyleSheet, Text, View } from 'react-native';
import { LiveBadge } from '../ui/LiveBadge';
import { formatOvers, runRate } from '../../lib/scoring';
import type { MatchRules } from '../../lib/cricket/types';
import { colors } from '../../lib/theme';

interface ScoreboardHeaderProps {
  battingTeam: string;
  bowlingTeam: string;
  runs: number;
  wickets: number;
  legalBalls: number;
  target?: number | null;
  requiredRR?: string;
  runsNeeded?: number;
  ballsRemaining?: number;
  matchRules?: MatchRules;
  isLive?: boolean;
}

export function ScoreboardHeader({
  battingTeam,
  bowlingTeam,
  runs,
  wickets,
  legalBalls,
  target,
  requiredRR,
  runsNeeded,
  ballsRemaining,
  matchRules,
  isLive,
}: ScoreboardHeaderProps) {
  const ballsPerOver = matchRules?.ballsPerOver ?? 6;
  const overs = formatOvers(legalBalls, ballsPerOver);

  return (
    <View style={styles.wrap}>
      <View style={styles.top}>
        {isLive && <LiveBadge />}
        <Text style={styles.bowling}>vs {bowlingTeam}</Text>
      </View>

      <Text style={styles.battingTeam}>{battingTeam}</Text>
      <Text style={styles.score}>
        {runs}/{wickets}
      </Text>
      <Text style={styles.overs}>{overs} overs</Text>

      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={styles.statVal}>RR {runRate(runs, legalBalls)}</Text>
          <Text style={styles.statLabel}>Run rate</Text>
        </View>
        {target != null && target > 0 && requiredRR != null && (
          <View style={styles.stat}>
            <Text style={styles.statVal}>{requiredRR}</Text>
            <Text style={styles.statLabel}>Required</Text>
          </View>
        )}
        {target != null && target > 0 && runsNeeded != null && (
          <View style={styles.stat}>
            <Text style={styles.statVal}>{runsNeeded}</Text>
            <Text style={styles.statLabel}>Need runs</Text>
          </View>
        )}
      </View>

      {target != null &&
        target > 0 &&
        runsNeeded != null &&
        ballsRemaining != null &&
        ballsRemaining > 0 && (
          <Text style={styles.chaseMini}>
            Need {runsNeeded} from {ballsRemaining} balls
          </Text>
        )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: 'rgba(255,107,0,0.12)',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,107,0,0.35)',
    marginBottom: 16,
  },
  top: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  bowling: { color: colors.textMuted, fontSize: 13 },
  battingTeam: { color: colors.textMuted, fontSize: 14, textTransform: 'uppercase', letterSpacing: 1 },
  score: { color: colors.text, fontSize: 52, fontWeight: '800', marginTop: 4 },
  overs: { color: colors.orange, fontSize: 18, fontWeight: '600', marginTop: 4 },
  statsRow: { flexDirection: 'row', marginTop: 16, gap: 12 },
  stat: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
  },
  statVal: { color: colors.text, fontWeight: '700', fontSize: 14 },
  statLabel: { color: colors.textDim, fontSize: 10, marginTop: 2 },
  chaseMini: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
    marginTop: 12,
    textAlign: 'center',
  },
});
