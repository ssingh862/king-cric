import mongoose, { Schema } from 'mongoose';
const ref = (model: string) => ({ type: Schema.Types.ObjectId, ref: model });
const clubSchema = new Schema({
    name: { type: String, required: true, trim: true, maxlength: 80 }, short_name: String, city: String,
    owner_id: { ...ref('User'), required: true }, roster_revision: { type: Number, default: 0 },
    legacy_team_id: ref('Team'),
}, { timestamps: true });
clubSchema.index({ legacy_team_id: 1 }, { unique: true, partialFilterExpression: { legacy_team_id: { $type: 'objectId' } } });
export const Club = mongoose.model('Club', clubSchema);
const memberSchema = new Schema({
    club_id: { ...ref('Club'), required: true }, profile_id: ref('User'), full_name: { type: String, required: true, maxlength: 80 },
    role: { type: String, default: 'all_rounder' }, batting_style: String, bowling_style: String,
    status: { type: String, enum: ['guest', 'accepted', 'removed'], default: 'guest' },
}, { timestamps: true });
memberSchema.index({ club_id: 1, profile_id: 1 }, { unique: true, partialFilterExpression: { profile_id: { $type: 'objectId' } } });
export const ClubMember = mongoose.model('ClubMember', memberSchema);
const invitationSchema = new Schema({
    club_id: { ...ref('Club'), required: true }, member_id: { ...ref('ClubMember'), required: true },
    recipient_id: { ...ref('User'), required: true }, sender_id: { ...ref('User'), required: true },
    status: { type: String, enum: ['pending', 'accepted', 'declined', 'cancelled'], default: 'pending' },
}, { timestamps: true });
invitationSchema.index({ member_id: 1 }, { unique: true, partialFilterExpression: { status: 'pending' } });
export const MemberInvitation = mongoose.model('MemberInvitation', invitationSchema);
const entrySchema = new Schema({
    club_id: { ...ref('Club'), required: true }, tournament_id: { ...ref('Tournament'), required: true },
    sender_id: { ...ref('User'), required: true }, status: { type: String, enum: ['pending', 'accepted', 'declined'], default: 'pending' },
    team_id: ref('Team'), member_ids: [{ type: Schema.Types.ObjectId, ref: 'ClubMember' }],
}, { timestamps: true });
entrySchema.index({ club_id: 1, tournament_id: 1 }, { unique: true });
export const ClubEntry = mongoose.model('ClubEntry', entrySchema);
