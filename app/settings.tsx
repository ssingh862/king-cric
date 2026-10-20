import { Alert } from '../src/i18n';
import { useEffect, useState } from 'react';
import { BackHandler, Image, Platform, Switch, View } from 'react-native';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Text, useTranslation } from '../src/i18n';
import { languages } from '../src/i18n/catalog';
import { Page, Card, Field, Button, LinkRow, Group, Hero, Choice, styles } from '../src/components/settings/SettingsUI';
import { MatchRulesEditor, standardLocalRules } from '../src/components/cricket/MatchRulesEditor';
import { useAuthStore } from '../src/stores/authStore';
import { usePreferences } from '../src/stores/preferencesStore';
import { api, setToken } from '../src/lib/api';
import { ensureNotificationPermission } from '../src/lib/matchReminders';
import type { Profile } from '../src/types/database';

type Section = 'language' | 'profile' | 'appearance' | 'preferences' | 'scoring' | 'account' | 'help' | 'admin';

const titles: Record<Section, string> = {
  language: 'Language',
  profile: 'Edit profile',
  appearance: 'Appearance',
  preferences: 'Preferences',
  scoring: 'Scoring defaults',
  account: 'Account & security',
  help: 'Help & support',
  admin: 'Platform administration',
};

export default function Settings() {
  const { profile, userEmail, updateProfile, signOut } = useAuthStore();
  const { t } = useTranslation();
  const { reduceMotion, setReduceMotion, theme, setTheme, language, setLanguage } = usePreferences();
  const [section, setSection] = useState<Section | null>(null);
  const [name, setName] = useState(profile?.full_name ?? '');
  const [city, setCity] = useState(profile?.city ?? '');
  const [role, setRole] = useState(profile?.playing_role ?? 'all_rounder');
  const [bat, setBat] = useState(profile?.batting_style ?? '');
  const [bowl, setBowl] = useState(profile?.bowling_style ?? '');
  const [photo, setPhoto] = useState(profile?.avatar_url ?? '');
  const [current, setCurrent] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [rules, setRules] = useState({ ...standardLocalRules, ...profile?.preferences?.scoringDefaults });
  const [report, setReport] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (!section) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      setSection(null);
      setNotice('');
      return true;
    });
    return () => sub.remove();
  }, [section]);

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setNotice('');
    try {
      await action();
      setNotice('Changes saved');
    } catch (e) {
      setNotice((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const preferences = async (value: Record<string, unknown>) => {
    const result = await api<{ user: Profile }>('/settings/preferences', { method: 'PATCH', body: JSON.stringify(value) });
    useAuthStore.setState({ profile: result.user });
  };

  function confirmAction(title: string, description: string, action: () => Promise<void>) {
    if (Platform.OS === 'web') {
      if (window.confirm(t(description))) void run(action);
    } else {
      Alert.alert(t(title), t(description), [
        { text: t('Cancel'), style: 'cancel' },
        { text: t('Confirm'), style: 'destructive', onPress: () => void run(action) },
      ]);
    }
  }

  async function pickPhoto() {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.4, base64: true });
    if (!result.canceled) {
      const asset = result.assets[0];
      if (!asset.base64 || asset.base64.length > 850000) throw new Error('Choose a smaller photo');
      setPhoto(`data:${asset.mimeType ?? 'image/jpeg'};base64,${asset.base64}`);
    }
  }

  function open(next: Section) {
    setNotice('');
    setSection(next);
  }

  const currentLanguage = languages.find((item) => item.id === language)?.name ?? 'English';
  const noticeNode = notice ? <Text accessibilityRole="alert" style={styles.notice}>{notice}</Text> : null;

  if (!section) {
    return (
      <Page title="Settings">
        <Hero name={profile?.full_name ?? 'Cricket Fan'} meta={userEmail ?? profile?.phone ?? 'Your cricket, your way.'} photo={profile?.avatar_url} />
        <Group title="Your account">
          <LinkRow icon="language-outline" tint="#176B45" title="Language" value={currentLanguage} onPress={() => open('language')} />
          <LinkRow icon="person-outline" tint="#0284C7" title="Edit profile" onPress={() => open('profile')} />
          <LinkRow icon="shield-checkmark-outline" tint="#B45309" title="Account & security" onPress={() => open('account')} />
        </Group>
        <Group title="The app">
          <LinkRow icon="contrast-outline" tint="#7C3AED" title="Appearance" value={theme === 'light' ? 'Light' : 'Dark'} onPress={() => open('appearance')} />
          <LinkRow icon="notifications-outline" tint="#DB2777" title="Preferences" onPress={() => open('preferences')} />
          <LinkRow icon="baseball-outline" tint="#176B45" title="Scoring defaults" onPress={() => open('scoring')} />
        </Group>
        <Group title="Tournament management">
          <LinkRow icon="trophy-outline" tint="#B45309" title="Manage tournaments" onPress={() => router.push('/organizer-settings' as never)} />
          {profile?.role === 'admin' ? <LinkRow icon="people-outline" tint="#0284C7" title="Platform administration" onPress={() => open('admin')} /> : null}
        </Group>
        <Group title="Support">
          <LinkRow icon="help-circle-outline" tint="#176B45" title="Help & support" onPress={() => open('help')} />
        </Group>
      </Page>
    );
  }

  return (
    <Page title={titles[section]} onBack={() => { setSection(null); setNotice(''); }}>
      {noticeNode}
      {section === 'language' ? (
        <>
          <Text style={styles.sub}>Choose your language</Text>
          {languages.map((item) => (
            <Choice key={item.id} icon="language-outline" title={item.name} subtitle={item.id === 'en' ? 'English' : item.id === 'hi' ? 'Hindi' : 'Gujarati'} selected={language === item.id} onPress={() => setLanguage(item.id)} />
          ))}
        </>
      ) : null}
      {section === 'profile' ? (
        <Card title="Edit profile">
          <View style={{ alignItems: 'center', marginBottom: 4 }}>
            {photo ? <Image source={{ uri: photo }} style={{ width: 96, height: 96, borderRadius: 48, marginBottom: 12 }} /> : <View style={{ width: 96, height: 96, borderRadius: 48, marginBottom: 12, backgroundColor: '#EAF4DE', alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontSize: 32, fontWeight: '800', color: '#176B45' }}>{(name || 'U')[0].toUpperCase()}</Text></View>}
          </View>
          <Button title="Change photo" busy={busy} onPress={() => void pickPhoto().catch((e) => setNotice(e.message))} />
          <Field label="Full name" value={name} onChange={setName} />
          <Field label="City" value={city} onChange={setCity} />
          <Text style={styles.label}>Playing role</Text>
          <View style={{ gap: 0, marginBottom: 14 }}>
            {([['batter', 'Batter', 'baseball-outline'], ['bowler', 'Bowler', 'ellipse-outline'], ['all_rounder', 'All-rounder', 'flash-outline'], ['wicket_keeper', 'Wicketkeeper', 'hand-left-outline']] as const).map(([id, label, icon]) => (
              <LinkRow key={id} icon={icon} title={label} selected={role === id} onPress={() => setRole(id)} />
            ))}
          </View>
          <Text style={styles.label}>Batting style</Text>
          <View style={{ marginBottom: 14 }}>
            {([['right_hand', 'Right-hand bat'], ['left_hand', 'Left-hand bat']] as const).map(([id, label]) => (
              <LinkRow key={id} icon="hand-right-outline" title={label} selected={bat === id} onPress={() => setBat(id)} />
            ))}
          </View>
          <Text style={styles.label}>Bowling style</Text>
          <View style={{ marginBottom: 14 }}>
            {([['right_arm_fast', 'Right-arm fast'], ['right_arm_medium', 'Right-arm medium'], ['right_arm_off', 'Right-arm off break'], ['left_arm_fast', 'Left-arm fast'], ['left_arm_orthodox', 'Left-arm orthodox'], ['leg_break', 'Leg break'], ['none', 'Does not bowl']] as const).map(([id, label]) => (
              <LinkRow key={id} icon="ellipse-outline" title={label} selected={bowl === id} onPress={() => setBowl(id)} />
            ))}
          </View>
          <Button title="Save changes" busy={busy} onPress={() => void run(async () => {
            if (!name.trim()) throw new Error('Name is required');
            await updateProfile({ full_name: name.trim(), city: city.trim(), playing_role: role, batting_style: bat, bowling_style: bowl, avatar_url: photo || null });
          })} />
        </Card>
      ) : null}
      {section === 'appearance' ? (
        <>
          <Text style={styles.sub}>Appearance</Text>
          <Choice icon="sunny-outline" title="Light" subtitle="Bright grounds and outdoor use" selected={theme === 'light'} onPress={() => setTheme('light')} />
          <Choice icon="moon-outline" title="Dark" subtitle="Easier on the eyes at night" selected={theme === 'dark'} onPress={() => setTheme('dark')} />
        </>
      ) : null}
      {section === 'preferences' ? (
        <Card title="Preferences">
          <View style={styles.row}>
            <Text style={[styles.label, { flex: 1, marginBottom: 0 }]}>Allow push notifications</Text>
            <Switch disabled={busy} accessibilityLabel={t('Allow push notifications')} value={profile?.preferences?.notifications === true} onValueChange={(v) => void run(async () => {
              if (v) {
                const permission = await ensureNotificationPermission().catch(() => 'denied' as const);
                if (permission !== 'granted') throw new Error('Allow notifications for KingCric in your phone settings.');
              }
              await preferences({ notifications: v });
            })} />
          </View>
          <View style={styles.row}>
            <Text style={[styles.label, { flex: 1, marginBottom: 0 }]}>Reduce animations</Text>
            <Switch accessibilityLabel={t('Reduce animations')} value={reduceMotion} onValueChange={setReduceMotion} />
          </View>
          <Text style={styles.sub}>Use a simpler launch transition.</Text>
        </Card>
      ) : null}
      {section === 'scoring' ? (
        <Card title="Scoring defaults">
          <Text style={styles.sub}>Applied only to new matches.</Text>
          <MatchRulesEditor value={rules} onChange={setRules} />
          <Button title="Save changes" busy={busy} onPress={() => void run(() => preferences({ scoringDefaults: rules }))} />
        </Card>
      ) : null}
      {section === 'admin' ? (
        <Card title="Platform administration">
          <LinkRow icon="color-palette-outline" title="Brand appearance" onPress={() => router.push('/admin')} />
          <LinkRow title="Users" onPress={() => router.push('/admin')} />
        </Card>
      ) : null}
      {section === 'account' ? (
        <Card title="Account & security">
          <Field label="Current password" value={current} onChange={setCurrent} secure />
          <Field label="New password" value={password} onChange={setPassword} secure />
          <Field label="Confirm password" value={confirm} onChange={setConfirm} secure />
          <Button title="Change password" busy={busy} onPress={() => void run(async () => {
            if (password !== confirm) throw new Error(t('Passwords do not match'));
            const data = await api<{ token: string }>('/settings/password', { method: 'POST', body: JSON.stringify({ currentPassword: current, newPassword: password }) });
            await setToken(data.token);
            setCurrent('');
            setPassword('');
            setConfirm('');
          })} />
          <Button title="Sign out other devices" busy={busy} onPress={() => confirmAction('Sign out other devices', 'Other devices will need to sign in again.', async () => {
            const data = await api<{ token: string }>('/settings/revoke-sessions', { method: 'POST' });
            await setToken(data.token);
          })} />
          <Text style={[styles.sub, { marginTop: 18 }]}>Enter your password to confirm.</Text>
          <Button title="Delete account" danger busy={busy} onPress={() => confirmAction('Delete account', 'This permanently removes your account.', async () => {
            await api('/settings/delete-account', { method: 'POST', body: JSON.stringify({ password: current }) });
            await signOut();
          })} />
        </Card>
      ) : null}
      {section === 'help' ? (
        <Card title="Help & support">
          <LinkRow title="Cricket handbook" onPress={() => router.push('/rules')} />
          <Field label="Describe the problem" value={report} onChange={setReport} multiline />
          <Button title="Send report" busy={busy} onPress={() => void run(async () => {
            await api('/settings/reports', { method: 'POST', body: JSON.stringify({ message: report }) });
            setReport('');
          })} />
        </Card>
      ) : null}
    </Page>
  );
}
