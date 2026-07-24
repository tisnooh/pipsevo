create index trades_account_owner_idx
on public.trades (account_id, user_id);

create index payouts_account_owner_idx
on public.payouts (account_id, user_id);
