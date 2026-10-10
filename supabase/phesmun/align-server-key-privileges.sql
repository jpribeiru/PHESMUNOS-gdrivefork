-- PHESMUN OS: give the server (secret) key the same least privilege it has on DCMUN Development.
-- New Supabase projects grant service_role full DML on public tables and EXECUTE on every function by
-- default; the Conference OS design (verified on DCMUN) lets the server key run only the four public QR
-- form RPCs. This script only REVOKES. It changes no table, policy, RLS setting or anon/authenticated grant.
-- Target: Supabase project gglltljhdpkfjnyjmnif (PHESMUN - Production) ONLY. One transaction.
begin;
do $guard$ begin
 if to_regnamespace('supabase_migrations') is null or coalesce(obj_description('supabase_migrations'::regnamespace,'pg_namespace'),'') <> 'conference-os-target=phesmun ref=gglltljhdpkfjnyjmnif' then
  raise exception 'Target guard: this is not the PHESMUN database (gglltljhdpkfjnyjmnif). Nothing was changed.'; end if;
 if (select count(*) from supabase_migrations.schema_migrations) <> 18 then raise exception 'Expected all 18 migrations first. Nothing was changed.'; end if;
end $guard$;
-- Existing objects: table DML and function EXECUTE for service_role, except the four public form RPCs.
revoke select, insert, update, delete on all tables in schema public from service_role;
do $revoke$ declare f regprocedure; begin
 for f in select p.oid::regprocedure from pg_proc p join pg_namespace n on n.oid=p.pronamespace
   where n.nspname in ('public','private') and p.oid::regprocedure::text not in (
     'submission_link_info(text)','amendment_link_info(text)',
     'submit_resolution(text,uuid,uuid,text,text,text,text,text,integer)',
     'submit_amendment(text,uuid,uuid,uuid,text,text,text)')
 loop execute format('revoke execute on function %s from service_role', f); end loop;
end $revoke$;
-- Future objects created by postgres in public: same defaults as DCMUN (no API-role DML/EXECUTE/sequence use).
alter default privileges for role postgres in schema public revoke select, insert, update, delete on tables from anon, authenticated, service_role;
alter default privileges for role postgres in schema public revoke execute on functions from anon, authenticated, service_role;
alter default privileges for role postgres in schema public revoke usage, select, update on sequences from anon, authenticated, service_role;
commit;
select r.rolname, p.oid::regprocedure::text as executable from pg_proc p join pg_namespace n on n.oid=p.pronamespace cross join pg_roles r
 where n.nspname in ('public','private') and r.rolname='service_role' and has_function_privilege(r.oid,p.oid,'execute') order by 2;
