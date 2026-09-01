-- Tables created in an exposed schema can inherit broad project default
-- privileges. Keep provider-owned integration data read-only for signed-in
-- clients; every mutation must pass through the backend service role.
revoke all on table public.integration_accounts from anon, authenticated;
revoke all on table public.trade_executions from anon, authenticated;
revoke all on table public.integration_account_snapshots from anon, authenticated;

grant select on table public.integration_accounts to authenticated;
grant select on table public.trade_executions to authenticated;
grant select on table public.integration_account_snapshots to authenticated;

grant all on table public.integration_accounts to service_role;
grant all on table public.trade_executions to service_role;
grant all on table public.integration_account_snapshots to service_role;

-- OAuth states and synchronization locks are backend-only even though their
-- helper functions live in public for PostgREST RPC access.
revoke all on table private.integration_oauth_states from public, anon, authenticated;

revoke all on function public.integration_claim_sync_lock(uuid, uuid, integer)
  from public, anon, authenticated;
revoke all on function public.integration_release_sync_lock(uuid, uuid)
  from public, anon, authenticated;
revoke all on function public.integration_consume_oauth_state(text, text)
  from public, anon, authenticated;
revoke all on function public.integration_create_oauth_state(text, uuid, text, text, timestamptz, text, integer)
  from public, anon, authenticated;

grant execute on function public.integration_claim_sync_lock(uuid, uuid, integer)
  to service_role;
grant execute on function public.integration_release_sync_lock(uuid, uuid)
  to service_role;
grant execute on function public.integration_consume_oauth_state(text, text)
  to service_role;
grant execute on function public.integration_create_oauth_state(text, uuid, text, text, timestamptz, text, integer)
  to service_role;

-- Index every ownership foreign key used during account deletion, provider
-- cleanup and history joins. The existing reporting indexes intentionally
-- remain separate because they serve different leading-column patterns.
create index if not exists integration_oauth_states_user_id_idx
  on private.integration_oauth_states (user_id);

create index if not exists integration_accounts_connection_owner_idx
  on public.integration_accounts (connection_id, user_id);
create index if not exists integration_accounts_account_owner_idx
  on public.integration_accounts (account_id, user_id);

create index if not exists integration_sync_runs_account_owner_idx
  on public.integration_sync_runs (integration_account_id, user_id);

create index if not exists trade_executions_connection_owner_idx
  on public.trade_executions (connection_id, user_id);
create index if not exists trade_executions_integration_account_owner_idx
  on public.trade_executions (integration_account_id, user_id);
create index if not exists trade_executions_account_owner_idx
  on public.trade_executions (account_id, user_id);

create index if not exists integration_snapshots_user_id_idx
  on public.integration_account_snapshots (user_id);
create index if not exists integration_snapshots_integration_account_owner_idx
  on public.integration_account_snapshots (integration_account_id, user_id);
create index if not exists integration_snapshots_account_owner_idx
  on public.integration_account_snapshots (account_id, user_id);

create index if not exists trades_integration_account_idx
  on public.trades (integration_account_id);
