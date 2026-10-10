import test from 'node:test';
import assert from 'node:assert/strict';
import {assertPhesmunTarget,checkTarget,supabaseRef,PHESMUN_SUPABASE_REF} from '../lib/platform/target-guard';
import {probe} from '../lib/platform/health-probe';
const PHESMUN=`https://${PHESMUN_SUPABASE_REF}.supabase.co`, DCMUN='https://opmydpozhdgkpcnjwpqb.supabase.co';
test('target guard: accepts only the PHESMUN project and always rejects DCMUN Development',()=>{
 assert.equal(supabaseRef(PHESMUN+'/'),PHESMUN_SUPABASE_REF);
 assert.deepEqual(checkTarget(PHESMUN),{ok:true,ref:PHESMUN_SUPABASE_REF});
 assert.match((checkTarget(DCMUN) as {reason:string}).reason,/DCMUN's Development project/);
 assert.match((checkTarget(DCMUN,'opmydpozhdgkpcnjwpqb') as {reason:string}).reason,/DCMUN/,'cannot be overridden into accepting DCMUN');
 for(const bad of [undefined,'','http://gglltljhdpkfjnyjmnif.supabase.co','https://gglltljhdpkfjnyjmnif.supabase.co.evil.example','https://u:p@gglltljhdpkfjnyjmnif.supabase.co','https://aaaaaaaaaaaaaaaaaaaa.supabase.co'])assert.equal(checkTarget(bad).ok,false,String(bad));
 assert.throws(()=>assertPhesmunTarget(DCMUN),/Target guard refused.*Nothing was contacted/);
 assert.equal(assertPhesmunTarget(PHESMUN),PHESMUN_SUPABASE_REF);
});
test('health probe never contacts or reports healthy a forbidden or unexpected project',async()=>{
 let calls=0;const fetcher=(async()=>{calls++;return new Response('null',{status:200});}) as typeof fetch;
 const base={NEXT_PUBLIC_DATA_BACKEND:'supabase',NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:'pk',SUPABASE_SECRET_KEY:'sb_secret_TEST'};
 const dcmun=await probe({...base,NEXT_PUBLIC_SUPABASE_URL:DCMUN},fetcher);
 assert.equal(dcmun.status,'down');assert.equal(dcmun.checks.database.detail,'Wrong Supabase project');
 const mismatch=await probe({...base,NEXT_PUBLIC_SUPABASE_URL:'https://bbbbbbbbbbbbbbbbbbbb.supabase.co',EXPECTED_SUPABASE_REF:PHESMUN_SUPABASE_REF},fetcher);
 assert.equal(mismatch.status,'down');
 assert.equal(calls,0,'the wrong project is never contacted');
 const right=await probe({...base,NEXT_PUBLIC_SUPABASE_URL:PHESMUN,EXPECTED_SUPABASE_REF:PHESMUN_SUPABASE_REF},fetcher);
 assert.equal(right.status,'ok');assert.equal(calls,3);
});
