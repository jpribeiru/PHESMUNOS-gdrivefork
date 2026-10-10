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
