import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { isRunningInExpoGo } from 'expo';
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { useAuthStore } from '../stores/authStore';

/** Remote push is not available in Expo Go (SDK 53+). Use a dev build for production push. */
export function isPushNotificationsAvailable(): boolean {
  if (Platform.OS === 'web') return false;
  if (!Device.isDevice) return false;
  if (isRunningInExpoGo() || Constants.appOwnership === 'expo') return false;
  return true;
}

export function usePushNotifications() {
  const { profile, updateProfile } = useAuthStore();
  const registered = useRef(false);

  useEffect(() => {
    if (!profile?.preferences?.notifications) { registered.current = false; return; }
    if (!profile || registered.current || !isPushNotificationsAvailable()) return;

    registered.current = true;

    registerForPushNotifications()
      .then((token) => {
        if (token && token !== profile.expo_push_token) {
          void updateProfile({ expo_push_token: token } as never).catch(() => undefined);
        }
      })
      .catch(() => {
        // Push is optional; ignore errors in dev
      });
  }, [profile?.id, profile?.preferences?.notifications]);
}

async function registerForPushNotifications(): Promise<string | null> {
  if (!isPushNotificationsAvailable()) return null;
  const Notifications = await import('expo-notifications');

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;
  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') return null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('live-scores', {
      name: 'Live Scores',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF6B00',
    });
  }

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    process.env.EXPO_PUBLIC_EAS_PROJECT_ID;

  if (!projectId) {
    return null;
  }

  const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
  return data;
}
