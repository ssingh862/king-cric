import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';

/** Remote push is not available in Expo Go (SDK 53+). Use a dev build for production push. */
export function isPushNotificationsAvailable(): boolean {
  if (!Device.isDevice) return false;
  if (Constants.appOwnership === 'expo') return false;
  return true;
}

export function usePushNotifications() {
  const { profile, updateProfile } = useAuthStore();
  const registered = useRef(false);

  useEffect(() => {
    if (!profile || registered.current || !isPushNotificationsAvailable()) return;

    registered.current = true;

    registerForPushNotifications()
      .then((token) => {
        if (token && token !== profile.expo_push_token) {
          updateProfile({ expo_push_token: token } as never);
          supabase
            .from('profiles')
            .update({ expo_push_token: token })
            .eq('id', profile.id);
        }
      })
      .catch(() => {
        // Push is optional; ignore errors in dev
      });
  }, [profile?.id]);
}

async function registerForPushNotifications(): Promise<string | null> {
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
