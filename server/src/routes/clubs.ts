import { Router, type Response } from 'express';
import mongoose from 'mongoose';
import { requireAuth, type AuthRequest } from '../middleware/auth';
import { ownsTournament } from '../middleware/ownership';
import { Club, ClubMember, MemberInvitation, ClubEntry } from '../models/clubs';
import { User, Team, Player, Tournament, TournamentRegistration, PointsTable, toApi, AuditLog } from '../models';
import { ClubError, playerAccountId, playerEmail, registrationOpen, validateSquad, rosterSnapshot } from '../domain/clubs';
import { syncMemberToOpenSquads } from '../services/squadSync';
const router = Router();
router.use(requireAuth);
const route = (fn: (req: AuthRequest, res: Response) => Promise<unknown>) => (req: AuthRequest, res: Response) => {
    void fn(req, res).catch((error) => {
        if (error instanceof ClubError)
            return res.status(error.status).json({ error: error.message });
        if (error?.code === 11000)
            return res.status(409).json({ error: 'This team, player or invitation already exists' });
        if (error?.name === 'CastError')
            return res.status(400).json({ error: 'Invalid ID' });
        console.error('Club request failed', error);
        return res.status(500).json({ error: 'Unable to save. Please retry.' });
    });
};
async function owned(id: unknown, userId: string) { const club = await Club.findById(id); if (!club)
    throw new ClubError('Team not found', 404); if (String(club.owner_id) !== userId)
    throw new ClubError('Only the team captain can change this roster', 403); return club; }
function name(value: unknown) { if (typeof value !== 'string' || !value.trim() || value.trim().length > 80)
    throw new ClubError('Enter a name with 1–80 characters'); return value.trim(); }
const publicUser = (u: InstanceType<typeof User>) => ({ id: String(u._id), player_id: `KC-${u._id}`, full_name: u.full_name, city: u.city, role: u.playing_role, batting_style: u.batting_style, bowling_style: u.bowling_style });
router.get('/players/lookup', route(async (req, res) => { const email = playerEmail(req.query.email); const user = await User.findOne({ email, suspended: { $ne: true } }); if (!user)
    throw new ClubError('This email has no KingCric account yet. Ask them to sign up first.', 404); res.json(publicUser(user)); }));
