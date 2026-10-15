import { Alert, TextInput } from '../../src/i18n';
import { createThemedStyles } from '../../src/lib/theme';
import { Text } from '../../src/i18n';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TournamentLogoField, TournamentProfileFields } from '../../src/components/tournament/TournamentProfileFields';
import { KeyboardForm } from '../../src/components/ui/KeyboardForm';
import { GradientButton } from '../../src/components/ui/GradientButton';
import { createTournament, validateTournamentProfile, type TournamentBallType } from '../../src/lib/tournaments';
import { colors, radius } from '../../src/lib/theme';
import { useAuthStore } from '../../src/stores/authStore';

export default function CreateTournamentScreen() {
  const queryClient = useQueryClient();
  const { profile } = useAuthStore();
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [venue, setVenue] = useState('');
  const [format, setFormat] = useState('T20');
  const [overs, setOvers] = useState('20');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [organizerName, setOrganizerName] = useState(profile?.full_name ?? '');
  const [organizerPhone, setOrganizerPhone] = useState(profile?.phone ?? '');
  const [startDate, setStartDate] = useState('');
  const [registrationDate, setRegistrationDate] = useState('');
  const [closingDate, setClosingDate] = useState('');
  const [ballType, setBallType] = useState<TournamentBallType>('tennis');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (profile?.full_name) setOrganizerName((current) => current || profile.full_name || '');
    if (profile?.phone) setOrganizerPhone((current) => current || profile.phone || '');
  }, [profile?.full_name, profile?.phone]);

  const handleCreate = async () => {
    if (!name.trim()) {
      Alert.alert('Required', 'Enter a tournament name');
      return;
    }
    if (!profile?.id) {
      Alert.alert('Sign in', 'Please sign in to create a tournament');
      return;
    }
    const profileError = validateTournamentProfile({
      organizerName,
      organizerPhone,
      startDate,
      registrationDate,
      closingDate,
      ballType,
      logoUrl,
    });
    if (profileError) {
      Alert.alert('Required', profileError);
      return;
    }

    setLoading(true);
    const slug = `${name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')}-${Date.now().toString(36)}`;

    const { tournamentId, error } = await createTournament({
      name: name.trim(),
      slug,
      city: city.trim() || undefined,
      venue: venue.trim() || undefined,
      format,
      oversPerInnings: parseInt(overs, 10) || 20,
      status: 'registration',
      logoUrl,
      organizerName,
      organizerPhone,
      startDate,
      registrationDate,
      closingDate,
      ballType,
    });

    setLoading(false);

    if (error) {
      Alert.alert('Error', error);
      return;
    }

    await queryClient.invalidateQueries({ queryKey: ['tournaments'] });

    Alert.alert('Created!', 'Your tournament is live — completely free.', [
      { text: 'OK', onPress: () => router.push(`/tournament/${tournamentId}`) },
    ]);
  };

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.flex} edges={['top']}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()}>
            <Ionicons name="close" size={28} color={colors.text} />
          </Pressable>
          <Text style={styles.title}>Create Tournament</Text>
          <View style={{ width: 28 }} />
        </View>

        <KeyboardForm contentContainerStyle={styles.formPad}>
          <TournamentLogoField logoUrl={logoUrl} onLogo={setLogoUrl} featured />

          <View style={styles.freeBadge}>
            <Ionicons name="gift-outline" size={18} color={colors.green} />
            <Text style={styles.freeText}>100% free — no subscription needed</Text>
          </View>

          <Text style={styles.label}>Tournament name *</Text>
          <TextInput
            style={styles.input}
            placeholder="Gully Premier League 2026"
            placeholderTextColor={colors.textDim}
            value={name}
            onChangeText={setName}
            returnKeyType="next"
          />

          <Text style={styles.label}>City</Text>
          <TextInput
            style={styles.input}
            placeholder="Mumbai"
            placeholderTextColor={colors.textDim}
            value={city}
            onChangeText={setCity}
            returnKeyType="next"
          />

          <Text style={styles.label}>Venue</Text>
          <TextInput
            style={styles.input}
            placeholder="Azad Maidan"
            placeholderTextColor={colors.textDim}
            value={venue}
            onChangeText={setVenue}
            returnKeyType="done"
          />

          <Text style={styles.label}>Format</Text>
          <View style={styles.chipRow}>
            {['T10', 'T20', 'ODI'].map((f) => (
              <Pressable
                key={f}
                style={[styles.chip, format === f && styles.chipActive]}
                onPress={() => setFormat(f)}
              >
                <Text style={[styles.chipText, format === f && styles.chipTextActive]}>{f}</Text>
              </Pressable>
            ))}
          </View>

          <TournamentProfileFields
            logoUrl={logoUrl}
            onLogo={setLogoUrl}
            showLogo={false}
            organizerName={organizerName}
            onOrganizerName={setOrganizerName}
            organizerPhone={organizerPhone}
            onOrganizerPhone={setOrganizerPhone}
            startDate={startDate}
            onStartDate={setStartDate}
            registrationDate={registrationDate}
            onRegistrationDate={setRegistrationDate}
            closingDate={closingDate}
            onClosingDate={setClosingDate}
            ballType={ballType}
            onBallType={setBallType}
          />

          <Text style={styles.label}>Overs per innings</Text>
          <TextInput
            style={styles.input}
            placeholder="20"
            placeholderTextColor={colors.textDim}
            value={overs}
            onChangeText={setOvers}
            keyboardType="number-pad"
          />

          <GradientButton
            title="Create Tournament"
            onPress={handleCreate}
            loading={loading}
            style={{ marginTop: 24 }}
          />
        </KeyboardForm>
      </SafeAreaView>
    </View>
  );
}

const styles = createThemedStyles({
  root: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  title: { color: colors.text, fontSize: 18, fontWeight: '700' },
  formPad: { paddingTop: 0 },
  freeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(0,200,83,0.12)',
    padding: 12,
    borderRadius: radius.md,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(0,200,83,0.3)',
  },
  freeText: { color: colors.green, fontSize: 14, fontWeight: '600' },
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
  chipRow: { flexDirection: 'row', gap: 10 },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  chipActive: { backgroundColor: 'rgba(255,107,0,0.2)', borderColor: colors.orange },
  chipText: { color: colors.textMuted, fontWeight: '600' },
  chipTextActive: { color: colors.orange },
});
