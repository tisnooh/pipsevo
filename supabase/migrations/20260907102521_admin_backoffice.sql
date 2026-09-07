-- PipsEvo administrative control plane.
-- Every privileged table is accessed by the trusted FastAPI service only.

alter table public.profiles
  add column if not exists role text not null default 'user',
  add column if not exists status text not null default 'active',
  add column if not exists last_activity_at timestamptz;

alter table public.profiles
  drop constraint if exists profiles_role_check,
  drop constraint if exists profiles_status_check;

alter table public.profiles
  add constraint profiles_role_check check (role in ('user', 'support', 'admin', 'super_admin')),
  add constraint profiles_status_check check (status in ('active', 'suspended'));

create index if not exists profiles_role_status_idx
  on public.profiles (role, status, created_at desc);
create index if not exists profiles_last_activity_idx
  on public.profiles (last_activity_at desc nulls last);

-- The former table-level UPDATE grant allowed every profile column to be sent
-- by a malicious Data API client. Keep only the editable product preferences.
revoke update on table public.profiles from authenticated;
revoke insert on table public.profiles from authenticated;
grant update (
  name, trader_type, prop_firms, num_accounts, onboarded,
  onboarding_completed, rules, journal_preferences, app_preferences
) on table public.profiles to authenticated;

create table if not exists public.prop_firms (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]+$'),
  name text not null check (char_length(name) between 2 and 120),
  logo_url text,
  market_types text[] not null default '{}',
  platforms text[] not null default '{}',
  import_supported boolean not null default false,
  auto_sync_supported boolean not null default false,
  official_source text,
  last_verified_at date,
  active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 2 and 140),
  message text not null check (char_length(message) between 2 and 2000),
  type text not null default 'info' check (type in ('info', 'success', 'warning', 'critical')),
  audience text not null default 'all' check (audience in ('all', 'free', 'pro', 'specific_users', 'admins')),
  audience_user_ids uuid[] not null default '{}',
  starts_at timestamptz,
  ends_at timestamptz,
  dismissible boolean not null default true,
  active boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (ends_at is null or starts_at is null or ends_at > starts_at)
);

