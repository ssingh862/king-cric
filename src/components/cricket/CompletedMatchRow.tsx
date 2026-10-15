import { Text } from '../../i18n';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, Share, View } from 'react-native';
import { router } from 'expo-router';
import { format } from 'date-fns';
import { createThemedStyles, colors, radius } from '../../lib/theme';

type Side = { id: string; name: string; short_name?: string | null };

export type CompletedMatch = {
  id: string;
  scheduled_at?: string | null;
  result_summary?: string | null;
  team_a?: Side;
  team_b?: Side;
  tournament?: { name: string } | null;
  innings?: { batting_team_id: string; total_runs: number; total_wickets: number; total_overs: number }[];
};

function shortDate(value?: string | null) {
  if (!value) return 'Date not set';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Date not set';
  return format(date, 'd MMM');
}

function sideName(team?: Side) {
  return team?.short_name || team?.name || 'Team';
}

export function CompletedMatchRow({ match, onLongPress }: { match: CompletedMatch; onLongPress?: () => void }) {
  const [open, setOpen] = useState(false);
  const teamA = sideName(match.team_a);
  const teamB = sideName(match.team_b);
  return (
    <View style={styles.wrap}>
      <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={() => setOpen((value) => !value)} onLongPress={onLongPress} style={styles.row}>
        <Text style={styles.date}>{shortDate(match.scheduled_at)}</Text>
        <View style={styles.main}>
          <Text style={styles.teams} numberOfLines={1}>{teamA}{'  vs  '}{teamB}</Text>
          {match.tournament?.name ? <Text style={styles.league} numberOfLines={1}>{match.tournament.name}</Text> : null}
        </View>
        <Pressable hitSlop={8} onPress={() => void Share.share({ message: [match.tournament?.name, shortDate(match.scheduled_at), `${teamA} vs ${teamB}`, ...(match.innings ?? []).map((inn) => `${inn.batting_team_id === match.team_a?.id ? teamA : teamB} ${inn.total_runs}/${inn.total_wickets}`), match.result_summary].filter(Boolean).join('\n') })} accessibilityLabel="Share result">
          <Ionicons name="share-outline" size={18} color={colors.orange} />
        </Pressable>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textDim} />
      </Pressable>
      {open ? (
        <Pressable style={styles.detail} onPress={() => router.push({ pathname: '/match/scorecard/[matchId]', params: { matchId: match.id } })}>
          {match.innings?.length ? match.innings.map((inn) => (
            <View key={inn.batting_team_id} style={styles.scoreLine}>
              <Text style={styles.scoreTeam}>{inn.batting_team_id === match.team_a?.id ? teamA : teamB}</Text>
              <Text style={styles.score}>{inn.total_runs}/{inn.total_wickets} ({Number(inn.total_overs).toFixed(1)})</Text>
            </View>
          )) : <Text style={styles.result}>{match.result_summary || 'Match completed'}</Text>}
          {match.innings?.length && match.result_summary ? <Text style={styles.result}>{match.result_summary}</Text> : null}
          <Text style={styles.hint}>Tap the score for the scorecard</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = createThemedStyles({
  wrap: { marginBottom: 8, backgroundColor: colors.card, borderRadius: radius.md, borderWidth: 1, borderColor: colors.cardBorder, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 12 },
  date: { color: colors.orange, fontWeight: '800', fontSize: 13, width: 58 },
  main: { flex: 1 },
  teams: { color: colors.text, fontWeight: '700', fontSize: 15 },
  league: { color: colors.textMuted, fontSize: 12, fontWeight: '600', marginTop: 2 },
  detail: { paddingHorizontal: 12, paddingBottom: 12, borderTopWidth: 1, borderTopColor: colors.cardBorder, paddingTop: 10 },
  scoreLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  scoreTeam: { color: colors.textMuted, fontSize: 13, flex: 1 },
  score: { color: colors.text, fontWeight: '800', fontSize: 16 },
  result: { color: colors.text, fontSize: 14, lineHeight: 20, marginTop: 4 },
  hint: { color: colors.orange, fontWeight: '700', fontSize: 12, marginTop: 8 },
});
