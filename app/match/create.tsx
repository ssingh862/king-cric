import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardForm } from '../../src/components/ui/KeyboardForm';
import { GradientButton } from '../../src/components/ui/GradientButton';
import { useTournament, useTournamentTeams } from '../../src/hooks/useTournaments';
import { createMatch } from '../../src/lib/matches';
import { canManageTournament } from '../../src/lib/permissions';
import { colors } from '../../src/lib/theme';
import { useAuthStore } from '../../src/stores/authStore';

export default function CreateMatchScreen() {
  const { tournamentId } = useLocalSearchParams<{ tournamentId: string }>();
  const profile = useAuthStore((s) => s.profile);
  const { data: tournament, isLoading } = useTournament(tournamentId ?? '');
  const { data: teams } = useTournamentTeams(tournamentId ?? '');
  const [teamAId, setTeamAId] = useState<string | null>(null);
  const [teamBId, setTeamBId] = useState<string | null>(null);
  const [venue, setVenue] = useState('');
  const [loading, setLoading] = useState(false);

  const canManage = canManageTournament(tournament ?? null, profile);

  useEffect(() => {
    if (isLoading || !tournament || !profile) return;
    if (!canManageTournament(tournament, profile)) {
      Alert.alert('Organizer only', 'Only the tournament organizer can create matches.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    }
  }, [isLoading, tournament, profile]);

  const submit = async () => {
    if (!canManage) return;
    if (!teamAId || !teamBId) {
      Alert.alert('Select teams', 'Pick two different teams for this match.');
      return;
    }
    if (teamAId === teamBId) {
      Alert.alert('Invalid', 'Team A and Team B must be different.');
      return;
    }
    setLoading(true);
    const { matchId, error } = await createMatch({
      tournamentId: tournamentId ?? '',
      teamAId,
      teamBId,
      venue: venue.trim() || undefined,
      oversPerInnings: tournament?.overs_per_innings ?? 20,
    });
    setLoading(false);
    if (error) {
      Alert.alert('Error', error);
      return;
    }
    router.replace({ pathname: '/match/setup', params: { matchId: matchId ?? '' } });
  };

  const TeamOption = ({
    id,
    name,
    selected,
    onPress,
  }: {
    id: string;
    name: string;
    selected: boolean;
    onPress: () => void;
  }) => (
    <Pressable style={[styles.teamOpt, selected && styles.teamOptOn]} onPress={onPress}>
      <Text style={[styles.teamOptText, selected && styles.teamOptTextOn]}>{name}</Text>
      {selected && <Ionicons name="checkmark" size={18} color={colors.orange} />}
    </Pressable>
  );

  if (isLoading && !tournament) {
    return (
      <View style={[styles.root, styles.centered]}>
        <ActivityIndicator color={colors.orange} />
      </View>
    );
  }

  if (tournament && profile && !canManage) {
    return (
      <View style={[styles.root, styles.centered]}>
        <ActivityIndicator color={colors.orange} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.flex}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()}>
            <Ionicons name="close" size={28} color={colors.text} />
          </Pressable>
          <Text style={styles.title}>New Match</Text>
          <View style={{ width: 28 }} />
        </View>

        <KeyboardForm>
          <ScrollView contentContainerStyle={styles.scroll}>
            <Text style={styles.label}>Team A (batting first option)</Text>
            {teams?.map((t) => (
              <TeamOption
                key={`a-${t.id}`}
                id={t.id}
                name={t.name}
                selected={teamAId === t.id}
                onPress={() => setTeamAId(t.id)}
              />
            ))}

            <Text style={[styles.label, { marginTop: 20 }]}>Team B</Text>
            {teams?.map((t) => (
              <TeamOption
                key={`b-${t.id}`}
                id={t.id}
                name={t.name}
                selected={teamBId === t.id}
                onPress={() => setTeamBId(t.id)}
              />
            ))}

            <Text style={[styles.label, { marginTop: 16 }]}>
              Format: {tournament?.overs_per_innings ?? 20} overs per innings
            </Text>

            <Text style={[styles.label, { marginTop: 20 }]}>Venue (optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="Ground name"
              placeholderTextColor={colors.textDim}
              value={venue}
              onChangeText={setVenue}
            />

            <GradientButton
              title={loading ? 'Creating…' : 'Create & Start Scoring'}
              onPress={submit}
              style={{ marginTop: 24 }}
              disabled={loading || !teams?.length}
            />
          </ScrollView>
        </KeyboardForm>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  centered: { alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  title: { color: colors.text, fontSize: 18, fontWeight: '700' },
  scroll: { padding: 16, paddingBottom: 40 },
  label: { color: colors.textMuted, fontSize: 13, fontWeight: '600', marginBottom: 8 },
  teamOpt: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  teamOptOn: { borderColor: colors.orange, backgroundColor: 'rgba(255,107,0,0.12)' },
  teamOptText: { color: colors.text, fontSize: 16 },
  teamOptTextOn: { color: colors.orange, fontWeight: '700' },
  input: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
});
