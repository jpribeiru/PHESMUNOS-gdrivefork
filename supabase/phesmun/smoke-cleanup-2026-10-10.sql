-- PHESMUN OS: remove the TEMPORARY smoke-test data (conference "ZZ SMOKE TEST — temporary, will be deleted").
-- Target: Supabase project gglltljhdpkfjnyjmnif (PHESMUN - Production) ONLY. Run once in the SQL editor.
-- One transaction. Every delete is limited to the smoke conference d0fcf2e1-9526-4eec-9783-f3f503295790 (or its two
-- temporary anonymous identities) and must remove EXACTLY the expected number of rows; otherwise nothing is deleted.
-- The real PHESMUN conference (26aee7e8-ffa6-493f-9924-524eb52b5c4a) is checked before and after and must be unchanged.
begin;
do $cleanup$
declare
  sc constant uuid := 'd0fcf2e1-9526-4eec-9783-f3f503295790';
  real_conf constant uuid := '26aee7e8-ffa6-493f-9924-524eb52b5c4a';
  users constant uuid[] := array['4c6d7cb5-9d1c-4deb-aff9-0af8e7349b0c','61ae7c2b-1fc8-4454-9f82-5a23a2c009ba']::uuid[];
  n bigint; real_before text; real_after text;
  real_snapshot constant text := $q$select concat_ws('|',(select count(*) from public.committees where conference_id=$1),(select count(*) from public.delegates where conference_id=$1),(select count(*) from public.schools where conference_id=$1),(select count(*) from public.sessions where conference_id=$1),(select count(*) from public.user_access where conference_id=$1),(select count(*) from public.audit_log where conference_id=$1),(select count(*) from public.documents where conference_id=$1),(select count(*) from private.access_credentials where conference_id=$1),(select count(*) from private.mutation_receipts where conference_id=$1))$q$;
