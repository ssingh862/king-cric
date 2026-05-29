import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import {
  createEmptyPlayer,
  PlayerSquadEditor,
  type SquadPlayerDraft,
} from '../../src/components/forms/PlayerSquadEditor';
import { KeyboardForm } from '../../src/components/ui/KeyboardForm';
import { GradientButton } from '../../src/components/ui/GradientButton';
import { deletePlayer, upsertPlayersFromDrafts } from '../../src/lib/players';
import { updateTeam } from '../../src/lib/teams';
import { colors, radius } from '../../src/lib/theme';
import { useTeam } from '../../src/hooks/useTournaments';
import { canManageTournament } from '../../src/lib/permissions';
import type { Player, Tournament } from '../../src/types/database';
import { useAuthStore } from '../../src/stores/authStore';

export default function EditTeamScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const profile = useAuthStore((s) => s.profile);
  const { data: team, isLoading } = useTeam(id ?? '');

  const tournament = team?.tournament as Tournament | undefined;
  const canEdit =
    canManageTournament(tournament ?? null, profile) || team?.captain_id === profile?.id;

  useEffect(() => {
    if (isLoading || !team || !profile) return;
    if (!canManageTournament(tournament ?? null, profile) && team.captain_id !== profile.id) {
      Alert.alert('Not allowed', 'Only the tournament organizer or team captain can edit this squad.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    }
  }, [isLoading, team, profile, tournament]);

  const [teamName, setTeamName] = useState('');
  const [shortName, setShortName] = useState('');
  const [players, setPlayers] = useState<SquadPlayerDraft[]>([createEmptyPlayer()]);
  const [removedPlayerIds, setRemovedPlayerIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const existingIdMap = useMemo(() => {
    const map = new Map<string, string>();
    (team?.players as Player[] | undefined)?.forEach((p) => {
      map.set(`db-${p.id}`, p.id);
    });
    return map;
  }, [team?.players]);

  useEffect(() => {
    if (!team) return;
    setTeamName(team.name ?? '');
    setShortName(team.short_name ?? '');
    const squad = (team.players as Player[] | undefined) ?? [];
    if (squad.length) {
      setPlayers(
        squad.map((p) => ({
          key: `db-${p.id}`,
          fullName: p.full_name,
          jerseyNumber: p.jersey_number != null ? String(p.jersey_number) : '',
          role: p.role ?? 'all_rounder',
          isCaptain: p.is_captain,
          isWicketKeeper: p.is_wicket_keeper,
        }))
      );
    } else {
      setPlayers([createEmptyPlayer()]);
    }
    setRemovedPlayerIds([]);
  }, [team]);

  const handleSave = async () => {
    if (!canEdit) {
      Alert.alert('Not allowed', 'You cannot edit this team.');
      return;
    }
    if (!id || !teamName.trim()) {
      Alert.alert('Required', 'Team name is required');
      return;
    }

    setSaving(true);

    const { error: teamErr } = await updateTeam({
      teamId: id,
      name: teamName,
      shortName,
    });

    if (teamErr) {
      setSaving(false);
      Alert.alert('Error', teamErr);
      return;
    }

    for (const pid of removedPlayerIds) {
      await deletePlayer(pid);
    }

    const { error: playersErr } = await upsertPlayersFromDrafts(id, players, existingIdMap);
    setSaving(false);

    if (playersErr) {
      Alert.alert('Error', playersErr);
      return;
    }

    await queryClient.invalidateQueries({ queryKey: ['team', id] });
    await queryClient.invalidateQueries({ queryKey: ['points'] });

    Alert.alert('Saved', 'Team and squad updated.', [
      { text: 'OK', onPress: () => router.back() },
    ]);
  };

  if (isLoading && !team) {
    return (
      <View style={[styles.root, styles.center]}>
        <Text style={styles.loading}>Loading…</Text>
      </View>
    );
  }

  if (team && profile && !canEdit) {
    return (
      <View style={[styles.root, styles.center]}>
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
          <Text style={styles.title}>Edit Team & Squad</Text>
          <View style={{ width: 24 }} />
        </View>

        <KeyboardForm>
            <Text style={styles.label}>Team name *</Text>
            <TextInput
              style={styles.input}
              value={teamName}
              onChangeText={setTeamName}
              placeholderTextColor={colors.textDim}
            />

            <Text style={styles.label}>Short name</Text>
            <TextInput
              style={styles.input}
              value={shortName}
              onChangeText={(t) => setShortName(t.toUpperCase().slice(0, 4))}
              maxLength={4}
              placeholderTextColor={colors.textDim}
            />

            <PlayerSquadEditor
              players={players}
              onChange={(next) => {
                const removed = players.filter(
                  (old) => !next.find((n) => n.key === old.key) && existingIdMap.has(old.key)
                );
                removed.forEach((r) => {
                  const dbId = existingIdMap.get(r.key);
                  if (dbId) setRemovedPlayerIds((prev) => [...new Set([...prev, dbId])]);
                });
                setPlayers(next);
              }}
            />

            <GradientButton title="Save Changes" onPress={handleSave} loading={saving} style={{ marginTop: 24 }} />
          </KeyboardForm>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  title: { color: colors.text, fontSize: 18, fontWeight: '700' },
  loading: { color: colors.textMuted, textAlign: 'center', marginTop: 40 },
  label: { color: colors.textMuted, fontSize: 13, marginBottom: 8, marginTop: 4 },
  input: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    color: colors.text,
    fontSize: 16,
    padding: 16,
    marginBottom: 8,
  },
});
