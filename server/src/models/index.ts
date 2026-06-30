import mongoose, { Schema, type Document, type Types } from 'mongoose';

function isObjectId(value: unknown): value is Types.ObjectId {
  return Boolean(value && typeof value === 'object' && (value as Types.ObjectId).constructor?.name === 'ObjectId');
}

function serializeValue(value: unknown): unknown {
  if (isObjectId(value)) return String(value);
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(serializeValue);
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = serializeValue(v);
    }
    return out;
  }
  return value;
}

export function toApi<T extends Document | Record<string, unknown> | null>(
  doc: T
): T extends null ? null : Record<string, unknown> {
  if (!doc) return null as never;

  const obj =
    typeof (doc as Document).toObject === 'function'
      ? (doc as Document).toObject()
      : { ...(doc as Record<string, unknown>) };

  const { _id, __v, password, ...rest } = obj as Record<string, unknown>;
  const id = _id ?? (obj as Record<string, unknown>).id;
  return serializeValue({ id: String(id), ...rest }) as never;
}

export function toApiList<T extends Document>(docs: T[]) {
  return docs.map((d) => toApi(d));
}

const userSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, select: false },
    phone: { type: String, default: null },
    full_name: { type: String, default: 'Cricket Fan' },
    avatar_url: { type: String, default: null },
    role: {
      type: String,
      enum: ['viewer', 'player', 'organizer', 'admin'],
      default: 'viewer',
    },
    expo_push_token: { type: String, default: null },
    is_premium: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export type UserDoc = Document & {
  email: string;
  password: string;
  phone: string | null;
  full_name: string;
  avatar_url: string | null;
  role: string;
  expo_push_token: string | null;
  is_premium: boolean;
};

export const User = mongoose.model<UserDoc>('User', userSchema);

