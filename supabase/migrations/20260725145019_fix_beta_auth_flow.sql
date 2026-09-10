alter table public.profiles
  add column if not exists onboarding_completed boolean not null default false;

update public.profiles
set onboarding_completed = onboarded
where onboarding_completed is distinct from onboarded;

create or replace function private.sync_profile_onboarding_flags()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.onboarding_completed := coalesce(new.onboarding_completed, new.onboarded, false);
    new.onboarded := new.onboarding_completed;
  elsif new.onboarding_completed is distinct from old.onboarding_completed then
    new.onboarded := new.onboarding_completed;
  elsif new.onboarded is distinct from old.onboarded then
    new.onboarding_completed := new.onboarded;
  end if;
  return new;
end;
$$;

revoke all on function private.sync_profile_onboarding_flags() from public, anon, authenticated;

drop trigger if exists profiles_sync_onboarding_flags on public.profiles;
create trigger profiles_sync_onboarding_flags
before insert or update on public.profiles
for each row execute function private.sync_profile_onboarding_flags();

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  commercial_phase text;
begin
  select phase into commercial_phase
  from private.commercial_config
  where singleton = true;

  insert into public.profiles (id, email, name, onboarded, onboarding_completed)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
      nullif(trim(new.raw_user_meta_data ->> 'name'), ''),
      split_part(coalesce(new.email, ''), '@', 1),
      'Trader'
    ),
    false,
    false
  );

  insert into public.subscriptions (user_id, joined_during_beta, launch_offer_eligible)
  values (new.id, commercial_phase = 'beta', commercial_phase = 'beta');

  return new;
end;
$$;

revoke all on function private.handle_new_user() from public, anon, authenticated;

comment on column public.profiles.onboarding_completed is
  'Canonical server-side onboarding state. Never authorize access from user_metadata.';

comment on column public.profiles.onboarded is
  'Legacy compatibility alias kept synchronized with onboarding_completed.';
