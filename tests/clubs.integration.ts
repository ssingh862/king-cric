/** Run with a disposable replica set on 127.0.0.1:27029. Never uses .env database settings. */
import assert from 'node:assert/strict';
import express from '../server/node_modules/express/index.js';
import mongoose from '../server/node_modules/mongoose/index.js';
import { once } from 'node:events';
import clubs from '../server/src/routes/clubs';
import playersRoute from '../server/src/routes/players';
import { signToken } from '../server/src/routes/auth';
import { User, Tournament, Team, Player, ScoreEvent, Match } from '../server/src/models';
import { Club, ClubMember, ClubEntry, MemberInvitation } from '../server/src/models/clubs';
async function main() {
    const direct = new mongoose.mongo.MongoClient('mongodb://127.0.0.1:27029/?directConnection=true');
    await direct.connect();
    try {
        await direct.db('admin').command({ replSetInitiate: { _id: 'kingcric-test', members: [{ _id: 0, host: '127.0.0.1:27029' }] } });
    }
    catch (e: any) {
        if (e.code !== 23)
            throw e;
    }
    for (let i = 0; i < 40; i++) {
        if ((await direct.db('admin').command({ hello: 1 })).isWritablePrimary)
            break;
        await new Promise(r => setTimeout(r, 250));
    }
    await direct.close();
    await mongoose.connect(`mongodb://127.0.0.1:27029/kingcric_clubs_test_${Date.now()}?replicaSet=kingcric-test`);
    const app = express();
    app.use(express.json());
    app.use('/clubs', clubs);
    app.use('/players', playersRoute);
    const server = app.listen(0, '127.0.0.1');
    await once(server, 'listening');
    const address = server.address() as {
        port: number;
    };
    async function request(user: any, path: string, body?: unknown, method = body === undefined ? 'GET' : 'POST') {
        const response = await fetch(`http://127.0.0.1:${address.port}${path}`, { method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${signToken(String(user._id))}` }, body: body === undefined ? undefined : JSON.stringify(body) });
        const data = await response.json();
        return { status: response.status, data };
    }
    try {
        await Promise.all([Club.init(), ClubMember.init(), ClubEntry.init(), MemberInvitation.init(), Team.init(), Player.init(), User.init()]);
        const [captain, player, organizer, outsider, guestAccount] = await User.create(['captain', 'player', 'organizer', 'outsider', 'guest'].map(name => ({ email: `${name}@example.invalid`, password: 'unused-test-hash', full_name: name })));
        const created = await request(captain, '/clubs', { name: 'Mumbai XI', city: 'Mumbai' });
        assert.equal(created.status, 201);
        const clubId = created.data.id;
        const guest = await request(captain, `/clubs/${clubId}/members`, { full_name: 'Guest One' });
        assert.equal(guest.status, 201);
        const guest2 = await request(captain, `/clubs/${clubId}/members`, { full_name: 'Guest Two' });
        assert.equal(guest2.status, 201);
        assert.equal((await request(outsider, `/clubs/${clubId}/members`, { full_name: 'Intruder' })).status, 403);
        const lookup = await request(captain, `/clubs/players/lookup?email=${encodeURIComponent(player.email)}`);
        assert.equal(lookup.data.full_name, 'player');
        assert.equal(lookup.data.email, undefined);
        assert.equal((await request(captain, `/clubs/${clubId}/invite-player`, { playerId: `KC-${player._id}`, memberId: guest.data.id })).status, 200);
        const inbox = await request(player, '/clubs/invitations');
        const memberInvite = inbox.data.members[0].id;
        assert.equal((await request(outsider, `/clubs/member-invitations/${memberInvite}/respond`, { accept: true })).status, 409);
        const tournament = await Tournament.create({ organizer_id: organizer._id, name: 'IPL', slug: 'ipl', status: 'registration', max_teams: 8 });
        const invitation = await request(organizer, `/clubs/tournaments/${tournament._id}/invite`, { clubId });
        assert.equal(invitation.status, 200);
        const entryId = invitation.data.id;
        assert.equal((await request(outsider, `/clubs/tournaments/${tournament._id}/invite`, { clubId })).status, 403);
        const roster = await request(captain, `/clubs/${clubId}`);
        const all = roster.data.members.map((m: any) => m.id);
        assert.equal((await request(captain, `/clubs/entries/${entryId}/respond`, { accept: true, memberIds: all })).status, 400, 'pending member cannot be entered');
        assert.equal((await request(player, `/clubs/member-invitations/${memberInvite}/respond`, { accept: true })).status, 200);
        const duplicate = await Promise.all([1, 2].map(() => request(captain, `/clubs/entries/${entryId}/respond`, { accept: true, memberIds: all })));
        assert.deepEqual(duplicate.map(r => r.status).sort(), [200, 409]);
        const teamId = duplicate.find(r => r.status === 200)!.data.teamId;
        assert.equal(await Team.countDocuments({ source_club_id: clubId, tournament_id: tournament._id }), 1);
        assert.equal(await Player.countDocuments({ team_id: teamId }), 3);
        const snapshot = await Player.findOne({ team_id: teamId, source_member_id: guest2.data.id });
        assert(snapshot);
        assert.equal((await request(captain, `/clubs/${clubId}/members/${guest2.data.id}`, { full_name: 'New Guest Name' }, 'PATCH')).status, 200);
        assert.equal((await Player.findById(snapshot._id))?.full_name, 'New Guest Name', 'open tournament squad follows the captain roster');
        assert.equal((await request(captain, `/players/${snapshot._id}`, { profile_id: String(outsider._id) }, 'PATCH')).status, 400, 'direct identity assignment forbidden');
        const event = await ScoreEvent.create({ innings_id: new mongoose.Types.ObjectId(), over_number: 0, ball_number: 1, ball_in_over: 1, ball_type: 'one', runs_off_bat: 1, striker_player_id: snapshot._id });
        assert.equal((await request(captain, `/clubs/${clubId}/invite-player`, { playerId: `KC-${guestAccount._id}`, memberId: guest2.data.id })).status, 200);
        const later = await request(guestAccount, '/clubs/invitations');
        assert.equal((await request(guestAccount, `/clubs/member-invitations/${later.data.members[0].id}/respond`, { accept: true })).status, 200);
        assert.equal(String((await Player.findById(snapshot._id))?.profile_id), String(guestAccount._id));
        assert.equal(String((await ScoreEvent.findById(event._id))?.striker_player_id), String(snapshot._id), 'linking preserves delivery identities');
        const next = await Tournament.create({ organizer_id: organizer._id, name: 'Winter Cup', slug: 'winter', status: 'registration' });
        const secondInvite = await request(organizer, `/clubs/tournaments/${next._id}/invite`, { clubId });
        const second = await request(captain, `/clubs/entries/${secondInvite.data.id}/respond`, { accept: true, memberIds: all });
        assert.equal(second.status, 200);
        assert.equal((await Player.findOne({ team_id: second.data.teamId, source_member_id: guest2.data.id }))?.full_name, 'New Guest Name');
        const rival = await Team.create({ tournament_id: tournament._id, name: 'Rivals', captain_id: organizer._id });
        await Match.create({ tournament_id: tournament._id, team_a_id: teamId, team_b_id: rival._id, status: 'live' });
        assert.equal((await request(captain, `/clubs/${clubId}/members/${guest2.data.id}`, { full_name: 'After the start' }, 'PATCH')).status, 200);
        assert.equal((await Player.findById(snapshot._id))?.full_name, 'New Guest Name', 'a started match keeps the tournament squad unchanged');
        assert.equal((await Player.findOne({ team_id: second.data.teamId, source_member_id: guest2.data.id }))?.full_name, 'After the start');
        console.log('PASS: creation, lookup privacy, authorization, invitation consent, atomic duplicate acceptance, independent squads, guest linking, preserved deliveries and team reuse.');
    }
    finally {
        server.close();
        await once(server, 'close');
        assert.match(mongoose.connection.name, /^kingcric_clubs_test_/);
        await mongoose.connection.dropDatabase();
        await mongoose.disconnect();
    }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
