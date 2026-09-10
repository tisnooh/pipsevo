-- Import batches make CSV ingestion auditable and reversible.
create table public.trade_imports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  file_name text not null check (char_length(file_name) between 1 and 255),
  status text not null default 'processing' check (status in ('processing', 'completed', 'rolled_back', 'failed')),
  total_rows integer not null default 0 check (total_rows >= 0),
  imported_rows integer not null default 0 check (imported_rows >= 0),
  skipped_rows integer not null default 0 check (skipped_rows >= 0),
  error_rows integer not null default 0 check (error_rows >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  completed_at timestamptz
);

alter table public.trades
  add column import_batch_id uuid references public.trade_imports(id) on delete set null,
  add column import_source text,
  add column import_fingerprint text,
  add column external_trade_id text;

alter table public.ai_reports
  add column evidence jsonb not null default '[]'::jsonb;

create unique index trades_user_import_fingerprint_unique
  on public.trades (user_id, import_fingerprint)
  where import_fingerprint is not null;

create index trade_imports_user_created_idx
  on public.trade_imports (user_id, created_at desc);

alter table public.trade_imports enable row level security;

create policy "trade_imports_select_own"
on public.trade_imports for select to authenticated
using ((select auth.uid()) = user_id);

create policy "trade_imports_insert_own"
on public.trade_imports for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy "trade_imports_update_own"
on public.trade_imports for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "trade_imports_delete_own"
on public.trade_imports for delete to authenticated
using ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.trade_imports to authenticated;
grant insert on public.ai_reports to authenticated;
