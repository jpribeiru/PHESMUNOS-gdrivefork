-- PHESMUN OS migration 20261010200000_print_copies_from_delegates for Supabase project gglltljhdpkfjnyjmnif (PHESMUN - Production) ONLY.
-- Run once in the SQL editor BEFORE merging the PR. Safe with the current app: it only changes the copy count stored
-- when a resolution is approved. One transaction.
-- Refuses any non-PHESMUN database and refuses unless exactly the 21 earlier migrations are recorded.
begin;
do $guard$ begin
 if to_regnamespace('supabase_migrations') is null or coalesce(obj_description('supabase_migrations'::regnamespace,'pg_namespace'),'') <> 'conference-os-target=phesmun ref=gglltljhdpkfjnyjmnif' then
  raise exception 'Target guard: this is not the PHESMUN database (gglltljhdpkfjnyjmnif). Nothing was applied.'; end if;
 if coalesce((select array_agg(version order by version) from supabase_migrations.schema_migrations),'{}'::text[]) <> array['20261005103403','20261005103922','20261005151954','20261005152815','20261006023101','20261006023104','20261006023106','20261006023108','20261006023111','20261006023253','20261006073442','20261006135232','20261006202710','20261006211039','20261007104500','20261007104501','20261008135032','20261009120000','20261010150000','20261010180000','20261010190000']::text[] then
  raise exception 'Order guard: expected exactly the 21 earlier migrations and not this one. Nothing was applied.'; end if;
end $guard$;
-- ===== 20261010200000_print_copies_from_delegates.sql (sha256 56c0802ba2482ea17763f2e97ee092f96ec6ad613d91beec06bf93b51141a032) =====
-- Print copies follow committee size (PHESMUN). When a resolution is approved (it enters the Admins' print queue),
-- its copy count is set to the number of delegates in its committee plus 3 spares (Chairs and the Approval Panel).
-- Previously every resolution kept the column default of 24 regardless of committee size.
-- A BEFORE trigger sets it on every transition into Approved, so a revised and re-approved resolution is recounted.
-- Admins (logistics) cannot read delegates under RLS, so the count is taken server-side here and they see only the
-- resulting number. Mirrored in lib/print.ts. No RLS, grants or mutation functions change.
create function private.print_copies(conf uuid,cid uuid) returns integer language sql stable security definer set search_path='' as $$
 select least(10000,(select count(*) from public.delegates where conference_id=conf and committee_id=cid)::integer+3) $$;
revoke all on function private.print_copies(uuid,uuid) from public,anon,authenticated;

create function private.set_print_copies() returns trigger language plpgsql security definer set search_path='' as $$
begin
 new.copies:=private.print_copies(new.conference_id,new.committee_id);
 return new;
end $$;
revoke all on function private.set_print_copies() from public,anon,authenticated;

create trigger documents_print_copies before insert or update of status on public.documents
 for each row when (new.status='Approved') execute function private.set_print_copies();

-- Resolutions already waiting in the print queue get the same count.
update public.documents set copies=private.print_copies(conference_id,committee_id) where status='Approved';
insert into supabase_migrations.schema_migrations(version,name,statements) values('20261010200000','print_copies_from_delegates',array[$ledger$-- applied from supabase/migrations/20261010200000_print_copies_from_delegates.sql (sha256 56c0802ba2482ea17763f2e97ee092f96ec6ad613d91beec06bf93b51141a032)$ledger$]);
commit;
select count(*) as migrations_in_ledger, 22 as expected,
 (select max(version) from supabase_migrations.schema_migrations) as latest,
 (select count(*) from pg_trigger where tgname='documents_print_copies') as print_trigger
from supabase_migrations.schema_migrations;
