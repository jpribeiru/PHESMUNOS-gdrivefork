import test from 'node:test';
import assert from 'node:assert/strict';
import {applyCommand} from '../lib/repository';
import {createSeed} from '../lib/seed';
import {parseCSV,validateImport} from '../lib/import';
import type {Command} from '../lib/commands';
import type {ConferenceData} from '../lib/domain';
import {fingerprint} from '../lib/sync/repository';
import {freshDatabase} from './helpers/database';
const map={name:0,country:1,email:2};
test('CSV import: email is optional; non-empty emails keep format and duplicate checks',()=>{
 const rows=parseCSV('Name,Country,Email\nAli,Türkiye,\nBo,Kenya,\nCy,Japan,cy@example.com\nDi,Chile,not-an-email\nEd,Peru,CY@example.com\nFay,Qatar,taken@example.com\n,Oman,\nGus,,');
 const checked=validateImport(rows.slice(1),map,['taken@example.com',null]);
 const errors=Object.fromEntries(checked.map(r=>[r.name||`line ${r.line}`,r.errors]));
 assert.deepEqual(errors.Ali,[],'blank email accepted');
 assert.deepEqual(errors.Bo,[],'a second blank email is not a duplicate');
 assert.deepEqual(errors.Cy,[],'valid email accepted');
 assert.deepEqual(errors.Di,['Invalid email']);
 assert.deepEqual(errors.Ed,['Duplicate email'],'duplicate within the file (case-insensitive)');
 assert.deepEqual(errors.Fay,['Duplicate email'],'duplicate of an existing delegate');
 assert.deepEqual(errors['line 8'],['Name is required']);
 assert.deepEqual(errors.Gus,['Country is required']);
});
test('local import and delegate edit store a missing email as null',()=>{
 const seed=createSeed();
 const row=(name:string,email:string)=>({name,country:'Kenya',email,schoolId:seed.schools[0].id,committeeId:seed.committees[0].id});
 const d=applyCommand(seed,{type:'import',rows:[row('Blank One',''),row('Blank Two',''),row('Has Mail','mail@example.com')]},'admin');
 const added=d.delegates.slice(-3);
 assert.deepEqual(added.map(x=>x.email),[null,null,'mail@example.com']);
 assert.throws(()=>applyCommand(d,{type:'import',rows:[row('Bad','bad-email')]},'admin'),/invalid or duplicate/);
 assert.throws(()=>applyCommand(d,{type:'import',rows:[row('Dup','MAIL@example.com')]},'admin'),/invalid or duplicate/);
 const edited=applyCommand(d,{type:'delegate',id:added[2].id,name:'Has Mail',email:'  ',country:'Kenya'},'admin');
 assert.equal(edited.delegates.find(x=>x.id===added[2].id)!.email,null,'clearing the email stores null');
});
test('real PostgreSQL: blank emails import and edit; non-empty emails still validated and unique',async()=>{
 const {db,ids,as,grant,query,asOwner}=await freshDatabase();
 const admin='72000000-0000-4000-8000-000000000001';
 try{
  await grant(admin,'admin');await as(admin);
  const snap=async()=>(await query<{s:ConferenceData}>('select public.conference_snapshot($1) s',[ids.conference]))[0].s;
  const send=async(c:Command)=>{const data=await snap();await db.query('select public.apply_conference_mutation($1,$2,$3,$4,$5,$6)',[ids.conference,crypto.randomUUID(),JSON.stringify(c),'admin',fingerprint(data,c),'2026-10-10T09:00:00Z']);};
  await asOwner();const school=(await query<{id:string}>('select "schoolId" id from public.delegates where id=$1',[ids.france]))[0].id;await as(admin);
  const row=(name:string,email:string)=>({name,country:'Kenya',email,flag:'🇰🇪',committeeId:ids.ga1,schoolId:school});
  await send({type:'import',rows:[row('Blank One',''),row('Blank Two','  '),row('Has Mail','Has.Mail@Example.com')]});
  await asOwner();
  assert.deepEqual((await query<{name:string;email:string|null}>("select name,email from public.delegates where name in ('Blank One','Blank Two','Has Mail') order by name")).map(r=>[r.name,r.email]),
   [['Blank One',null],['Blank Two',null],['Has Mail','has.mail@example.com']]);
  await as(admin);
  await assert.rejects(()=>send({type:'import',rows:[row('Bad','not-an-email')]}),/Invalid imported delegate/);
  await assert.rejects(()=>send({type:'import',rows:[row('Dup','has.mail@example.com')]}),/duplicate key|unique/i);
  const japan=(await snap()).delegates.find(d=>d.id===ids.japan)!;
  await send({type:'delegate',id:ids.japan,name:japan.name,email:'',country:japan.country,flag:japan.flag});
  assert.equal((await snap()).delegates.find(d=>d.id===ids.japan)!.email,null,'edit to blank stores null and the snapshot returns null');
  await asOwner();
  assert.equal((await query<{n:number}>("select count(*)::int n from public.delegates where conference_id=$1 and email is null",[ids.conference]))[0].n,3);
 }finally{await db.close();}
});
