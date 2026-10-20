/** Disposable local DB only. Verify global branding authorization, validation and persistence. */
import assert from 'node:assert/strict';
import { once } from 'node:events';
import express from '../server/node_modules/express/index.js';
import mongoose from '../server/node_modules/mongoose/index.js';
import { createAppearanceRouter } from '../server/src/routes/appearance';
import { signToken } from '../server/src/routes/auth';
import { User, AuditLog } from '../server/src/models';
async function main(){
 await mongoose.connect(`mongodb://127.0.0.1:27032/kingcric_appearance_test_${Date.now()}`);
 const emitted:unknown[][]=[];const io={emit:(...args:unknown[])=>emitted.push(args)};
 const app=express();app.use(express.json());app.use('/appearance',createAppearanceRouter(io as never));
 const server=app.listen(0,'127.0.0.1');await once(server,'listening');
 const base=`http://127.0.0.1:${(server.address() as any).port}/appearance`;
 try{
  const [admin,user]=await User.create([{email:'admin@example.invalid',password:'unused',full_name:'Admin',role:'admin'},{email:'user@example.invalid',password:'unused',full_name:'User',role:'player'}]);
  async function request(method='GET',body?:unknown,actor?:typeof admin){const r=await fetch(base,{method,headers:{'Content-Type':'application/json',...(actor?{Authorization:`Bearer ${signToken(String(actor._id),actor.token_version??0)}`}:{})},body:body?JSON.stringify(body):undefined});return {status:r.status,body:await r.json()};}
  assert.deepEqual((await request()).body,{palette:'green'});
  assert.equal((await request('PUT',{palette:'pink'})).status,401);
  assert.equal((await request('PUT',{palette:'pink'},user)).status,403);
  assert.equal((await request('PUT',{palette:'not-a-color'},admin)).status,400);
  assert.equal((await request('PUT',{palette:{$ne:'green'}},admin)).status,400);
  assert.deepEqual((await request()).body,{palette:'green'});
  for(const palette of ['pink','blue','amber','green']){assert.deepEqual(await request('PUT',{palette},admin),{status:200,body:{palette}});assert.deepEqual((await request()).body,{palette});}
  assert.equal(emitted.length,4);assert.deepEqual(emitted[0],['appearance_updated',{palette:'pink'}]);
  assert.equal(await AuditLog.countDocuments({actor_id:admin._id,action:'Brand color updated'}),4);
  console.log('Appearance integration passed: default, anonymous denial, player denial, invalid values, four palettes, persistence, live events and audit.');
 }finally{await new Promise<void>(resolve=>server.close(()=>resolve()));await mongoose.connection.dropDatabase();await mongoose.disconnect();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
