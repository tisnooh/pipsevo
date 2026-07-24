create or replace function private.apply_trade_balance()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    update public.accounts
    set balance = balance + coalesce(new.pnl, 0)
    where id = new.account_id and user_id = new.user_id;
    return new;
  end if;

  if tg_op = 'DELETE' then
    update public.accounts
    set balance = balance - coalesce(old.pnl, 0)
    where id = old.account_id and user_id = old.user_id;
    return old;
  end if;

  if old.account_id = new.account_id and old.user_id = new.user_id then
    update public.accounts
    set balance = balance + coalesce(new.pnl, 0) - coalesce(old.pnl, 0)
    where id = new.account_id and user_id = new.user_id;
  else
    update public.accounts
    set balance = balance - coalesce(old.pnl, 0)
    where id = old.account_id and user_id = old.user_id;

    update public.accounts
    set balance = balance + coalesce(new.pnl, 0)
    where id = new.account_id and user_id = new.user_id;
  end if;

  return new;
end;
$$;

revoke all on function private.apply_trade_balance() from public, anon, authenticated;

create trigger trades_apply_balance
after insert or update of pnl, account_id or delete on public.trades
for each row execute function private.apply_trade_balance();

create policy "ai_reports_insert_own"
on public.ai_reports for insert
to authenticated
with check ((select auth.uid()) = user_id);

grant insert on public.ai_reports to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'trade-screenshots',
  'trade-screenshots',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy "trade_screenshots_select_own"
on storage.objects for select
to authenticated
using (
  bucket_id = 'trade-screenshots'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "trade_screenshots_insert_own"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'trade-screenshots'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "trade_screenshots_update_own"
on storage.objects for update
to authenticated
using (
  bucket_id = 'trade-screenshots'
  and (storage.foldername(name))[1] = (select auth.uid())::text
)
with check (
  bucket_id = 'trade-screenshots'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "trade_screenshots_delete_own"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'trade-screenshots'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);
