-- Account suspension must apply to direct Data API / Storage access too.
-- Existing owner policies remain permissive; these restrictive policies are
-- AND-ed with them, so this check can never grant another owner's data.
begin;

create or replace function private.has_active_profile()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and status = 'active'
  );
$$;

revoke all on function private.has_active_profile() from public, anon, authenticated;
grant execute on function private.has_active_profile() to authenticated;

-- SECURITY DEFINER avoids recursively invoking profile RLS. There is no
-- caller-supplied identity; only the authenticated JWT's subject is inspected.
do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'accounts', 'trades', 'payouts', 'ai_reports', 'trade_imports', 'subscriptions',
    'integration_connections', 'integration_sync_runs', 'integration_waitlist',
    'integration_accounts', 'trade_executions', 'integration_account_snapshots'
  ] loop
    execute format(
      'create policy active_profile_required on public.%I as restrictive for all to authenticated '
      'using ((select private.has_active_profile())) '
      'with check ((select private.has_active_profile()))', table_name
    );
  end loop;
end;
$$;

-- Keep own profile SELECT available to show a truthful suspension/recovery
-- screen. Never allow a suspended session to change its preferences or state.
create policy active_profile_update_required
on public.profiles as restrictive for update to authenticated
using ((select private.has_active_profile()))
with check ((select private.has_active_profile()));

create policy active_profile_screenshots_required
on storage.objects as restrictive for all to authenticated
using (bucket_id <> 'trade-screenshots' or (select private.has_active_profile()))
with check (bucket_id <> 'trade-screenshots' or (select private.has_active_profile()));

comment on function private.has_active_profile() is
  'Status gate for direct user data access. No arbitrary user id; service-role maintenance keeps its existing BYPASSRLS authority.';

commit;
