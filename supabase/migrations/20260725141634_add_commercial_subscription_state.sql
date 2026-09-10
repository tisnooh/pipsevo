create table if not exists private.commercial_config (
  singleton boolean primary key default true check (singleton),
  phase text not null default 'beta' check (phase in ('beta', 'launch_offer', 'paid')),
  beta_end_date timestamptz,
  launch_offer_end_date timestamptz,
  essential_price numeric(10, 2) not null default 9.99 check (essential_price >= 0),
  pro_price numeric(10, 2) not null default 19.99 check (pro_price >= 0),
  beta_launch_price numeric(10, 2) not null default 4.99 check (beta_launch_price >= 0),
  currency text not null default 'EUR' check (char_length(currency) = 3),
  updated_at timestamptz not null default timezone('utc', now())
);

insert into private.commercial_config (singleton)
values (true)
on conflict (singleton) do nothing;

revoke all on private.commercial_config from public, anon, authenticated;

alter table public.subscriptions
  drop constraint if exists subscriptions_plan_check;

alter table public.subscriptions
  add constraint subscriptions_plan_check check (plan in ('free', 'essential', 'pro')),
  add column if not exists joined_during_beta boolean not null default false,
  add column if not exists launch_offer_eligible boolean not null default false,
  add column if not exists launch_offer_used boolean not null default false,
  add column if not exists subscription_started_at timestamptz,
  add column if not exists launch_offer_expires_at timestamptz,
  add column if not exists cancel_at_period_end boolean not null default false;

update public.subscriptions
set joined_during_beta = true,
    launch_offer_eligible = true
where created_at <= timezone('utc', now())
  and launch_offer_used = false;

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

  insert into public.profiles (id, email, name)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'name'), ''), split_part(coalesce(new.email, ''), '@', 1), 'Trader')
  );

  insert into public.subscriptions (user_id, joined_during_beta, launch_offer_eligible)
  values (new.id, commercial_phase = 'beta', commercial_phase = 'beta');

  return new;
end;
$$;

revoke all on function private.handle_new_user() from public, anon, authenticated;

comment on table private.commercial_config is
  'Server-side mirror of the commercial phase. Update it with the frontend billing config when changing phases; never expose write access to clients.';

comment on column public.subscriptions.launch_offer_used is
  'Must only be updated by a trusted billing webhook after successful checkout.';
