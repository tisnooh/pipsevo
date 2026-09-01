-- Generalise the existing MT5 integration scaffold into a provider-agnostic,
-- multi-account trading synchronization model. Provider secrets remain in the
-- private schema and every public object is protected by ownership RLS.

alter table public.integration_connections
  drop constraint if exists integration_connections_platform_check,
  drop constraint if exists integration_connections_user_id_platform_provider_external_account_id_key;

alter table public.integration_connections
  alter column external_account_id drop not null,
  alter column server_name drop not null,
  alter column account_number_masked drop not null,
  add column if not exists external_connection_id text,
  add column if not exists auth_type text not null default 'credentials',
  add column if not exists permission_scope text,
  add column if not exists token_expires_at timestamptz,
  add column if not exists provider_environment text,
  add column if not exists provider_metadata jsonb not null default '{}'::jsonb,
  add column if not exists authorized_at timestamptz,
  add column if not exists disconnected_at timestamptz;

alter table public.integration_connections
  add constraint integration_connections_platform_check check (
    platform in ('ctrader', 'mt4', 'mt5', 'tradelocker', 'tradovate', 'ninjatrader')
  ),
  add constraint integration_connections_auth_type_check check (
    auth_type in ('oauth2', 'jwt', 'provider_link', 'credentials', 'api_token')
  );

create unique index if not exists integration_connections_external_identity_unique
  on public.integration_connections (user_id, provider, external_connection_id)
  where external_connection_id is not null;

create table if not exists public.integration_accounts (
  id uuid primary key default gen_random_uuid(),
  connection_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid,
  provider text not null,
  platform text not null check (
    platform in ('ctrader', 'mt4', 'mt5', 'tradelocker', 'tradovate', 'ninjatrader')
  ),
  external_account_id text not null,
  account_name text,
  account_number_masked text,
  broker_name text,
  server_name text,
  currency text,
  account_type text check (account_type is null or account_type in ('real', 'demo', 'unknown')),
  status text not null default 'available' check (
    status in ('available', 'selected', 'syncing', 'connected', 'disconnected', 'error')
  ),
  balance numeric(22, 6),
  equity numeric(22, 6),
  provider_metadata jsonb not null default '{}'::jsonb,
  sync_cursor jsonb not null default '{}'::jsonb,
  last_successful_sync_at timestamptz,
  last_sync_attempt_at timestamptz,
  last_error_code text,
  last_error_message text,
  sync_locked_until timestamptz,
  sync_lock_token uuid,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint integration_accounts_connection_owner_fk
    foreign key (connection_id, user_id)
    references public.integration_connections(id, user_id)
    on delete cascade,
  constraint integration_accounts_account_owner_fk
    foreign key (account_id, user_id)
    references public.accounts(id, user_id)
    on delete set null (account_id),
  unique (id, user_id),
  unique (user_id, provider, external_account_id)
);

alter table public.integration_sync_runs
  add column if not exists integration_account_id uuid,
  add column if not exists sync_type text,
  add column if not exists trades_found integer not null default 0,
  add column if not exists executions_found integer not null default 0,
  add column if not exists duration_ms integer;

alter table public.integration_sync_runs
  drop constraint if exists integration_sync_runs_trigger_source_check;
alter table public.integration_sync_runs
  add constraint integration_sync_runs_trigger_source_check check (
    trigger_source in ('initial_import', 'manual', 'scheduled', 'webhook', 'retry', 'reconnect')
  );

alter table public.integration_sync_runs
  add constraint integration_sync_runs_integration_account_fk
  foreign key (integration_account_id, user_id)
  references public.integration_accounts(id, user_id)
  on delete cascade;

