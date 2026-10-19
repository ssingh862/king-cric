import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { EventEmitter } from 'node:events';
import { build } from '../server/node_modules/esbuild/lib/main.js';
const require = createRequire(import.meta.url);
const apiStub = `
export const API_URL='https://test.invalid';
export const isApiConfigured=()=>true;
export class ApiError extends Error { constructor(message,status){super(message);this.status=status;} }
export const getToken=async()=>fixture.token;
export const setToken=async value=>{fixture.token=value;};
export const api=async (...args)=>{if(fixture.failure==='network')throw new Error('offline');if(typeof fixture.failure==='number')throw new ApiError('error',fixture.failure);return fixture.api(...args);};
export const apiSafe=async (...args)=>fixture.apiSafe(...args);
`;
async function load(entry: string, fixture: any) {
  const result=await build({entryPoints:[entry],bundle:true,write:false,platform:'node',format:'cjs',plugins:[{name:'test-platform',setup(b){
    b.onResolve({filter:/(^react-native$|^socket.io-client$|\/api$)/},args=>({path:args.path,namespace:'test'}));
    b.onLoad({filter:/.*/,namespace:'test'},args=>({contents:args.path==='react-native'?`export const AppState={addEventListener:(_,fn)=>{fixture.foreground=fn;return {remove(){}};}};`:args.path==='socket.io-client'?`export const io=()=>fixture.socket;`:apiStub,loader:'js'}));
  }}]});
  const module={exports:{} as any};new Function('module','exports','require','fixture',result.outputFiles[0].text)(module,module.exports,require,fixture);return module.exports;
}
test('temporary auth failures retain token; rejected sessions clear it; later retry succeeds',async()=>{
  const f:any={token:'saved',failure:'network',api:async()=>({user:{id:'u'},email:'u@example.invalid'})};
  const {useAuthStore:s}=await load('src/stores/authStore.ts',f);
  await s.getState().loadProfile();assert.equal(f.token,'saved');assert.equal(s.getState().isLoading,false);
  f.failure=503;await s.getState().loadProfile();assert.equal(f.token,'saved');
  f.failure=null;await s.getState().loadProfile();assert.equal(s.getState().isAuthenticated,true);
  f.failure=401;await s.getState().loadProfile();assert.equal(f.token,null);assert.equal(s.getState().isAuthenticated,false);
});
test('room subscriptions rejoin after reconnect and stop after last subscriber leaves',async()=>{
  const socket:any=new EventEmitter();socket.connected=false;socket.disconnect=()=>{};
  const joined:string[]=[];socket.on('join_innings',(id:string)=>joined.push(id));
  const m=await load('src/lib/socket.ts',{socket});
  m.joinInningsRoom('i');m.joinInningsRoom('i');assert.deepEqual(joined,[]);
  socket.connected=true;socket.emit('connect');assert.deepEqual(joined,['i']);
  m.leaveInningsRoom('i');socket.emit('connect');assert.deepEqual(joined,['i','i']);
  m.leaveInningsRoom('i');socket.emit('connect');assert.deepEqual(joined,['i','i']);
});
test('recording a ball updates local totals after one save without a follow-up PATCH',async()=>{
  const calls:any[]=[];const f:any={socket:new EventEmitter(),apiSafe:async(path:string,options:any)=>{
    calls.push({path,method:options.method});return {data:{id:'event',innings_id:'i',created_at:new Date().toISOString(),...JSON.parse(options.body)},error:null};
  }};
  const {useScoringStore:s}=await load('src/stores/scoringStore.ts',f);
  s.setState({innings:{id:'i',match_id:'m',batting_team_id:'a',bowling_team_id:'b',innings_number:1,status:'in_progress',total_runs:0,total_wickets:0,total_overs:0,target_runs:null,striker_player_id:'a1',non_striker_player_id:'a2',current_bowler_id:'b1'},strikerId:'a1',nonStrikerId:'a2',bowlerId:'b1',events:[]});
  const result=await s.getState().recordBall({ballType:'one',runs:1});
  assert.equal(result.error,null);assert.equal(calls.length,1);assert.equal(calls[0].method,'POST');
  assert.equal(s.getState().innings.total_runs,1);assert.equal(s.getState().innings.total_overs,0.1);assert.equal(s.getState().strikerId,'a2');
});
