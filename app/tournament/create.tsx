import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardForm } from '../../src/components/ui/KeyboardForm';
import { GradientButton } from '../../src/components/ui/GradientButton';
import { supabase } from '../../src/lib/supabase';
import { colors, radius } from '../../src/lib/theme';
import { useAuthStore } from '../../src/stores/authStore';

export default function CreateTournamentScreen() {
  const { profile } = useAuthStore();
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [venue, setVenue] = useState('');
  const [format, setFormat] = useState('T20');
  const [overs, setOvers] = useState('20');
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) {
      Alert.alert('Required', 'Enter a tournament name');
      return;
    }
    if (!profile?.id) {
      Alert.alert('Sign in', 'Please sign in to create a tournament');
      return;
    }

    const slug = name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    setLoading(true);
    const { data, error } = await supabase
      .from('tournaments')
      .insert({
        organizer_id: profile.id,
        name: name.trim(),
        slug: `${slug}-${Date.now().toString(36)}`,
        city: city.trim() || null,
        venue: venue.trim() || null,
        format,
        overs_per_innings: parseInt(overs, 10) || 20,
        status: 'registration',
      })
      .select('id')
      .single();

    setLoading(false);

    if (error) {
      Alert.alert('Error', error.message);
      return;
    }

    Alert.alert('Created!', 'Your tournament is live — completely free.', [
      { text: 'OK', onPress: () => router.replace(`/tournament/${data.id}`) },
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

const styles = StyleSheet.create({
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
    backgroundColor: 'rgba(255,255,255,0.06)',
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
