import { useBranding } from '../../src/stores/brandingStore';
import { createThemedStyles } from '../../src/lib/theme';
import { useTranslation } from '../../src/i18n';
import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { Platform, StyleSheet, useWindowDimensions } from 'react-native';
import { colors, shadows } from '../../src/lib/theme';

export default function TabLayout() {
 useBranding(s=>s.palette);
  const {t}=useTranslation();
  const {width}=useWindowDimensions();
  return (
    <Tabs
      backBehavior="history"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.orange,
        tabBarInactiveTintColor: colors.textDim,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700',paddingBottom:4 },
        tabBarActiveBackgroundColor:colors.orangeLight,
        tabBarItemStyle:{borderRadius:14,marginHorizontal:5,marginVertical:3},
        tabBarStyle: [styles.tabBar,Platform.OS==='web'&&width>=1000?{display:'none'}:undefined],
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('Home'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="live"
        options={{
          title: t('Matches'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="radio" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="tournaments"
        options={{
          title: t('Leagues'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="trophy" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('Profile'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = createThemedStyles({
  tabBar: {
    backgroundColor: colors.backgroundSecondary,
    borderTopColor: colors.cardBorder,
    borderTopWidth: 1,
    height: Platform.OS === 'ios' ? 88 : 64,
    paddingTop: 8,
    ...shadows.card,
  },
});
