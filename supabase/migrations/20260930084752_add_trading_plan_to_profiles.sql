alter table public.profiles
  add column if not exists trading_plan jsonb not null default '{}'::jsonb;

alter table public.profiles
  drop constraint if exists profiles_trading_plan_shape_check;

alter table public.profiles
  add constraint profiles_trading_plan_shape_check check (
    jsonb_typeof(trading_plan) = 'object'
    and pg_column_size(trading_plan) <= 65536
  );

-- Profile UPDATE access is column-scoped by the admin migration. Keep the new
-- field user-editable without reopening privileged fields such as role/status.
grant update (trading_plan) on table public.profiles to authenticated;

comment on column public.profiles.trading_plan is
  'Private structured trading plan owned and editable by the authenticated user.';
