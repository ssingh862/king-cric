import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api } from './api';
export interface Club {
    id: string;
    name: string;
    short_name?: string;
    city?: string;
    owner_id: string;
}
export interface Member {
    id: string;
    full_name: string;
    role: string;
    status: 'guest' | 'accepted';
    profile_id?: string;
    batting_style?: string;
    bowling_style?: string;
}
export interface ClubDetail {
    club: Club;
    members: Member[];
    owner: boolean;
    pending: {
        id: string;
        member_id: string;
        recipient_id: string;
    }[];
}
export interface PlayerAccount {
    id: string;
    player_id: string;
    full_name: string;
    city: string;
    role: string;
    batting_style: string;
    bowling_style: string;
}
export function useClubAction() {
    const client = useQueryClient();
    const [busy, setBusy] = useState(false);
    const [notice, setNotice] = useState('');
    async function run(action: () => Promise<unknown>, message = 'Changes saved') {
        if (busy)
            return;
        setBusy(true);
        setNotice('');
        try {
            await action();
            setNotice(message);
            await Promise.all(['clubs', 'club', 'invitations', 'my-teams', 'tournament-teams', 'team', 'points'].map(key => client.invalidateQueries({ queryKey: [key] })));
        }
        catch (e) {
            setNotice((e as Error).message);
        }
        finally {
            setBusy(false);
        }
    }
    return { busy, notice, run, setNotice };
}
export const clubMutation = (path: string, body: unknown, method = 'POST') => api(`/clubs${path}`, { method, body: JSON.stringify(body) });
