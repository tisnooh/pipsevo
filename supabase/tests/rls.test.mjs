import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";

// No remote URL, token, production credential or persistent database is used.
const migrations = fileURLToPath(new URL("../migrations/", import.meta.url));
const hardening = "20261011170000_enforce_active_profile_data_access.sql";
const authHardening = "20261011183000_enforce_auth_lifecycle_data_access.sql";
const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";
const accountA = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const accountB = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const personal = ["accounts", "trades", "payouts", "ai_reports", "trade_imports", "subscriptions"];

async function setup() {
  const db = await PGlite.create();
  await db.exec(`
    CREATE ROLE anon NOLOGIN;
    CREATE ROLE authenticated NOLOGIN;
    CREATE ROLE service_role NOLOGIN BYPASSRLS;
    CREATE SCHEMA auth;
    CREATE TABLE auth.users (id uuid PRIMARY KEY, email text, raw_user_meta_data jsonb DEFAULT '{}', deleted_at timestamptz, banned_until timestamptz);
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
      $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;
    GRANT EXECUTE ON FUNCTION auth.uid() TO anon, authenticated, service_role;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
    CREATE SCHEMA storage;
    CREATE TABLE storage.buckets (id text PRIMARY KEY, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
    CREATE TABLE storage.objects (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), bucket_id text, name text);
    ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
    CREATE FUNCTION storage.foldername(name text) RETURNS text[] LANGUAGE sql IMMUTABLE AS
      $$ SELECT (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1)-1] $$;
    GRANT USAGE ON SCHEMA storage TO anon, authenticated, service_role;
    GRANT SELECT, INSERT, UPDATE, DELETE ON storage.objects TO anon, authenticated, service_role;
    GRANT EXECUTE ON FUNCTION storage.foldername(text) TO anon, authenticated, service_role;
  `);
  for (const file of (await readdir(migrations)).filter(f => f.endsWith(".sql") && ![hardening, authHardening].includes(f)).sort()) {
    try { await db.exec(await readFile(`${migrations}/${file}`, "utf8")); }
    catch (error) { throw new Error(`Migration failed: ${file}: ${error.message}`, { cause: error }); }
  }
  await db.exec(`
    INSERT INTO auth.users (id, email) VALUES ('${A}', 'a@example.invalid'), ('${B}', 'b@example.invalid');
    INSERT INTO public.accounts (id, user_id, name, firm) VALUES
      ('${accountA}', '${A}', 'A', 'Manual'), ('${accountB}', '${B}', 'B', 'Manual');
    INSERT INTO public.trades (user_id, account_id, date, instrument, direction, pnl) VALUES
      ('${A}', '${accountA}', '2026-10-11', 'NQ', 'long', 100),
      ('${B}', '${accountB}', '2026-10-11', 'NQ', 'short', -50);
    INSERT INTO public.payouts (user_id, account_id, amount, date) VALUES
      ('${A}', '${accountA}', 10, '2026-10-11'), ('${B}', '${accountB}', 10, '2026-10-11');
    INSERT INTO public.ai_reports (user_id, question, answer) VALUES ('${A}', 'test', 'test'), ('${B}', 'test', 'test');
    INSERT INTO public.trade_imports (user_id, file_name) VALUES ('${A}', 'a.csv'), ('${B}', 'b.csv');
    INSERT INTO storage.objects (bucket_id, name) VALUES
      ('trade-screenshots', '${A}/trade/a.png'), ('trade-screenshots', '${B}/trade/b.png');
  `);
  return db;
}

async function asUser(db, id = A, role = "authenticated") {
  await db.exec("RESET ROLE");
  await db.query("SELECT set_config('request.jwt.claim.sub', $1, false)", [id]);
  await db.exec(`SET ROLE ${role}`);
}
async function count(db, table) { return (await db.query(`SELECT count(*)::integer AS n FROM ${table}`)).rows[0].n; }
async function apply(db, includeAuth = true) {
  await db.exec("RESET ROLE");
  await db.exec(await readFile(`${migrations}/${hardening}`, "utf8"));
  if (includeAuth) await db.exec(await readFile(`${migrations}/${authHardening}`, "utf8"));
}

test("historical policies reproduce direct data access after profile suspension", async () => {
  const db = await setup();
  try {
    await db.query("UPDATE public.profiles SET status='suspended' WHERE id=$1", [A]);
    await asUser(db);
    assert.equal(await count(db, "public.accounts"), 1);
    assert.equal(await count(db, "storage.objects"), 1);
  } finally { await db.close(); }
});

test("active owners retain access, other owners and anonymous clients stay isolated", async () => {
  const db = await setup();
  try {
    await apply(db);
    for (const id of [A, B]) {
      await asUser(db, id);
      for (const table of personal) assert.equal(await count(db, `public.${table}`), 1, table);
      assert.equal(await count(db, "storage.objects"), 1);
      assert.equal(await count(db, "public.profiles"), 1);
      await assert.rejects(db.query("UPDATE public.profiles SET role='super_admin' WHERE id=$1", [id]), /permission denied/);
      await assert.rejects(db.query("UPDATE public.profiles SET status='active' WHERE id=$1", [id]), /permission denied/);
    }
    await asUser(db, "", "anon");
    for (const table of personal) assert.equal(await count(db, `public.${table}`), 0, table);
    assert.equal(await count(db, "storage.objects"), 0);
  } finally { await db.close(); }
});

