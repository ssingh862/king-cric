import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  createEmptyPlayer,
  PlayerSquadEditor,
  type SquadPlayerDraft,
} from '../src/components/forms/PlayerSquadEditor';
import { KeyboardForm } from '../src/components/ui/KeyboardForm';
import { GradientButton } from '../src/components/ui/GradientButton';
import { draftsToPlayerInput } from '../src/lib/players';
import { canManageTournament } from '../src/lib/permissions';
import { registerTeam } from '../src/lib/teams';
import { isApiConfigured } from '../src/lib/api';
import { colors, radius } from '../src/lib/theme';
import { useAuthStore } from '../src/stores/authStore';
import { useTournament } from '../src/hooks/useTournaments';

export default function RegisterTeamScreen() {
  const { tournamentId } = useLocalSearchParams<{ tournamentId: string }>();
  const queryClient = useQueryClient();
  const { profile } = useAuthStore();
  const { data: tournament, isLoading: tournamentLoading } = useTournament(tournamentId ?? '');

  const [teamName, setTeamName] = useState('');
  const [shortName, setShortName] = useState('');
  const [players, setPlayers] = useState<SquadPlayerDraft[]>([createEmptyPlayer()]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const canManage = canManageTournament(tournament ?? null, profile);

  useEffect(() => {
    if (!tournament || !profile) return;
    if (!canManageTournament(tournament, profile)) {
      Alert.alert('Organizer only', 'Only the tournament organizer can register teams for this league.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    }
  }, [tournament, profile]);

  const handleRegister = async () => {
    if (!canManage) {
      setError('Only the tournament organizer can register teams.');
      return;
    }
    setError('');

    if (!teamName.trim()) {
      setError('Enter your team name');
      return;
    }
    if (!tournamentId) {
      setError('Tournament not found');
      return;
    }
    if (!profile?.id) {
      Alert.alert('Sign in', 'Please sign in to register a team');
      return;
    }

    if (!isApiConfigured()) {
      Alert.alert('Demo', 'Connect the API server to register teams.');
      return;
    }

    setLoading(true);
    const { teamId, error: err } = await registerTeam({
      tournamentId,
      teamName,
      shortName,
      captainId: profile.id,
      players: draftsToPlayerInput(players),
    });
    setLoading(false);

    if (err) {
      setError(err);
      return;
    }

    await queryClient.invalidateQueries({ queryKey: ['my-teams', profile.id] });
    await queryClient.invalidateQueries({ queryKey: ['tournament-teams', tournamentId] });

    Alert.alert('Team registered!', `${teamName} and squad are saved.`, [
      { text: 'Edit squad', onPress: () => router.replace(`/team/edit?id=${teamId}`) },
      { text: 'View team', onPress: () => router.replace(`/team/${teamId}`) },
    ]);
  };

  if (tournamentLoading && !tournament) {
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
      <SafeAreaView style={styles.flex} edges={['top']}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </Pressable>
          <Text style={styles.headerTitle}>Register Team</Text>
          <View style={{ width: 24 }} />
        </View>

        <KeyboardForm>
          {tournament?.name ? (
            <Text style={styles.tournamentName}>{tournament.name}</Text>
          ) : null}
          <Text style={styles.sub}>Add team details and player names. You can edit everything later.</Text>

          <Text style={styles.label}>Team name *</Text>
          <TextInput
            style={styles.input}
            placeholder="Mumbai Strikers"
            placeholderTextColor={colors.textDim}
            value={teamName}
            onChangeText={setTeamName}
            autoCapitalize="words"
          />

          <Text style={styles.label}>Short name (optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="MUS"
            placeholderTextColor={colors.textDim}
            value={shortName}
            onChangeText={(t) => setShortName(t.toUpperCase().slice(0, 4))}
            maxLength={4}
            autoCapitalize="characters"
          />

          <PlayerSquadEditor players={players} onChange={setPlayers} />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <GradientButton
            title="Register Team"
            onPress={handleRegister}
            loading={loading}
            style={{ marginTop: 24 }}
            disabled={!canManage}
          />
        </KeyboardForm>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: { color: colors.text, fontSize: 18, fontWeight: '700' },
  tournamentName: { color: colors.orange, fontSize: 16, fontWeight: '700', marginBottom: 4 },
  sub: { color: colors.textMuted, fontSize: 14, marginBottom: 12 },
  label: { color: colors.textMuted, fontSize: 13, marginBottom: 8, marginTop: 12 },
  input: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    color: colors.text,
    fontSize: 16,
    padding: 16,
  },
  error: { color: colors.live, fontSize: 13, marginTop: 12, lineHeight: 18 },
});
