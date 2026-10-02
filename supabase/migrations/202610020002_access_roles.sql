-- Separate administrator accounts from client viewer accounts.
alter table public.kopi_app_access
  add column if not exists is_admin boolean not null default false;

-- Administrators use the admin console only; enabled non-admin accounts use the viewer.
create or replace function private.kopi_has_active_access()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.kopi_app_access access
    where access.user_id = (select auth.uid())
      and access.enabled = true
      and access.is_admin = false
  );
$$;
revoke all on function private.kopi_has_active_access() from public, anon, authenticated;
grant usage on schema private to authenticated;
grant execute on function private.kopi_has_active_access() to authenticated;
