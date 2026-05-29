import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GlassCard } from '../../src/components/ui/GlassCard';
import { useTournaments } from '../../src/hooks/useTournaments';
import { MOCK_TOURNAMENTS } from '../../src/lib/mockData';
import { colors } from '../../src/lib/theme';

export default function TournamentsScreen() {
  const { data, isLoading } = useTournaments();
  const list = process.env.EXPO_PUBLIC_SUPABASE_URL ? data : MOCK_TOURNAMENTS;

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.flex}>
        <View style={styles.header}>
          <Text style={styles.title}>Tournaments</Text>
          <Pressable style={styles.addBtn} onPress={() => router.push('/tournament/create')}>
            <LinearGradient colors={[colors.orange, colors.pink]} style={styles.addGrad}>
              <Ionicons name="add" size={24} color="#fff" />
            </LinearGradient>
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.scroll}>
          {isLoading ? (
            <ActivityIndicator color={colors.orange} />
          ) : (
            list?.map((t, i) => (
              <Pressable key={t.id} onPress={() => router.push(`/tournament/${t.id}`)}>
                <GlassCard delay={i * 50} style={{ marginBottom: 12 }}>
                  <Text style={styles.name}>{t.name}</Text>
                  <Text style={styles.meta}>
                    📍 {t.city ?? 'TBD'} • {t.format} • Max {t.max_teams} teams
                  </Text>
                  <View style={styles.footer}>
                    <Text style={styles.venue}>{t.venue ?? 'Venue TBD'}</Text>
                    <Text style={[styles.badge, t.status === 'registration' && styles.badgeOpen]}>
                      {t.status}
                    </Text>
                  </View>
                </GlassCard>
              </Pressable>
            ))
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1, padding: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  title: { color: colors.text, fontSize: 28, fontWeight: '800' },
  addBtn: { borderRadius: 22, overflow: 'hidden' },
  addGrad: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingBottom: 40 },
  name: { color: colors.text, fontSize: 18, fontWeight: '700' },
  meta: { color: colors.textMuted, fontSize: 13, marginTop: 6 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, alignItems: 'center' },
  venue: { color: colors.textDim, fontSize: 12 },
  badge: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 8,
  },
  badgeOpen: { color: colors.green, backgroundColor: 'rgba(0,200,83,0.15)' },
});
