/** Only disposable localhost MongoDB. Never uses production configuration. */
import assert from 'node:assert/strict';
import { once } from 'node:events';
import express from '../server/node_modules/express/index.js';
import mongoose from '../server/node_modules/mongoose/index.js';
import settingsRoutes from '../server/src/routes/settings';
import { signToken } from '../server/src/routes/auth';
import { User,Tournament,SupportReport,AuditLog } from '../server/src/models';
async function main(){
 await mongoose.connect(`mongodb://127.0.0.1:27032/kingcric_admin_test_${Date.now()}`);
 const app=express();app.use(express.json());app.use('/settings',settingsRoutes);const server=app.listen(0,'127.0.0.1');await once(server,'listening');
 const base=`http://127.0.0.1:${(server.address() as any).port}/settings/admin`;
 try{
  const admin=await User.create({email:'admin@example.invalid',password:'unused',full_name:'Admin',role:'admin'});
  const regular=await User.create({email:'regular@example.invalid',password:'unused',full_name:'Square [Club].*',role:'player'});
  await User.insertMany(Array.from({length:21},(_,i)=>({email:`member${i}@example.invalid`,password:'unused',full_name:`Member ${i}`,role:'player'})));
  await Tournament.create([{name:'League One',slug:'one',city:'Rajkot',organizer_id:admin._id,status:'registration'},{name:'League Two',slug:'two',organizer_id:admin._id,status:'completed'}]);
  const report=await SupportReport.create({user_id:regular._id,message:'Help with the latest score please.'});
  async function request(path:string,actor:any=admin,body?:unknown){const r=await fetch(base+path,{method:body?'POST':'GET',headers:{'Content-Type':'application/json',...(actor?{Authorization:`Bearer ${signToken(String(actor._id),actor.token_version??0)}`}:{})},body:body?JSON.stringify(body):undefined});return {status:r.status,data:await r.json()};}
  for(const path of ['/overview','/users-list','/tournaments','/reports-list','/activity']){assert.equal((await request(path,null)).status,401);assert.equal((await request(path,regular)).status,403);}
  assert.equal((await request('/overview')).data.users,23);
  const first=(await request('/users-list')).data,second=(await request('/users-list?page=2')).data;
  assert.equal(first.items.length,20);assert.equal(second.items.length,3);assert.equal(first.total,23);assert.ok(!second.items.some((u:any)=>first.items.some((a:any)=>a.id===u.id)));assert.ok(!('password' in first.items[0]));
  const literal=(await request('/users-list?q='+encodeURIComponent('[Club].*'))).data;assert.equal(literal.total,1);assert.equal(literal.items[0].id,String(regular._id));
  const tours=(await request('/tournaments?status=completed')).data;assert.equal(tours.total,1);assert.equal(tours.items[0].name,'League Two');
  assert.equal((await request('/suspend',admin,{userId:admin._id,suspended:true})).status,400);
  assert.equal((await request('/suspend',admin,{userId:regular._id,suspended:true})).status,200);
  assert.equal((await request('/overview')).data.suspended,1);assert.equal((await request('/users-list?status=suspended')).data.total,1);
  assert.equal((await request('/overview',regular)).status,401);
  assert.equal((await request('/suspend',admin,{userId:regular._id,suspended:false})).status,200);
  assert.equal((await request('/report-status',admin,{id:'bad',status:'resolved'})).status,400);
  assert.equal((await request('/report-status',admin,{id:String(report._id),status:'closed'})).status,400);
  assert.equal((await request('/report-status',admin,{id:String(report._id),status:'resolved'})).status,200);assert.equal((await request('/overview')).data.openReports,0);
  assert.equal((await request('/report-status',admin,{id:String(report._id),status:'open'})).status,200);assert.equal((await request('/reports-list?status=open')).data.total,1);
  assert.equal((await request('/activity')).data.total,4);assert.equal(await AuditLog.countDocuments(),4);
  console.log('Admin integration passed: access control, pagination, literal search, counts, filters, protected admins, suspension/session revocation, report resolve/reopen and audit.');
 }finally{await new Promise<void>(resolve=>server.close(()=>resolve()));await mongoose.connection.dropDatabase();await mongoose.disconnect();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
