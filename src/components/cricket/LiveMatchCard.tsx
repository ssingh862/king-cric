import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeInRight } from 'react-native-reanimated';
import { LiveBadge } from '../ui/LiveBadge';
import { colors, radius, shadows } from '../../lib/theme';

interface TeamInfo {
  id: string;
  name: string;
  short_name?: string | null;
  primary_color?: string;
}

interface LiveMatchCardProps {
  match: {
    id: string;
    status: string;
    result_summary?: string | null;
    team_a?: TeamInfo;
    team_b?: TeamInfo;
    tournament?: { name: string; city?: string | null };
  };
  index?: number;
}

export function LiveMatchCard({ match, index = 0 }: LiveMatchCardProps) {
  const teamA = match.team_a?.short_name ?? match.team_a?.name ?? 'Team A';
  const teamB = match.team_b?.short_name ?? match.team_b?.name ?? 'Team B';

  return (
    <Animated.View entering={FadeInRight.delay(index * 80).springify()}>
      <Pressable onPress={() => router.push(`/match/${match.id}`)}>
        <View style={[styles.card, shadows.card]}>
          <View style={styles.header}>
            <Text style={styles.tournament} numberOfLines={1}>
              {match.tournament?.name ?? 'Tournament'}
            </Text>
            {match.status === 'live' && <LiveBadge />}
            {match.status === 'scheduled' && (
              <View style={styles.scheduledBadge}>
                <Text style={styles.scheduledText}>Upcoming</Text>
              </View>
            )}
            {match.status === 'completed' && (
              <View style={styles.completedBadge}>
                <Ionicons name="checkmark-circle" size={14} color={colors.green} />
                <Text style={styles.completedText}>Done</Text>
              </View>
            )}
          </View>

          <View style={styles.teams}>
            <View style={styles.teamCol}>
              <View style={[styles.teamDot, { backgroundColor: match.team_a?.primary_color ?? colors.orange }]} />
              <Text style={styles.teamName}>{teamA}</Text>
            </View>
            <Text style={styles.vs}>VS</Text>
            <View style={[styles.teamCol, styles.teamColRight]}>
              <Text style={styles.teamName}>{teamB}</Text>
              <View style={[styles.teamDot, { backgroundColor: match.team_b?.primary_color ?? colors.purple }]} />
            </View>
          </View>

          {match.result_summary ? (
            <Text style={styles.summary} numberOfLines={3}>
              {match.result_summary}
            </Text>
          ) : match.status === 'completed' ? (
            <Text style={styles.hint}>Tap to view result</Text>
          ) : (
            <View style={styles.footer}>
              <Ionicons name="play-circle" size={16} color={colors.orange} />
              <Text style={styles.tapHint}>Tap for score</Text>
            </View>
          )}
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.card,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  tournament: {
    color: colors.textMuted,
    fontSize: 12,
    flex: 1,
    marginRight: 8,
    fontWeight: '600',
  },
  scheduledBadge: {
    backgroundColor: colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  scheduledText: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.successLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  completedText: {
    color: colors.green,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  teams: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  teamCol: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  teamColRight: { justifyContent: 'flex-end' },
  teamDot: { width: 10, height: 10, borderRadius: 5 },
  teamName: { color: colors.text, fontSize: 17, fontWeight: '800' },
  vs: {
    color: colors.textDim,
    fontSize: 12,
    fontWeight: '800',
    marginHorizontal: 12,
  },
  summary: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 12,
    textAlign: 'center',
    fontWeight: '500',
  },
  hint: { color: colors.textDim, fontSize: 13, marginTop: 12, textAlign: 'center' },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
  },
  tapHint: { color: colors.orange, fontSize: 13, fontWeight: '600' },
});
