-- Explicitly invoked deployment verification, NOT part of the offline scan.
-- Synthetic fixture IDs only. No actual Auth API, email, file upload or delete.
-- A nested exception rolls back every fixture and role/claim setting, even
-- when an assertion fails. No permanent test user or object is created.
-- This checks deployed PostgreSQL RLS, not real signed JWT/HTTP flows.
do $verification$
declare
  owner_a uuid := '10000000-aaaa-4aaa-8aaa-010111000001';
  owner_b uuid := '10000000-bbbb-4bbb-8bbb-010111000002';
  account_a uuid := '10000000-aaaa-4aaa-8aaa-010111000011';
  account_b uuid := '10000000-bbbb-4bbb-8bbb-010111000012';
  fixture_owner uuid;
  changed integer;
  passed boolean := false;
begin
  begin
    -- A collision fails safely rather than modifying an existing record.
    insert into auth.users(id,email,raw_user_meta_data) values
      (owner_a,'launch-rls-a@example.invalid','{"name":"Synthetic RLS A"}'),
      (owner_b,'launch-rls-b@example.invalid','{"name":"Synthetic RLS B"}');
    insert into public.accounts(id,user_id,name,firm) values
      (account_a,owner_a,'Synthetic RLS A','Manual'),
      (account_b,owner_b,'Synthetic RLS B','Manual');
    insert into public.trades(user_id,account_id,date,instrument,direction,pnl) values
      (owner_a,account_a,'2026-10-11','TEST','long',100),
      (owner_b,account_b,'2026-10-11','TEST','short',-50);
    insert into storage.objects(bucket_id,name) values
      ('trade-screenshots',owner_a::text||'/synthetic/no-file-a.png'),
      ('trade-screenshots',owner_b::text||'/synthetic/no-file-b.png');

    foreach fixture_owner in array array[owner_a,owner_b] loop
      perform set_config('request.jwt.claim.sub',fixture_owner::text,true);
      perform set_config('request.jwt.claims',jsonb_build_object('sub',fixture_owner,'role','authenticated')::text,true);
      perform set_config('role','authenticated',true);
      if (select count(*) from public.accounts) <> 1
         or (select count(*) from public.trades) <> 1
         or (select count(*) from public.profiles) <> 1
         or (select count(*) from storage.objects where bucket_id='trade-screenshots') <> 1 then
        raise exception 'Active owner isolation failed';
      end if;
      if exists(select 1 from public.accounts where user_id <> fixture_owner)
         or exists(select 1 from storage.objects where bucket_id='trade-screenshots' and name not like fixture_owner::text||'/%') then
        raise exception 'Foreign data visible';
      end if;
      begin
        update public.profiles set role='super_admin' where id=fixture_owner;
        raise exception 'Client role escalation accepted';
      exception when insufficient_privilege then null;
      end;
      perform set_config('role','none',true);
    end loop;

    update public.profiles set status='suspended' where id=owner_a;
    perform set_config('request.jwt.claim.sub',owner_a::text,true);
    perform set_config('request.jwt.claims',jsonb_build_object('sub',owner_a,'role','authenticated')::text,true);
    perform set_config('role','authenticated',true);
    if exists(select 1 from public.accounts) or exists(select 1 from public.trades)
       or exists(select 1 from storage.objects where bucket_id='trade-screenshots') then
      raise exception 'Suspended identity retained private data access';
    end if;
    if (select status from public.profiles where id=owner_a) <> 'suspended' then
      raise exception 'Recovery profile unavailable';
    end if;
    update public.accounts set name='not allowed' where user_id=owner_a;
    get diagnostics changed = row_count;
    if changed <> 0 then raise exception 'Suspended update accepted'; end if;
    begin
      insert into public.accounts(user_id,name,firm) values(owner_a,'not allowed','Manual');
      raise exception 'Suspended insert accepted';
    exception when insufficient_privilege then null;
    end;
    begin
      insert into storage.objects(bucket_id,name) values('trade-screenshots',owner_a::text||'/synthetic/forbidden.png');
      raise exception 'Suspended screenshot insert accepted';
    exception when insufficient_privilege then null;
    end;

    perform set_config('role','none',true);
    update public.profiles set status='active' where id=owner_a;
    perform set_config('role','authenticated',true);
    if (select count(*) from public.accounts) <> 1
       or (select count(*) from storage.objects where bucket_id='trade-screenshots') <> 1 then
      raise exception 'Reactivation did not restore owned access';
    end if;
    perform set_config('role','none',true);

    -- Auth erasure/ban must also gate retained JWT subjects even while the
    -- profile still says active and cross-store cleanup is pending.
    update auth.users set deleted_at=now() where id=owner_a;
    perform set_config('role','authenticated',true);
    if exists(select 1 from public.accounts) or exists(select 1 from public.trades)
       or exists(select 1 from storage.objects where bucket_id='trade-screenshots') then
      raise exception 'Soft-deleted Auth identity retained private data access';
    end if;
    perform set_config('role','none',true);
    update auth.users set deleted_at=null,banned_until=now()+interval '1 hour' where id=owner_a;
    perform set_config('role','authenticated',true);
    if exists(select 1 from public.accounts) then
      raise exception 'Banned Auth identity retained private data access';
    end if;
    perform set_config('role','none',true);
    update auth.users set banned_until=now()-interval '1 hour' where id=owner_a;
    perform set_config('role','authenticated',true);
    if (select count(*) from public.accounts) <> 1 then
      raise exception 'Expired Auth ban did not restore owned access';
    end if;
    perform set_config('role','none',true);

    perform set_config('request.jwt.claim.sub','',true);
    perform set_config('request.jwt.claims','{}',true);
    perform set_config('role','anon',true);
    if exists(select 1 from public.accounts) or exists(select 1 from public.trades)
       or exists(select 1 from storage.objects where bucket_id='trade-screenshots') then
      raise exception 'Anonymous private data access';
    end if;
    passed := true;
    -- Deliberately abort the fixture subtransaction, but retain local proof.
    raise exception using errcode='P0400', message='rollback synthetic verification fixtures';
  exception when sqlstate 'P0400' then
    if not passed then raise exception 'Verification incomplete'; end if;
  end;
  if exists(select 1 from auth.users where id in (owner_a,owner_b))
     or exists(select 1 from public.accounts where id in (account_a,account_b))
     or exists(select 1 from storage.objects where bucket_id='trade-screenshots' and
               (name like owner_a::text||'/%' or name like owner_b::text||'/%')) then
    raise exception 'Synthetic verification fixtures were not rolled back';
  end if;
end;
$verification$;
select 'PASS: two owners, suspension, Auth deletion/ban, reactivation, anonymous, screenshots; fixtures rolled back' as verification;
