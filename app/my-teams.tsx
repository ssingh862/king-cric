import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GlassCard } from '../src/components/ui/GlassCard';
import { GradientButton } from '../src/components/ui/GradientButton';
import { useMyTeams } from '../src/hooks/useTournaments';
import { colors, radius } from '../src/lib/theme';
import { useAuthStore } from '../src/stores/authStore';

const isSupabaseConfigured = () =>
  Boolean(process.env.EXPO_PUBLIC_SUPABASE_URL && process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);

export default function MyTeamsScreen() {
  const { profile } = useAuthStore();
  const { data: teams, isLoading } = useMyTeams(profile?.id);

  const configured = isSupabaseConfigured();

  return (
    <View style={styles.root}>
      <LinearGradient colors={['#1A0A2E', '#0A0612']} style={styles.header} />
      <SafeAreaView style={styles.flex} edges={['top']}>
        <View style={styles.topBar}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </Pressable>
          <Text style={styles.title}>My teams</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll}>
          {!configured ? (
            <GlassCard>
              <Text style={styles.body}>
                Connect Supabase in your environment to load teams you captain or registered.
              </Text>
            </GlassCard>
          ) : isLoading ? (
            <ActivityIndicator color={colors.orange} style={{ marginTop: 32 }} />
          ) : teams?.length ? (
            teams.map((t) => {
              const tour = t.tournament as { name?: string; city?: string | null } | null | undefined;
              return (
                <Pressable key={t.id} onPress={() => router.push(`/team/${t.id}`)}>
                  <GlassCard style={styles.card}>
                    <View style={styles.row}>
                      <View style={[styles.dot, { backgroundColor: t.primary_color ?? colors.orange }]} />
                      <View style={styles.info}>
                        <Text style={styles.teamName}>{t.name}</Text>
                        <Text style={styles.meta} numberOfLines={1}>
                          {tour?.name ?? 'Tournament'}{tour?.city ? ` · ${tour.city}` : ''}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={20} color={colors.textDim} />
                    </View>
                  </GlassCard>
                </Pressable>
              );
            })
          ) : (
            <GlassCard>
              <Text style={styles.body}>
                You have not registered a team yet. Open a tournament and tap Register Team, or create
                your own league.
              </Text>
              <GradientButton
                title="Browse tournaments"
                onPress={() => router.replace('/(tabs)/tournaments')}
                style={{ marginTop: 16 }}
              />
            </GlassCard>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: { position: 'absolute', top: 0, left: 0, right: 0, height: 160 },
  flex: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  title: { color: colors.text, fontSize: 18, fontWeight: '700' },
  scroll: { padding: 20, paddingBottom: 40 },
  card: { marginBottom: 12, borderRadius: radius.lg },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dot: { width: 12, height: 12, borderRadius: 6 },
  info: { flex: 1 },
  teamName: { color: colors.text, fontSize: 17, fontWeight: '700' },
  meta: { color: colors.textMuted, fontSize: 13, marginTop: 4 },
  body: { color: colors.textMuted, fontSize: 15, lineHeight: 22 },
});
