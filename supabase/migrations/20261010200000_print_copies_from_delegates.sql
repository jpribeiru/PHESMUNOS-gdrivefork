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
