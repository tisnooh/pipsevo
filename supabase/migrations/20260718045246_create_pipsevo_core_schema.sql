create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create or replace function private.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

revoke all on function private.set_updated_at() from public, anon, authenticated;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  name text not null check (char_length(name) between 1 and 80),
  trader_type text check (trader_type is null or trader_type in ('futures', 'cfd', 'both')),
  prop_firms text[] not null default '{}',
  num_accounts integer not null default 0 check (num_accounts >= 0),
  onboarded boolean not null default false,
  rules jsonb not null default '{}'::jsonb,
  journal_preferences jsonb not null default '{}'::jsonb,
  app_preferences jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  plan text not null default 'free' check (plan in ('free', 'pro')),
  status text not null default 'inactive' check (status in ('inactive', 'trialing', 'active', 'past_due', 'canceled')),
  provider_customer_id text unique,
  provider_subscription_id text unique,
  current_period_end timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 100),
  firm text not null check (char_length(firm) between 1 and 100),
  market_type text check (market_type is null or market_type in ('futures', 'cfd')),
  balance numeric(18, 2) not null default 0,
  initial_balance numeric(18, 2) not null default 0 check (initial_balance >= 0),
  profit_target numeric(18, 2) not null default 0 check (profit_target >= 0),
  max_drawdown numeric(18, 2) not null default 0 check (max_drawdown >= 0),
  daily_loss_limit numeric(18, 2) not null default 0 check (daily_loss_limit >= 0),
  current_drawdown numeric(18, 2) not null default 0 check (current_drawdown >= 0),
  status text not null default 'active' check (status in ('active', 'passed', 'failed', 'paused', 'archived')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (id, user_id)
);

create table public.trades (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid not null,
  date date not null,
  instrument text not null check (char_length(instrument) between 1 and 40),
  direction text not null check (direction in ('long', 'short')),
  entry numeric(24, 10),
  stop numeric(24, 10),
  take_profit numeric(24, 10),
  exit_price numeric(24, 10),
  pnl numeric(18, 2),
  result_status text not null default 'closed' check (result_status in ('open', 'closed', 'breakeven', 'canceled')),
  market_type text check (market_type is null or market_type in ('futures', 'cfd')),
  setup text,
  setups text[] not null default '{}',
  session text,
  emotion text,
  emotion_secondary text,
  emotion_intensity text,
  notes text check (notes is null or char_length(notes) <= 10000),
  plan_respected boolean not null default true,
  screenshots text[] not null default '{}',
  r numeric(12, 4),
  size numeric(18, 6) not null default 1 check (size > 0),
  duration text,
  duration_minutes integer check (duration_minutes is null or duration_minutes >= 0),
  entry_time time,
  exit_time time,
  point_value numeric(18, 8),
  commission numeric(18, 2) not null default 0 check (commission >= 0),
  mistakes text[] not null default '{}',
  exit_reason text,
  plan_exception_reason text,
  tags text[] not null default '{}',
  checklist_results jsonb not null default '[]'::jsonb,
  starred boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint trades_account_owner_fk
    foreign key (account_id, user_id)
    references public.accounts(id, user_id)
    on delete cascade
);

create table public.payouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid not null,
  amount numeric(18, 2) not null check (amount > 0),
  date date not null,
  note text check (note is null or char_length(note) <= 2000),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint payouts_account_owner_fk
    foreign key (account_id, user_id)
    references public.accounts(id, user_id)
    on delete cascade
);

create table public.ai_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  question text not null check (char_length(question) between 1 and 5000),
  answer text not null,
  tag text not null default 'overall',
  model text,
  created_at timestamptz not null default timezone('utc', now())
);

create table public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 80),
  email text not null check (char_length(email) between 3 and 320),
  subject text not null check (char_length(subject) between 3 and 120),
  message text not null check (char_length(message) between 10 and 3000),
  status text not null default 'new' check (status in ('new', 'read', 'answered', 'archived')),
  created_at timestamptz not null default timezone('utc', now())
);

create index accounts_user_created_idx on public.accounts (user_id, created_at desc);
create index accounts_user_status_idx on public.accounts (user_id, status);
create index trades_user_date_idx on public.trades (user_id, date desc);
create index trades_user_account_date_idx on public.trades (user_id, account_id, date desc);
create index payouts_user_date_idx on public.payouts (user_id, date desc);
create index ai_reports_user_created_idx on public.ai_reports (user_id, created_at desc);
create index contact_messages_status_created_idx on public.contact_messages (status, created_at desc);

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function private.set_updated_at();

create trigger subscriptions_set_updated_at
before update on public.subscriptions
for each row execute function private.set_updated_at();

create trigger accounts_set_updated_at
before update on public.accounts
for each row execute function private.set_updated_at();

create trigger trades_set_updated_at
before update on public.trades
for each row execute function private.set_updated_at();

create trigger payouts_set_updated_at
before update on public.payouts
for each row execute function private.set_updated_at();

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, name)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'name'), ''), split_part(coalesce(new.email, ''), '@', 1), 'Trader')
  );

  insert into public.subscriptions (user_id)
  values (new.id);

  return new;
end;
$$;

revoke all on function private.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function private.handle_new_user();

alter table public.profiles enable row level security;
alter table public.subscriptions enable row level security;
alter table public.accounts enable row level security;
alter table public.trades enable row level security;
alter table public.payouts enable row level security;
alter table public.ai_reports enable row level security;
alter table public.contact_messages enable row level security;

create policy "profiles_select_own"
on public.profiles for select
to authenticated
using ((select auth.uid()) = id);

create policy "profiles_insert_own"
on public.profiles for insert
to authenticated
with check ((select auth.uid()) = id);

create policy "profiles_update_own"
on public.profiles for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

create policy "subscriptions_select_own"
on public.subscriptions for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "accounts_select_own"
on public.accounts for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "accounts_insert_own"
on public.accounts for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "accounts_update_own"
on public.accounts for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "accounts_delete_own"
on public.accounts for delete
to authenticated
using ((select auth.uid()) = user_id);

create policy "trades_select_own"
on public.trades for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "trades_insert_own"
on public.trades for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "trades_update_own"
on public.trades for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "trades_delete_own"
on public.trades for delete
to authenticated
using ((select auth.uid()) = user_id);

create policy "payouts_select_own"
on public.payouts for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "payouts_insert_own"
on public.payouts for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "payouts_update_own"
on public.payouts for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "payouts_delete_own"
on public.payouts for delete
to authenticated
using ((select auth.uid()) = user_id);

create policy "ai_reports_select_own"
on public.ai_reports for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "contact_messages_public_insert"
on public.contact_messages for insert
to anon, authenticated
with check (status = 'new');

grant usage on schema public to anon, authenticated;
grant select, insert, update on public.profiles to authenticated;
grant select on public.subscriptions to authenticated;
grant select, insert, update, delete on public.accounts to authenticated;
grant select, insert, update, delete on public.trades to authenticated;
grant select, insert, update, delete on public.payouts to authenticated;
grant select on public.ai_reports to authenticated;
grant insert on public.contact_messages to anon, authenticated;