create table if not exists public.trade_executions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  connection_id uuid not null,
  integration_account_id uuid not null,
  account_id uuid not null,
  provider text not null,
  platform text not null,
  external_account_id text not null,
  external_execution_id text not null,
  external_order_id text,
  external_position_id text,
  symbol text not null,
  side text not null check (side in ('long', 'short')),
  execution_type text not null check (execution_type in ('open', 'close', 'other')),
  quantity numeric(24, 8) not null check (quantity > 0),
  price numeric(28, 12) not null,
  gross_pnl numeric(22, 6) not null default 0,
  commission numeric(22, 6) not null default 0,
  fees numeric(22, 6) not null default 0,
  swap numeric(22, 6) not null default 0,
  currency text,
  executed_at timestamptz not null,
  raw_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint trade_executions_connection_owner_fk
    foreign key (connection_id, user_id)
    references public.integration_connections(id, user_id)
    on delete cascade,
  constraint trade_executions_integration_account_owner_fk
    foreign key (integration_account_id, user_id)
    references public.integration_accounts(id, user_id)
    on delete cascade,
  constraint trade_executions_account_owner_fk
    foreign key (account_id, user_id)
    references public.accounts(id, user_id)
    on delete cascade,
  unique (user_id, provider, external_account_id, external_execution_id)
);

create table if not exists public.integration_account_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  integration_account_id uuid not null,
  account_id uuid not null,
  balance numeric(22, 6),
  equity numeric(22, 6),
  drawdown numeric(22, 6),
  currency text,
  recorded_at timestamptz not null default timezone('utc', now()),
  constraint integration_snapshots_account_owner_fk
    foreign key (integration_account_id, user_id)
    references public.integration_accounts(id, user_id)
    on delete cascade,
  constraint integration_snapshots_journal_account_owner_fk
    foreign key (account_id, user_id)
    references public.accounts(id, user_id)
    on delete cascade
);

