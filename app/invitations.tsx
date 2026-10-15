import { useState } from 'react';
import { View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Text } from '../src/i18n';
import { Page, Card, Button, Choice, styles } from '../src/components/settings/SettingsUI';
import { api } from '../src/lib/api';
import { type ClubDetail, useClubAction, clubMutation } from '../src/lib/clubs';
import { useAuthStore } from '../src/stores/authStore';
interface Entry {
    id: string;
    club_id: {
        id?: string;
        _id?: string;
        name: string;
    };
    tournament_id: {
        name: string;
    } | null;
}
interface Inbox {
    members: {
        id: string;
        club_id: {
            name: string;
        } | null;
        member_id: {
            full_name: string;
        } | null;
    }[];
    tournaments: Entry[];
}
export default function Invitations() {
    const userId = useAuthStore(s => s.profile?.id);
    const { busy, notice, run } = useClubAction();
    const [entry, setEntry] = useState<Entry | null>(null);
    const [squad, setSquad] = useState<ClubDetail | null>(null);
    const [selected, setSelected] = useState<string[]>([]);
    const inbox = useQuery({ queryKey: ['invitations', userId], queryFn: () => api<Inbox>('/clubs/invitations'), refetchInterval: 20000 });
    async function review(item: Entry) { const id = item.club_id.id ?? item.club_id._id; const data = await api<ClubDetail>(`/clubs/${id}`); setSquad(data); setSelected(data.members.filter(m => !data.pending.some(p => p.member_id === m.id)).map(m => m.id)); setEntry(item); }
    return <Page title="Invitations">{notice ? <Text accessibilityRole="alert" style={styles.notice}>{notice}</Text> : null}
 {inbox.isPending ? <Text>Loading…</Text> : inbox.isError ? <Button title="Retry" onPress={() => void inbox.refetch()}/> : <>
 <Card title="Player invitations">{inbox.data?.members.length ? inbox.data.members.map(invite => <View key={invite.id} style={{ marginBottom: 20 }}><Text style={styles.heading}>{invite.club_id?.name ?? 'Team'}</Text><Text>{invite.member_id?.full_name}</Text><Text style={styles.sub}>Accept to link this player record and its match history to your account.</Text><Button title="Accept" busy={busy} onPress={() => void run(() => clubMutation(`/member-invitations/${invite.id}/respond`, { accept: true }))}/><Button title="Decline" busy={busy} onPress={() => void run(() => clubMutation(`/member-invitations/${invite.id}/respond`, { accept: false }))}/></View>) : <Text>No pending invitations.</Text>}</Card>
 <Card title="Tournament invitations">{inbox.data?.tournaments.length ? inbox.data.tournaments.map(item => <View key={item.id} style={{ marginBottom: 20 }}><Text style={styles.heading}>{item.tournament_id?.name ?? 'Tournament'}</Text><Text>{item.club_id.name}</Text><Button title="Review squad" busy={busy} onPress={() => void run(() => review(item), 'Select your tournament squad')}/><Button title="Decline" busy={busy} onPress={() => void run(() => clubMutation(`/entries/${item.id}/respond`, { accept: false }))}/></View>) : <Text>No pending invitations.</Text>}</Card>
 </>}
 {entry && squad ? <Card title="Confirm tournament squad"><Text style={styles.sub}>Select 2–30 players. Pending account invitations must be accepted first.</Text>{squad.members.filter(m => !squad.pending.some(p => p.member_id === m.id)).map(m => <Choice key={m.id} title={m.full_name} subtitle={m.status === 'guest' ? 'Guest player' : 'Linked account'} selected={selected.includes(m.id)} icon="person-outline" onPress={() => setSelected(ids => ids.includes(m.id) ? ids.filter(id => id !== m.id) : [...ids, m.id])}/>)}<Button title="Accept & add squad" busy={busy} onPress={() => void run(async () => { const result = await api<{
        teamId: string;
    }>(`/clubs/entries/${entry.id}/respond`, { method: 'POST', body: JSON.stringify({ accept: true, memberIds: selected }) }); setEntry(null); setSquad(null); router.push(`/team/${result.teamId}`); })}/><Button title="Cancel" onPress={() => { setEntry(null); setSquad(null); }}/></Card> : null}
 </Page>;
}
