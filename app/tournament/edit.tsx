import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import { KeyboardForm } from '../../src/components/ui/KeyboardForm';
import { GradientButton } from '../../src/components/ui/GradientButton';
import { updateTournament } from '../../src/lib/tournaments';
import { canManageTournament } from '../../src/lib/permissions';
import { colors, radius } from '../../src/lib/theme';
import { useTournament } from '../../src/hooks/useTournaments';
import { useAuthStore } from '../../src/stores/authStore';

const STATUSES = ['draft', 'registration', 'ongoing', 'completed'] as const;

export default function EditTournamentScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const profile = useAuthStore((s) => s.profile);
  const { data: tournament, isLoading } = useTournament(id ?? '');

  const canManage = canManageTournament(tournament ?? null, profile);

  useEffect(() => {
    if (isLoading || !tournament || !profile) return;
    if (!canManageTournament(tournament, profile)) {
      Alert.alert('Organizer only', 'Only the tournament organizer can edit this league.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    }
  }, [isLoading, tournament, profile]);

  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [venue, setVenue] = useState('');
  const [format, setFormat] = useState('T20');
  const [overs, setOvers] = useState('20');
  const [maxTeams, setMaxTeams] = useState('8');
  const [status, setStatus] = useState<string>('registration');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!tournament) return;
    setName(tournament.name ?? '');
    setCity(tournament.city ?? '');
    setVenue(tournament.venue ?? '');
    setFormat(tournament.format ?? 'T20');
    setOvers(String(tournament.overs_per_innings ?? 20));
    setMaxTeams(String(tournament.max_teams ?? 8));
    setStatus(tournament.status ?? 'registration');
  }, [tournament]);

  const handleSave = async () => {
    if (!canManage) {
      Alert.alert('Organizer only', 'You cannot edit this tournament.');
      return;
    }
    if (!id || !name.trim()) {
      Alert.alert('Required', 'Tournament name is required');
      return;
    }

    setSaving(true);
    const { error } = await updateTournament({
      id,
      name,
      city,
      venue,
      format,
      oversPerInnings: parseInt(overs, 10) || 20,
      maxTeams: parseInt(maxTeams, 10) || 8,
      status,
    });
    setSaving(false);

    if (error) {
      Alert.alert('Error', error);
      return;
    }

    await queryClient.invalidateQueries({ queryKey: ['tournament', id] });
    await queryClient.invalidateQueries({ queryKey: ['tournaments'] });

    Alert.alert('Saved', 'Tournament updated successfully.', [
      { text: 'OK', onPress: () => router.back() },
    ]);
  };

  if (isLoading && !tournament) {
    return (
      <View style={[styles.root, styles.center]}>
        <Text style={{ color: colors.textMuted }}>Loading…</Text>
      </View>
    );
  }

  if (tournament && profile && !canManage) {
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
          <Text style={styles.title}>Edit Tournament</Text>
          <View style={{ width: 24 }} />
        </View>

        <KeyboardForm>
          <Text style={styles.label}>Tournament name *</Text>
          <TextInput style={styles.input} value={name} onChangeText={setName} placeholderTextColor={colors.textDim} />

          <Text style={styles.label}>City</Text>
          <TextInput style={styles.input} value={city} onChangeText={setCity} placeholderTextColor={colors.textDim} />

          <Text style={styles.label}>Venue</Text>
          <TextInput style={styles.input} value={venue} onChangeText={setVenue} placeholderTextColor={colors.textDim} />

          <Text style={styles.label}>Format</Text>
          <View style={styles.chipRow}>
            {['T10', 'T20', 'ODI'].map((f) => (
              <Pressable
                key={f}
                style={[styles.chip, format === f && styles.chipOn]}
                onPress={() => setFormat(f)}
              >
                <Text style={[styles.chipText, format === f && styles.chipTextOn]}>{f}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.label}>Overs per innings</Text>
          <TextInput
            style={styles.input}
            value={overs}
            onChangeText={setOvers}
            keyboardType="number-pad"
            placeholderTextColor={colors.textDim}
          />

          <Text style={styles.label}>Max teams</Text>
          <TextInput
            style={styles.input}
            value={maxTeams}
            onChangeText={setMaxTeams}
            keyboardType="number-pad"
            placeholderTextColor={colors.textDim}
          />

          <Text style={styles.label}>Status</Text>
          <View style={styles.chipRow}>
            {STATUSES.map((s) => (
              <Pressable
                key={s}
                style={[styles.chip, status === s && styles.chipOn]}
                onPress={() => setStatus(s)}
              >
                <Text style={[styles.chipText, status === s && styles.chipTextOn]}>{s}</Text>
              </Pressable>
            ))}
          </View>

          <GradientButton title="Save Changes" onPress={handleSave} loading={saving} style={{ marginTop: 24 }} />
        </KeyboardForm>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  center: { alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  title: { color: colors.text, fontSize: 18, fontWeight: '700' },
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
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  chipOn: { borderColor: colors.orange, backgroundColor: 'rgba(255,107,0,0.15)' },
  chipText: { color: colors.textMuted, fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },
  chipTextOn: { color: colors.orange },
});
