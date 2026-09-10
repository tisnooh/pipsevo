create index trades_import_batch_idx
  on public.trades (import_batch_id)
  where import_batch_id is not null;