create table if not exists private.integration_oauth_states (
  state_hash text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null,
  redirect_after text not null,
  code_verifier_ciphertext text,
  key_version integer,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create or replace function public.integration_create_oauth_state(
  p_state_hash text,
  p_user_id uuid,
  p_provider text,
  p_redirect_after text,
  p_expires_at timestamptz,
  p_code_verifier_ciphertext text default null,
  p_key_version integer default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into private.integration_oauth_states (
    state_hash, user_id, provider, redirect_after, expires_at,
    code_verifier_ciphertext, key_version
  ) values (
    p_state_hash, p_user_id, p_provider, p_redirect_after, p_expires_at,
    p_code_verifier_ciphertext, p_key_version
  );
end;
$$;

alter table public.trades
  add column if not exists integration_account_id uuid references public.integration_accounts(id) on delete set null,
  add column if not exists platform text,
  add column if not exists external_position_id text,
  add column if not exists provider_currency text,
  add column if not exists broker_timezone text,
  add column if not exists provider_metadata jsonb not null default '{}'::jsonb,
  add column if not exists provider_updated_at timestamptz;

-- Imported executions cannot prove whether the trader respected a subjective
-- plan. Keep the existing default for manual entries but allow integrations to
-- store an explicit "not reviewed" state.
alter table public.trades alter column plan_respected drop not null;

alter table public.trades drop constraint if exists trades_source_check;
alter table public.trades add constraint trades_source_check check (
  source in (
    'manual', 'csv', 'mt4_api', 'mt5_api', 'ctrader_api', 'tradelocker_api',
    'tradovate_api', 'ninjatrader_api', 'file_import', 'other_integration'
  )
);

alter table public.integration_waitlist drop constraint if exists integration_waitlist_platform_check;
alter table public.integration_waitlist add constraint integration_waitlist_platform_check check (
  platform in ('ctrader', 'mt4', 'mt5', 'tradelocker', 'tradovate', 'ninjatrader')
);

create index if not exists integration_accounts_connection_idx
  on public.integration_accounts (connection_id, status, updated_at desc);
create index if not exists integration_accounts_sync_due_idx
  on public.integration_accounts (status, last_successful_sync_at)
  where status in ('selected', 'connected', 'error');
create index if not exists trade_executions_position_idx
  on public.trade_executions (user_id, provider, external_account_id, external_position_id, executed_at);
create index if not exists integration_snapshots_account_time_idx
  on public.integration_account_snapshots (integration_account_id, recorded_at desc);
create index if not exists integration_sync_runs_account_time_idx
  on public.integration_sync_runs (integration_account_id, started_at desc);

drop trigger if exists integration_accounts_set_updated_at on public.integration_accounts;
create trigger integration_accounts_set_updated_at
before update on public.integration_accounts
for each row execute function private.set_updated_at();

drop trigger if exists trade_executions_set_updated_at on public.trade_executions;
create trigger trade_executions_set_updated_at
before update on public.trade_executions
for each row execute function private.set_updated_at();

alter table public.integration_accounts enable row level security;
alter table public.trade_executions enable row level security;
alter table public.integration_account_snapshots enable row level security;
alter table private.integration_oauth_states enable row level security;

create policy "integration_accounts_select_own"
on public.integration_accounts for select to authenticated
using ((select auth.uid()) = user_id);

create policy "trade_executions_select_own"
on public.trade_executions for select to authenticated
using ((select auth.uid()) = user_id);

create policy "integration_snapshots_select_own"
on public.integration_account_snapshots for select to authenticated
using ((select auth.uid()) = user_id);

grant select on public.integration_accounts to authenticated;
grant select on public.trade_executions to authenticated;
grant select on public.integration_account_snapshots to authenticated;
grant all on public.integration_accounts to service_role;
grant all on public.trade_executions to service_role;
grant all on public.integration_account_snapshots to service_role;
revoke all on private.integration_oauth_states from public, anon, authenticated;

-- Atomic account-level lock shared by manual and scheduled synchronizations.
create or replace function public.integration_claim_sync_lock(
  p_integration_account_id uuid,
  p_lock_token uuid,
  p_lock_seconds integer default 300
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  claimed integer;
begin
  update public.integration_accounts
  set sync_lock_token = p_lock_token,
      sync_locked_until = timezone('utc', now()) + make_interval(secs => greatest(30, p_lock_seconds))
  where id = p_integration_account_id
    and (sync_locked_until is null or sync_locked_until < timezone('utc', now()));
  get diagnostics claimed = row_count;
  return claimed = 1;
end;
$$;

create or replace function public.integration_release_sync_lock(
  p_integration_account_id uuid,
  p_lock_token uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  released integer;
begin
  update public.integration_accounts
  set sync_lock_token = null, sync_locked_until = null
  where id = p_integration_account_id and sync_lock_token = p_lock_token;
  get diagnostics released = row_count;
  return released = 1;
end;
$$;

create or replace function public.integration_consume_oauth_state(
  p_state_hash text,
  p_provider text
)
returns table (user_id uuid, redirect_after text, code_verifier_ciphertext text, key_version integer)
language plpgsql
security definer
set search_path = ''
as $$
begin
  return query
  update private.integration_oauth_states s
  set consumed_at = timezone('utc', now())
  where s.state_hash = p_state_hash
    and s.provider = p_provider
    and s.consumed_at is null
    and s.expires_at > timezone('utc', now())
  returning s.user_id, s.redirect_after, s.code_verifier_ciphertext, s.key_version;
end;
$$;

revoke all on function public.integration_claim_sync_lock(uuid, uuid, integer) from public, anon, authenticated;
revoke all on function public.integration_release_sync_lock(uuid, uuid) from public, anon, authenticated;
revoke all on function public.integration_consume_oauth_state(text, text) from public, anon, authenticated;
revoke all on function public.integration_create_oauth_state(text, uuid, text, text, timestamptz, text, integer) from public, anon, authenticated;
grant execute on function public.integration_claim_sync_lock(uuid, uuid, integer) to service_role;
grant execute on function public.integration_release_sync_lock(uuid, uuid) to service_role;
grant execute on function public.integration_consume_oauth_state(text, text) to service_role;
grant execute on function public.integration_create_oauth_state(text, uuid, text, text, timestamptz, text, integer) to service_role;

comment on table public.integration_accounts is
  'Provider accounts selected or available under one authorization connection.';
comment on table public.trade_executions is
  'Immutable provider fills/executions used to reconstruct partial and scaled trades.';
comment on column public.trades.provider_metadata is
  'Provider-owned raw metadata only. User journal enrichment lives in separate trade columns and is never overwritten by sync.';
