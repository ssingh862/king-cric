import { useEffect, useState } from 'react';
import { Image, Platform, Pressable, Share, View } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../src/lib/api';
import { Text } from '../src/i18n';
import { colors, createThemedStyles } from '../src/lib/theme';
import { Page, Card, Field, Button, LinkRow, styles } from '../src/components/settings/SettingsUI';
import { router, useLocalSearchParams } from 'expo-router';

interface Tournament {
  id: string;
  name: string;
  city?: string | null;
  format?: string | null;
  logo_url?: string | null;
  points_win: number;
  points_tie: number;
  points_loss: number;
  points_no_result: number;
  registration_deadline: string | null;
  settings?: { archived?: boolean };
}
interface Detail {
  tournament: Tournament;
  scorers: { id: string; full_name: string; email: string }[];
  teams: { id: string; name: string; is_approved: boolean }[];
  audit: { id: string; action: string; resource?: string; created_at: string; actor_id?: { full_name?: string } }[];
}

function Logo({ uri, size = 48 }: { uri?: string | null; size?: number }) {
  if (uri) return <Image source={{ uri }} style={{ width: size, height: size, borderRadius: 14 }} />;
  return (
    <View style={[ui.logoFallback, { width: size, height: size, borderRadius: 14 }]}>
      <Ionicons name="trophy" size={size * 0.46} color={colors.forest} />
    </View>
  );
}

