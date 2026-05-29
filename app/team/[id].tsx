import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GlassCard } from '../../src/components/ui/GlassCard';
import { GradientButton } from '../../src/components/ui/GradientButton';
import { useTeam } from '../../src/hooks/useTournaments';
import { canManageTournament } from '../../src/lib/permissions';
import { colors } from '../../src/lib/theme';
import type { Player, Tournament } from '../../src/types/database';
import { useAuthStore } from '../../src/stores/authStore';

export default function TeamScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const profile = useAuthStore((s) => s.profile);
  const { data: team, isLoading, refetch } = useTeam(id ?? '');

  const tournament = team?.tournament as Tournament | undefined;
  const canEditSquad =
    canManageTournament(tournament ?? null, profile) || team?.captain_id === profile?.id;

  const players = (team?.players as Player[] | undefined) ?? [];

  if (isLoading && process.env.EXPO_PUBLIC_SUPABASE_URL && !team) {
    return (
      <View style={[styles.root, styles.center]}>
        <ActivityIndicator color={colors.orange} />
      </View>
    );
  }

  const t = team ?? {
    name: 'Team',
    short_name: 'TM',
    primary_color: colors.orange,
    tournament: { name: '' },
  };

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={[t.primary_color ?? colors.orange, '#0A0612']}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      />
      <SafeAreaView style={styles.flex}>
        <View style={styles.topBar}>
          <Pressable onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </Pressable>
          {canEditSquad ? (
            <Pressable
              style={styles.editBtn}
              onPress={() => router.push({ pathname: '/team/edit', params: { id: id ?? '' } })}
            >
              <Ionicons name="create-outline" size={20} color={colors.orange} />
              <Text style={styles.editText}>Edit</Text>
            </Pressable>
          ) : (
            <View style={{ width: 56 }} />
          )}
        </View>

        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.teamHeader}>
            <View style={[styles.logo, { backgroundColor: t.primary_color ?? colors.orange }]}>
              <Text style={styles.logoText}>{t.short_name ?? t.name?.slice(0, 3)}</Text>
            </View>
            <Text style={styles.name}>{t.name}</Text>
            <Text style={styles.tournament}>{t.tournament?.name}</Text>
          </View>

          <Text style={styles.section}>Squad ({players.length})</Text>
          {players.length === 0 ? (
            <GlassCard>
              <Text style={styles.empty}>No players yet. Tap Edit to add your squad.</Text>
            </GlassCard>
          ) : (
            players.map((p) => (
              <Pressable
                key={p.id}
                onPress={() => router.push({ pathname: '/team/edit', params: { id: id ?? '' } })}
              >
                <GlassCard style={{ marginBottom: 8 }}>
                  <View style={styles.playerRow}>
                    <View style={styles.jersey}>
                      <Text style={styles.jerseyNum}>{p.jersey_number ?? '—'}</Text>
                    </View>
                    <View style={styles.playerInfo}>
                      <Text style={styles.playerName}>
                        {p.full_name}
                        {p.is_captain ? ' (C)' : ''}
                        {p.is_wicket_keeper ? ' (WK)' : ''}
                      </Text>
                      <Text style={styles.playerRole}>{p.role?.replace(/_/g, ' ')}</Text>
                    </View>
                    <Ionicons name="pencil" size={16} color={colors.textDim} />
                  </View>
                </GlassCard>
              </Pressable>
            ))
          )}

          <GradientButton
            title="Edit team & players"
            onPress={() => router.push({ pathname: '/team/edit', params: { id: id ?? '' } })}
            style={{ marginTop: 20 }}
          />
          <GradientButton
            title="Refresh"
            onPress={() => refetch()}
            variant="outline"
            style={{ marginTop: 12 }}
          />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  center: { alignItems: 'center', justifyContent: 'center' },
  header: { position: 'absolute', top: 0, left: 0, right: 0, height: 240, opacity: 0.6 },
  flex: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  editBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  editText: { color: colors.orange, fontWeight: '600' },
  scroll: { padding: 20, paddingBottom: 40 },
  teamHeader: { alignItems: 'center', marginBottom: 28 },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: { color: '#fff', fontSize: 24, fontWeight: '800' },
  name: { color: colors.text, fontSize: 26, fontWeight: '800', marginTop: 16 },
  tournament: { color: colors.textMuted, marginTop: 4 },
  section: { color: colors.text, fontSize: 18, fontWeight: '700', marginBottom: 12 },
  empty: { color: colors.textMuted, textAlign: 'center' },
  playerRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  jersey: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  jerseyNum: { color: colors.orange, fontWeight: '800' },
  playerInfo: { flex: 1 },
  playerName: { color: colors.text, fontWeight: '600' },
  playerRole: { color: colors.textMuted, fontSize: 12, marginTop: 2, textTransform: 'capitalize' },
});
