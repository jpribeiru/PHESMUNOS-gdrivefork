import test from 'node:test';
import assert from 'node:assert/strict';
import {freshDatabase} from './helpers/database';
import {applyCommand} from '../lib/commands';
import {createSeed} from '../lib/seed';
import {fingerprint} from '../lib/sync/repository';
import type {ConferenceData} from '../lib/domain';

test('Local staff edit reassigns committees; remove deletes only that entry; Executive only',()=>{
 const seed=createSeed(),staff=seed.staff.find(s=>s.role==='chair')!,other=seed.committees.find(c=>!staff.committeeIds.includes(c.id))!;
 assert.throws(()=>applyCommand(seed,{type:'staffUpdate',id:staff.id,name:'X',role:'chair',committeeIds:[]},'chair'),/boundary/);
 assert.throws(()=>applyCommand(seed,{type:'staffRemove',id:staff.id},'chair'),/boundary/);
 assert.throws(()=>applyCommand(seed,{type:'staffUpdate',id:staff.id,name:'  ',role:'chair',committeeIds:[]},'admin'),/Name required/);
 assert.throws(()=>applyCommand(seed,{type:'staffUpdate',id:staff.id,name:'X',role:'chair',committeeIds:['missing']},'admin'),/Committee unavailable/);
 const updated=applyCommand(seed,{type:'staffUpdate',id:staff.id,name:' Renamed Chair ',role:'chair',committeeIds:[other.id,other.id]},'admin');
 const after=updated.staff.find(s=>s.id===staff.id)!;
 assert.equal(after.name,'Renamed Chair');assert.deepEqual(after.committeeIds,[other.id]);assert.equal(after.contactRevision,(staff.contactRevision??1)+1);
 const removed=applyCommand(updated,{type:'staffRemove',id:staff.id},'admin');
 assert.equal(removed.staff.some(s=>s.id===staff.id),false);assert.equal(removed.staff.length,seed.staff.length-1);
 assert.throws(()=>applyCommand(removed,{type:'staffRemove',id:staff.id},'admin'),/unavailable/);
});

test('Database staff edit and remove: Executive only, stale-checked, scoped to the conference',async()=>{
 const {db,ids,as,asOwner,grant,query}=await freshDatabase();
 const executive='74000000-0000-4000-8000-000000000001',chair='74000000-0000-4000-8000-000000000002';
 try {
  await grant(executive,'admin');await grant(chair,'chair',ids.ga1);await asOwner();
  const [staff]=await query<{id:string}>(`select s.id from public.staff s join public.committee_staff a on a.staff_id=s.id join public.conference_staff r on r.staff_id=s.id where a.committee_id=$1 and r.role='chair' limit 1`,[ids.ga1]);
  const before=(await query<{n:number}>('select count(*)::int n from public.staff where conference_id=$1',[ids.conference]))[0].n;
  const send=(command:object,expected:string,role='admin')=>db.query('select public.apply_conference_mutation($1,$2,$3,$4,$5,$6)',[ids.conference,crypto.randomUUID(),JSON.stringify(command),role,expected,'2026-10-10T00:00:00Z']);
  const snapshot=async()=>(await query<{s:ConferenceData}>('select public.conference_snapshot($1) s',[ids.conference]))[0].s;
  const update={type:'staffUpdate',id:staff.id,name:'Reassigned Chair',role:'chair',committeeIds:[ids.sc,ids.sc]};
  await as(chair);await assert.rejects(()=>send(update,'1','chair'),/no access|Administrator/);
  await as(executive);
  await assert.rejects(()=>send({...update,name:' '},'1'),/Name required/);
  await assert.rejects(()=>send({...update,committeeIds:[crypto.randomUUID()]},'1'),/foreign key|violates/);
  await send(update,'1');
  let s=await snapshot(),row=s.staff.find(x=>x.id===staff.id)!;
  assert.equal(row.name,'Reassigned Chair');assert.deepEqual(row.committeeIds,[ids.sc]);assert.equal(row.role,'chair');
  assert.equal(fingerprint(s,update as never),'2');
  await assert.rejects(()=>send({...update,name:'Stale'},'1'),/Another chair/);
  await send({...update,role:'approval',committeeIds:[]},'2');
  s=await snapshot();row=s.staff.find(x=>x.id===staff.id)!;
  assert.equal(row.role,'approval');assert.deepEqual(row.committeeIds,[]);
  await as(chair);await assert.rejects(()=>send({type:'staffRemove',id:staff.id},'3','chair'),/no access|Administrator/);
  await as(executive);
  await assert.rejects(()=>send({type:'staffRemove',id:staff.id},'2'),/Another chair/);
  await send({type:'staffRemove',id:staff.id},'3');
  await assert.rejects(()=>send({type:'staffRemove',id:staff.id},'3'),/unavailable/);
  await asOwner();
  assert.equal((await query<{n:number}>('select count(*)::int n from public.staff where conference_id=$1',[ids.conference]))[0].n,before-1);
  assert.equal((await query<{n:number}>('select (select count(*) from public.committee_staff where staff_id=$1)+(select count(*) from public.conference_staff where staff_id=$1) n',[staff.id]))[0].n,0);
  assert.equal((await query<{n:number}>(`select count(*)::int n from public.audit_log where action in ('staffUpdate updated','staffRemove updated')`))[0].n,3);
 }finally{await db.close();}
});
