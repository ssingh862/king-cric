import { useBranding } from '../src/stores/brandingStore';
import { useBrandingSync } from '../src/hooks/useBrandingSync';
import WebFrame from '../src/components/website/WebFrame';
import '../src/lib/browserAlerts';
import { usePreferences } from '../src/stores/preferencesStore';
import { colors } from '../src/lib/theme';
import '../global.css';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useCallback, useEffect, useState } from 'react';
import { View, Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { LaunchAnimation } from '../src/components/brand/LaunchAnimation';
import { useAuthStore } from '../src/stores/authStore';
import { usePushNotifications } from '../src/hooks/useNotifications';

SplashScreen.preventAutoHideAsync().catch(() => {});

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30000 } },
});

function AuthGuard({ children }: { children: React.ReactNode }) {
 useBranding(s=>s.palette);
  const { isAuthenticated, isLoading } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading || (Platform.OS === 'web' && segments.join('/') === '')) return;
    const inAuth = segments[0] === '(auth)';
    if (!isAuthenticated && !inAuth && segments[0] !== 'rules' && segments[0] !== 'play' && segments[0] !== 'welcome') {
      router.replace(Platform.OS === 'web' && segments[0] === '(tabs)' && segments.length === 1 ? '/welcome' : '/(auth)/login');
    } else if (isAuthenticated && inAuth) {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, isLoading, segments]);

  usePushNotifications();
  return <>{children}</>;
}

export default function RootLayout() {
 useBranding(s=>s.palette);
  useBrandingSync();
  const theme = usePreferences(s=>s.theme);
  const [showLaunch, setShowLaunch] = useState(Platform.OS !== 'web');
  const isLoading = useAuthStore(s => s.isLoading);
  const finishLaunch = useCallback(() => setShowLaunch(false), []);

  useEffect(() => {
    void useAuthStore.getState().loadProfile();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider key={theme} client={queryClient}>
        <StatusBar style={showLaunch || theme === 'dark' ? 'light' : 'dark'} />
        <View style={{ flex: 1 }} aria-hidden={showLaunch} accessibilityElementsHidden={showLaunch} importantForAccessibility={showLaunch ? 'no-hide-descendants' : 'auto'}>
        <AuthGuard>
          <WebFrame><Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="match/[id]" options={{ presentation: 'card' }} />
            <Stack.Screen name="match/create" options={{ presentation: 'modal' }} />
            <Stack.Screen name="match/setup" options={{ presentation: 'card' }} />
            <Stack.Screen name="match/scorecard/[matchId]" options={{ presentation: 'card' }} />
            <Stack.Screen name="tournament/[id]" />
            <Stack.Screen name="team/[id]" />
            <Stack.Screen name="player/[id]" />
            <Stack.Screen name="tournament/create" options={{ presentation: 'modal' }} />
            <Stack.Screen name="tournament/edit" options={{ presentation: 'modal' }} />
            <Stack.Screen name="register-team" options={{ presentation: 'modal' }} />
            <Stack.Screen name="team/edit" options={{ presentation: 'modal' }} />
            <Stack.Screen name="my-teams" options={{ presentation: 'card' }} />
            <Stack.Screen name="settings" />
            <Stack.Screen name="organizer-settings" />
            <Stack.Screen name="admin/index" />
            <Stack.Screen name="score/[matchId]" options={{ presentation: 'fullScreenModal' }} />
          </Stack></WebFrame>
        </AuthGuard>
        </View>
        {showLaunch ? <LaunchAnimation ready={!isLoading} onFinish={finishLaunch} /> : null}
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
