/** Uses only a disposable local MongoDB on port 27031; never reads the live DB URI. */
import assert from 'node:assert/strict';
import { once } from 'node:events';
import express from '../server/node_modules/express/index.js';
import mongoose from '../server/node_modules/mongoose/index.js';
import { createMatchesRouter } from '../server/src/routes/matches';
import { signToken } from '../server/src/routes/auth';
import { User, Tournament, Team, Player, Match, Innings } from '../server/src/models';
async function main() {
  await mongoose.connect(`mongodb://127.0.0.1:27031/kingcric_scoring_test_${Date.now()}`);
  const emitted: any[] = [];
  const io: any = { to: () => io, emit: (...args: any[]) => emitted.push(args) };
  const app = express(); app.use(express.json()); app.use('/matches', createMatchesRouter(io));
  const server = app.listen(0, '127.0.0.1'); await once(server, 'listening');
  const base = `http://127.0.0.1:${(server.address() as any).port}/matches`;
  try {
    const owner = await User.create({ email: 'owner@example.invalid', full_name: 'Owner', password: 'unused' });
    const outsider = await User.create({ email: 'other@example.invalid', full_name: 'Other', password: 'unused' });
    const tournament = await Tournament.create({ name: 'Test', slug: 'test', organizer_id: owner._id });
    const [a,b] = await Team.create(['A','B'].map(name => ({name,tournament_id:tournament._id})));
    const [striker, nonStriker] = await Player.create([1,2].map(n=>({team_id:a._id,full_name:`Batter ${n}`,jersey_number:n})));
    const bowler = await Player.create({team_id:b._id,full_name:'Bowler',jersey_number:1});
    const match = await Match.create({tournament_id:tournament._id,team_a_id:a._id,team_b_id:b._id,status:'live',overs_per_innings:2});
    const inn = await Innings.create({match_id:match._id,batting_team_id:a._id,bowling_team_id:b._id,innings_number:1,status:'in_progress',striker_player_id:striker._id,non_striker_player_id:nonStriker._id,current_bowler_id:bowler._id});
    async function request(path: string, body?: any, user: any = owner, method='POST') {
      const r = await fetch(base+path,{method,headers:{'Content-Type':'application/json',...(user?{Authorization:`Bearer ${signToken(String(user._id), user.token_version ?? 0)}`}:{})},body:body?JSON.stringify(body):undefined});
      return {status:r.status,data:r.status===204?null:await r.json()};
    }
    const path=`/innings/${inn._id}/score-events`;
    let state:any=inn; let last:any;
    const payload=()=>({ball_type:'dot',runs_off_bat:0,extras:0,is_wicket:false,striker_player_id:String(state.striker_player_id),non_striker_player_id:String(state.non_striker_player_id),bowler_player_id:String(bowler._id)});
    assert.equal((await request(path,payload(),null)).status,401);
    assert.equal((await request(path,payload(),outsider)).status,403);
    for(let n=0;n<6;n++) {
      const r=await request(path,{...payload(),...(n===0?{ball_type:'one',runs_off_bat:1}:{})});
      assert.equal(r.status,201,JSON.stringify(r.data)); state=r.data.innings;last=r.data;
      assert.equal(state.total_runs,1);
      assert.equal(state.total_overs,n===5?1:(n+1)/10);
      const saved=await Innings.findById(inn._id);
      assert.equal(String(saved!.striker_player_id),state.striker_player_id);
      assert.equal(saved!.total_runs,state.total_runs);
    }
    assert.equal(state.current_bowler_id,null);
    assert.equal(emitted.filter(e=>e[0]==='score_event').length,6);
    assert.equal(emitted.filter(e=>e[0]==='innings_updated').at(-1)[1].current_bowler_id,null);
    assert.equal((await request(`/score-events/${last.id}`,undefined,owner,'DELETE')).status,204);
    state=await Innings.findById(inn._id);assert.equal(state.total_overs,0.5);
    const wicket=await request(path,{...payload(),is_wicket:true,wicket_type:'bowled',dismissed_player_id:String(state.striker_player_id)});
    assert.equal(wicket.status,201);assert.equal(wicket.data.innings.total_wickets,1);assert.equal(wicket.data.innings.status,'completed');
    await User.updateOne({_id:owner._id},{$set:{suspended:true}});
    assert.equal((await request(`/score-events/${wicket.data.id}`,undefined,owner,'DELETE')).status,401);
    console.log('PASS: authorized scoring, persisted totals/strike, over completion, wicket, undo, realtime payloads, and suspended/unauthorized users');
  } finally {
    await new Promise<void>(resolve=>server.close(()=>resolve()));
    await mongoose.connection.dropDatabase(); await mongoose.disconnect();
  }
}
main().catch(e=>{console.error(e);process.exitCode=1});
