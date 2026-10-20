import { useBranding } from '../../src/stores/brandingStore';
import { Text } from '../../src/i18n';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ActivityIndicator, Image, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../../src/lib/api';
import { colors, createThemedStyles, radius } from '../../src/lib/theme';

type Career = {
  player: { full_name: string; jersey_number: number | null; role: string; photo_url?: string | null; is_captain: boolean; is_wicket_keeper: boolean };
  team: { name: string };
  stats: { matches: number; runs: number; average: string; strikeRate: string; fours: number; sixes: number; highScore: string; wickets: number; economy: string; best: string };
};

export default function PlayerScreen() {
 useBranding(s=>s.palette);
  const { id } = useLocalSearchParams<{ id: string }>();
  const career = useQuery({ queryKey: ['player-career', id], enabled: !!id, queryFn: () => api<Career>(`/players/${id}/career`) });
  const stats = career.data?.stats;
  const player = career.data?.player;
  return (
    <SafeAreaView style={styles.page}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} accessibilityLabel="Back"><Ionicons name="arrow-back" size={24} color={colors.text} /></Pressable>
        <Text style={styles.title}>Player</Text>
      </View>
      {career.isPending ? <ActivityIndicator color={colors.orange} style={{ marginTop: 40 }} /> : career.isError ? <Text style={styles.muted}>Could not load this player.</Text> : (
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.identity}>
            {player?.photo_url ? <Image source={{ uri: player.photo_url }} style={styles.photo} /> : <View style={styles.photo}><Text style={styles.photoText}>{player?.full_name?.[0] ?? 'P'}</Text></View>}
            <Text style={styles.name}>{player?.full_name}{player?.is_captain ? ' (C)' : ''}{player?.is_wicket_keeper ? ' (WK)' : ''}</Text>
            <Text style={styles.muted}>{career.data?.team.name}{player?.jersey_number != null ? ` · #${player.jersey_number}` : ''} · {player?.role?.replace(/_/g, ' ')}</Text>
          </View>
          <Text style={styles.section}>Batting</Text>
          <View style={styles.grid}>
            {[['Matches', stats?.matches], ['Runs', stats?.runs], ['Average', stats?.average], ['Strike rate', stats?.strikeRate], ['Fours', stats?.fours], ['Sixes', stats?.sixes], ['Highest', stats?.highScore]].map(([label, value]) => (
              <View key={String(label)} style={styles.stat}><Text style={styles.statValue}>{String(value ?? '—')}</Text><Text style={styles.statLabel}>{label}</Text></View>
            ))}
          </View>
          <Text style={styles.section}>Bowling</Text>
          <View style={styles.grid}>
            {[['Wickets', stats?.wickets], ['Economy', stats?.economy], ['Best', stats?.best]].map(([label, value]) => (
              <View key={String(label)} style={styles.stat}><Text style={styles.statValue}>{String(value ?? '—')}</Text><Text style={styles.statLabel}>{label}</Text></View>
            ))}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = createThemedStyles({
  page: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  title: { fontSize: 22, fontWeight: '800', color: colors.text },
  scroll: { padding: 20, paddingBottom: 40 },
  identity: { alignItems: 'center', marginBottom: 20 },
  photo: { width: 88, height: 88, borderRadius: 44, backgroundColor: colors.orangeLight, alignItems: 'center', justifyContent: 'center' },
  photoText: { fontSize: 32, fontWeight: '800', color: colors.orange },
  name: { color: colors.text, fontSize: 24, fontWeight: '800', marginTop: 12, textAlign: 'center' },
  muted: { color: colors.textMuted, marginTop: 4, textAlign: 'center' },
  section: { color: colors.text, fontSize: 18, fontWeight: '800', marginTop: 8, marginBottom: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  stat: { width: '30%', flexGrow: 1, backgroundColor: colors.card, borderRadius: radius.md, borderWidth: 1, borderColor: colors.cardBorder, padding: 12 },
  statValue: { color: colors.text, fontWeight: '800', fontSize: 18 },
  statLabel: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
});
