-- PHESMUN OS migrations 20261010180000_edit_remove_staff and 20261010190000_debated_amendment_points
-- for Supabase project gglltljhdpkfjnyjmnif (PHESMUN - Production) ONLY.
-- Run once in the SQL editor BEFORE merging the PR. Safe with the current app: it never sends the new staff commands,
-- and the Debated Amendment credit only adds a participation event when a Chair opens an amendment debate. One transaction.
-- Refuses any non-PHESMUN database and refuses unless exactly the 19 earlier migrations are recorded.
begin;
do $guard$ begin
 if to_regnamespace('supabase_migrations') is null or coalesce(obj_description('supabase_migrations'::regnamespace,'pg_namespace'),'') <> 'conference-os-target=phesmun ref=gglltljhdpkfjnyjmnif' then
  raise exception 'Target guard: this is not the PHESMUN database (gglltljhdpkfjnyjmnif). Nothing was applied.'; end if;
 if coalesce((select array_agg(version order by version) from supabase_migrations.schema_migrations),'{}'::text[]) <> array['20261005103403','20261005103922','20261005151954','20261005152815','20261006023101','20261006023104','20261006023106','20261006023108','20261006023111','20261006023253','20261006073442','20261006135232','20261006202710','20261006211039','20261007104500','20261007104501','20261008135032','20261009120000','20261010150000']::text[] then
  raise exception 'Order guard: expected exactly the 19 earlier migrations and not these. Nothing was applied.'; end if;
end $guard$;
-- ===== 20261010180000_edit_remove_staff.sql (sha256 30b9cf1f680880cab9e7fdc9d71573e97914d032578aa2e23eed0e379346a741) =====
-- Edit and remove staff directory entries (PHESMUN). Executive only.
-- * staffUpdate: rename, change role, and reassign committees in one transaction. Bumps "contactRevision", which is the
--   staff row's stale-write check, so two Executives editing the same person cannot silently overwrite each other.
-- * staffRemove: deletes the directory entry with its role and committee assignments. Nothing else references staff;
--   the audit log keeps the removal. Directory entries are contacts, not logins: committee access codes are unaffected.
-- The mutation function is PATCHED in place with exact anchors (as in 20261009120000), so all earlier patches survive.
create or replace function pg_temp.patch_once(definition text,anchor text,replacement text,label text) returns text language plpgsql as $$
begin
 if (length(definition)-length(replace(definition,anchor,'')))<>length(anchor) then raise exception '% changed; review before applying',label; end if;
 return replace(definition,anchor,replacement);
end $$;