router.get('/', route(async (req, res) => {
    const membership = await ClubMember.find({ profile_id: req.userId, status: 'accepted' }).distinct('club_id');
    res.json((await Club.find({ $or: [{ owner_id: req.userId }, { _id: { $in: membership } }] }).sort({ createdAt: -1 })).map(toApi));
}));
router.get('/search', route(async (req, res) => {
    const query = String(req.query.q ?? '').trim();
    if (query.length < 2 || query.length > 80)
        throw new ClubError('Enter at least two characters');
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const list = await Club.find({ name: { $regex: escaped, $options: 'i' } }).limit(20);
    res.json(list.map(c => ({ id: String(c._id), name: c.name, city: c.city, short_name: c.short_name })));
}));
router.post('/', route(async (req, res) => {
    const user = await User.findById(req.userId);
    if (!user)
        throw new ClubError('Account not found', 401);
    const result = await mongoose.connection.transaction(async (session) => {
        const [club] = await Club.create([{ name: name(req.body.name), short_name: name(req.body.name).slice(0, 4).toUpperCase(), city: String(req.body.city ?? '').slice(0, 80), owner_id: req.userId }], { session });
        await ClubMember.create([{ club_id: club._id, profile_id: req.userId, full_name: user.full_name, role: user.playing_role, status: 'accepted', batting_style: user.batting_style, bowling_style: user.bowling_style }], { session });
        return club;
    });
    res.status(201).json(toApi(result));
}));
router.get('/invitations', route(async (req, res) => {
    const clubs = await Club.find({ owner_id: req.userId }).distinct('_id');
    const members = await MemberInvitation.find({ recipient_id: req.userId, status: 'pending' }).populate('club_id', 'name').populate('member_id', 'full_name').sort({ createdAt: -1 });
    const tournaments = await ClubEntry.find({ club_id: { $in: clubs }, status: 'pending' }).populate('club_id', 'name').populate('tournament_id', 'name city').sort({ createdAt: -1 });
    res.json({ members: members.map(toApi), tournaments: tournaments.map(toApi) });
}));
router.post('/member-invitations/:id/respond', route(async (req, res) => {
    if (typeof req.body.accept !== 'boolean')
        throw new ClubError('Choose accept or decline');
    await mongoose.connection.transaction(async (session) => {
        const invitation = await MemberInvitation.findOne({ _id: req.params.id, recipient_id: req.userId, status: 'pending' }).session(session);
        if (!invitation)
            throw new ClubError('Invitation is no longer pending', 409);
        const member = await ClubMember.findById(invitation.member_id).session(session);
        if (!member || member.status === 'removed' || member.profile_id)
            throw new ClubError('This roster place is no longer available', 409);
        await Club.updateOne({ _id: invitation.club_id }, { $inc: { roster_revision: 1 } }, { session });
        if (req.body.accept) {
            if (await ClubMember.exists({ club_id: invitation.club_id, profile_id: req.userId }).session(session))
                throw new ClubError('You are already linked to this team', 409);
            // Preserve names, delivery IDs and tournament-specific playing details.
            const appearances = await Player.find({ source_member_id: member._id }).session(session).distinct('team_id');
            const tournamentIds = await Team.find({ _id: { $in: appearances } }).session(session).distinct('tournament_id');
            // Lock affected tournaments against concurrent squad confirmation or another claim.
            await Tournament.updateMany({ _id: { $in: tournamentIds } }, { $inc: { roster_revision: 1 } }, { session });
            const tournamentTeams = await Team.find({ tournament_id: { $in: tournamentIds } }).session(session).distinct('_id');
            if (await Player.exists({ team_id: { $in: tournamentTeams }, profile_id: req.userId, source_member_id: { $ne: member._id } }).session(session))
                throw new ClubError('Your account already has a player record in this tournament. Ask the organizer to resolve it first.', 409);
            member.profile_id = new mongoose.Types.ObjectId(req.userId);
            member.status = 'accepted';
            await member.save({ session });
            await Player.updateMany({ source_member_id: member._id }, { $set: { profile_id: req.userId } }, { session });
        }
        invitation.status = req.body.accept ? 'accepted' : 'declined';
        await invitation.save({ session });
        if (req.body.accept)
            await syncMemberToOpenSquads(member._id, session);
    });
    res.json({ ok: true });
}));
router.post('/entries/:id/respond', route(async (req, res) => {
    if (typeof req.body.accept !== 'boolean')
        throw new ClubError('Choose accept or decline');
    const result = await mongoose.connection.transaction(async (session) => {
        const entry = await ClubEntry.findOne({ _id: req.params.id, status: 'pending' }).session(session);
        if (!entry)
            throw new ClubError('Invitation is no longer pending', 409);
        const club = await Club.findOneAndUpdate({ _id: entry.club_id, owner_id: req.userId }, { $inc: { roster_revision: 1 } }, { new: true, session });
        if (!club)
            throw new ClubError('Only the captain can confirm this squad', 403);
        if (!req.body.accept) {
            entry.status = 'declined';
            await entry.save({ session });
            return null;
        }
        // Serialize admissions to enforce team capacity when two captains accept together.
        const tournament = await Tournament.findByIdAndUpdate(entry.tournament_id, { $inc: { roster_revision: 1 } }, { new: true, session });
        if (!tournament)
            throw new ClubError('Tournament not found', 404);
        registrationOpen(tournament);
        if (await Team.countDocuments({ tournament_id: tournament._id }).session(session) >= tournament.max_teams)
            throw new ClubError('Tournament team limit reached');
        const pendingIds = await MemberInvitation.find({ club_id: club._id, status: 'pending' }).session(session).distinct('member_id');
        const eligible = await ClubMember.find({ club_id: club._id, _id: { $nin: pendingIds }, status: { $in: ['guest', 'accepted'] } }).session(session);
        const ids = validateSquad(req.body.memberIds, eligible.map(m => String(m._id)));
        const members = ids.map(id => eligible.find(m => String(m._id) === id)!);
        const teams = await Team.find({ tournament_id: tournament._id }).session(session).distinct('_id');
        if (await Player.exists({ team_id: { $in: teams }, profile_id: { $in: members.filter(m => m.profile_id).map(m => m.profile_id) } }).session(session))
            throw new ClubError('A selected player is already in another squad in this tournament');
        const [team] = await Team.create([{ tournament_id: tournament._id, source_club_id: club._id, captain_id: club.owner_id, name: club.name, short_name: club.short_name, is_approved: true }], { session });
        await Player.insertMany(members.map((m, i) => ({ ...rosterSnapshot(m, team._id, i + 1), is_captain: String(m.profile_id) === String(club.owner_id) })), { session });
        await TournamentRegistration.create([{ tournament_id: tournament._id, team_id: team._id, registered_by: req.userId, status: 'approved' }], { session });
        await PointsTable.create([{ tournament_id: tournament._id, team_id: team._id }], { session });
        entry.status = 'accepted';
        entry.team_id = team._id;
        entry.member_ids = members.map(m => m._id);
        await entry.save({ session });
        await AuditLog.create([{ tournament_id: tournament._id, actor_id: req.userId, action: 'Tournament squad confirmed', resource: String(team._id) }], { session });
        return String(team._id);
    });
    res.json({ ok: true, teamId: result });
}));
router.post('/tournaments/:id/invite', route(async (req, res) => {
    if (!await ownsTournament(req, res, req.params.id))
        return;
    const tournament = await Tournament.findById(req.params.id);
    if (!tournament)
        throw new ClubError('Tournament not found', 404);
    registrationOpen(tournament);
    const club = await Club.findById(req.body.clubId);
    if (!club)
        throw new ClubError('Team not found', 404);
    if (await Team.exists({ tournament_id: tournament._id, source_club_id: club._id }))
        throw new ClubError('This team has already joined', 409);
    const entry = await ClubEntry.findOneAndUpdate({ club_id: club._id, tournament_id: tournament._id, status: { $ne: 'accepted' } }, { $set: { sender_id: req.userId, status: 'pending' } }, { upsert: true, new: true });
    res.json(toApi(entry));
}));
router.post('/import/:teamId', route(async (req, res) => {
    const team = await Team.findOne({ _id: req.params.teamId, captain_id: req.userId });
    if (!team)
        throw new ClubError('Only the captain can reuse this team', 403);
    if (team.source_club_id) {
        res.json({ id: String(team.source_club_id) });
        return;
    }
    const club = await mongoose.connection.transaction(async (session) => {
        const existing = await Club.findOne({ legacy_team_id: team._id }).session(session);
        if (existing)
            return existing;
        const [created] = await Club.create([{ name: team.name, short_name: team.short_name, owner_id: req.userId, legacy_team_id: team._id }], { session });
        const players = await Player.find({ team_id: team._id }).session(session);
        for (const player of players) {
            const [member] = await ClubMember.create([{ club_id: created._id, full_name: player.full_name, role: player.role, batting_style: player.batting_style, bowling_style: player.bowling_style, ...(player.profile_id ? { profile_id: player.profile_id, status: 'accepted' } : { status: 'guest' }) }], { session });
            player.source_member_id = member._id;
            await player.save({ session });
        }
        await Team.updateOne({ _id: team._id }, { $set: { source_club_id: created._id } }, { session });
        return created;
    });
    res.json(toApi(club));
}));
router.get('/:id', route(async (req, res) => {
    const club = await Club.findById(req.params.id);
    if (!club)
        throw new ClubError('Team not found', 404);
    const owner = String(club.owner_id) === req.userId;
    if (!owner && !await ClubMember.exists({ club_id: club._id, profile_id: req.userId, status: 'accepted' }))
        throw new ClubError('Team membership required', 403);
    const members = await ClubMember.find({ club_id: club._id, status: { $ne: 'removed' } }).sort({ createdAt: 1 });
    const pending = owner ? await MemberInvitation.find({ club_id: club._id, status: 'pending' }) : [];
    res.json({ club: toApi(club), members: members.map(toApi), pending: pending.map(toApi), owner });
}));
router.patch('/:id', route(async (req, res) => { const club = await owned(req.params.id, req.userId!); club.name = name(req.body.name); club.city = String(req.body.city ?? '').slice(0, 80); await club.save(); res.json(toApi(club)); }));
router.post('/:id/members', route(async (req, res) => {
    await owned(req.params.id, req.userId!);
    const member = await mongoose.connection.transaction(async (session) => {
        await Club.updateOne({ _id: req.params.id }, { $inc: { roster_revision: 1 } }, { session });
        if (await ClubMember.countDocuments({ club_id: req.params.id, status: { $ne: 'removed' } }).session(session) >= 40)
            throw new ClubError('Maximum 40 roster members');
        const [created] = await ClubMember.create([{ club_id: req.params.id, full_name: name(req.body.full_name), role: 'all_rounder', status: 'guest' }], { session });
        await syncMemberToOpenSquads(created._id, session);
        return created;
    });
    res.status(201).json(toApi(member));
}));
router.post('/:id/invite-player', route(async (req, res) => {
    await owned(req.params.id, req.userId!);
    const account = await User.findOne({ _id: playerAccountId(req.body.playerId), suspended: { $ne: true } });
    if (!account)
        throw new ClubError('Player account not found', 404);
    await mongoose.connection.transaction(async (session) => {
        await Club.updateOne({ _id: req.params.id }, { $inc: { roster_revision: 1 } }, { session });
        if (await ClubMember.exists({ club_id: req.params.id, profile_id: account._id }).session(session))
            throw new ClubError('This player is already linked to the team', 409);
        if (await MemberInvitation.exists({ club_id: req.params.id, recipient_id: account._id, status: 'pending' }).session(session))
            throw new ClubError('An invitation is already pending', 409);
        let member = req.body.memberId ? await ClubMember.findOne({ _id: req.body.memberId, club_id: req.params.id, status: 'guest', profile_id: { $exists: false } }).session(session) : null;
        if (req.body.memberId && !member)
            throw new ClubError('Guest player not found', 404);
        if (!member) {
            if (await ClubMember.countDocuments({ club_id: req.params.id, status: { $ne: 'removed' } }).session(session) >= 40)
                throw new ClubError('Maximum 40 roster members');
            [member] = await ClubMember.create([{ club_id: req.params.id, full_name: account.full_name, role: account.playing_role, batting_style: account.batting_style, bowling_style: account.bowling_style, status: 'guest' }], { session });
        }
        await MemberInvitation.create([{ club_id: req.params.id, member_id: member._id, recipient_id: account._id, sender_id: req.userId }], { session });
    });
    res.json({ ok: true });
}));
router.patch('/:id/members/:memberId', route(async (req, res) => {
    await owned(req.params.id, req.userId!);
    await mongoose.connection.transaction(async (session) => {
        await Club.updateOne({ _id: req.params.id }, { $inc: { roster_revision: 1 } }, { session });
        const member = await ClubMember.findOne({ _id: req.params.memberId, club_id: req.params.id, status: { $ne: 'removed' } }).session(session);
        if (!member)
            throw new ClubError('Player not found', 404);
        if (req.body.remove === true) {
            if (String(member.profile_id) === req.userId)
                throw new ClubError('The captain must remain on the roster');
            member.status = 'removed';
            await MemberInvitation.updateMany({ member_id: member._id, status: 'pending' }, { status: 'cancelled' }, { session });
        }
        else {
            member.full_name = name(req.body.full_name);
            for (const key of ['role', 'batting_style', 'bowling_style'] as const)
                if (typeof req.body[key] === 'string')
                    member[key] = req.body[key].slice(0, 80);
        }
        await member.save({ session });
        await syncMemberToOpenSquads(member._id, session);
    });
    res.json({ ok: true });
}));
export default router;
