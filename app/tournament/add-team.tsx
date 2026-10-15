import { useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { Text } from '../../src/i18n';
import { Page, Card, Field, Button, styles } from '../../src/components/settings/SettingsUI';
import { api } from '../../src/lib/api';
import { type Club, useClubAction, clubMutation } from '../../src/lib/clubs';
export default function AddTeam() {
    const { tournamentId } = useLocalSearchParams<{
        tournamentId: string;
    }>();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<Club[]>([]);
    const [searched, setSearched] = useState(false);
    const { busy, notice, run } = useClubAction();
    const [sent, setSent] = useState<string[]>([]);
    return <Page title="Add existing team"><Text style={styles.sub}>Invite a captain to bring their team and confirm its tournament squad.</Text>{notice ? <Text accessibilityRole="alert" style={styles.notice}>{notice}</Text> : null}
 <Card title="Find a team"><Field label="Team name" value={query} onChange={setQuery}/><Button title="Search teams" busy={busy} onPress={() => void run(async () => { setResults(await api<Club[]>(`/clubs/search?q=${encodeURIComponent(query)}`)); setSearched(true); }, 'Search complete')}/></Card>
 {searched && !results.length ? <Text>No teams found.</Text> : null}
 {results.map(team => <Card key={team.id} title={team.name}><Text style={styles.sub}>{team.city}</Text><Text style={styles.sub}>Team ID: {team.id}</Text>{sent.includes(team.id) ? <Text>Invitation sent</Text> : <Button title="Invite to tournament" busy={busy} onPress={() => void run(async () => { await clubMutation(`/tournaments/${tournamentId}/invite`, { clubId: team.id }); setSent(ids => [...ids, team.id]); }, 'Invitation sent')}/>}</Card>)}
 </Page>;
}
