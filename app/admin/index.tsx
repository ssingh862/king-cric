import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GlassCard } from '../../src/components/ui/GlassCard';
import { colors } from '../../src/lib/theme';

const ADMIN_SECTIONS = [
  { icon: 'people', title: 'Users', count: '—', color: colors.blue },
  { icon: 'trophy', title: 'Tournaments', count: '—', color: colors.orange },
  { icon: 'notifications', title: 'Push Notifications', count: '—', color: colors.purple },
  { icon: 'shield-checkmark', title: 'Approve Teams', count: '—', color: colors.green },
  { icon: 'analytics', title: 'Platform Analytics', count: '—', color: colors.pink },
];

export default function AdminScreen() {
  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.flex}>
        <Pressable style={styles.back} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>Admin Panel</Text>
        <Text style={styles.sub}>Manage platform, users & payments</Text>

        <ScrollView contentContainerStyle={styles.scroll}>
          {ADMIN_SECTIONS.map((s) => (
            <Pressable key={s.title}>
              <GlassCard style={{ marginBottom: 12 }}>
                <View style={styles.row}>
                  <View style={[styles.iconWrap, { backgroundColor: `${s.color}22` }]}>
                    <Ionicons name={s.icon as never} size={24} color={s.color} />
                  </View>
                  <View style={styles.info}>
                    <Text style={styles.sectionTitle}>{s.title}</Text>
                    <Text style={styles.count}>{s.count} items</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={colors.textDim} />
                </View>
              </GlassCard>
            </Pressable>
          ))}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1, padding: 20 },
  back: { marginBottom: 16 },
  title: { color: colors.text, fontSize: 28, fontWeight: '800' },
  sub: { color: colors.textMuted, marginBottom: 24 },
  scroll: { paddingBottom: 40 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  iconWrap: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1 },
  sectionTitle: { color: colors.text, fontSize: 16, fontWeight: '600' },
  count: { color: colors.textDim, fontSize: 12, marginTop: 2 },
});
