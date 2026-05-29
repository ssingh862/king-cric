import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LiveMatchCard } from '../../src/components/cricket/LiveMatchCard';
import { GlassCard } from '../../src/components/ui/GlassCard';
import { useCompletedMatches, useLiveMatches, useTournaments } from '../../src/hooks/useTournaments';
import { MOCK_COMPLETED_MATCHES, MOCK_LIVE_MATCHES, MOCK_TOURNAMENTS } from '../../src/lib/mockData';
import { colors, radius } from '../../src/lib/theme';
import { useAuthStore } from '../../src/stores/authStore';

const isSupabaseConfigured = () =>
  Boolean(process.env.EXPO_PUBLIC_SUPABASE_URL && process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);

export default function HomeScreen() {
  const { profile } = useAuthStore();
  const { data: liveMatches, isLoading: liveLoading } = useLiveMatches();
  const { data: completedMatches, isLoading: completedLoading } = useCompletedMatches();
  const { data: tournaments, isLoading: tourLoading } = useTournaments('ongoing');

  const matches = isSupabaseConfigured() ? liveMatches : MOCK_LIVE_MATCHES;
  const completed = isSupabaseConfigured() ? completedMatches : MOCK_COMPLETED_MATCHES;
  const leagues = isSupabaseConfigured() ? tournaments : MOCK_TOURNAMENTS;
  const loading = isSupabaseConfigured() && (liveLoading || completedLoading || tourLoading);

  return (
    <View style={styles.root}>
      <LinearGradient colors={['#1A0A2E', '#0A0612']} style={styles.headerGrad} />
      <SafeAreaView style={styles.flex} edges={['top']}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          <Animated.View entering={FadeInDown.springify()} style={styles.header}>
            <View>
              <Text style={styles.greeting}>Hello, {profile?.full_name?.split(' ')[0] ?? 'Champion'} 👋</Text>
              <Text style={styles.headline}>KingCric</Text>
              <Text style={styles.headlineTag}>Live cricket near you</Text>
            </View>
            <Pressable style={styles.bell} onPress={() => router.push('/tournament/create')}>
              <Ionicons name="add-circle" size={28} color={colors.orange} />
            </Pressable>
          </Animated.View>

          <Pressable onPress={() => router.push('/tournament/create')}>
            <LinearGradient
              colors={[colors.orange, colors.pink, colors.purple]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.proBanner}
            >
              <View>
                <Text style={styles.proTitle}>Create a Tournament</Text>
                <Text style={styles.proSub}>Free scoring • Teams • Points table</Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color="#fff" />
            </LinearGradient>
          </Pressable>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>🔴 Live Now</Text>
              <Pressable onPress={() => router.push('/(tabs)/live')}>
                <Text style={styles.seeAll}>See all</Text>
              </Pressable>
            </View>
            {loading ? (
              <ActivityIndicator color={colors.orange} />
            ) : matches?.length ? (
              matches.slice(0, 3).map((m, i) => (
                <LiveMatchCard key={m.id} match={m} index={i} />
              ))
            ) : (
              <GlassCard>
                <Text style={styles.empty}>No live matches right now</Text>
              </GlassCard>
            )}
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>✅ Completed</Text>
              <Pressable onPress={() => router.push('/(tabs)/live')}>
                <Text style={styles.seeAll}>See all</Text>
              </Pressable>
            </View>
            {loading ? (
              <ActivityIndicator color={colors.orange} />
            ) : completed?.length ? (
              completed.slice(0, 3).map((m, i) => (
                <LiveMatchCard key={m.id} match={m} index={i} />
              ))
            ) : (
              <GlassCard>
                <Text style={styles.empty}>No completed matches yet</Text>
              </GlassCard>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🏆 Active Tournaments</Text>
            {leagues?.map((t, i) => (
              <Animated.View key={t.id} entering={FadeInDown.delay(i * 60)}>
                <Pressable onPress={() => router.push(`/tournament/${t.id}`)}>
                  <GlassCard delay={i * 40} style={{ marginBottom: 10 }}>
                    <View style={styles.tourRow}>
                      <View style={styles.tourIcon}>
                        <Text style={styles.tourEmoji}>🏏</Text>
                      </View>
                      <View style={styles.tourInfo}>
                        <Text style={styles.tourName}>{t.name}</Text>
                        <Text style={styles.tourMeta}>
                          {t.city} • {t.format} • {t.overs_per_innings} overs
                        </Text>
                      </View>
                      <View style={[styles.statusPill, t.status === 'ongoing' && styles.statusLive]}>
                        <Text style={styles.statusText}>{t.status}</Text>
                      </View>
                    </View>
                  </GlassCard>
                </Pressable>
              </Animated.View>
            ))}
          </View>

          {profile?.role === 'admin' && (
            <Pressable style={styles.adminLink} onPress={() => router.push('/admin')}>
              <Ionicons name="shield" size={18} color={colors.purple} />
              <Text style={styles.adminText}>Admin Panel</Text>
            </Pressable>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  headerGrad: { position: 'absolute', top: 0, left: 0, right: 0, height: 200 },
  flex: { flex: 1 },
  scroll: { padding: 20, paddingBottom: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
  greeting: { color: colors.textMuted, fontSize: 14 },
  headline: { color: colors.text, fontSize: 26, fontWeight: '800', marginTop: 4 },
  headlineTag: { color: colors.textMuted, fontSize: 14, marginTop: 6, fontWeight: '600' },
  bell: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  proBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 18,
    borderRadius: radius.lg,
    marginBottom: 28,
  },
  proTitle: { color: '#fff', fontSize: 17, fontWeight: '800' },
  proSub: { color: 'rgba(255,255,255,0.85)', fontSize: 12, marginTop: 4 },
  section: { marginBottom: 28 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 },
  sectionTitle: { color: colors.text, fontSize: 18, fontWeight: '700' },
  seeAll: { color: colors.orange, fontSize: 14 },
  empty: { color: colors.textMuted, textAlign: 'center' },
  tourRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  tourIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(255,107,0,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tourEmoji: { fontSize: 24 },
  tourInfo: { flex: 1 },
  tourName: { color: colors.text, fontSize: 16, fontWeight: '700' },
  tourMeta: { color: colors.textMuted, fontSize: 12, marginTop: 4 },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  statusLive: { backgroundColor: 'rgba(0,200,83,0.2)' },
  statusText: { color: colors.textMuted, fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  adminLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    justifyContent: 'center',
    padding: 16,
  },
  adminText: { color: colors.purple, fontWeight: '600' },
});