begin
  if to_regnamespace('supabase_migrations') is null or coalesce(obj_description('supabase_migrations'::regnamespace,'pg_namespace'),'') <> 'conference-os-target=phesmun ref=gglltljhdpkfjnyjmnif' then
    raise exception 'Target guard: this is not the PHESMUN database. Nothing was deleted.'; end if;
  if not exists(select 1 from public.conferences where id=sc and name='ZZ SMOKE TEST — temporary, will be deleted') then
    raise exception 'Smoke conference not found (already cleaned up?). Nothing was deleted.'; end if;
  if exists(select 1 from public.user_access where user_id=any(users) and conference_id<>sc) then
    raise exception 'A temporary identity has access outside the smoke conference. Nothing was deleted.'; end if;
  execute real_snapshot into real_before using real_conf;

  update public.committees set "currentSessionId"=null where conference_id=sc; get diagnostics n=row_count; if n<>1 then raise exception 'committees(current session) %', n; end if;
  delete from private.amendment_submissions where amendment_id in (select id from public.amendments where conference_id=sc); get diagnostics n=row_count; if n<>1 then raise exception 'amendment_submissions %', n; end if;
  delete from private.resolution_submissions where conference_id=sc; get diagnostics n=row_count; if n<>1 then raise exception 'resolution_submissions %', n; end if;
  delete from public.participation_corrections where conference_id=sc; get diagnostics n=row_count; if n<>0 then raise exception 'participation_corrections %', n; end if;
  delete from public.participation_events where conference_id=sc; get diagnostics n=row_count; if n<>2 then raise exception 'participation_events %', n; end if;
  delete from public.poi_queue where conference_id=sc; get diagnostics n=row_count; if n<>0 then raise exception 'poi_queue %', n; end if;
  delete from public.speeches where conference_id=sc; get diagnostics n=row_count; if n<>1 then raise exception 'speeches %', n; end if;
  delete from public.votes where conference_id=sc; get diagnostics n=row_count; if n<>4 then raise exception 'votes %', n; end if;
  delete from public.attendance where conference_id=sc; get diagnostics n=row_count; if n<>4 then raise exception 'attendance %', n; end if;
  delete from public.speaker_queue where conference_id=sc; get diagnostics n=row_count; if n<>3 then raise exception 'speaker_queue %', n; end if;
  delete from public.timers where conference_id=sc; get diagnostics n=row_count; if n<>1 then raise exception 'timers %', n; end if;
  delete from public.debate_states where conference_id=sc; get diagnostics n=row_count; if n<>0 then raise exception 'debate_states %', n; end if;
  delete from public.amendments where conference_id=sc; get diagnostics n=row_count; if n<>1 then raise exception 'amendments %', n; end if;
  delete from public.resolution_links where conference_id=sc; get diagnostics n=row_count; if n<>1 then raise exception 'resolution_links %', n; end if;
  delete from public.document_comments where conference_id=sc; get diagnostics n=row_count; if n<>0 then raise exception 'document_comments %', n; end if;
  delete from public.archive_jobs where conference_id=sc; get diagnostics n=row_count; if n<>0 then raise exception 'archive_jobs %', n; end if;
  delete from public.document_versions where conference_id=sc; get diagnostics n=row_count; if n<>1 then raise exception 'document_versions %', n; end if;
  delete from public.documents where conference_id=sc; get diagnostics n=row_count; if n<>1 then raise exception 'documents %', n; end if;
  delete from public.operational_changes where conference_id=sc; get diagnostics n=row_count; if n<>40 then raise exception 'operational_changes %', n; end if;
  delete from public.audit_log where conference_id=sc; get diagnostics n=row_count; if n<>34 then raise exception 'audit_log %', n; end if;
  delete from private.mutation_receipts where conference_id=sc; get diagnostics n=row_count; if n<>39 then raise exception 'mutation_receipts %', n; end if;
  delete from public.submission_links where conference_id=sc; get diagnostics n=row_count; if n<>1 then raise exception 'submission_links %', n; end if;
  delete from public.amendment_links where conference_id=sc; get diagnostics n=row_count; if n<>1 then raise exception 'amendment_links %', n; end if;
  delete from private.access_grant_sources where user_access_id in (select id from public.user_access where conference_id=sc); get diagnostics n=row_count; if n<>0 then raise exception 'access_grant_sources %', n; end if;
  delete from public.user_access where conference_id=sc; get diagnostics n=row_count; if n<>4 then raise exception 'user_access %', n; end if;
  delete from private.access_redemption_attempts where conference_id=sc; get diagnostics n=row_count; if n<>0 then raise exception 'access_redemption_attempts %', n; end if;
  delete from private.access_credentials where conference_id=sc; get diagnostics n=row_count; if n<>0 then raise exception 'access_credentials %', n; end if;
  delete from public.delegates where conference_id=sc; get diagnostics n=row_count; if n<>4 then raise exception 'delegates %', n; end if;
  delete from public.sessions where conference_id=sc; get diagnostics n=row_count; if n<>1 then raise exception 'sessions %', n; end if;
  delete from public.conference_session_slots where conference_id=sc; get diagnostics n=row_count; if n<>1 then raise exception 'conference_session_slots %', n; end if;
  delete from public.committees where conference_id=sc; get diagnostics n=row_count; if n<>1 then raise exception 'committees %', n; end if;
  delete from public.schools where conference_id=sc; get diagnostics n=row_count; if n<>1 then raise exception 'schools %', n; end if;
  delete from public.conferences where id=sc; get diagnostics n=row_count; if n<>1 then raise exception 'conferences %', n; end if;
  delete from auth.users where id=any(users) and is_anonymous; get diagnostics n=row_count; if n<>2 then raise exception 'auth.users %', n; end if;

  execute real_snapshot into real_after using real_conf;
  if real_before is distinct from real_after then raise exception 'Real conference changed (% -> %). Rolled back.', real_before, real_after; end if;
  raise notice 'Smoke data removed. Real PHESMUN conference unchanged: %', real_after;
end $cleanup$;
commit;
select (select count(*) from public.conferences) as conferences_left,
       (select count(*) from public.conferences where id='d0fcf2e1-9526-4eec-9783-f3f503295790') as smoke_conference_left,
       (select count(*) from auth.users where id in ('4c6d7cb5-9d1c-4deb-aff9-0af8e7349b0c','61ae7c2b-1fc8-4454-9f82-5a23a2c009ba')) as smoke_identities_left;