create table if not exists public.feature_flags (
  id uuid primary key default gen_random_uuid(),
  key text not null unique check (key ~ '^[a-z][a-z0-9_]{2,79}$'),
  name text not null check (char_length(name) between 2 and 120),
  description text not null default '' check (char_length(description) <= 1000),
  enabled boolean not null default false,
  rollout_percentage integer not null default 100 check (rollout_percentage between 0 and 100),
  audience text not null default 'all' check (audience in ('all', 'admin_only', 'specific_users', 'plan')),
  audience_values text[] not null default '{}',
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.feature_flag_overrides (
  id uuid primary key default gen_random_uuid(),
  flag_id uuid not null references public.feature_flags(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  enabled boolean not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (flag_id, user_id)
);

create table if not exists public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  actor_email text,
  action text not null check (char_length(action) between 3 and 120),
  target_type text not null check (char_length(target_type) between 2 and 80),
  target_id text,
  old_value jsonb,
  new_value jsonb,
  metadata jsonb not null default '{}'::jsonb,
  request_id text,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.system_incidents (
  id uuid primary key default gen_random_uuid(),
  severity text not null check (severity in ('info', 'warning', 'error', 'critical')),
  source text not null check (source in ('trading_sync', 'emails', 'atlas', 'backtest', 'api', 'database', 'auth')),
  message text not null check (char_length(message) between 3 and 1000),
  error_code text,
  occurrences integer not null default 1 check (occurrences > 0),
  status text not null default 'open' check (status in ('open', 'investigating', 'resolved', 'ignored')),
  safe_metadata jsonb not null default '{}'::jsonb,
  first_seen_at timestamptz not null default timezone('utc', now()),
  last_seen_at timestamptz not null default timezone('utc', now()),
  resolved_at timestamptz,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.admin_settings (
  key text primary key check (key in (
    'maintenance_mode', 'registration_enabled', 'support_enabled',
    'default_locale', 'atlas_daily_limit', 'backtest_session_limit'
  )),
  value jsonb not null,
  description text not null default '',
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.product_events (
  id bigint generated by default as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  event_name text not null check (event_name ~ '^[a-z][a-z0-9_.-]{2,79}$'),
  feature text not null check (char_length(feature) between 2 and 80),
  safe_metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default timezone('utc', now())
);

create index if not exists announcements_active_window_idx
  on public.announcements (active, starts_at, ends_at);
create index if not exists feature_flags_enabled_idx
  on public.feature_flags (enabled, updated_at desc);
create index if not exists feature_flag_overrides_user_idx
  on public.feature_flag_overrides (user_id, flag_id);
create index if not exists admin_audit_logs_created_idx
  on public.admin_audit_logs (created_at desc);
create index if not exists admin_audit_logs_target_idx
  on public.admin_audit_logs (target_type, target_id, created_at desc);
create index if not exists system_incidents_status_seen_idx
  on public.system_incidents (status, last_seen_at desc);
create index if not exists product_events_time_idx
  on public.product_events (occurred_at desc);
create index if not exists product_events_user_time_idx
  on public.product_events (user_id, occurred_at desc);
create index if not exists product_events_feature_time_idx
  on public.product_events (feature, occurred_at desc);

create or replace view public.admin_user_metrics
with (security_invoker = true)
as
select
  p.id,
  p.email,
  p.name,
  p.role,
  p.status,
  p.onboarding_completed,
  p.created_at,
  p.last_activity_at,
  s.plan,
  s.status as subscription_status,
  (select count(*)::integer from public.accounts a where a.user_id = p.id) as accounts_count,
  (select count(*)::integer from public.trades t where t.user_id = p.id) as trades_count
from public.profiles p
left join public.subscriptions s on s.user_id = p.id;

drop trigger if exists prop_firms_set_updated_at on public.prop_firms;
create trigger prop_firms_set_updated_at before update on public.prop_firms
for each row execute function private.set_updated_at();
drop trigger if exists announcements_set_updated_at on public.announcements;
create trigger announcements_set_updated_at before update on public.announcements
for each row execute function private.set_updated_at();
drop trigger if exists feature_flags_set_updated_at on public.feature_flags;
create trigger feature_flags_set_updated_at before update on public.feature_flags
for each row execute function private.set_updated_at();
drop trigger if exists feature_flag_overrides_set_updated_at on public.feature_flag_overrides;
create trigger feature_flag_overrides_set_updated_at before update on public.feature_flag_overrides
for each row execute function private.set_updated_at();
drop trigger if exists system_incidents_set_updated_at on public.system_incidents;
create trigger system_incidents_set_updated_at before update on public.system_incidents
for each row execute function private.set_updated_at();
drop trigger if exists admin_settings_set_updated_at on public.admin_settings;
create trigger admin_settings_set_updated_at before update on public.admin_settings
for each row execute function private.set_updated_at();

create or replace function private.reject_admin_audit_mutation()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  raise exception 'admin audit logs are append-only';
end;
$$;
revoke all on function private.reject_admin_audit_mutation() from public, anon, authenticated;
drop trigger if exists admin_audit_logs_immutable on public.admin_audit_logs;
create trigger admin_audit_logs_immutable
before update or delete on public.admin_audit_logs
for each row execute function private.reject_admin_audit_mutation();

alter table public.prop_firms enable row level security;
alter table public.announcements enable row level security;
alter table public.feature_flags enable row level security;
alter table public.feature_flag_overrides enable row level security;
alter table public.admin_audit_logs enable row level security;
alter table public.system_incidents enable row level security;
alter table public.admin_settings enable row level security;
alter table public.product_events enable row level security;

revoke all on table public.prop_firms, public.announcements, public.feature_flags,
  public.feature_flag_overrides, public.admin_audit_logs, public.system_incidents,
  public.admin_settings, public.product_events from public, anon, authenticated;
revoke all on table public.admin_user_metrics from public, anon, authenticated;

grant select on table public.prop_firms to anon, authenticated;
create policy "prop_firms_public_active_select"
on public.prop_firms for select to anon, authenticated
using (active = true);

grant all on table public.prop_firms, public.announcements, public.feature_flags,
  public.feature_flag_overrides, public.admin_audit_logs, public.system_incidents,
  public.admin_settings, public.product_events to service_role;
grant select on table public.admin_user_metrics to service_role;
grant usage, select on sequence public.product_events_id_seq to service_role;

insert into public.admin_settings (key, value, description) values
  ('maintenance_mode', 'false'::jsonb, 'Bloque temporairement les fonctionnalités non administratives.'),
  ('registration_enabled', 'true'::jsonb, 'Autorise la création de nouveaux comptes.'),
  ('support_enabled', 'true'::jsonb, 'Autorise les nouvelles demandes de support.'),
  ('default_locale', '"fr"'::jsonb, 'Langue par défaut du produit.'),
  ('atlas_daily_limit', '10'::jsonb, 'Nombre maximal de requêtes Atlas par utilisateur et par 24 heures.'),
  ('backtest_session_limit', '100'::jsonb, 'Nombre maximal de sessions Backtest par utilisateur.')
on conflict (key) do nothing;

insert into public.feature_flags (key, name, description, enabled, rollout_percentage, audience) values
  ('new_backtest_lab', 'Backtest Lab', 'Accès au moteur de replay PipsEvo.', true, 100, 'all'),
  ('atlas_v2', 'Atlas IA', 'Accès à l’analyse comportementale Atlas.', true, 100, 'all'),
  ('auto_sync_mt5', 'Synchronisation MT5', 'Déploiement contrôlé de la synchronisation automatique MT5.', false, 0, 'specific_users')
on conflict (key) do nothing;

insert into public.prop_firms (
  slug, name, logo_url, market_types, platforms, import_supported,
  auto_sync_supported, official_source, last_verified_at
) values
  ('topstep', 'Topstep', '/brand/prop-firms/topstep.webp', array['futures'], array['topstepx'], false, false, 'https://help.topstep.com/en/articles/8284199-new-to-topstep-start-here', '2026-09-03'),
  ('apex', 'Apex Trader Funding', '/brand/prop-firms/apex.svg', array['futures'], array['ninjatrader','rithmic','tradovate'], true, false, 'https://support.apextraderfunding.com/hc/en-us/articles/13397375485851-Connection-Guide-for-Rithmic-Using-NinjaTrader-8-1-X', '2026-09-03'),
  ('take-profit-trader', 'Take Profit Trader', '/brand/prop-firms/take-profit-trader.svg', array['futures'], array['tradovate','ninjatrader','rithmic','tradingview','quantower'], true, false, 'https://takeprofittraderhelp.zendesk.com/hc/en-us/articles/15173017163549-Choosing-Your-Platform', '2026-09-03'),
  ('ftmo', 'FTMO', '/brand/prop-firms/ftmo.svg', array['cfd','futures'], array['mt4','mt5','ctrader','tradingview','ninjatrader','tradovate'], true, false, 'https://ftmo.com/en/faq/which-platforms-can-i-use-for-trading/', '2026-09-03'),
  ('the5ers', 'The5ers', '/brand/prop-firms/the5ers.svg', array['cfd','futures'], array['mt5','ctrader','tradingview','blackarrow'], true, false, 'https://the5ers.com/faqs/which-trading-platform-do-you-use/', '2026-09-03'),
  ('fundednext', 'FundedNext', '/brand/prop-firms/fundednext.png', array['cfd'], array['mt4','mt5','ctrader','match-trader'], true, false, 'https://help.fundednext.com/en/articles/8019808-which-platforms-can-i-use-for-trading-at-fundednext', '2026-09-03'),
  ('fundingpips', 'FundingPips', '/brand/prop-firms/fundingpips.svg', array['cfd'], array['mt5','ctrader','match-trader'], true, false, 'https://help.fundingpips.com/hc/en-us/articles/43468639481105-Account-Workspace', '2026-09-04'),
  ('my-funded-futures', 'My Funded Futures', '/brand/prop-firms/my-funded-futures.svg', array['futures'], array['ninjatrader','tradovate','tradingview','quantower'], true, false, 'https://help.myfundedfutures.com/en/articles/8528335-overview-of-supported-platforms-at-mffu', '2026-09-04'),
  ('alpha-capital-group', 'Alpha Capital Group', '/brand/prop-firms/alpha-capital-group.svg', array['cfd'], array['mt5','ctrader','dxtrade','tradelocker'], true, false, 'https://help.alphacapitalgroup.uk/en/articles/6933883-what-trading-platforms-are-available-for-use', '2026-09-04'),
  ('earn2trade', 'Earn2Trade', '/brand/prop-firms/earn2trade.svg', array['futures'], array['ninjatrader','tradovate','tradingview','rithmic','quantower'], true, false, 'https://help.earn2trade.com/en/articles/2090521-what-platforms-can-i-use-for-the-gauntlet-mini-trader-career-path', '2026-09-04'),
  ('e8-markets', 'E8 Markets', '/brand/prop-firms/e8-markets.jpg', array['cfd'], array['tradelocker','match-trader','ctrader','mt5','e8-terminal'], true, false, 'https://help.e8markets.com/en/articles/9799834-available-trading-platforms', '2026-09-04'),
  ('blue-guardian', 'Blue Guardian', '/brand/prop-firms/blue-guardian.png', array['cfd'], array['mt5','match-trader','tradelocker'], true, false, 'https://help.blueguardian.com/en/articles/9661525-platform-rules', '2026-09-04'),
  ('goat-funded-trader', 'Goat Funded Trader', '/brand/prop-firms/goat-funded-trader.webp', array['cfd'], array['ctrader','tradelocker','match-trader','volumetrica','mt5'], true, false, 'https://help.goatfundedtrader.com/en/articles/10741900-which-platforms-can-i-trade-on', '2026-09-04'),
  ('city-traders-imperium', 'City Traders Imperium', '/brand/prop-firms/city-traders-imperium.png', array['cfd'], array['mt5','match-trader'], true, false, 'https://citytradersimperium.com/partners/', '2026-09-04'),
  ('breakout', 'Breakout', '/brand/prop-firms/breakout.ico', array['crypto'], array['breakout-terminal'], false, false, 'https://www.breakoutprop.com/guides/breakout-terminal-walkthrough/', '2026-09-04'),
  ('instant-funding', 'Instant Funding', '/brand/prop-firms/instant-funding.png', array['cfd','crypto'], array['mt5','ctrader','match-trader'], true, false, 'https://instantfunding.com/help/trading-platforms/', '2026-09-04'),
  ('funding-traders', 'Funding Traders', '/brand/prop-firms/funding-traders.svg', array['cfd','crypto'], array['mt5','tradelocker'], true, false, 'https://fundingtraders.com/help/en/articles/12283589-trading-platforms-login-guide', '2026-09-04'),
  ('tradeday', 'TradeDay', '/brand/prop-firms/tradeday.webp', array['futures'], array['rithmic'], false, false, 'https://www.tradeday.com/blog-posts/rithmic-is-now-available', '2026-09-04')
on conflict (slug) do nothing;

comment on column public.profiles.role is 'Server-managed PipsEvo RBAC role. Client updates are revoked.';
comment on column public.profiles.status is 'Server-managed account access status.';
comment on table public.admin_audit_logs is 'Append-only administrative actions. No browser role has access.';
comment on table public.product_events is 'Minimal product telemetry; safe_metadata must not contain content or credentials.';
