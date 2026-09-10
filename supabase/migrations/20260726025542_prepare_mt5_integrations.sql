-- Prepare secure, provider-agnostic broker integrations.
-- No provider is enabled by this migration and no credential is ever exposed
-- through the public Data API.

create table public.integration_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid,
  platform text not null check (platform in ('mt5')),
  provider text not null check (char_length(provider) between 1 and 80),
  external_account_id text not null check (char_length(external_account_id) between 1 and 160),
  broker_name text check (broker_name is null or char_length(broker_name) <= 160),
  server_name text not null check (char_length(server_name) between 1 and 160),
  account_number_masked text not null check (char_length(account_number_masked) between 4 and 40),
  account_type text check (account_type is null or account_type in ('real', 'demo', 'unknown')),
  account_currency text check (account_currency is null or char_length(account_currency) between 3 and 8),
  display_name text check (display_name is null or char_length(display_name) <= 100),
  connection_status text not null default 'pending'
    check (connection_status in ('pending', 'connected', 'disconnected', 'expired', 'error')),
  sync_status text not null default 'idle'
    check (sync_status in ('idle', 'importing_history', 'syncing', 'success', 'partial_error', 'failed')),
  sync_cursor jsonb not null default '{}'::jsonb,
  last_successful_sync_at timestamptz,
  last_sync_attempt_at timestamptz,
  last_error_code text,
  last_error_message text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint integration_connections_account_owner_fk
    foreign key (account_id, user_id)
    references public.accounts(id, user_id)
    on delete cascade,
  unique (id, user_id),
  unique (user_id, platform, provider, external_account_id)
);

create table public.integration_sync_runs (
  id uuid primary key default gen_random_uuid(),
  connection_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  trigger_source text not null check (trigger_source in ('initial_import', 'manual', 'scheduled', 'webhook', 'retry')),
  status text not null check (status in ('running', 'success', 'partial_error', 'failed')),
  imported_count integer not null default 0 check (imported_count >= 0),
  updated_count integer not null default 0 check (updated_count >= 0),
  skipped_count integer not null default 0 check (skipped_count >= 0),
  error_count integer not null default 0 check (error_count >= 0),
  cursor_before jsonb not null default '{}'::jsonb,
  cursor_after jsonb not null default '{}'::jsonb,
  error_code text,
  error_message text,
  started_at timestamptz not null default timezone('utc', now()),
  completed_at timestamptz,
  constraint integration_sync_runs_connection_owner_fk
    foreign key (connection_id, user_id)
    references public.integration_connections(id, user_id)
    on delete cascade
);

create table public.integration_waitlist (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  platform text not null check (platform in ('mt5')),
  created_at timestamptz not null default timezone('utc', now()),
  unique (user_id, platform)
);

-- Public schema is used only so the trusted server can access these records
-- through PostgREST. No client role receives any privilege on the tables.
create table public.integration_connection_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  platform text not null,
  succeeded boolean not null default false,
  error_code text,
  attempted_at timestamptz not null default timezone('utc', now())
);

