import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Text } from '../../src/i18n';
import { Page, Card, Field, Button, LinkRow, styles } from '../../src/components/settings/SettingsUI';
import { api } from '../../src/lib/api';
import { useAuthStore } from '../../src/stores/authStore';
import { type Club, useClubAction } from '../../src/lib/clubs';
export default function Clubs() {
    const [name, setName] = useState('');
    const [city, setCity] = useState('');
    const { busy, notice, run } = useClubAction();
    const userId = useAuthStore(s => s.profile?.id);
    const teams = useQuery({ queryKey: ['clubs', userId], queryFn: () => api<Club[]>('/clubs') });
    return <Page title="Reusable teams"><Text style={styles.sub}>Create once. Play in many tournaments.</Text>
 <LinkRow title="Invitations" icon="mail-outline" onPress={() => router.push('/invitations' as never)}/>
 {notice ? <Text accessibilityRole="alert" style={styles.notice}>{notice}</Text> : null}
 <Card title="My Teams">{teams.isPending ? <Text>Loading…</Text> : teams.isError ? <Button title="Retry" onPress={() => void teams.refetch()}/> : teams.data?.length ? teams.data.map(team => <LinkRow key={team.id} title={team.name} value={team.city} icon="people-outline" onPress={() => router.push(`/clubs/${team.id}` as never)}/>) : <Text>No items yet.</Text>}</Card>
 <Card title="Create a reusable team"><Field label="Team name" value={name} onChange={setName}/><Field label="City" value={city} onChange={setCity}/><Button title="Create team" busy={busy} onPress={() => void run(async () => { const team = await api<Club>('/clubs', { method: 'POST', body: JSON.stringify({ name, city }) }); setName(''); router.push(`/clubs/${team.id}` as never); })}/></Card>
 </Page>;
}