const tournamentSchema = new Schema(
  {
    organizer_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    slug: { type: String, required: true },
    description: { type: String, default: null },
    logo_url: { type: String, default: null },
    venue: { type: String, default: null },
    city: { type: String, default: null },
    format: { type: String, default: 'T20' },
    overs_per_innings: { type: Number, default: 20 },
    max_teams: { type: Number, default: 8 },
    status: {
      type: String,
      enum: ['draft', 'registration', 'ongoing', 'completed', 'cancelled'],
      default: 'draft',
    },
    start_date: { type: String, default: null },
    end_date: { type: String, default: null },
    registration_deadline: { type: Date, default: null },
    points_win: { type: Number, default: 2 },
    points_tie: { type: Number, default: 1 },
    points_loss: { type: Number, default: 0 },
    settings: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

tournamentSchema.index({ organizer_id: 1, slug: 1 }, { unique: true });

export const Tournament = mongoose.model('Tournament', tournamentSchema);

const teamSchema = new Schema(
  {
    tournament_id: { type: Schema.Types.ObjectId, ref: 'Tournament', required: true },
    captain_id: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    name: { type: String, required: true },
    short_name: { type: String, default: null },
    logo_url: { type: String, default: null },
    primary_color: { type: String, default: '#FF6B00' },
    secondary_color: { type: String, default: '#1A0A2E' },
    is_approved: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

teamSchema.index({ tournament_id: 1, name: 1 }, { unique: true });

export const Team = mongoose.model('Team', teamSchema);

const playerSchema = new Schema(
  {
    team_id: { type: Schema.Types.ObjectId, ref: 'Team', required: true },
    profile_id: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    full_name: { type: String, required: true },
    jersey_number: { type: Number, default: null },
    role: { type: String, default: 'all_rounder' },
    batting_style: { type: String, default: null },
    bowling_style: { type: String, default: null },
    is_captain: { type: Boolean, default: false },
    is_wicket_keeper: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

playerSchema.index({ team_id: 1, jersey_number: 1 }, { unique: true, sparse: true });

export const Player = mongoose.model('Player', playerSchema);

const registrationSchema = new Schema(
  {
    tournament_id: { type: Schema.Types.ObjectId, ref: 'Tournament', required: true },
    team_id: { type: Schema.Types.ObjectId, ref: 'Team', required: true },
    registered_by: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, default: 'pending' },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

registrationSchema.index({ tournament_id: 1, team_id: 1 }, { unique: true });

export const TournamentRegistration = mongoose.model('TournamentRegistration', registrationSchema);

const pointsTableSchema = new Schema(
  {
    tournament_id: { type: Schema.Types.ObjectId, ref: 'Tournament', required: true },
    team_id: { type: Schema.Types.ObjectId, ref: 'Team', required: true },
    played: { type: Number, default: 0 },
    won: { type: Number, default: 0 },
    lost: { type: Number, default: 0 },
    tied: { type: Number, default: 0 },
    no_result: { type: Number, default: 0 },
    points: { type: Number, default: 0 },
    net_run_rate: { type: Number, default: 0 },
    runs_for: { type: Number, default: 0 },
    runs_against: { type: Number, default: 0 },
    overs_for: { type: Number, default: 0 },
    overs_against: { type: Number, default: 0 },
  },
  { timestamps: { createdAt: false, updatedAt: 'updated_at' } }
);

pointsTableSchema.index({ tournament_id: 1, team_id: 1 }, { unique: true });

export const PointsTable = mongoose.model('PointsTable', pointsTableSchema);

const matchSchema = new Schema(
  {
    tournament_id: { type: Schema.Types.ObjectId, ref: 'Tournament', required: true },
    team_a_id: { type: Schema.Types.ObjectId, ref: 'Team', required: true },
    team_b_id: { type: Schema.Types.ObjectId, ref: 'Team', required: true },
    venue: { type: String, default: null },
    scheduled_at: { type: Date, default: null },
    status: {
      type: String,
      enum: ['scheduled', 'live', 'completed', 'abandoned', 'no_result'],
      default: 'scheduled',
    },
    toss_winner_team_id: { type: Schema.Types.ObjectId, ref: 'Team', default: null },
    toss_decision: { type: String, default: null },
    winner_team_id: { type: Schema.Types.ObjectId, ref: 'Team', default: null },
    result_summary: { type: String, default: null },
    man_of_the_match_player_id: { type: Schema.Types.ObjectId, ref: 'Player', default: null },
    overs_per_innings: { type: Number, default: 20 },
    current_innings_number: { type: Number, default: 0 },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export const Match = mongoose.model('Match', matchSchema);

const inningsSchema = new Schema(
  {
    match_id: { type: Schema.Types.ObjectId, ref: 'Match', required: true },
    batting_team_id: { type: Schema.Types.ObjectId, ref: 'Team', required: true },
    bowling_team_id: { type: Schema.Types.ObjectId, ref: 'Team', required: true },
    innings_number: { type: Number, required: true, enum: [1, 2] },
    status: {
      type: String,
      enum: ['not_started', 'in_progress', 'completed'],
      default: 'not_started',
    },
    total_runs: { type: Number, default: 0 },
    total_wickets: { type: Number, default: 0 },
    total_overs: { type: Number, default: 0 },
    extras_wide: { type: Number, default: 0 },
    extras_no_ball: { type: Number, default: 0 },
    extras_bye: { type: Number, default: 0 },
    extras_leg_bye: { type: Number, default: 0 },
    target_runs: { type: Number, default: null },
    striker_player_id: { type: Schema.Types.ObjectId, ref: 'Player', default: null },
    non_striker_player_id: { type: Schema.Types.ObjectId, ref: 'Player', default: null },
    current_bowler_id: { type: Schema.Types.ObjectId, ref: 'Player', default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

inningsSchema.index({ match_id: 1, innings_number: 1 }, { unique: true });

export const Innings = mongoose.model('Innings', inningsSchema);

const scoreEventSchema = new Schema(
  {
    innings_id: { type: Schema.Types.ObjectId, ref: 'Innings', required: true },
    over_number: { type: Number, required: true },
    ball_number: { type: Number, required: true },
    ball_in_over: { type: Number, required: true },
    ball_type: { type: String, required: true },
    runs_off_bat: { type: Number, default: 0 },
    extras: { type: Number, default: 0 },
    is_wicket: { type: Boolean, default: false },
    wicket_type: { type: String, default: null },
    dismissed_player_id: { type: Schema.Types.ObjectId, ref: 'Player', default: null },
    bowler_player_id: { type: Schema.Types.ObjectId, ref: 'Player', default: null },
    striker_player_id: { type: Schema.Types.ObjectId, ref: 'Player', default: null },
    non_striker_player_id: { type: Schema.Types.ObjectId, ref: 'Player', default: null },
    commentary: { type: String, default: null },
    is_legal_delivery: { type: Boolean, default: true },
    created_by: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false } }
);

scoreEventSchema.index({ innings_id: 1, created_at: 1 });

export const ScoreEvent = mongoose.model('ScoreEvent', scoreEventSchema);

export type ObjectId = Types.ObjectId;
