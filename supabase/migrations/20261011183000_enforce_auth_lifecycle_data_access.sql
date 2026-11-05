-- PostgREST and Storage validate JWTs independently of the Auth /user route.
-- A retained JWT must not keep direct access after a confirmed Auth soft
-- deletion or ban while cross-store account cleanup is still pending.
begin;

create or replace function private.has_active_profile()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles as profile
    join auth.users as identity on identity.id = profile.id
    where profile.id = (select auth.uid())
      and profile.status = 'active'
      and identity.deleted_at is null
      and (identity.banned_until is null or identity.banned_until <= now())
  );
$$;

revoke all on function private.has_active_profile() from public, anon, authenticated;
grant execute on function private.has_active_profile() to authenticated;

comment on function private.has_active_profile() is
  'Private data requires an active owned profile and non-deleted, non-banned Auth identity. No arbitrary identity argument; service-role maintenance remains unchanged.';

commit;
