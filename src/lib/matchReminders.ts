import AsyncStorage from '@react-native-async-storage/async-storage';
import { isRunningInExpoGo } from 'expo';
import { Platform } from 'react-native';

/** Importing expo-notifications on Android Expo Go throws before any API can run. */
function notificationsModuleSafe() {
  return Platform.OS !== 'web' && !(Platform.OS === 'android' && isRunningInExpoGo());
}

type ReminderMatch = {
  id: string;
  status: string;
  scheduled_at?: string | null;
  team_a_id?: string;
  team_b_id?: string;
  team_a?: { name?: string; short_name?: string | null };
  team_b?: { name?: string; short_name?: string | null };
};

function label(match: ReminderMatch) {
  const a = match.team_a?.short_name || match.team_a?.name || 'Team A';
  const b = match.team_b?.short_name || match.team_b?.name || 'Team B';
  return `${a} vs ${b}`;
}

function isTomorrow(value?: string | null) {
  if (!value) return false;
  const date = new Date(value);
  const next = new Date();
  next.setDate(next.getDate() + 1);
  return date.getFullYear() === next.getFullYear() && date.getMonth() === next.getMonth() && date.getDate() === next.getDate();
}

export async function ensureNotificationPermission(): Promise<'granted' | 'denied'> {
  if (!notificationsModuleSafe()) return 'granted';
  const Notifications = await import('expo-notifications');
  const current = await Notifications.getPermissionsAsync();
  const status = current.granted ? current.status : (await Notifications.requestPermissionsAsync()).status;
  if (status !== 'granted') return 'denied';
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('live-scores', {
      name: 'Live Scores',
      importance: Notifications.AndroidImportance.MAX,
    });
  }
  return 'granted';
}

export async function remindAboutMatches(matches: ReminderMatch[], myTeamIds: string[], enabled: boolean) {
  if (!enabled || !notificationsModuleSafe() || !myTeamIds.length) return;
  const mine = matches.filter((match) => myTeamIds.includes(match.team_a_id ?? '') || myTeamIds.includes(match.team_b_id ?? ''));
  if (!mine.length) return;
  const Notifications = await import('expo-notifications');
  const permission = await Notifications.getPermissionsAsync();
  if (!permission.granted) return;
  const stored = new Set(JSON.parse(await AsyncStorage.getItem('kingcric-reminders') ?? '[]') as string[]);
  for (const match of mine) {
    const key = match.status === 'live' ? `live:${match.id}` : isTomorrow(match.scheduled_at) ? `tomorrow:${match.id}` : '';
    if (!key || stored.has(key)) continue;
    stored.add(key);
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: match.status === 'live' ? 'Your match is live' : 'Match tomorrow',
          body: label(match),
          ...(Platform.OS === 'android' ? { channelId: 'live-scores' } : {}),
        },
        trigger: null,
      });
    } catch {
      stored.delete(key);
    }
  }
  await AsyncStorage.setItem('kingcric-reminders', JSON.stringify([...stored]));
}
