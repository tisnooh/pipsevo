alter table public.trades
  drop constraint if exists trades_result_status_check;

alter table public.trades
  add constraint trades_result_status_check
  check (result_status in (
    'winner', 'loser', 'breakeven', 'partial',
    'open', 'cancelled', 'closed', 'canceled'
  ));

alter table public.trades
  alter column result_status set default 'open';
