-- PHESMUN OS migration 20261010150000_optional_delegate_email for Supabase project gglltljhdpkfjnyjmnif (PHESMUN - Production) ONLY.
-- Run once in the SQL editor BEFORE merging the PR (safe with the current app, which never sends blank emails). One transaction.
-- Refuses any non-PHESMUN database and refuses unless exactly the 18 earlier migrations are recorded.
begin;
do $guard$ begin
 if to_regnamespace('supabase_migrations') is null or coalesce(obj_description('supabase_migrations'::regnamespace,'pg_namespace'),'') <> 'conference-os-target=phesmun ref=gglltljhdpkfjnyjmnif' then
  raise exception 'Target guard: this is not the PHESMUN database (gglltljhdpkfjnyjmnif). Nothing was applied.'; end if;
 if coalesce((select array_agg(version order by version) from supabase_migrations.schema_migrations),'{}'::text[]) <> array['20261005103403','20261005103922','20261005151954','20261005152815','20261006023101','20261006023104','20261006023106','20261006023108','20261006023111','20261006023253','20261006073442','20261006135232','20261006202710','20261006211039','20261007104500','20261007104501','20261008135032','20261009120000']::text[] then
  raise exception 'Order guard: expected exactly the 18 earlier migrations and not this one. Nothing was applied.'; end if;
end $guard$;

-- ===== 20261010150000_optional_delegate_email.sql (sha256 1f1151d02d41f5e7642da9192abf2f7a7a870a726148e53abd4f7919f3b3e9ef) =====
-- Optional delegate email (PHESMUN). Name and country stay required.
-- * public.delegates.email becomes nullable. The existing UNIQUE (conference_id, email) is kept: PostgreSQL treats
--   NULLs as distinct, so any number of delegates may have no email, while non-empty emails stay unique.
-- * Import: a blank email cell is stored as NULL; a non-empty email must still match the existing format check.
-- * Delegate edit: clearing the email stores NULL instead of an empty string.
-- The mutation function is PATCHED in place with exact anchors (as in 20261009120000), so all earlier patches survive.
alter table public.delegates alter column email drop not null;

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
  $q$   update public.delegates set name=command->>'name',email=lower(command->>'email'),country=command->>'country',$q$,
  $q$   update public.delegates set name=command->>'name',email=lower(nullif(btrim(command->>'email'),'')),country=command->>'country',$q$,'optional email: delegate edit');
 definition:=pg_temp.patch_once(definition,
  $q$ or row_data->>'email' !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' or (row_data ? 'flag'$q$,
  $q$ or (nullif(btrim(row_data->>'email'),'') is not null and btrim(row_data->>'email') !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$') or (row_data ? 'flag'$q$,'optional email: import check');
 definition:=pg_temp.patch_once(definition,
  $q$row_data->>'name',lower(row_data->>'email'));$q$,
  $q$row_data->>'name',lower(nullif(btrim(row_data->>'email'),'')));$q$,'optional email: import insert');
 execute definition;
end $patch$;
insert into supabase_migrations.schema_migrations(version,name,statements) values('20261010150000','optional_delegate_email',array[$ledger$-- applied from supabase/migrations/20261010150000_optional_delegate_email.sql (sha256 1f1151d02d41f5e7642da9192abf2f7a7a870a726148e53abd4f7919f3b3e9ef)$ledger$]);
commit;
select count(*) as migrations_in_ledger, 19 as expected, (select is_nullable from information_schema.columns where table_schema='public' and table_name='delegates' and column_name='email') as email_nullable from supabase_migrations.schema_migrations;
