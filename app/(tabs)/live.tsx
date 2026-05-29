import { LinearGradient } from 'expo-linear-gradient';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LiveMatchCard } from '../../src/components/cricket/LiveMatchCard';
import { useCompletedMatches, useLiveMatches } from '../../src/hooks/useTournaments';
import { MOCK_LIVE_MATCHES } from '../../src/lib/mockData';
import { colors } from '../../src/lib/theme';

export default function LiveScreen() {
  const { data: liveData, isLoading: liveLoading } = useLiveMatches();
  const { data: completedData, isLoading: completedLoading } = useCompletedMatches();
  const useApi = !!process.env.EXPO_PUBLIC_SUPABASE_URL;

  const liveMatches = useApi ? liveData : MOCK_LIVE_MATCHES;
  const completedMatches = useApi ? completedData : [];
  const loading = useApi && (liveLoading || completedLoading);

  return (
    <View style={styles.root}>
      <LinearGradient colors={['rgba(255,23,68,0.15)', '#0A0612']} style={styles.grad} />
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
  grad: { position: 'absolute', top: 0, left: 0, right: 0, height: 180 },
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
