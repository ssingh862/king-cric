export class ClubError extends Error {
    constructor(message: string, public status = 400) { super(message); }
}
export function playerEmail(value: unknown): string {
    const email = String(value ?? '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 120)
        throw new ClubError('Enter a valid email address.');
    return email;
}
export function playerAccountId(value: unknown): string {
    const id = String(value ?? '').trim().replace(/^KC-/i, '').toLowerCase();
    if (!/^[a-f0-9]{24}$/.test(id))
        throw new ClubError('Enter a valid KingCric player ID');
    return id;
}
export function validateSquad(ids: unknown, eligible: string[]): string[] {
    if (!Array.isArray(ids) || ids.length < 2 || ids.length > 30 || ids.some(id => typeof id !== 'string'))
        throw new ClubError('Select 2–30 players');
    if (new Set(ids).size !== ids.length)
        throw new ClubError('A player can only appear once');
    if (ids.some(id => !eligible.includes(id)))
        throw new ClubError('Select only current roster members');
    return ids;
}
export function registrationOpen(t: {
    status: string;
    settings?: {
        archived?: boolean;
    };
    registration_deadline?: Date | null;
}, now = new Date()) {
    if (t.settings?.archived || !['draft', 'registration'].includes(t.status))
        throw new ClubError('Registration is closed');
    if (t.registration_deadline && t.registration_deadline < now)
        throw new ClubError('Registration deadline has passed');
}
export function rosterSnapshot(member: {
    _id: unknown;
    profile_id?: unknown;
    status: string;
    full_name: string;
    role?: string;
    batting_style?: string | null;
    bowling_style?: string | null;
}, teamId: unknown, jersey: number) {
    return { team_id: teamId, source_member_id: member._id, profile_id: member.status === 'accepted' ? member.profile_id ?? null : null,
        full_name: member.full_name, role: member.role ?? 'all_rounder', batting_style: member.batting_style ?? null, bowling_style: member.bowling_style ?? null, jersey_number: jersey };
}
