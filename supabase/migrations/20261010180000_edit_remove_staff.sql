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
