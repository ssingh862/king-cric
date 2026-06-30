import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardForm } from '../../src/components/ui/KeyboardForm';
import { GradientButton } from '../../src/components/ui/GradientButton';
import { useTournament, useTournamentTeams } from '../../src/hooks/useTournaments';
import { createMatch } from '../../src/lib/matches';
import { canManageTournament } from '../../src/lib/permissions';
import { colors, radius, shadows } from '../../src/lib/theme';
import { useAuthStore } from '../../src/stores/authStore';

type TeamOption = {
  id: string;
  name: string;
  short_name?: string | null;
  primary_color?: string;
};

export default function CreateMatchScreen() {
  const queryClient = useQueryClient();
  const { tournamentId } = useLocalSearchParams<{ tournamentId: string }>();
  const profile = useAuthStore((s) => s.profile);
  const { data: tournament, isLoading } = useTournament(tournamentId ?? '');
  const { data: teams } = useTournamentTeams(tournamentId ?? '');
  const [teamAId, setTeamAId] = useState<string | null>(null);
  const [teamBId, setTeamBId] = useState<string | null>(null);
  const [venue, setVenue] = useState('');
  const [loading, setLoading] = useState(false);

  const canManage = canManageTournament(tournament ?? null, profile);
  const teamList = (teams ?? []) as TeamOption[];

  const teamA = teamList.find((t) => t.id === teamAId);
  const teamB = teamList.find((t) => t.id === teamBId);

  const availableForB = useMemo(
    () => teamList.filter((t) => t.id !== teamAId),
    [teamList, teamAId]
  );

  useEffect(() => {
    if (isLoading || !tournament || !profile) return;
    if (!canManageTournament(tournament, profile)) {
      Alert.alert('Organizer only', 'Only the tournament organizer can create matches.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    }
  }, [isLoading, tournament, profile]);

  const pickTeamA = (id: string) => {
    setTeamAId(id);
    if (teamBId === id) setTeamBId(null);
  };

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
    await queryClient.invalidateQueries({ queryKey: ['tournament-matches', tournamentId] });
    await queryClient.invalidateQueries({ queryKey: ['matches'] });
    router.replace({ pathname: '/match/setup', params: { matchId: matchId ?? '' } });
  };

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
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="close" size={28} color={colors.text} />
          </Pressable>
          <Text style={styles.title}>New Match</Text>
          <View style={{ width: 28 }} />
        </View>

        <KeyboardForm>
          <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
            <Text style={styles.hint}>
              Choose two different teams. You will pick who bats first on the next screen.
            </Text>

            {teamA && teamB ? (
              <View style={[styles.previewCard, shadows.card]}>
                <TeamBadge team={teamA} />
                <Text style={styles.vs}>VS</Text>
                <TeamBadge team={teamB} />
              </View>
            ) : null}

            <Text style={styles.sectionTitle}>Team 1</Text>
            {teamList.length === 0 ? (
              <Text style={styles.empty}>Register at least 2 teams in this tournament first.</Text>
            ) : (
              teamList.map((t) => (
                <TeamCard
                  key={`a-${t.id}`}
                  team={t}
                  selected={teamAId === t.id}
                  disabled={teamBId === t.id}
                  disabledReason="Already Team 2"
                  onPress={() => pickTeamA(t.id)}
                />
              ))
            )}

            <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Team 2</Text>
            {!teamAId ? (
              <Text style={styles.pickFirst}>Select Team 1 first</Text>
            ) : availableForB.length === 0 ? (
              <Text style={styles.empty}>No other teams available.</Text>
            ) : (
              availableForB.map((t) => (
                <TeamCard
                  key={`b-${t.id}`}
                  team={t}
                  selected={teamBId === t.id}
                  onPress={() => setTeamBId(t.id)}
                />
              ))
            )}

            <View style={styles.formatBox}>
              <Ionicons name="time-outline" size={18} color={colors.orange} />
              <Text style={styles.formatText}>
                {tournament?.format ?? 'T20'} · {tournament?.overs_per_innings ?? 20} overs per innings
              </Text>
            </View>

            <Text style={styles.sectionTitle}>Venue (optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="Ground name"
              placeholderTextColor={colors.textDim}
              value={venue}
              onChangeText={setVenue}
            />

            <GradientButton
              title={loading ? 'Creating…' : 'Continue to Toss & Setup'}
              onPress={submit}
              style={{ marginTop: 24 }}
              disabled={loading || !teamAId || !teamBId || teamAId === teamBId}
            />
          </ScrollView>
        </KeyboardForm>
      </SafeAreaView>
    </View>
  );
}

function TeamBadge({ team }: { team: TeamOption }) {
  return (
    <View style={styles.badgeCol}>
      <View style={[styles.badgeDot, { backgroundColor: team.primary_color ?? colors.orange }]}>
        <Text style={styles.badgeInitial}>
          {(team.short_name ?? team.name).slice(0, 2).toUpperCase()}
        </Text>
      </View>
      <Text style={styles.badgeName} numberOfLines={1}>
        {team.name}
      </Text>
    </View>
  );
}

function TeamCard({
  team,
  selected,
  disabled,
  disabledReason,
  onPress,
}: {
  team: TeamOption;
  selected: boolean;
  disabled?: boolean;
  disabledReason?: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[
        styles.teamCard,
        selected && styles.teamCardOn,
        disabled && styles.teamCardDisabled,
      ]}
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
    >
      <View style={[styles.teamDot, { backgroundColor: team.primary_color ?? colors.orange }]} />
      <View style={styles.teamInfo}>
        <Text style={[styles.teamName, selected && styles.teamNameOn, disabled && styles.teamNameDisabled]}>
          {team.name}
        </Text>
        {team.short_name ? (
          <Text style={styles.teamShort}>{team.short_name}</Text>
        ) : null}
        {disabled && disabledReason ? (
          <Text style={styles.disabledTag}>{disabledReason}</Text>
        ) : null}
      </View>
      {selected ? (
        <Ionicons name="checkmark-circle" size={24} color={colors.orange} />
      ) : disabled ? (
        <Ionicons name="lock-closed" size={18} color={colors.textDim} />
      ) : (
        <View style={styles.radio} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  centered: { alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
    backgroundColor: colors.card,
  },
  title: { color: colors.text, fontSize: 18, fontWeight: '800' },
  scroll: { padding: 16, paddingBottom: 40 },
  hint: { color: colors.textMuted, fontSize: 14, lineHeight: 20, marginBottom: 16 },
  previewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  badgeCol: { alignItems: 'center', flex: 1 },
  badgeDot: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  badgeInitial: { color: '#fff', fontWeight: '800', fontSize: 16 },
  badgeName: { color: colors.text, fontWeight: '700', fontSize: 14, textAlign: 'center' },
  vs: { color: colors.textDim, fontWeight: '800', fontSize: 14, marginHorizontal: 8 },
  sectionTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  empty: { color: colors.textMuted, fontSize: 14, marginBottom: 8 },
  pickFirst: { color: colors.textDim, fontSize: 14, fontStyle: 'italic', marginBottom: 8 },
  teamCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: radius.lg,
    marginBottom: 8,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
    backgroundColor: colors.card,
    gap: 12,
  },
  teamCardOn: {
    borderColor: colors.orange,
    backgroundColor: colors.orangeLight,
  },
  teamCardDisabled: {
    opacity: 0.55,
    backgroundColor: colors.surface,
  },
  teamDot: { width: 12, height: 12, borderRadius: 6 },
  teamInfo: { flex: 1 },
  teamName: { color: colors.text, fontSize: 16, fontWeight: '700' },
  teamNameOn: { color: colors.orange },
  teamNameDisabled: { color: colors.textDim },
  teamShort: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  disabledTag: { color: colors.textDim, fontSize: 11, marginTop: 4, fontWeight: '600' },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.borderStrong,
  },
  formatBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 20,
    marginBottom: 8,
    padding: 12,
    backgroundColor: colors.orangeLight,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(234, 88, 12, 0.2)',
  },
  formatText: { color: colors.text, fontSize: 14, fontWeight: '600' },
  input: {
    padding: 14,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.card,
    color: colors.text,
    fontSize: 16,
  },
});
