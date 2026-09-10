-- Explicitly block client-role access even if the private schema is exposed
-- by a future API configuration. Trusted SECURITY DEFINER functions remain
-- the only application bridge to these records.
alter table private.commercial_config enable row level security;
alter table private.integration_credentials enable row level security;
alter table private.integration_trade_events enable row level security;

-- Cover foreign keys used during ownership checks and cascading deletes.
create index if not exists integration_credentials_user_idx
  on private.integration_credentials (user_id);
create index if not exists integration_trade_events_user_idx
  on private.integration_trade_events (user_id);
create index if not exists integration_connections_account_owner_idx
  on public.integration_connections (account_id, user_id);
create index if not exists integration_security_audit_connection_idx
  on public.integration_security_audit (connection_id);
create index if not exists integration_sync_runs_connection_owner_idx
  on public.integration_sync_runs (connection_id, user_id);
create index if not exists trades_integration_connection_idx
  on public.trades (integration_connection_id);
