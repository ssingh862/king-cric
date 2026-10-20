import { Club } from '../models/clubs';
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { requireAuth, type AuthRequest } from '../middleware/auth';
import { ownsTournament } from '../middleware/ownership';
import { User, Tournament, Team, Match, Innings, ScoreEvent, AuditLog, SupportReport, TournamentRegistration, PointsTable, Player, toApi } from '../models';
import { signToken } from './auth';
import { validateRules } from '../domain/scoring';
import { recalculateTournamentPoints } from '../services/pointsTable';
const router = Router();
router.use(requireAuth);
// Keep errors inside Express 4's request lifecycle.
const route = (fn: (req: AuthRequest, res: any) => Promise<any>) => (req: AuthRequest, res: any) => {
  void fn(req, res).catch(() => res.status(500).json({ error: 'Unable to save changes. Please retry.' }));
};
router.patch('/preferences', route(async (req, res) => {
  const user = await User.findById(req.userId);
  if (!user) return res.sendStatus(401);
  const updates: Record<string, unknown> = {};
  if ('notifications' in req.body) {
    if (typeof req.body.notifications !== 'boolean') return res.status(400).json({error:'Invalid preference'});
    updates.notifications = req.body.notifications;
    if (!req.body.notifications) user.expo_push_token = null;
  }
  if ('scoringDefaults' in req.body) {
    try { updates.scoringDefaults = validateRules(req.body.scoringDefaults); } catch (e) { return res.status(400).json({error:(e as Error).message}); }
  }
  user.preferences = {...user.preferences, ...updates};
  await user.save(); res.json({user:toApi(user)});
}));
router.post('/password', route(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (typeof currentPassword !== 'string' || typeof newPassword !== 'string' || newPassword.length < 8 || newPassword.length > 72) return res.status(400).json({error:'Use a password with 8–72 characters'});
  const user = await User.findById(req.userId).select('+password');
  if (!user || !await bcrypt.compare(currentPassword, user.password)) return res.status(400).json({error:'Current password is incorrect'});
  user.password = await bcrypt.hash(newPassword, 12); user.token_version = (user.token_version ?? 0) + 1;
  await user.save(); res.json({token: signToken(String(user._id), user.token_version)});
}));
router.post('/revoke-sessions', route(async (req, res) => {
  const user = await User.findByIdAndUpdate(req.userId, {$inc:{token_version:1}}, {new:true});
  if (!user) return res.sendStatus(401);
  res.json({token:signToken(String(user._id), user.token_version)});
}));
router.post('/delete-account', route(async (req, res) => {
  const user = await User.findById(req.userId).select('+password');
  if (!user || typeof req.body.password !== 'string' || !await bcrypt.compare(req.body.password,user.password)) return res.status(400).json({error:'Current password is incorrect'});
  if (await Club.exists({owner_id:req.userId}) || user.role === 'admin' || await Tournament.exists({organizer_id:req.userId}) || await Team.exists({captain_id:req.userId})) return res.status(409).json({error:'Transfer or remove your tournaments and teams before deleting your account. Admin accounts need another administrator.'});
  await User.findByIdAndDelete(req.userId); res.json({ok:true});
}));
router.post('/reports', route(async(req,res) => {
  const message = req.body.message;
  if (typeof message !== 'string' || message.trim().length < 10 || message.length > 2000) return res.status(400).json({error:'Describe the problem in 10–2000 characters'});
  await SupportReport.create({user_id:req.userId,message:message.trim()}); res.json({ok:true});
}));
router.get('/tournaments', route(async(req,res) => {
  const user = await User.findById(req.userId);
  const list = await Tournament.find(user?.role === 'admin' ? {} : {organizer_id:req.userId}).sort({created_at:-1});
  res.json(list.map(toApi));
}));
router.get('/tournaments/:id', route(async(req,res) => {
  if (!await ownsTournament(req,res,req.params.id)) return;
  const tournament = await Tournament.findById(req.params.id);
  const scorers = await User.find({_id:{$in:tournament?.settings?.scorer_ids ?? []}}).select('full_name email');
  const teams = await Team.find({tournament_id:req.params.id});
  const audit = await AuditLog.find({tournament_id:req.params.id}).sort({created_at:-1}).limit(100).populate('actor_id','full_name');
  res.json({tournament:toApi(tournament),scorers:scorers.map(toApi),teams:teams.map(toApi),audit:audit.map(toApi)});
}));
router.patch('/tournaments/:id', route(async(req,res) => {
  if (!await ownsTournament(req,res,req.params.id)) return;
  const tournament = await Tournament.findById(req.params.id);
  if (!tournament) return res.sendStatus(404);
  for (const key of ['points_win','points_tie','points_loss','points_no_result'] as const) {
    if (key in req.body) {
      if (!Number.isInteger(req.body[key]) || req.body[key]<0 || req.body[key]>20) return res.status(400).json({error:'Points must be between 0 and 20'});
      tournament[key] = req.body[key];
    }
  }
  if ('registration_deadline' in req.body) {
    const value = req.body.registration_deadline;
    if (value !== null && (typeof value !== 'string' || !Number.isFinite(Date.parse(value)))) return res.status(400).json({error:'Invalid deadline'});
    tournament.registration_deadline = value ? new Date(value) : null;
  }
  if ('archived' in req.body) {
    if (typeof req.body.archived !== 'boolean') return res.sendStatus(400);
    if (req.body.archived && !['completed','cancelled'].includes(tournament.status)) return res.status(400).json({error:'Finish or cancel the tournament before you hide it from home.'});
    tournament.settings = {...tournament.settings, archived:req.body.archived};
  }
  await tournament.save();
  await recalculateTournamentPoints(String(tournament._id));
  await AuditLog.create({tournament_id:tournament._id,actor_id:req.userId,action:'Tournament settings updated'});
  res.json({ok:true});
}));
router.post('/tournaments/:id/scorers', route(async(req,res) => {
  if (!await ownsTournament(req,res,req.params.id)) return;
  if (typeof req.body.email !== 'string' || typeof req.body.remove !== 'boolean') return res.sendStatus(400);
  const scorer = await User.findOne({email:req.body.email.trim().toLowerCase(),suspended:{$ne:true}});
  if (!scorer) return res.status(404).json({error:'This email has no KingCric account yet. Ask them to sign up first.'});
  const t = await Tournament.findById(req.params.id); if(!t) return res.sendStatus(404);
  const ids = new Set<string>((t.settings?.scorer_ids ?? []).map(String));
  req.body.remove ? ids.delete(String(scorer._id)) : ids.add(String(scorer._id));
  if(ids.size > 20) return res.status(400).json({error:'Maximum 20 scorers'});
  t.settings={...t.settings,scorer_ids:[...ids]}; await t.save();
  await AuditLog.create({tournament_id:t._id,actor_id:req.userId,action:req.body.remove?'Scorer removed':'Scorer assigned',resource:String(scorer._id)});
  res.json({ok:true});
}));
router.post('/tournaments/:id/approve', route(async(req,res) => {
  if (!await ownsTournament(req,res,req.params.id)) return;
  if(typeof req.body.approved !== 'boolean') return res.sendStatus(400);
  const team = await Team.findOneAndUpdate({_id:req.body.teamId,tournament_id:req.params.id},{is_approved:req.body.approved},{new:true});
  if(!team) return res.sendStatus(404);
  await TournamentRegistration.updateMany({team_id:team._id,tournament_id:req.params.id},{status:req.body.approved?'approved':'pending'});
  await AuditLog.create({tournament_id:req.params.id,actor_id:req.userId,action:req.body.approved?'Team approved':'Team approval removed',resource:team.name});
  res.json({ok:true});
}));
router.get('/tournaments/:id/export', route(async(req,res) => {
  if (!await ownsTournament(req,res,req.params.id)) return;
  const tournament=await Tournament.findById(req.params.id);
  const matches=await Match.find({tournament_id:req.params.id});
  const innings=await Innings.find({match_id:{$in:matches.map(m=>m._id)}});
  const events=await ScoreEvent.find({innings_id:{$in:innings.map(i=>i._id)}}).sort({created_at:1});
  const teams=await Team.find({tournament_id:req.params.id});
  const players=await Player.find({team_id:{$in:teams.map(t=>t._id)}});
  const points=await PointsTable.find({tournament_id:req.params.id});
  res.json({teams:teams.map(toApi),players:players.map(toApi),points:points.map(toApi),tournament:toApi(tournament), matches:matches.map(toApi),innings:innings.map(toApi),deliveries:events.map(toApi)});
}));
router.use('/admin', route(async(req,res) => {
  const user=await User.findById(req.userId);
  if(user?.role!=='admin') return res.status(403).json({error:'Administrator access required'});
  // Paged lists keep the admin workspace usable as the community grows.
  const page=Math.max(1,Math.min(10000,Math.floor(Number(req.query.page)||1)));
  const limit=20;
  const q=String(req.query.q??'').trim().slice(0,80);
  const escaped=q.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  if(req.method==='GET' && req.path==='/overview') {
    const [users,suspended,tournaments,liveMatches,teams,openReports]=await Promise.all([User.countDocuments(),User.countDocuments({suspended:true}),Tournament.countDocuments(),Match.countDocuments({status:'live'}),Team.countDocuments(),SupportReport.countDocuments({status:'open'})]);
    return res.json({users,suspended,tournaments,liveMatches,teams,openReports});
  }
  if(req.method==='GET' && req.path==='/users-list') {
    const filter:Record<string,unknown>={};
    if(q)filter.$or=[{full_name:{$regex:escaped,$options:'i'}},{email:{$regex:escaped,$options:'i'}}];
    if(req.query.status==='suspended')filter.suspended=true;
    else if(req.query.status==='active')filter.suspended={$ne:true};
    const [items,total]=await Promise.all([User.find(filter).select('full_name email role suspended').sort({_id:-1}).skip((page-1)*limit).limit(limit),User.countDocuments(filter)]);
    return res.json({items:items.map(toApi),total,page,limit});
  }
  if(req.method==='GET' && req.path==='/tournaments') {
    const filter:Record<string,unknown>={};
    if(q)filter.$or=[{name:{$regex:escaped,$options:'i'}},{city:{$regex:escaped,$options:'i'}}];
    if(['draft','registration','ongoing','completed','cancelled'].includes(String(req.query.status)))filter.status=req.query.status;
    const [items,total]=await Promise.all([Tournament.find(filter).sort({created_at:-1}).skip((page-1)*limit).limit(limit).populate('organizer_id','full_name'),Tournament.countDocuments(filter)]);
    return res.json({items:items.map(toApi),total,page,limit});
  }
  if(req.method==='GET' && req.path==='/reports-list') {
    const filter:Record<string,unknown>={};
    if(['open','resolved'].includes(String(req.query.status)))filter.status=req.query.status;
    const [items,total]=await Promise.all([SupportReport.find(filter).sort({createdAt:-1}).skip((page-1)*limit).limit(limit).populate('user_id','full_name email'),SupportReport.countDocuments(filter)]);
    return res.json({items:items.map(toApi),total,page,limit});
  }
  if(req.method==='GET' && req.path==='/activity') {
    const [items,total]=await Promise.all([AuditLog.find().sort({created_at:-1}).skip((page-1)*limit).limit(limit).populate('actor_id','full_name'),AuditLog.countDocuments()]);
    return res.json({items:items.map(toApi),total,page,limit});
  }
  if(req.method==='POST' && req.path==='/report-status') {
    if(!['open','resolved'].includes(req.body.status)||!String(req.body.id??'').match(/^[a-f0-9]{24}$/i))return res.status(400).json({error:'Invalid report update'});
    const report=await SupportReport.findByIdAndUpdate(req.body.id,{status:req.body.status},{new:true});
    if(!report)return res.status(404).json({error:'Report not found'});
    await AuditLog.create({actor_id:req.userId,action:report.status==='resolved'?'Report resolved':'Report reopened',resource:String(report._id)});
    return res.json({ok:true});
  }
  if(req.method==='GET' && req.path==='/users') return res.json((await User.find().select('full_name email role suspended').limit(200)).map(toApi));
  if(req.method==='GET' && req.path==='/reports') return res.json((await SupportReport.find().sort({createdAt:-1}).limit(100)).map(toApi));
  if(req.method==='POST' && req.path==='/suspend') {
    const target=await User.findById(req.body.userId);
    if(!target || target.role==='admin' || String(target._id)===req.userId || typeof req.body.suspended !== 'boolean') return res.status(400).json({error:'This account cannot be changed'});
    target.suspended=req.body.suspended; target.token_version=(target.token_version??0)+1; await target.save();
    await AuditLog.create({actor_id:req.userId,action:target.suspended?'Account suspended':'Account restored',resource:String(target._id)});
    return res.json({ok:true});
  }
  if(req.method==='POST' && req.path==='/resolve') { await SupportReport.findByIdAndUpdate(req.body.id,{status:'resolved'}); return res.json({ok:true}); }
  res.sendStatus(404);
}));
export default router;
