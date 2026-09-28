-- Do not silently destroy synchronized trades by deleting the PipsEvo account
-- that owns an active provider integration. The backend clears account_id when
-- the user explicitly disconnects, after which normal account deletion is safe.
alter table public.integration_accounts
  drop constraint if exists integration_accounts_account_owner_fk;

alter table public.integration_accounts
  add constraint integration_accounts_account_owner_fk
  foreign key (account_id, user_id)
  references public.accounts (id, user_id)
  on delete restrict;
