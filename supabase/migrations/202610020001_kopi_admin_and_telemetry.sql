-- Admin-controlled account access for the KOPI SAIGON viewer.
create table if not exists public.kopi_app_access (
  user_id uuid primary key references auth.users (id) on delete cascade,
  enabled boolean not null default true,
  granted_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.kopi_app_access enable row level security;
revoke all on public.kopi_app_access from public, anon, authenticated;
grant all on public.kopi_app_access to service_role;

create schema if not exists private;
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
  );
$$;
revoke all on function private.kopi_has_active_access() from public, anon, authenticated;
grant usage on schema private to authenticated;
grant execute on function private.kopi_has_active_access() to authenticated;

-- Keep the Atlas editor's anonymous project access while protecting this viewer's project row.
alter table public.map_projects enable row level security;
drop policy if exists map_projects_public_read on public.map_projects;
drop policy if exists kopi_viewer_authenticated_read on public.map_projects;
drop policy if exists kopi_viewer_public_read on public.map_projects;
drop policy if exists kopi_viewer_public_manage_other_projects on public.map_projects;
drop policy if exists kopi_viewer_authenticated_manage_other_projects on public.map_projects;

grant select, insert, update, delete on public.map_projects to anon, authenticated;
grant all on public.map_projects to service_role;

create policy kopi_viewer_public_read
  on public.map_projects for select to anon
  using (id::text <> 'c5e014fa-2c16-4ad5-8f00-5d525ba954d7');

create policy kopi_viewer_public_manage_other_projects
  on public.map_projects for all to anon
  using (id::text <> 'c5e014fa-2c16-4ad5-8f00-5d525ba954d7')
  with check (id::text <> 'c5e014fa-2c16-4ad5-8f00-5d525ba954d7');

create policy kopi_viewer_authenticated_read
  on public.map_projects for select to authenticated
  using (id::text <> 'c5e014fa-2c16-4ad5-8f00-5d525ba954d7' or (select private.kopi_has_active_access()));

create policy kopi_viewer_authenticated_manage_other_projects
  on public.map_projects for all to authenticated
  using (id::text <> 'c5e014fa-2c16-4ad5-8f00-5d525ba954d7')
  with check (id::text <> 'c5e014fa-2c16-4ad5-8f00-5d525ba954d7');

create table if not exists public.kopi_activity_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  session_id uuid not null,
  event_name text not null check (event_name in (
    'session_started', 'session_heartbeat', 'project_loaded', 'project_load_failed',
    'area_selected', 'tier_selected', 'display_mode_changed', 'map_mode_changed', 'price_table_opened', 'signed_out'
  )),
  event_properties jsonb not null default '{}'::jsonb check (jsonb_typeof(event_properties) = 'object'),
  created_at timestamptz not null default now()
);

create index if not exists kopi_activity_events_created_at_idx on public.kopi_activity_events (created_at desc);
create index if not exists kopi_activity_events_user_created_at_idx on public.kopi_activity_events (user_id, created_at desc);
create index if not exists kopi_activity_events_session_idx on public.kopi_activity_events (session_id, created_at);

alter table public.kopi_activity_events enable row level security;
revoke all on public.kopi_activity_events from public, anon, authenticated;
grant insert on public.kopi_activity_events to authenticated;
grant all on public.kopi_activity_events to service_role;
create policy kopi_users_record_own_active_activity
  on public.kopi_activity_events for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and (select private.kopi_has_active_access())
  );

create table if not exists public.kopi_admin_audit_events (
  id bigint generated always as identity primary key,
  admin_user_id uuid references auth.users (id) on delete set null,
  action text not null check (action in ('invite_user', 'enable_user', 'disable_user')),
  target_user_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists kopi_admin_audit_events_created_at_idx on public.kopi_admin_audit_events (created_at desc);
alter table public.kopi_admin_audit_events enable row level security;
revoke all on public.kopi_admin_audit_events from public, anon, authenticated;
grant all on public.kopi_admin_audit_events to service_role;