import { test } from 'node:test';
import assert from 'node:assert/strict';
import { playerAccountId, playerEmail, validateSquad, registrationOpen, rosterSnapshot } from '../server/src/domain/clubs';
test('player lookup accepts an account email and still rejects names', () => {
    assert.equal(playerEmail(' Player@Example.com '), 'player@example.com');
    for (const value of ['Sandeep', 'not-an-email', '9999999999', { $ne: null }])
        assert.throws(() => playerEmail(value));
});
test('player account IDs stay exact and never accept a name or email', () => {
    assert.equal(playerAccountId('KC-ABCDEF012345678901234567'), 'abcdef012345678901234567');
    for (const value of ['Sandeep', 'someone@example.com', '9999999999', { $ne: null }])
        assert.throws(() => playerAccountId(value));
});
test('squad validates capacity, duplicates and current eligibility', () => {
    assert.deepEqual(validateSquad(['a', 'b'], ['a', 'b', 'c']), ['a', 'b']);
    for (const ids of [['a'], ['a', 'a'], ['a', 'pending'], Array(31).fill('a'), null])
        assert.throws(() => validateSquad(ids, ['a', 'b']));
});
test('closed, archived and expired tournaments cannot admit teams', () => {
    const now = new Date('2026-10-15T12:00:00Z');
    assert.doesNotThrow(() => registrationOpen({ status: 'registration' }, now));
    assert.throws(() => registrationOpen({ status: 'ongoing' }, now));
    assert.throws(() => registrationOpen({ status: 'registration', settings: { archived: true } }, now));
    assert.throws(() => registrationOpen({ status: 'registration', registration_deadline: new Date('2026-10-14') }, now));
});
test('squad copies playing details and only accepted accounts are linked', () => {
    const member = { _id: 'member', profile_id: 'account', status: 'guest', full_name: 'Old Name', role: 'batter' };
    const snapshot = rosterSnapshot(member, 'team', 1);
    assert.equal(snapshot.profile_id, null);
    member.full_name = 'New Name';
    assert.equal(snapshot.full_name, 'Old Name');
    assert.equal(rosterSnapshot({ ...member, status: 'accepted' }, 'team', 1).profile_id, 'account');
});
