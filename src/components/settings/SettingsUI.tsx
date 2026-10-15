import { TextInput } from '../../i18n';
import { colors, createThemedStyles, shadows } from '../../lib/theme';
import type { ReactNode } from 'react';
import type { ComponentProps } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Text, useTranslation } from '../../i18n';

type IconName = ComponentProps<typeof Ionicons>['name'];

export const styles = createThemedStyles({
  page: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: 20, paddingBottom: 48, width: '100%', maxWidth: 720, alignSelf: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 18 },
  back: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  title: { fontSize: 26, fontWeight: '800', color: colors.text, flex: 1 },
  group: { color: colors.textMuted, fontSize: 12, fontWeight: '800', letterSpacing: 0.8, marginBottom: 8, marginLeft: 6, textTransform: 'uppercase' },
  hero: { borderRadius: 24, padding: 20, marginBottom: 22, flexDirection: 'row', alignItems: 'center', gap: 14 },
  heroName: { color: '#fff', fontSize: 20, fontWeight: '800' },
  heroMeta: { color: '#E7F6EC', marginTop: 4, fontSize: 14 },
  avatar: { width: 58, height: 58, borderRadius: 29, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.18)' },
  avatarText: { color: '#fff', fontSize: 24, fontWeight: '800' },
  card: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: 18,
    ...shadows.card,
  },
  heading: { fontSize: 18, fontWeight: '800', color: colors.text, marginTop: 10, marginBottom: 12 },
  label: { color: colors.text, fontWeight: '600', fontSize: 14, marginBottom: 8 },
  sub: { color: colors.textMuted, lineHeight: 21, marginBottom: 14 },
  input: { borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 14, padding: 14, color: colors.text, backgroundColor: colors.inputBg, marginBottom: 14, fontSize: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  iconWrap: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { color: colors.text, fontWeight: '700', fontSize: 16 },
  rowValue: { color: colors.textMuted, fontSize: 14, marginRight: 2 },
  button: { padding: 15, borderRadius: 14, backgroundColor: colors.orange, alignItems: 'center', marginTop: 8, marginBottom: 8 },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  notice: { padding: 14, borderRadius: 14, backgroundColor: colors.orangeLight, color: colors.text, marginBottom: 14 },
  danger: { backgroundColor: colors.live },
  choice: { borderRadius: 16, borderWidth: 1.5, borderColor: colors.cardBorder, padding: 14, marginBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 12 },
  choiceOn: { borderColor: colors.orange, backgroundColor: colors.orangeLight },
});

export function Page({ title, children, onBack }: { title: string; children: ReactNode; onBack?: () => void }) {
  const { t } = useTranslation();
  return (
    <SafeAreaView style={styles.page}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Pressable accessibilityLabel={t('Back')} style={styles.back} onPress={() => onBack ? onBack() : router.canGoBack() ? router.back() : router.replace('/(tabs)/profile')}>
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </Pressable>
          <Text style={styles.title}>{title}</Text>
        </View>
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

export function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View>
      <Text style={styles.group}>{title}</Text>
      <Card>{children}</Card>
    </View>
  );
}

export function Hero({ name, meta, photo }: { name: string; meta: string; photo?: string | null }) {
  return (
    <LinearGradient colors={[colors.forest, colors.orange]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
      <View style={styles.avatar}>
        {photo ? <Image source={{ uri: photo }} style={{ width: 58, height: 58, borderRadius: 29 }} /> : <Text style={styles.avatarText}>{(name || 'U')[0].toUpperCase()}</Text>}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.heroName}>{name}</Text>
        <Text style={styles.heroMeta}>{meta}</Text>
      </View>
    </LinearGradient>
  );
}

export function Card({ title, children }: { title?: string; children: ReactNode }) {
  return <View style={styles.card}>{title ? <Text style={styles.heading}>{title}</Text> : null}{children}</View>;
}

export function Field({ label, value, onChange, secure = false, multiline = false }: { label: string; value: string; onChange: (v: string) => void; secure?: boolean; multiline?: boolean }) {
  const { t } = useTranslation();
  return (
    <>
      <Text style={styles.label}>{label}</Text>
      <TextInput accessibilityLabel={t(label)} style={[styles.input, multiline && { minHeight: 96, textAlignVertical: 'top' }]} value={value} onChangeText={onChange} secureTextEntry={secure} multiline={multiline} autoCapitalize="none" />
    </>
  );
}

export function Button({ title, onPress, busy = false, danger = false }: { title: string; onPress: () => void; busy?: boolean; danger?: boolean }) {
  return (
    <Pressable accessibilityRole="button" disabled={busy} style={[styles.button, danger && styles.danger, busy && { opacity: 0.5 }]} onPress={onPress}>
      {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{title}</Text>}
    </Pressable>
  );
}

export function LinkRow({ title, value, selected, onPress, icon, tint }: { title: string; value?: string; selected?: boolean; onPress: () => void; icon?: IconName; tint?: string }) {
  const chosen = selected === true;
  return (
    <Pressable accessibilityRole={selected === undefined ? 'button' : 'radio'} accessibilityState={selected === undefined ? undefined : { checked: selected }} style={styles.row} onPress={onPress}>
      {icon ? (
        <View style={[styles.iconWrap, { backgroundColor: chosen ? colors.orangeLight : (tint ? `${tint}18` : colors.surface) }]}>
          <Ionicons name={icon} size={18} color={chosen ? colors.orange : (tint ?? colors.orange)} />
        </View>
      ) : null}
      <Text style={[styles.rowTitle, { flex: 1 }]}>{title}</Text>
      {value ? <Text style={styles.rowValue}>{value}</Text> : null}
      {selected === undefined ? <Ionicons name="chevron-forward" size={18} color={colors.textDim} /> : chosen ? <Ionicons name="checkmark-circle" size={22} color={colors.orange} /> : <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: colors.borderStrong }} />}
    </Pressable>
  );
}

export function Choice({ title, subtitle, selected, onPress, icon }: { title: string; subtitle?: string; selected: boolean; onPress: () => void; icon: IconName }) {
  return (
    <Pressable accessibilityRole="radio" accessibilityState={{ checked: selected }} onPress={onPress} style={[styles.choice, selected && styles.choiceOn]}>
      <View style={[styles.iconWrap, { backgroundColor: selected ? colors.card : colors.surface }]}>
        <Ionicons name={icon} size={18} color={colors.orange} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle}>{title}</Text>
        {subtitle ? <Text style={[styles.rowValue, { marginTop: 2 }]}>{subtitle}</Text> : null}
      </View>
      {selected ? <Ionicons name="checkmark-circle" size={22} color={colors.orange} /> : <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: colors.borderStrong }} />}
    </Pressable>
  );
}
