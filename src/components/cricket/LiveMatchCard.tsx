import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeInRight } from 'react-native-reanimated';
import { LiveBadge } from '../ui/LiveBadge';
import { colors, radius } from '../../lib/theme';

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
        <LinearGradient
          colors={['rgba(255,107,0,0.15)', 'rgba(123,44,191,0.1)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.card}
        >
          <View style={styles.header}>
            <Text style={styles.tournament} numberOfLines={1}>
              {match.tournament?.name ?? 'Tournament'}
            </Text>
            {match.status === 'live' && <LiveBadge />}
            {match.status === 'completed' && (
              <View style={styles.completedBadge}>
                <Ionicons name="checkmark-circle" size={14} color={colors.gold} />
                <Text style={styles.completedText}>Completed</Text>
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
            <Text style={styles.summary}>Tap to view result</Text>
          ) : (
            <View style={styles.footer}>
              <Ionicons name="play-circle" size={16} color={colors.orange} />
              <Text style={styles.tapHint}>Tap for live score</Text>
            </View>
          )}
        </LinearGradient>
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
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,215,0,0.12)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.35)',
  },
  completedText: {
    color: colors.gold,
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
  teamColRight: {
    justifyContent: 'flex-end',
  },
  teamDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  teamName: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  vs: {
    color: colors.textDim,
    fontSize: 12,
    fontWeight: '800',
    marginHorizontal: 12,
  },
  summary: {
    color: colors.gold,
    fontSize: 13,
    marginTop: 12,
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 12,
  },
  tapHint: {
    color: colors.orange,
    fontSize: 13,
  },
});
