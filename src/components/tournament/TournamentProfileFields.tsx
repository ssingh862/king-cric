import { Alert, TextInput } from '../../i18n';
import { createThemedStyles } from '../../lib/theme';
import { Text } from '../../i18n';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { format } from 'date-fns';
import { useState } from 'react';
import { Image, Platform, Pressable, StyleSheet, View } from 'react-native';
import { BALL_TYPES, type TournamentBallType } from '../../lib/tournaments';
import { colors, radius } from '../../lib/theme';

function dateKey(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

async function pickTournamentLogo(onLogo: (value: string | null) => void) {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    Alert.alert('Photos', 'Allow photo access to add a tournament logo.');
    return;
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.4,
    base64: true,
  });
  if (result.canceled || !result.assets[0]?.base64) return;
  const uri = `data:image/jpeg;base64,${result.assets[0].base64}`;
  if (uri.length > 900_000) {
    Alert.alert('Logo', 'That image is too large. Choose a smaller photo.');
    return;
  }
  onLogo(uri);
}

export function TournamentLogoField({
  logoUrl,
  onLogo,
  featured = false,
}: {
  logoUrl: string | null;
  onLogo: (value: string | null) => void;
  featured?: boolean;
}) {
  const choose = () => pickTournamentLogo(onLogo);
  return (
    <View style={featured ? styles.featured : undefined}>
      <Pressable
        style={[styles.logoButton, featured && styles.logoButtonFeatured]}
        onPress={choose}
        accessibilityLabel="Add tournament logo"
      >
        {logoUrl ? (
          <Image source={{ uri: logoUrl }} style={[styles.logo, featured && styles.logoFeatured]} />
        ) : (
          <Ionicons name="image-outline" size={featured ? 36 : 28} color={colors.orange} />
        )}
      </Pressable>
      <Pressable onPress={choose}>
        <Text style={[styles.logoAction, featured && styles.featuredAction]}>
          {logoUrl ? 'Change logo' : 'Add tournament logo'}
        </Text>
      </Pressable>
      {logoUrl ? (
        <Pressable onPress={() => onLogo(null)}>
          <Text style={styles.logoRemove}>Remove</Text>
        </Pressable>
      ) : (
        <Text style={[styles.hint, featured && styles.featuredHint]}>Shown on the tournament page and lists.</Text>
      )}
    </View>
  );
}

function DateField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const [open, setOpen] = useState(false);
  const selected = value ? new Date(`${value}T00:00:00`) : new Date();
  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      <Pressable style={styles.input} onPress={() => setOpen(true)} accessibilityLabel={label}>
        <Text style={{ color: value ? colors.text : colors.textDim, fontSize: 16 }}>
          {value ? format(selected, 'd MMM yyyy') : 'Select date'}
        </Text>
      </Pressable>
      {open ? (
        <DateTimePicker
          value={selected}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(_event, date) => {
            if (Platform.OS !== 'ios') setOpen(false);
            if (date) onChange(dateKey(date));
          }}
        />
      ) : null}
      {Platform.OS === 'ios' && open ? (
        <Pressable onPress={() => setOpen(false)}>
          <Text style={styles.logoAction}>Done</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function TournamentProfileFields({
  logoUrl,
  onLogo,
  organizerName,
  onOrganizerName,
  organizerPhone,
  onOrganizerPhone,
  startDate,
  onStartDate,
  registrationDate,
  onRegistrationDate,
  closingDate,
  onClosingDate,
  ballType,
  onBallType,
  showLogo = true,
}: {
  logoUrl: string | null;
  onLogo: (value: string | null) => void;
  organizerName: string;
  onOrganizerName: (value: string) => void;
  organizerPhone: string;
  onOrganizerPhone: (value: string) => void;
  startDate: string;
  onStartDate: (value: string) => void;
  registrationDate: string;
  onRegistrationDate: (value: string) => void;
  closingDate: string;
  onClosingDate: (value: string) => void;
  ballType: TournamentBallType;
  onBallType: (value: TournamentBallType) => void;
  showLogo?: boolean;
}) {

  return (
    <View>
      {showLogo ? <TournamentLogoField logoUrl={logoUrl} onLogo={onLogo} /> : null}

      <Text style={styles.label}>Organizer name *</Text>
      <TextInput
        style={styles.input}
        value={organizerName}
        onChangeText={onOrganizerName}
        placeholder="Sandeep Patel"
        placeholderTextColor={colors.textDim}
      />

      <Text style={styles.label}>Organizer number *</Text>
      <TextInput
        style={styles.input}
        value={organizerPhone}
        onChangeText={onOrganizerPhone}
        placeholder="9876543210"
        placeholderTextColor={colors.textDim}
        keyboardType="phone-pad"
      />

      <DateField label="Tournament date *" value={startDate} onChange={onStartDate} />
      <DateField label="Registration date *" value={registrationDate} onChange={onRegistrationDate} />
      <DateField label="Closing date *" value={closingDate} onChange={onClosingDate} />

      <Text style={styles.label}>Ball type *</Text>
      <View style={styles.chipRow}>
        {BALL_TYPES.map((ball) => (
          <Pressable
            key={ball.id}
            style={[styles.chip, ballType === ball.id && styles.chipOn]}
            onPress={() => onBallType(ball.id)}
          >
            <Text style={[styles.chipText, ballType === ball.id && styles.chipTextOn]}>{ball.label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = createThemedStyles({
  label: { color: colors.textMuted, fontSize: 13, marginBottom: 8, marginTop: 12 },
  hint: { color: colors.textMuted, fontSize: 12, lineHeight: 17 },
  input: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    color: colors.text,
    fontSize: 16,
    padding: 16,
  },
  featured: { alignItems: 'center', marginBottom: 8 },
  featuredAction: { textAlign: 'center', marginTop: 10 },
  featuredHint: { textAlign: 'center' },
  logoButton: {
    width: 72,
    height: 72,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  logoButtonFeatured: {
    width: 108,
    height: 108,
    borderRadius: 24,
  },
  logo: { width: 72, height: 72 },
  logoFeatured: { width: 108, height: 108 },
  logoAction: { color: colors.orange, fontWeight: '700', fontSize: 15, marginTop: 8 },
  logoRemove: { color: colors.live, fontWeight: '600', marginTop: 6 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  chipOn: { backgroundColor: 'rgba(255,107,0,0.2)', borderColor: colors.orange },
  chipText: { color: colors.textMuted, fontWeight: '600' },
  chipTextOn: { color: colors.orange },
});