export default function OrganizerSettings() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const client = useQueryClient();
  const [selected, setSelected] = useState(typeof id === 'string' ? id : '');
  const [email, setEmail] = useState('');
  const [teamName, setTeamName] = useState('');
  useEffect(() => { if (typeof id === 'string' && id) setSelected(id); }, [id]);
  const [win, setWin] = useState('2');
  const [tie, setTie] = useState('1');
  const [loss, setLoss] = useState('0');
  const [deadline, setDeadline] = useState('');
  const [noResult, setNoResult] = useState('1');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const list = useQuery({ queryKey: ['settings-tournaments'], queryFn: () => api<Tournament[]>('/settings/tournaments') });
  const detail = useQuery({
    queryKey: ['tournament-settings', selected],
    enabled: !!selected,
    queryFn: async () => {
      const data = await api<Detail>(`/settings/tournaments/${selected}`);
      setWin(String(data.tournament.points_win));
      setTie(String(data.tournament.points_tie));
      setLoss(String(data.tournament.points_loss));
      setNoResult(String(data.tournament.points_no_result ?? 1));
      setDeadline(data.tournament.registration_deadline?.slice(0, 10) ?? '');
      return data;
    },
  });

  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    setNotice('');
    try {
      await action();
      setNotice('Changes saved');
      await client.invalidateQueries({ queryKey: ['tournament-settings', selected] });
      await client.invalidateQueries({ queryKey: ['tournaments'] });
      await client.invalidateQueries({ queryKey: ['points', selected] });
      await client.invalidateQueries({ queryKey: ['tournament-teams', selected] });
    } catch (e) {
      setNotice((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const mutate = (path: string, data: unknown, method = 'POST') => api(`/settings/tournaments/${selected}${path}`, { method, body: JSON.stringify(data) });

  async function exportData() {
    const data = await api(`/settings/tournaments/${selected}/export`);
    const json = JSON.stringify(data, null, 2);
    if (Platform.OS === 'web') {
      const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `kingcric-${selected}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      await Share.share({ title: 'KingCric tournament export', message: json });
    }
  }

  const data = detail.data;

  return (
    <Page title="Tournament management">
      {notice ? <Text accessibilityRole="alert" style={styles.notice}>{notice}</Text> : null}
      <Card title="My Tournaments">
        {list.isPending ? <Text style={styles.sub}>Loading…</Text> : list.isError ? (
          <>
            <Text style={styles.sub}>{list.error.message}</Text>
            <Button title="Retry" onPress={() => void list.refetch()} />
          </>
        ) : list.data?.length ? list.data.map((item) => {
          const on = item.id === selected;
          const meta = [item.city, item.format].filter(Boolean).join(' · ');
          return (
            <Pressable key={item.id} accessibilityRole="button" onPress={() => setSelected(item.id)} style={[ui.pick, on && ui.pickOn]}>
              <Logo uri={item.logo_url} />
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>{item.name}</Text>
                {meta ? <Text style={ui.meta}>{meta}</Text> : null}
              </View>
              <Ionicons name={on ? 'checkmark-circle' : 'chevron-forward'} size={on ? 22 : 18} color={on ? colors.orange : colors.textDim} />
            </Pressable>
          );
        }) : <Text style={styles.sub}>No items yet.</Text>}
      </Card>
      {selected && detail.isPending ? <Text style={styles.sub}>Loading…</Text> : null}
      {detail.isError ? <Button title="Retry" onPress={() => void detail.refetch()} /> : null}
      {data ? (
        <>
          <View style={ui.banner}>
            <Logo uri={data.tournament.logo_url} size={64} />
            <View style={{ flex: 1 }}>
              <Text style={ui.bannerName}>{data.tournament.name}</Text>
              <Text style={ui.bannerMeta}>{[data.tournament.city, data.tournament.format].filter(Boolean).join(' · ') || 'Local tournament'}</Text>
            </View>
          </View>
          <Card>
            <LinkRow icon="create-outline" tint="#176B45" title="Edit" onPress={() => router.push({ pathname: '/tournament/edit', params: { id: selected } })} />
          </Card>
          <Card title="Competition rules">
            <Field label="Points for win" value={win} onChange={setWin} />
            <Field label="Points for tie" value={tie} onChange={setTie} />
            <Field label="Points for loss" value={loss} onChange={setLoss} />
            <Field label="Points for no result" value={noResult} onChange={setNoResult} />
            <Field label="Registration deadline" value={deadline} onChange={setDeadline} />
            <Text style={styles.sub}>YYYY-MM-DD · UTC</Text>
            <Button title="Save changes" busy={busy} onPress={() => void run(() => mutate('', { points_win: Number(win), points_tie: Number(tie), points_loss: Number(loss), points_no_result: Number(noResult), registration_deadline: deadline ? `${deadline}T23:59:59.999Z` : null }, 'PATCH'))} />
          </Card>
          <Card title="Who can score">
            <Text style={styles.sub}>Add someone’s email so they can enter runs and wickets. They need a KingCric account. They cannot change the tournament.</Text>
            <Field label="Their email" value={email} onChange={setEmail} />
            <Button title="Let them score" busy={busy} onPress={() => void run(async () => { await mutate('/scorers', { email, remove: false }); setEmail(''); })} />
            {data.scorers.map((scorer) => (
              <View key={scorer.id} style={ui.person}>
                <View style={ui.personMark}><Text style={ui.personLetter}>{(scorer.full_name || 'S')[0].toUpperCase()}</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>{scorer.full_name}</Text>
                  <Text style={ui.meta}>{scorer.email}</Text>
                </View>
                <Pressable disabled={busy} onPress={() => void run(() => mutate('/scorers', { email: scorer.email, remove: true }))} style={ui.chip}>
                  <Text style={ui.chipText}>Remove</Text>
                </Pressable>
              </View>
            ))}
          </Card>
          <Card title="Teams">
            <Text style={styles.sub}>Add a team to this tournament. It is approved right away. You can still approve teams that other people add.</Text>
            <Field label="Team name" value={teamName} onChange={setTeamName} />
            <Button title="Add team" busy={busy} onPress={() => void run(async () => {
              if (!teamName.trim()) throw new Error('Enter the team name');
              await api('/teams/register', { method: 'POST', body: JSON.stringify({ tournament_id: selected, team_name: teamName.trim() }) });
              setTeamName('');
            })} />
            {data.teams.length ? data.teams.map((team) => (
              <View key={team.id} style={ui.person}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>{team.name}</Text>
                  <Text style={[ui.meta, { color: team.is_approved ? colors.green : colors.gold }]}>{team.is_approved ? 'Approved' : 'Pending'}</Text>
                </View>
                <Pressable disabled={busy} onPress={() => void run(() => mutate('/approve', { teamId: team.id, approved: !team.is_approved }))} style={[ui.chip, team.is_approved && ui.chipMuted]}>
                  <Text style={ui.chipText}>{team.is_approved ? 'Remove' : 'Approve'}</Text>
                </Pressable>
              </View>
            )) : <Text style={styles.sub}>No items yet.</Text>}
          </Card>
          <Card title="Corrections history">
            {data.audit.length ? data.audit.map((item) => (
              <View key={item.id} style={ui.history}>
                <Text style={styles.rowTitle}>{item.action}</Text>
                <Text style={ui.meta}>{item.actor_id?.full_name ?? '—'} · {new Date(item.created_at).toLocaleString()}</Text>
                {item.resource ? <Text style={ui.meta}>{item.resource}</Text> : null}
              </View>
            )) : <Text style={styles.sub}>No changes recorded yet.</Text>}
          </Card>
          <Card title="Save a copy">
            <Text style={styles.sub}>Sends a copy of teams, players and every ball. You can share it. The tournament stays here.</Text>
            <Button title="Share a copy" busy={busy} onPress={() => void run(exportData)} />
          </Card>
          <Card title="Hide a finished tournament">
            <Text style={styles.sub}>After the tournament is finished or cancelled, hide it from the home list. Scores stay saved.</Text>
            <Button title={data.tournament.settings?.archived ? 'Show on home again' : 'Hide from home'} busy={busy} onPress={() => void run(() => mutate('', { archived: !data.tournament.settings?.archived }, 'PATCH'))} />
          </Card>
        </>
      ) : null}
    </Page>
  );
}

const ui = createThemedStyles({
  pick: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 4, borderRadius: 16 },
  pickOn: { backgroundColor: colors.orangeLight, paddingHorizontal: 8 },
  logoFallback: { backgroundColor: colors.orangeLight, alignItems: 'center', justifyContent: 'center' },
  meta: { color: colors.textMuted, fontSize: 13, marginTop: 2 },
  banner: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: colors.card, borderRadius: 20, borderWidth: 1, borderColor: colors.cardBorder, padding: 16, marginBottom: 18 },
  bannerName: { fontSize: 20, fontWeight: '800', color: colors.text },
  bannerMeta: { color: colors.textMuted, marginTop: 4, fontSize: 14 },
  person: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  personMark: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.orangeLight, alignItems: 'center', justifyContent: 'center' },
  personLetter: { color: colors.forest, fontWeight: '800' },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, backgroundColor: colors.orangeLight },
  chipMuted: { backgroundColor: colors.surface },
  chipText: { color: colors.forest, fontWeight: '700', fontSize: 13 },
  history: { paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.cardBorder },
});
