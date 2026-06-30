import { StyleSheet, Text, View } from 'react-native';
import type { MatchRules } from '../../lib/cricket/types';
import { formatOvers } from '../../lib/scoring';
import { maxLegalBalls, allOutWicketsLabel } from '../../lib/cricket/rules';
import { colors, radius } from '../../lib/theme';

interface InningsFormatBannerProps {
  rules: MatchRules;
  legalBalls: number;
}

export function InningsFormatBanner({ rules, legalBalls }: InningsFormatBannerProps) {
  const maxBalls = maxLegalBalls(rules);
  const ballsLeft = Math.max(0, maxBalls - legalBalls);
  const oversLeft = formatOvers(ballsLeft, rules.ballsPerOver);

  return (
    <View style={styles.wrap}>
      <Text style={styles.main}>
        {rules.oversPerInnings} overs · {allOutWicketsLabel(rules.battingSquadSize, rules.maxWickets)}
      </Text>
      <Text style={styles.sub}>
        {formatOvers(legalBalls, rules.ballsPerOver)} bowled
        {ballsLeft > 0
          ? ` · ${oversLeft} (${ballsLeft} balls) left`
          : ' · overs complete'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 12,
    padding: 12,
    borderRadius: radius.md,
    backgroundColor: 'rgba(0,180,216,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(0,180,216,0.35)',
  },
  main: { color: colors.text, fontSize: 13, fontWeight: '700' },
  sub: { color: colors.textMuted, fontSize: 12, marginTop: 4 },
});