create table public.integration_security_audit (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  connection_id uuid references public.integration_connections(id) on delete set null,
  action text not null,
  outcome text not null check (outcome in ('success', 'failure')),
  safe_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create table private.integration_credentials (
  connection_id uuid primary key references public.integration_connections(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null,
  credential_ciphertext text,
  provider_token_ciphertext text,
  key_version integer not null check (key_version > 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (credential_ciphertext is not null or provider_token_ciphertext is not null)
);

create table private.integration_trade_events (
  id uuid primary key default gen_random_uuid(),
  connection_id uuid not null references public.integration_connections(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null,
  external_account_id text not null,
  provider_transaction_id text not null,
  provider_order_id text,
  provider_position_id text,
  event_type text not null check (event_type in ('trade', 'balance', 'credit', 'commission', 'swap', 'other')),
  normalized_payload jsonb not null,
  occurred_at timestamptz,
  processed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  unique (provider, external_account_id, provider_transaction_id)
);

alter table public.trades
  add column if not exists integration_connection_id uuid references public.integration_connections(id) on delete set null,
  add column if not exists source text not null default 'manual',
  add column if not exists source_provider text,
  add column if not exists external_account_id text,
  add column if not exists provider_trade_id text,
  add column if not exists provider_order_id text,
  add column if not exists symbol text,
  add column if not exists volume numeric(18, 6),
  add column if not exists open_time timestamptz,
  add column if not exists close_time timestamptz,
  add column if not exists open_price numeric(24, 10),
  add column if not exists close_price numeric(24, 10),
  add column if not exists gross_profit numeric(18, 2),
  add column if not exists swap numeric(18, 2) not null default 0,
  add column if not exists fees numeric(18, 2) not null default 0,
  add column if not exists net_profit numeric(18, 2),
  add column if not exists provider_comment text,
  add column if not exists magic_number bigint,
  add column if not exists imported_at timestamptz;

alter table public.trades
  drop constraint if exists trades_source_check;
alter table public.trades
  add constraint trades_source_check check (
    source in ('manual', 'csv', 'mt5_api', 'ctrader_api', 'tradovate_api', 'other_integration')
  );

update public.trades
set source = case when import_source = 'csv' then 'csv' else 'manual' end
where source = 'manual';

create unique index trades_provider_transaction_unique
  on public.trades (user_id, source_provider, external_account_id, provider_trade_id)
  where source_provider is not null
    and external_account_id is not null
    and provider_trade_id is not null;

create index integration_connections_user_status_idx
  on public.integration_connections (user_id, connection_status, updated_at desc);
create index integration_connections_sync_due_idx
  on public.integration_connections (connection_status, last_successful_sync_at)
  where connection_status = 'connected';
create index integration_sync_runs_user_started_idx
  on public.integration_sync_runs (user_id, started_at desc);
create index integration_attempts_user_time_idx
  on public.integration_connection_attempts (user_id, attempted_at desc);
create index integration_audit_user_time_idx
  on public.integration_security_audit (user_id, created_at desc);
create index integration_trade_events_pending_idx
  on private.integration_trade_events (connection_id, created_at)
  where processed_at is null;

create trigger integration_connections_set_updated_at
before update on public.integration_connections
for each row execute function private.set_updated_at();

create trigger integration_credentials_set_updated_at
before update on private.integration_credentials
for each row execute function private.set_updated_at();

alter table public.integration_connections enable row level security;
alter table public.integration_sync_runs enable row level security;
alter table public.integration_waitlist enable row level security;
alter table public.integration_connection_attempts enable row level security;
alter table public.integration_security_audit enable row level security;

create policy "integration_connections_select_own"
on public.integration_connections for select to authenticated
using ((select auth.uid()) = user_id);

create policy "integration_sync_runs_select_own"
on public.integration_sync_runs for select to authenticated
using ((select auth.uid()) = user_id);

create policy "integration_waitlist_select_own"
on public.integration_waitlist for select to authenticated
using ((select auth.uid()) = user_id);

create policy "integration_waitlist_insert_own"
on public.integration_waitlist for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy "integration_waitlist_delete_own"
on public.integration_waitlist for delete to authenticated
using ((select auth.uid()) = user_id);

create policy "integration_waitlist_update_own"
on public.integration_waitlist for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

grant select on public.integration_connections to authenticated;
grant select on public.integration_sync_runs to authenticated;
grant select, insert, update, delete on public.integration_waitlist to authenticated;
grant all on public.integration_connections to service_role;
grant all on public.integration_sync_runs to service_role;
grant all on public.integration_connection_attempts to service_role;
grant all on public.integration_security_audit to service_role;

-- Trusted-server-only RPCs are the only bridge to the private credential vault.
create or replace function public.integration_store_credentials(
  p_connection_id uuid,
  p_user_id uuid,
  p_provider text,
  p_credential_ciphertext text,
  p_provider_token_ciphertext text,
  p_key_version integer
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.integration_connections
    where id = p_connection_id and user_id = p_user_id
  ) then
    raise exception 'integration connection owner mismatch';
  end if;

  insert into private.integration_credentials (
    connection_id, user_id, provider, credential_ciphertext,
    provider_token_ciphertext, key_version
  ) values (
    p_connection_id, p_user_id, p_provider, p_credential_ciphertext,
    p_provider_token_ciphertext, p_key_version
  )
  on conflict (connection_id) do update set
    provider = excluded.provider,
    credential_ciphertext = excluded.credential_ciphertext,
    provider_token_ciphertext = excluded.provider_token_ciphertext,
    key_version = excluded.key_version;
end;
$$;

create or replace function public.integration_read_credentials(p_connection_id uuid, p_user_id uuid)
returns table (
  provider text,
  credential_ciphertext text,
  provider_token_ciphertext text,
  key_version integer
)
language sql
security definer
set search_path = ''
as $$
  select c.provider, c.credential_ciphertext, c.provider_token_ciphertext, c.key_version
  from private.integration_credentials c
  where c.connection_id = p_connection_id and c.user_id = p_user_id;
$$;

create or replace function public.integration_delete_credentials(p_connection_id uuid, p_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  deleted_count integer;
begin
  delete from private.integration_credentials
  where connection_id = p_connection_id and user_id = p_user_id;
  get diagnostics deleted_count = row_count;
  return deleted_count > 0;
end;
$$;

-- Keep every provider operation, including non-trade balance/credit events,
-- in an idempotent server-only journal before projecting trades publicly.
create or replace function public.integration_upsert_trade_event(
  p_connection_id uuid,
  p_user_id uuid,
  p_provider text,
  p_external_account_id text,
  p_provider_transaction_id text,
  p_provider_order_id text,
  p_provider_position_id text,
  p_event_type text,
  p_normalized_payload jsonb,
  p_occurred_at timestamptz
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  event_id uuid;
begin
  if not exists (
    select 1 from public.integration_connections
    where id = p_connection_id
      and user_id = p_user_id
      and provider = p_provider
      and external_account_id = p_external_account_id
  ) then
    raise exception 'integration event owner mismatch';
  end if;

  insert into private.integration_trade_events (
    connection_id, user_id, provider, external_account_id,
    provider_transaction_id, provider_order_id, provider_position_id,
    event_type, normalized_payload, occurred_at
  ) values (
    p_connection_id, p_user_id, p_provider, p_external_account_id,
    p_provider_transaction_id, p_provider_order_id, p_provider_position_id,
    p_event_type, p_normalized_payload, p_occurred_at
  )
  on conflict (provider, external_account_id, provider_transaction_id)
  do update set
    provider_order_id = excluded.provider_order_id,
    provider_position_id = excluded.provider_position_id,
    event_type = excluded.event_type,
    normalized_payload = excluded.normalized_payload,
    occurred_at = excluded.occurred_at
  returning id into event_id;

  return event_id;
end;
$$;

revoke all on function public.integration_store_credentials(uuid, uuid, text, text, text, integer) from public, anon, authenticated;
revoke all on function public.integration_read_credentials(uuid, uuid) from public, anon, authenticated;
revoke all on function public.integration_delete_credentials(uuid, uuid) from public, anon, authenticated;
revoke all on function public.integration_upsert_trade_event(uuid, uuid, text, text, text, text, text, text, jsonb, timestamptz) from public, anon, authenticated;
grant execute on function public.integration_store_credentials(uuid, uuid, text, text, text, integer) to service_role;
grant execute on function public.integration_read_credentials(uuid, uuid) to service_role;
grant execute on function public.integration_delete_credentials(uuid, uuid) to service_role;
grant execute on function public.integration_upsert_trade_event(uuid, uuid, text, text, text, text, text, text, jsonb, timestamptz) to service_role;

comment on table public.integration_connections is
  'Non-sensitive metadata for broker integrations. Credentials live only in private.integration_credentials.';
comment on table private.integration_credentials is
  'Server-encrypted credentials or provider tokens. Never exposed to browser roles.';
comment on column public.integration_connections.last_error_message is
  'Sanitized user-facing error only; raw provider errors must never be persisted here.';