do $patch$
declare definition text;
begin
 definition:=pg_get_functiondef('private.apply_mutation(uuid,uuid,jsonb,public.conference_role,text,timestamptz)'::regprocedure);
 definition:=pg_temp.patch_once(definition,
  $q$ elsif kind='staffContact' then$q$,
  $q$ elsif kind in ('staffContact','staffUpdate','staffRemove') then$q$,'staff edit: stale check');
 definition:=pg_temp.patch_once(definition,
  $q$ when 'staff' then$q$,
  $q$ when 'staffUpdate' then
   topic:='configuration';
   if nullif(btrim(command->>'name'),'') is null then raise exception 'Name required' using errcode='22023'; end if;
   if jsonb_typeof(coalesce(command->'committeeIds','[]'::jsonb))<>'array' then raise exception 'Invalid committees' using errcode='22023'; end if;
   update public.staff set name=btrim(command->>'name'),"contactRevision"="contactRevision"+1,updated_at=now() where id=(command->>'id')::uuid and conference_id=conf;
   delete from public.conference_staff where staff_id=(command->>'id')::uuid and conference_id=conf;
   insert into public.conference_staff(conference_id,staff_id,role) values(conf,(command->>'id')::uuid,(command->>'role')::public.conference_role);
   delete from public.committee_staff where staff_id=(command->>'id')::uuid and conference_id=conf;
   insert into public.committee_staff(conference_id,committee_id,staff_id)
     select distinct conf,(x#>>'{}')::uuid,(command->>'id')::uuid from jsonb_array_elements(coalesce(command->'committeeIds','[]'::jsonb)) x;
 when 'staffRemove' then
   topic:='configuration';
   delete from public.committee_staff where staff_id=(command->>'id')::uuid and conference_id=conf;
   delete from public.conference_staff where staff_id=(command->>'id')::uuid and conference_id=conf;
   delete from public.staff where id=(command->>'id')::uuid and conference_id=conf;
 when 'staff' then$q$,'staff edit: commands');
 execute definition;
end $patch$;
insert into supabase_migrations.schema_migrations(version,name,statements) values('20261010180000','edit_remove_staff',array[$ledger$-- applied from supabase/migrations/20261010180000_edit_remove_staff.sql (sha256 30b9cf1f680880cab9e7fdc9d71573e97914d032578aa2e23eed0e379346a741)$ledger$]);
-- ===== 20261010190000_debated_amendment_points.sql (sha256 6ae4ee8aaafa91528a17cd2b1abaf221e957fbba68ddd6aadfc472194d311899) =====
-- Debated Amendment points (PHESMUN). When a Chair opens an amendment for debate (Accepted for Debate → In Debate),
-- the amendment's submitter is credited automatically, once per amendment. Speeches and POIs during the amendment
-- debate keep their normal Speech/POI points; this credit is separate.
-- * New required scoring category 'amendment' ("Debated Amendment"), built-in default +2. The Executive may set it per
--   conference or per committee, as exactly one value because the credit is automatic.
-- * participation_events gains a nullable "amendmentId" (scoped FK) and a partial unique index: at most one credit per
--   amendment, enforced by the database. Existing rows stay valid.
-- * Chairs cannot record this category by hand; they may still correct or undo the credit in Participation.
-- Additive only. RLS, grants, receipts/idempotency and PT409 stale-write semantics are unchanged. Mutation and
-- snapshot functions are PATCHED in place with exact anchors (as in 20261009120000), so earlier patches survive.

alter table public.participation_events add column "amendmentId" uuid,
 add constraint participation_events_amendment_scope foreign key ("amendmentId",conference_id,committee_id) references public.amendments(id,conference_id,committee_id);
create unique index participation_amendment_credit_once on public.participation_events("amendmentId") where "categoryId"='amendment';

create or replace function private.required_scoring_label(category text) returns text language sql immutable set search_path='' as $$
 select case category when 'speech' then 'Speech' when 'poi' then 'POI' when 'amendment' then 'Debated Amendment' end $$;
create or replace function private.scoring_values(conf uuid,cid uuid,category text) returns integer[] language sql stable set search_path='' as $$
 select case when category='submitter' then array[5] else coalesce(
  (select s.values from public.scoring_definitions s where s.conference_id=conf and s.code=category and (s.committee_id=cid or s.committee_id is null) order by s.committee_id nulls last limit 1),
  case category when 'speech' then array[1,2,3] when 'poi' then array[1,2] when 'amendment' then array[2] end) end $$;
create or replace function private.scoring_problem(category text,vals integer[]) returns text language sql immutable set search_path='' as $$
 select case
  when category='submitter' then 'Main Submitter credit is fixed at +5 and cannot be changed.'
  when category='amendment' and (vals is null or cardinality(vals)<>1) then 'Debated Amendment credit is automatic: set exactly one value.'
  when vals is null or cardinality(vals) not between 1 and 10 or exists(select 1 from unnest(vals) v where v is null or v<0 or v>20) then 'Use 1–10 whole-number points from 0 to 20.'
  when cardinality(vals)<>(select count(distinct v) from unnest(vals) v) then 'Each point value may appear only once.'
 end $$;
revoke all on function private.required_scoring_label(text) from public,anon,authenticated;
revoke all on function private.scoring_values(uuid,uuid,text) from public,anon,authenticated;
revoke all on function private.scoring_problem(text,integer[]) from public,anon,authenticated;

create or replace function pg_temp.patch_once(definition text,anchor text,replacement text,label text) returns text language plpgsql as $$
begin
 if (length(definition)-length(replace(definition,anchor,'')))<>length(anchor) then raise exception '% changed; review before applying',label; end if;
 return replace(definition,anchor,replacement);
end $$;

do $patch$
declare definition text;
begin
 -- 1) Chairs cannot record the automatic credit by hand.
 definition:=pg_get_functiondef('private.apply_mutation(uuid,uuid,jsonb,public.conference_role,text,timestamptz)'::regprocedure);
 definition:=pg_temp.patch_once(definition,
  $q$   vals:=private.scoring_values(conf,cid,category);$q$,
  $q$   if category='amendment' then raise exception 'Debated Amendment credit is recorded automatically when the amendment debate opens' using errcode='22023'; end if;
   vals:=private.scoring_values(conf,cid,category);$q$,'amendment points: manual participation');
 execute definition;

 -- 2) Opening an amendment debate credits its submitter once.
 definition:=pg_get_functiondef('private.apply_staff_batch(uuid,uuid,jsonb,public.conference_role,text,timestamptz)'::regprocedure);
 definition:=pg_temp.patch_once(definition,
  $q$  update public.amendments set status=target,outcome=outcome_value,revision=revision+1 where id=amend.id;$q$,
  $q$  update public.amendments set status=target,outcome=outcome_value,revision=revision+1 where id=amend.id;
  if target='In Debate' and not exists(select 1 from public.participation_events where "amendmentId"=amend.id and "categoryId"='amendment') then
   insert into public.participation_events(id,conference_id,committee_id,"delegateId","sessionId","resolutionId","categoryId",points,"chairId","createdAt","amendmentId")
   values(new_id,conf,cid,amend."submitterId",coalesce(committee."currentSessionId",amend."sessionId"),amend."resolutionId",'amendment',(private.scoring_values(conf,cid,'amendment'))[1],actor,client_time,amend.id);
  end if;$q$,'amendment points: credit on debate');
 execute definition;

 -- 3) The snapshot exposes the credit's amendment.
 definition:=pg_get_functiondef('public.conference_snapshot(uuid)'::regprocedure);
 definition:=pg_temp.patch_once(definition,
  $q$'yieldedFrom',(select e."yieldedFrom" from public.participation_events e where e.id=x.id),$q$,
  $q$'yieldedFrom',(select e."yieldedFrom" from public.participation_events e where e.id=x.id),'amendmentId',(select e."amendmentId" from public.participation_events e where e.id=x.id),$q$,'amendment points: snapshot');
 execute definition;
end $patch$;
insert into supabase_migrations.schema_migrations(version,name,statements) values('20261010190000','debated_amendment_points',array[$ledger$-- applied from supabase/migrations/20261010190000_debated_amendment_points.sql (sha256 6ae4ee8aaafa91528a17cd2b1abaf221e957fbba68ddd6aadfc472194d311899)$ledger$]);
commit;
select count(*) as migrations_in_ledger, 21 as expected,
 (select max(version) from supabase_migrations.schema_migrations) as latest,
 (select count(*) from information_schema.columns where table_schema='public' and table_name='participation_events' and column_name='amendmentId') as amendment_column,
 (select private.scoring_values(null,null,'amendment')) as amendment_default
from supabase_migrations.schema_migrations;