test("suspension blocks reads and all write classes, profile remains readable for recovery", async () => {
  const db = await setup();
  try {
    await apply(db);
    await db.query("UPDATE public.profiles SET status='suspended' WHERE id=$1", [A]);
    await asUser(db);
    for (const table of personal) assert.equal(await count(db, `public.${table}`), 0, table);
    assert.equal(await count(db, "storage.objects"), 0);
    assert.equal((await db.query("SELECT status FROM public.profiles")).rows[0].status, "suspended");
    assert.equal((await db.query("UPDATE public.profiles SET name='Changed' RETURNING id")).rows.length, 0);
    assert.equal((await db.query("UPDATE public.accounts SET name='Changed' RETURNING id")).rows.length, 0);
    assert.equal((await db.query("DELETE FROM public.trades RETURNING id")).rows.length, 0);
    assert.equal((await db.query("UPDATE storage.objects SET name=name RETURNING id")).rows.length, 0);
    assert.equal((await db.query("DELETE FROM storage.objects RETURNING id")).rows.length, 0);
    await assert.rejects(db.query("INSERT INTO public.accounts(user_id,name,firm) VALUES($1,'new','Manual')", [A]), /row-level security/);
    await assert.rejects(db.query("INSERT INTO storage.objects(bucket_id,name) VALUES('trade-screenshots',$1)", [`${A}/trade/new.png`]), /row-level security/);
    await asUser(db, B);
    assert.equal(await count(db, "public.accounts"), 1);
    await db.exec("RESET ROLE");
    await db.query("UPDATE public.profiles SET status='active' WHERE id=$1", [A]);
    await asUser(db);
    assert.equal(await count(db, "public.accounts"), 1);
    assert.equal(await count(db, "storage.objects"), 1);
  } finally { await db.close(); }
});

test("restrictive gate cannot grant foreign ownership or affect trusted erasure", async () => {
  const db = await setup();
  try {
    await apply(db);
    await asUser(db);
    assert.equal((await db.query("SELECT * FROM public.accounts WHERE user_id=$1", [B])).rows.length, 0);
    await assert.rejects(db.query("INSERT INTO public.accounts(user_id,name,firm) VALUES($1,'foreign','Manual')", [B]), /row-level security/);
    await assert.rejects(db.query("INSERT INTO storage.objects(bucket_id,name) VALUES('trade-screenshots',$1)", [`${B}/trade/foreign.png`]), /row-level security/);
    await db.exec("RESET ROLE");
    await db.query("UPDATE public.profiles SET status='suspended' WHERE id=$1", [A]);
    await asUser(db, A, "service_role");
    assert.equal(await count(db, "public.accounts"), 2);
    assert.equal(await count(db, "storage.objects"), 2);
  } finally { await db.close(); }
});

test("all direct user tables carry the restrictive lifecycle gate", async () => {
  const db = await setup();
  try {
    await apply(db);
    const rows = (await db.query(`SELECT tablename, permissive, roles, cmd, qual, with_check
      FROM pg_policies WHERE policyname = 'active_profile_required' ORDER BY tablename`)).rows;
    assert.equal(rows.length, 12);
    for (const row of rows) {
      assert.equal(row.permissive, "RESTRICTIVE", row.tablename);
      assert.deepEqual(row.roles, ["authenticated"]);
      assert.equal(row.cmd, "ALL");
      assert.match(row.qual, /has_active_profile/);
      assert.match(row.with_check, /has_active_profile/);
    }
    const bucket = (await db.query("SELECT public FROM storage.buckets WHERE id='trade-screenshots'")).rows[0];
    assert.equal(bucket.public, false);
  } finally { await db.close(); }
});

test("ordinary clients cannot mutate subscriptions or read administrative data", async () => {
  const db = await setup();
  try {
    await apply(db);
    await asUser(db);
    assert.equal((await db.query("UPDATE public.subscriptions SET plan='pro' RETURNING user_id")).rows.length, 0);
    await assert.rejects(db.query("INSERT INTO public.subscriptions(user_id,plan) VALUES($1,'pro')", [B]), /row-level security/);
    for (const table of ["admin_user_metrics", "admin_audit_logs", "admin_settings", "feature_flags", "product_events"]) {
      await assert.rejects(db.query(`SELECT * FROM public.${table}`), /permission denied/, table);
    }
    // Editable preferences still work for an active owner.
    assert.equal((await db.query("UPDATE public.profiles SET name='Trader A' RETURNING name")).rows[0].name, "Trader A");
    assert.equal((await db.query("INSERT INTO public.accounts(user_id,name,firm) VALUES($1,'new','Manual') RETURNING name", [A])).rows[0].name, "new");
  } finally { await db.close(); }
});

test("Auth soft deletion and bans also revoke retained direct data access", async () => {
  const db = await setup();
  try {
    await apply(db, false);
    await db.query("UPDATE auth.users SET deleted_at=now() WHERE id=$1", [A]);
    await asUser(db);
    assert.equal(await count(db, "public.accounts"), 1, "profile-only gate reproduces retained access");
    await db.exec("RESET ROLE");
    await db.exec(await readFile(`${migrations}/${authHardening}`, "utf8"));
    await asUser(db);
    for (const table of personal) assert.equal(await count(db, `public.${table}`), 0, table);
    assert.equal(await count(db, "storage.objects"), 0);
    await db.exec("RESET ROLE");
    await db.query("UPDATE auth.users SET deleted_at=NULL,banned_until=now()+interval '1 hour' WHERE id=$1", [A]);
    await asUser(db);
    assert.equal(await count(db, "public.accounts"), 0);
    await asUser(db, B);
    assert.equal(await count(db, "public.accounts"), 1);
    await db.exec("RESET ROLE");
    await db.query("UPDATE auth.users SET banned_until=now()-interval '1 hour' WHERE id=$1", [A]);
    await asUser(db);
    assert.equal(await count(db, "public.accounts"), 1);
    assert.equal(await count(db, "storage.objects"), 1);
  } finally { await db.close(); }
});
