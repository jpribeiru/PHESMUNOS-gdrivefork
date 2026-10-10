import test from 'node:test';
import assert from 'node:assert/strict';
import {freshDatabase} from './helpers/database';
import {applyCommand} from '../lib/commands';
import {createSeed} from '../lib/seed';
import {PRINT_SPARES,printCopies} from '../lib/print';

test('local: approval sets copies to committee delegates plus 3 spares',()=>{
 let d=createSeed();
 const r=d.documents.find(x=>x.status==='Submitted')!;
 const expected=d.delegates.filter(x=>x.committeeId===r.committeeId).length+PRINT_SPARES;
 assert.equal(printCopies(d,r.committeeId),expected);
 assert.equal(printCopies({delegates:[]},'empty'),PRINT_SPARES,'an empty committee still gets the spares');
 d=applyCommand(d,{type:'document',id:r.id,status:'Approved'},'approval');
 assert.equal(d.documents.find(x=>x.id===r.id)?.copies,expected);
});

test('database: approval counts delegates server-side; Admins see the number without reading delegates',async()=>{
 const {db,ids,as,asOwner,grant,query}=await freshDatabase();
 const approval='77000000-0000-4000-8000-000000000001',logistics='77000000-0000-4000-8000-000000000002';
 try{
  await grant(approval,'approval');await grant(logistics,'logistics');await asOwner();
  const [doc]=await query<{id:string;committee_id:string;copies:number}>(`select id,committee_id,copies from public.documents where conference_id=$1 and status='Submitted' limit 1`,[ids.conference]);
  const count=async()=>(await query<{n:number}>('select count(*)::int n from public.delegates where committee_id=$1',[doc.committee_id]))[0].n;
  const delegates=await count();
  assert.equal(doc.copies,18,'not yet approved: seed value untouched');
  await as(approval);
  const rev=String((await query<{revision:string}>('select revision from public.documents where id=$1',[doc.id]))[0].revision);
  await db.query('select public.apply_conference_mutation($1,$2,$3,$4,$5,now())',[ids.conference,crypto.randomUUID(),JSON.stringify({type:'document',id:doc.id,status:'Approved'}),'approval',rev]);
  await as(logistics);
  assert.equal((await query('select id from public.delegates')).length,0,'Admins cannot read delegates');
  const [snap]=await query<{s:{documents:{id:string;copies:number}[]}}>('select public.conference_snapshot($1) s',[ids.conference]);
  assert.equal(snap.s.documents.find(x=>x.id===doc.id)?.copies,delegates+PRINT_SPARES);
  // Already-approved rows are recounted too (the seed inserts one Approved resolution after the migration).
  await asOwner();
  for(const r of await query<{committee_id:string;copies:number}>(`select committee_id,copies from public.documents where conference_id=$1 and status='Approved'`,[ids.conference]))
   assert.equal(r.copies,(await query<{n:number}>('select count(*)::int n from public.delegates where committee_id=$1',[r.committee_id]))[0].n+PRINT_SPARES);
  // Other transitions leave the count alone.
  await db.query(`update public.documents set status='Printed' where id=$1`,[doc.id]);
  assert.equal((await query<{copies:number}>('select copies from public.documents where id=$1',[doc.id]))[0].copies,delegates+PRINT_SPARES);
 }finally{await db.close();}
});
