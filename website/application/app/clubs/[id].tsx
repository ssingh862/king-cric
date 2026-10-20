import { useState } from 'react';
import { View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { Text } from '../../src/i18n';
import { Page, Card, Field, Button, LinkRow, styles } from '../../src/components/settings/SettingsUI';
import { api } from '../../src/lib/api';
import { type ClubDetail, type PlayerAccount, type Member, useClubAction, clubMutation } from '../../src/lib/clubs';
export default function Roster() {
    const { id } = useLocalSearchParams<{
        id: string;
    }>();
    const { busy, notice, run, setNotice } = useClubAction();
    const data = useQuery({ queryKey: ['club', id], enabled: !!id, queryFn: () => api<ClubDetail>(`/clubs/${id}`) });
    const [guest, setGuest] = useState('');
    const [email, setEmail] = useState('');
    const [account, setAccount] = useState<PlayerAccount | null>(null);
    const [linkGuest, setLinkGuest] = useState<Member | null>(null);
    const [edit, setEdit] = useState<Member | null>(null);
    const detail = data.data;
    return <Page title={detail?.club.name ?? 'Reusable team'}>
 <Text style={styles.sub}>Player changes show in a tournament until a match or the tournament starts. After that, only the organizer can change that squad.</Text>
 {notice ? <Text accessibilityRole="alert" style={styles.notice}>{notice}</Text> : null}
 {data.isPending ? <Text>Loading…</Text> : data.isError ? <><Text>{data.error.message}</Text><Button title="Retry" onPress={() => void data.refetch()}/></> : null}
 {detail ? <><Card title="Team roster">{detail.members.map(member => { const pending = detail.pending.some(p => p.member_id === member.id); return <View key={member.id} style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#DDE5DB' }}><Text style={styles.label}>{member.full_name}</Text><Text style={styles.sub}>{pending ? 'Invitation pending' : member.status === 'accepted' ? 'Linked account' : 'Guest player'}</Text>{detail.owner ? <><LinkRow title="Edit player" onPress={() => setEdit({ ...member })}/>{member.status === 'guest' && !pending ? <LinkRow title="Link player account" onPress={() => { setLinkGuest(member); setAccount(null); setNotice('Enter the player email below'); }}/> : null}</> : null}</View>; })}</Card>
 {detail.owner ? <>
 {edit ? <Card title="Edit player"><Field label="Full name" value={edit.full_name} onChange={full_name => setEdit({ ...edit, full_name })}/><Field label="Playing role" value={edit.role} onChange={role => setEdit({ ...edit, role })}/><Field label="Batting style" value={edit.batting_style ?? ''} onChange={batting_style => setEdit({ ...edit, batting_style })}/><Field label="Bowling style" value={edit.bowling_style ?? ''} onChange={bowling_style => setEdit({ ...edit, bowling_style })}/><Button title="Save changes" busy={busy} onPress={() => void run(async () => { await clubMutation(`/${id}/members/${edit.id}`, edit, 'PATCH'); setEdit(null); })}/><Button title="Remove from future squads" danger busy={busy} onPress={() => void run(async () => { await clubMutation(`/${id}/members/${edit.id}`, { remove: true }, 'PATCH'); setEdit(null); })}/><Button title="Cancel" onPress={() => setEdit(null)}/></Card> : null}
 <Card title={linkGuest ? 'Link player account' : 'Find a KingCric player'}>{linkGuest ? <><Text style={styles.label}>{linkGuest.full_name}</Text><Button title="Cancel" onPress={() => { setLinkGuest(null); setAccount(null); }}/></> : null}<Text style={styles.sub}>Ask the player for the email they used to create their KingCric account.</Text><Field label="Player email" value={email} keyboard="email-address" onChange={value => { setEmail(value); setAccount(null); }}/><Button title="Find player" busy={busy} onPress={() => void run(async () => setAccount(await api<PlayerAccount>(`/clubs/players/lookup?email=${encodeURIComponent(email.trim())}`)), 'Player found')}/>
 {account ? <><Text style={styles.heading}>{account.full_name}</Text><Text style={styles.sub}>{account.city} · {account.role} · {account.batting_style}</Text><Text style={styles.sub}>The player must accept before their account is linked.</Text><Button title="Send team invitation" busy={busy} onPress={() => void run(async () => { await clubMutation(`/${id}/invite-player`, { playerId: account.player_id, memberId: linkGuest?.id }); setAccount(null); setLinkGuest(null); setEmail(''); }, 'Invitation sent')}/></> : null}
 </Card>
 <Card title="Add a guest player"><Text style={styles.sub}>No account needed. Link their account later by invitation.</Text><Field label="Full name" value={guest} onChange={setGuest}/><Button title="Add player" busy={busy} onPress={() => void run(async () => { await clubMutation(`/${id}/members`, { full_name: guest }); setGuest(''); })}/></Card>
 </> : null}</> : null}</Page>;
}
