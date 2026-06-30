import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GlassCard } from '../../src/components/ui/GlassCard';
import { GradientButton } from '../../src/components/ui/GradientButton';
import { colors } from '../../src/lib/theme';
import { useAuthStore } from '../../src/stores/authStore';

const MENU = [
  { icon: 'add-circle' as const, label: 'Create Tournament', route: '/tournament/create', color: colors.orange },
  { icon: 'trophy' as const, label: 'My Tournaments', route: '/(tabs)/tournaments', color: colors.gold },
  { icon: 'people' as const, label: 'My Teams', route: '/my-teams', color: colors.blue },
  { icon: 'settings' as const, label: 'Settings', route: null, color: colors.textMuted },
];

export default function ProfileScreen() {
  const { profile, userEmail, signOut } = useAuthStore();

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.flex}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.avatarWrap}>
            <LinearGradient colors={[colors.orange, colors.purple]} style={styles.avatar}>
              <Text style={styles.avatarText}>
                {(profile?.full_name ?? 'U')[0].toUpperCase()}
              </Text>
            </LinearGradient>
            <Text style={styles.name}>{profile?.full_name ?? 'Cricket Fan'}</Text>
            <Text style={styles.phone}>{userEmail ?? profile?.phone ?? '—'}</Text>
            <View style={styles.premiumBadge}>
              <Ionicons name="checkmark-circle" size={14} color={colors.green} />
              <Text style={styles.premiumText}>FREE</Text>
            </View>
          </View>

          <GlassCard style={{ marginBottom: 20 }}>
            {MENU.map((item) => (
              <Pressable
                key={item.label}
                style={styles.menuRow}
                onPress={() => item.route && router.push(item.route as never)}
              >
                <Ionicons name={item.icon} size={22} color={item.color} />
                <Text style={styles.menuLabel}>{item.label}</Text>
                <Ionicons name="chevron-forward" size={20} color={colors.textDim} />
              </Pressable>
            ))}
          </GlassCard>

          <GradientButton title="Sign Out" onPress={signOut} variant="outline" />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  scroll: { padding: 20, paddingBottom: 40 },
  avatarWrap: { alignItems: 'center', marginBottom: 28, marginTop: 20 },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontSize: 36, fontWeight: '800' },
  name: { color: colors.text, fontSize: 24, fontWeight: '800', marginTop: 16 },
  phone: { color: colors.textMuted, marginTop: 4 },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: colors.successLight,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 20,
  },
  premiumText: { color: colors.green, fontWeight: '800', fontSize: 12 },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  menuLabel: { flex: 1, color: colors.text, fontSize: 16 },
});
