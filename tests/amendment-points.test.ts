import test from 'node:test';
import assert from 'node:assert/strict';
import {freshDatabase} from './helpers/database';
import {applyCommand,participationSummary,type Command} from '../lib/commands';
import {createSeed} from '../lib/seed';
import {fingerprint} from '../lib/sync/repository';
import {conferenceScoring,scoringProblem,scoringValues} from '../lib/scoring';
import {eventAmendmentId} from '../lib/procedure/view';
import type {ConferenceData,Role} from '../lib/domain';

const meta=()=>({id:crypto.randomUUID(),createdAt:'2026-10-10T09:00:00.000Z',actorId:'chair-1'});
const runner=(start:ConferenceData)=>{let d=start;const run=(c:Command,role:Role='chair')=>{d=applyCommand(d,c,role,meta());return d;};return {run,get d(){return d;}};};
const withAmendments=()=>{const d=createSeed();d.amendments=[0,1].map(i=>({id:`am${i}`,committeeId:'ga1',resolutionId:'r1',sessionId:'s1',submitterId:'d3',type:'Add' as const,clause:`Clause ${i+2}`,wording:`Adds a duty ${i}`,status:'Accepted for Debate' as const,outcome:null,createdAt:'2026-10-10T06:00:00.000Z',revision:1}));d.committees.find(c=>c.id==='ga1')!.currentSessionId='s1';return runner(d);};
const credits=(d:ConferenceData)=>d.events.filter(e=>e.categoryId==='amendment');

test('Debated Amendment: default +2, exactly one configurable value, not recordable by hand',()=>{
 const t=withAmendments();
 assert.deepEqual(conferenceScoring({scoring:[]}).find(s=>s.id==='amendment'),{id:'amendment',label:'Debated Amendment',values:[2]});
 assert.match(scoringProblem('amendment',[1,2])!,/exactly one value/);
 assert.equal(scoringProblem('amendment',[3]),null);
 assert.throws(()=>t.run({type:'scoring',id:'amendment',values:[1,3]},'admin'),/exactly one value/);
 assert.throws(()=>t.run({type:'participation',delegateId:'d3',sessionId:'s1',resolutionId:'r1',categoryId:'amendment',points:2}),/automatically/);
});

test('opening an amendment debate credits its submitter once with the configured value',()=>{
 const t=withAmendments();
 const before=participationSummary(t.d,'d3');
 t.run({type:'amendmentStatus',id:'am0',status:'In Debate'});
 assert.equal(credits(t.d).length,1);
 const e=credits(t.d)[0];
 assert.deepEqual([e.delegateId,e.points,e.sessionId,e.resolutionId,e.amendmentId],['d3',2,'s1','r1','am0']);
 assert.equal(eventAmendmentId(t.d,e),'am0');
 const after=participationSummary(t.d,'d3');
 assert.equal(after.points,before.points+2);
 assert.equal(after.opportunities,before.opportunities,'an automatic credit is not a floor opportunity');
 t.run({type:'amendmentStatus',id:'am0',status:'Closed',outcome:'Failed'});
 assert.equal(credits(t.d).length,1,'closing adds nothing; credit stays whatever the outcome');
 // A committee override changes the credit for later amendments only.
 t.run({type:'scoring',id:'amendment',values:[4],committeeId:'ga1'},'admin');
 assert.deepEqual(scoringValues(t.d,'ga1','amendment'),[4]);
 t.run({type:'amendmentStatus',id:'am1',status:'In Debate'});
 assert.deepEqual(credits(t.d).map(e=>[e.amendmentId,e.points]),[['am0',2],['am1',4]]);
 // Ruled out or withdrawn before debate: no credit.
 const u=withAmendments();u.run({type:'amendmentStatus',id:'am0',status:'Closed',outcome:'Ruled Out'});
 assert.equal(credits(u.d).length,0);
});

test('real PostgreSQL: debate opening credits once; manual recording refused; snapshot carries the amendment',async()=>{
 const {db,ids,as,asOwner,grant,query}=await freshDatabase();
 const actor='75000000-0000-4000-8000-000000000001',brazil='490357f5-75f4-4085-a2e4-13ed2c63f34b';
 try{
  await grant(actor,'chair',ids.ga1);await grant(actor,'admin');await as(actor);
  const snap=async()=>(await query<{s:ConferenceData}>('select public.conference_snapshot($1) s',[ids.conference]))[0].s;
  // conference_snapshot carries no amendments; their stale-check revision is read directly, as in procedure-usability-db.
  const expected=async(c:Command)=>c.type==='amendmentStatus'?String((await query<{revision:string}>('select revision from public.amendments where id=$1',[c.id]))[0].revision):fingerprint(await snap(),c);
  const send=async(c:Command,role='chair')=>{await db.query('select public.apply_conference_mutation($1,$2,$3,$4,$5,$6)',[ids.conference,crypto.randomUUID(),JSON.stringify(c),role,await expected(c),'2026-10-10T09:00:00Z']);};
  await send({type:'currentSession',committeeId:ids.ga1,sessionId:ids.session});
  await assert.rejects(()=>send({type:'scoring',id:'amendment',values:[1,2]},'admin'),/exactly one value/);
  await send({type:'scoring',id:'amendment',values:[3]},'admin');
  await assert.rejects(()=>send({type:'participation',delegateId:brazil,sessionId:ids.session,resolutionId:ids.resolution,categoryId:'amendment',points:3}),/automatically/);
  await asOwner();
  const [a1,a2]=['76000000-0000-4000-8000-000000000001','76000000-0000-4000-8000-000000000002'];
  for(const id of [a1,a2])await query(`insert into public.amendments(id,conference_id,committee_id,"resolutionId","sessionId","submitterId",type,clause,wording,status) values($1,$2,$3,$4,$5,$6,'Add','Clause 3','Adds a review clause.','Accepted for Debate')`,[id,ids.conference,ids.ga1,ids.resolution,ids.session,brazil]);
  await as(actor);
  await send({type:'amendmentStatus',id:a1,status:'In Debate'});
  let s=await snap();const c=s.events.filter(e=>e.categoryId==='amendment');
  assert.deepEqual(c.map(e=>[e.delegateId,e.points,e.sessionId,e.resolutionId,e.amendmentId]),[[brazil,3,ids.session,ids.resolution,a1]]);
  await send({type:'amendmentStatus',id:a1,status:'Closed',outcome:'Passed'});
  await send({type:'amendmentStatus',id:a2,status:'Closed',outcome:'Withdrawn'});
  s=await snap();assert.equal(s.events.filter(e=>e.categoryId==='amendment').length,1,'one credit; none for a withdrawn amendment');
  // The Chair can still undo the credit through the normal correction path.
  await send({type:'event',id:c[0].id,undo:true});
  assert.ok((await snap()).events.find(e=>e.id===c[0].id)?.voidedAt);
  // The database itself refuses a second credit for the same amendment.
  await asOwner();
  await assert.rejects(()=>query(`insert into public.participation_events(conference_id,committee_id,"delegateId","sessionId","resolutionId","categoryId",points,"amendmentId") values($1,$2,$3,$4,$5,'amendment',3,$6)`,[ids.conference,ids.ga1,brazil,ids.session,ids.resolution,a1]),/participation_amendment_credit_once/);
 }finally{await db.close();}
});
