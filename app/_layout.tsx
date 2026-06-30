import '../global.css';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useAuthStore } from '../src/stores/authStore';
import { usePushNotifications } from '../src/hooks/useNotifications';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30000 } },
});

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, loadProfile, initAuthListener } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    loadProfile();
    const unsubscribe = initAuthListener();
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (isLoading) return;
    const inAuth = segments[0] === '(auth)';
    if (!isAuthenticated && !inAuth) {
      router.replace('/(auth)/login');
    } else if (isAuthenticated && inAuth) {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, isLoading, segments]);

  usePushNotifications();
  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <StatusBar style="dark" />
        <AuthGuard>
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#F8FAFC' } }}>
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="match/[id]" options={{ presentation: 'card' }} />
            <Stack.Screen name="match/create" options={{ presentation: 'modal' }} />
            <Stack.Screen name="match/setup" options={{ presentation: 'card' }} />
            <Stack.Screen name="match/scorecard/[matchId]" options={{ presentation: 'card' }} />
            <Stack.Screen name="tournament/[id]" />
            <Stack.Screen name="team/[id]" />
            <Stack.Screen name="tournament/create" options={{ presentation: 'modal' }} />
            <Stack.Screen name="tournament/edit" options={{ presentation: 'modal' }} />
            <Stack.Screen name="register-team" options={{ presentation: 'modal' }} />
            <Stack.Screen name="team/edit" options={{ presentation: 'modal' }} />
            <Stack.Screen name="my-teams" options={{ presentation: 'card' }} />
            <Stack.Screen name="admin/index" />
            <Stack.Screen name="score/[matchId]" options={{ presentation: 'fullScreenModal' }} />
          </Stack>
        </AuthGuard>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
