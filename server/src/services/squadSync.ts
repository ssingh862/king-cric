import type { ClientSession } from 'mongoose';
import { ClubError } from '../domain/clubs';
import { Match, Player, ScoreEvent, Team, Tournament } from '../models';
import { Club, ClubMember, MemberInvitation } from '../models/clubs';

export type SquadLock = { locked: boolean; reason: 'status' | 'match' | null; status: string | null };

/** Captain edits reach a tournament only before it goes live and before this team plays. */
export async function squadLockInfo(teamId: unknown, session?: ClientSession | null): Promise<SquadLock> {
    const team = await Team.findById(teamId).session(session ?? null);
    if (!team)
        return { locked: true, reason: 'status', status: null };
    const tournament = await Tournament.findById(team.tournament_id).session(session ?? null);
    const status = tournament?.status ?? null;
    if (!tournament || !['draft', 'registration'].includes(tournament.status))
        return { locked: true, reason: 'status', status };
    const started = await Match.exists({
        $or: [{ team_a_id: team._id }, { team_b_id: team._id }],
        status: { $ne: 'scheduled' },
    }).session(session ?? null);
    if (started)
        return { locked: true, reason: 'match', status };
    return { locked: false, reason: null, status };
}

export async function captainMayEditSquad(teamId: unknown, session?: ClientSession | null) {
    return !(await squadLockInfo(teamId, session)).locked;
}

export function squadLockText(lock: SquadLock) {
    if (lock.reason === 'match')
        return 'You cannot edit this squad because a match has already started. Only the organizer can change it.';
    if (lock.status === 'ongoing')
        return 'You cannot edit this squad because the tournament is ongoing. Only the organizer can change it.';
    if (lock.status === 'completed')
        return 'You cannot edit this squad because the tournament is completed. Only the organizer can change it.';
    if (lock.status === 'cancelled')
        return 'You cannot edit this squad because the tournament is cancelled. Only the organizer can change it.';
    return 'You cannot edit this squad because the tournament is not open for changes. Only the organizer can change it.';
}

export async function syncMemberToOpenSquads(memberId: unknown, session: ClientSession) {
    const member = await ClubMember.findById(memberId).session(session);
    if (!member)
        return;
    const club = await Club.findById(member.club_id).session(session);
    const pending = await MemberInvitation.exists({ member_id: member._id, status: 'pending' }).session(session);
    const teams = await Team.find({ source_club_id: member.club_id }).session(session);
    for (const team of teams) {
        if (!await captainMayEditSquad(team._id, session))
            continue;
        const existing = await Player.findOne({ team_id: team._id, source_member_id: member._id }).session(session);
        if (member.status === 'removed') {
            if (existing && !await ScoreEvent.exists({
                $or: ['striker_player_id', 'non_striker_player_id', 'bowler_player_id', 'dismissed_player_id'].map((key) => ({ [key]: existing._id })),
            }).session(session))
                await existing.deleteOne({ session });
            continue;
        }
        if (pending)
            continue;
        const fields = {
            full_name: member.full_name,
            role: member.role || 'all_rounder',
            batting_style: member.batting_style ?? null,
            bowling_style: member.bowling_style ?? null,
            profile_id: member.status === 'accepted' ? member.profile_id ?? null : null,
            is_captain: !!(club && member.profile_id && String(member.profile_id) === String(club.owner_id)),
        };
        if (existing) {
            Object.assign(existing, fields);
            await existing.save({ session });
            continue;
        }
        if (fields.profile_id) {
            const others = await Team.find({ tournament_id: team.tournament_id }).session(session).distinct('_id');
            if (await Player.exists({ team_id: { $in: others }, profile_id: fields.profile_id }).session(session))
                throw new ClubError('A selected player is already in another squad in this tournament');
        }
        const taken = (await Player.find({ team_id: team._id }).session(session).distinct('jersey_number')).filter((n): n is number => typeof n === 'number');
        let jersey = 1;
        while (taken.includes(jersey))
            jersey += 1;
        await Player.create([{ team_id: team._id, source_member_id: member._id, jersey_number: jersey, ...fields }], { session });
    }
}
