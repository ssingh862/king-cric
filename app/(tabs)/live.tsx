import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LiveMatchCard } from '../../src/components/cricket/LiveMatchCard';
import { useCompletedMatches, useLiveMatches, useUpcomingMatches } from '../../src/hooks/useTournaments';
import { MOCK_LIVE_MATCHES } from '../../src/lib/mockData';
import { isApiConfigured } from '../../src/lib/api';
import { colors } from '../../src/lib/theme';

type MatchCard = {
  id: string;
  status: string;
  result_summary?: string | null;
  team_a?: { id: string; name: string; short_name?: string | null };
  team_b?: { id: string; name: string; short_name?: string | null };
  tournament?: { name: string; city?: string | null };
};

export default function LiveScreen() {
  const queryClient = useQueryClient();
  const { data: liveData, isLoading: liveLoading } = useLiveMatches();
  const { data: upcomingData, isLoading: upcomingLoading } = useUpcomingMatches();
  const { data: completedData, isLoading: completedLoading } = useCompletedMatches();
  const useApi = isApiConfigured();

  useFocusEffect(
    useCallback(() => {
      if (!useApi) return;
      void queryClient.invalidateQueries({ queryKey: ['matches'] });
    }, [useApi, queryClient])
  );

  const liveMatches = (useApi ? liveData : MOCK_LIVE_MATCHES) as MatchCard[] | undefined;
  const upcomingMatches = (useApi ? upcomingData : []) as MatchCard[] | undefined;
  const completedMatches = (useApi ? completedData : []) as MatchCard[] | undefined;
  const loading = useApi && (liveLoading || upcomingLoading || completedLoading);

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.flex}>
        <Text style={styles.title}>Matches</Text>
        <Text style={styles.sub}>Live scores and completed results</Text>
        <ScrollView contentContainerStyle={styles.scroll}>
          {loading ? (
            <ActivityIndicator color={colors.orange} style={{ marginTop: 40 }} />
          ) : (
            <>
              <Text style={styles.sectionTitle}>Live</Text>
              {liveMatches?.length ? (
                liveMatches.map((m, i) => <LiveMatchCard key={m.id} match={m} index={i} />)
              ) : (
                <Text style={styles.emptySection}>No live matches right now</Text>
              )}

              <Text style={[styles.sectionTitle, styles.sectionGap]}>Upcoming</Text>
              {upcomingMatches?.length ? (
                upcomingMatches.map((m, i) => <LiveMatchCard key={m.id} match={m} index={i} />)
              ) : (
                <Text style={styles.emptySection}>No scheduled matches yet</Text>
              )}

              <Text style={[styles.sectionTitle, styles.sectionGap]}>Completed</Text>
              {completedMatches?.length ? (
                completedMatches.map((m, i) => (
                  <LiveMatchCard key={m.id} match={m} index={i} />
                ))
              ) : (
                <Text style={styles.emptySection}>No completed matches yet</Text>
              )}
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1, padding: 20 },
  title: { color: colors.text, fontSize: 28, fontWeight: '800' },
  sub: { color: colors.textMuted, marginTop: 4, marginBottom: 20 },
  scroll: { paddingBottom: 40 },
  sectionTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionGap: { marginTop: 28 },
  emptySection: {
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: 8,
    paddingVertical: 12,
  },
});
