-- OAuth connections can contain several separately selected trading accounts.
-- Keep this private-journal entry point server-only and bound to its owner.
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
    select 1 from public.integration_connections c
    where c.id = p_connection_id
      and c.user_id = p_user_id
      and c.provider = p_provider
      and c.connection_status = 'connected'
      and (
        exists (
          select 1 from public.integration_accounts a
          where a.connection_id = c.id
            and a.user_id = c.user_id
            and a.provider = c.provider
            and a.platform = c.platform
            and a.external_account_id = p_external_account_id
            and a.account_id is not null
            and a.status in ('selected', 'syncing', 'connected', 'error')
        )
        or (
          c.external_account_id = p_external_account_id
          and not exists (
            select 1 from public.integration_accounts a
            where a.connection_id = c.id
          )
        )
      )
  ) then
    raise exception 'integration event owner mismatch';
  end if;

  insert into private.integration_trade_events as existing (
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
    connection_id = excluded.connection_id,
    provider_order_id = excluded.provider_order_id,
    provider_position_id = excluded.provider_position_id,
    event_type = excluded.event_type,
    normalized_payload = excluded.normalized_payload,
    occurred_at = excluded.occurred_at
  where existing.user_id = excluded.user_id
  returning id into event_id;

  if event_id is null then
    raise exception 'integration event owner mismatch';
  end if;
  return event_id;
end;
$$;

revoke all on function public.integration_upsert_trade_event(uuid, uuid, text, text, text, text, text, text, jsonb, timestamptz) from public, anon, authenticated;
grant execute on function public.integration_upsert_trade_event(uuid, uuid, text, text, text, text, text, text, jsonb, timestamptz) to service_role;
