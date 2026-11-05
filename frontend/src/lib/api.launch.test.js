const mockCalls = [];
let mockResponses = {};
const mockHttp = { get: jest.fn(), post: jest.fn(), delete: jest.fn(), interceptors: { request: { use: jest.fn() }, response: { use: jest.fn() } } };
const mockSupabase = { auth: { getUser: jest.fn(), signOut: jest.fn(), getSession: jest.fn(), updateUser: jest.fn() }, from: jest.fn() };
jest.mock("axios", () => ({ create: () => mockHttp }));
jest.mock("@/lib/supabase", () => ({ supabase: mockSupabase, SUPABASE_AUTH_STORAGE_KEY: "fixture-auth-key" }));
jest.mock("@/lib/appDataEvents", () => ({ notifyAppDataChanged: jest.fn() }));
const { auth, trades, accounts } = require("./api");
const handleApiError = mockHttp.interceptors.response.use.mock.calls[0][1];

function table(name) {
  const query = { table: name, op: "read", filters: [] };
  const execute = () => {
    mockCalls.push({ ...query, filters: [...query.filters] });
    const queue = mockResponses[`${name}:${query.op}`] || [];
    if (!queue.length) throw new Error(`Unexpected fixture operation ${name}:${query.op}`);
    return Promise.resolve(queue.shift());
  };
  const builder = {
    select: () => builder, order: () => builder,
    eq: (key, value) => { query.filters.push([key, value]); return builder; },
    range: () => execute(), single: () => execute(), maybeSingle: () => execute(),
    insert: values => { query.op = "insert"; query.payload = values; return builder; },
    update: values => { query.op = "update"; query.payload = values; return builder; },
    delete: () => { query.op = "delete"; return builder; },
    then: (resolve, reject) => execute().then(resolve, reject),
  };
  return builder;
}
const account = { id: "a1", user_id: "user", balance: 50000, initial_balance: 50000, max_drawdown: 2500 };
const row = (index = 1) => ({ account_id: "a1", date: "2026-10-10", instrument: "NQ", direction: "long", pnl: 100,
  result_status: "winner", external_trade_id: `fixture-${index}`, entry_time: "2026-10-10T09:30:00Z", commission: null, size: null, provider_currency: "USD" });
const requestId = "12345678-1234-4123-8123-123456789abc";
const manualPayload = { account_id: "a1", date: "2026-10-10", instrument: "NQ", direction: "long", pnl: 50, result_status: "winner", provider_currency: "USD", screenshots: [] };
const savedManual = { ...manualPayload, id: requestId, user_id: "user", commission: 0 };
beforeEach(() => {
  jest.clearAllMocks(); mockCalls.length = 0;
  mockSupabase.from.mockImplementation(table);
  mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: "user" } }, error: null });
  mockSupabase.auth.signOut.mockResolvedValue({ error: null });
  mockSupabase.auth.updateUser.mockResolvedValue({ error: null });
  mockSupabase.auth.getSession.mockResolvedValue({ data: { session: { access_token: "fixture-current-session" } }, error: null });
  mockResponses = {
    "accounts:read": [{ data: [account] }, { data: [] }], "integration_accounts:read": [{ data: [] }],
    "trades:read": [{ data: [] }], "trade_imports:insert": [{ data: { id: "batch" } }],
    "trade_imports:update": [{ error: null }],
  };
});

test("a manual creation uses the stable form ID as its database primary key", async () => {
  mockResponses["trades:insert"] = [{ data: savedManual }];
  expect((await trades.create(manualPayload, { requestId })).data).toMatchObject({ id: requestId, pnl: 50 });
  expect(mockCalls.find(call => call.table === "trades" && call.op === "insert").payload).toMatchObject({ id: requestId, user_id: "user" });
});

test.each([
  { code: "23505", message: "Duplicate primary key" },
  { message: "Response lost after commit" },
])("an existing owned creation is recovered after an ambiguous insert: %p", async error => {
  mockResponses["trades:insert"] = [{ error }];
  mockResponses["trades:read"] = [{ data: savedManual }];
  expect((await trades.create(manualPayload, { requestId })).data).toMatchObject({ id: requestId, pnl: 50 });
  const read = mockCalls.find(call => call.table === "trades" && call.op === "read");
  expect(read.filters).toEqual(expect.arrayContaining([["id", requestId], ["user_id", "user"]]));
  expect(mockCalls.filter(call => call.table === "trades" && call.op === "insert")).toHaveLength(1);
  expect(mockCalls.some(call => call.op === "delete" || call.op === "update")).toBe(false);
});

test("an insert with no confirmed persisted row remains a failed save", async () => {
  mockResponses["trades:insert"] = [{ error: { message: "Network unavailable" } }];
  mockResponses["trades:read"] = [{ data: null }];
  await expect(trades.create(manualPayload, { requestId })).rejects.toThrow("Network unavailable");
});

test("changed data cannot silently overwrite a first creation recovered on retry", async () => {
  mockResponses["trades:insert"] = [{ error: { code: "23505" } }];
  mockResponses["trades:read"] = [{ data: { ...savedManual, pnl: 80 } }];
  await expect(trades.create(manualPayload, { requestId })).rejects.toMatchObject({ saved_trade_id: requestId, response: { status: 409 } });
  expect(mockCalls.some(call => call.op === "delete" || call.op === "update")).toBe(false);
});

test("a foreign recovery row is never accepted as the saved manual trade", async () => {
  mockResponses["trades:insert"] = [{ error: { code: "23505", message: "Conflict" } }];
  mockResponses["trades:read"] = [{ data: { ...savedManual, user_id: "foreign" } }];
  await expect(trades.create(manualPayload, { requestId })).rejects.toThrow("Conflict");
});

test("a recovery read error cannot claim a successful creation", async () => {
  mockResponses["trades:insert"] = [{ error: { code: "23505" } }];
  mockResponses["trades:read"] = [{ error: { message: "Read unavailable" } }];
  await expect(trades.create(manualPayload, { requestId })).rejects.toThrow("Read unavailable");
});

test("a creation response with the wrong request ID is rejected", async () => {
  mockResponses["trades:insert"] = [{ data: { ...savedManual, id: "foreign" } }];
  await expect(trades.create(manualPayload, { requestId })).rejects.toMatchObject({ response: { status: 503 } });
});

test("a malformed manual request ID is rejected before any trade write", async () => {
  await expect(trades.create(manualPayload, { requestId: "not-a-uuid" })).rejects.toMatchObject({ response: { status: 422 } });
  expect(mockCalls.some(call => call.op === "insert")).toBe(false);
});

test.each([undefined, "Bearer fixture-old-session"])("a public or stale 401 never signs out the active session (%s)", async authorization => {
  const error = { response: { status: 401 }, config: { headers: { Authorization: authorization } } };
  await expect(handleApiError(error)).rejects.toBe(error);
  expect(mockSupabase.auth.signOut).not.toHaveBeenCalled();
});

test("a rejected current session is hidden even if the local sign-out request fails", async () => {
  const expired = jest.fn(); window.addEventListener("pipsevo:session-expired", expired);
  try {
    mockSupabase.auth.signOut.mockRejectedValueOnce(new Error("offline"));
    const error = { response: { status: 401 }, config: { headers: { Authorization: "Bearer fixture-current-session" } } };
    await expect(handleApiError(error)).rejects.toBe(error);
    expect(mockSupabase.auth.signOut).toHaveBeenCalledWith({ scope: "local" });
    expect(expired).toHaveBeenCalledTimes(1);
  } finally { window.removeEventListener("pipsevo:session-expired", expired); }
});

test("a profile update affecting no row cannot report a successful save", async () => {
  mockResponses["profiles:update"] = [{ data: null, error: null }];
  await expect(auth.update({ rules: { max_trades: 3 } })).rejects.toMatchObject({ response: { status: 503 } });
  expect(mockCalls.find(call => call.table === "profiles" && call.op === "update").filters).toContainEqual(["id", "user"]);
});

test("a profile update returning another identity is rejected", async () => {
  mockResponses["profiles:update"] = [{ data: { id: "other-user" }, error: null }];
  await expect(auth.update({ journal_preferences: {} })).rejects.toMatchObject({ response: { status: 503 } });
});

test("a successful profile save returns the freshly loaded same-owner profile", async () => {
  mockResponses["profiles:update"] = [{ data: { id: "user" }, error: null }];
  mockResponses["profiles:read"] = [{ data: { id: "user", name: "Saved name", rules: { max_trades: 5 } } }];
  mockResponses["subscriptions:read"] = [{ data: { user_id: "user", plan: "free" } }];
  expect(await auth.update({ name: "Saved name", role: "super_admin" })).toEqual({ data: expect.objectContaining({ id: "user", name: "Saved name", plan: "free" }) });
  expect(mockCalls.find(call => call.table === "profiles" && call.op === "update").payload).toEqual({ name: "Saved name" });
  expect(mockSupabase.auth.updateUser).toHaveBeenCalledWith({ data: { display_name: "Saved name" } });
});

test("an account switch after a DB save never updates the new user's auth metadata", async () => {
  mockResponses["profiles:update"] = [{ data: { id: "user" }, error: null }];
  mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: { id: "user" } }, error: null });
  mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: { id: "new-user" } }, error: null });
  await expect(auth.update({ name: "Old account draft" })).rejects.toMatchObject({ response: { status: 409 } });
  expect(mockSupabase.auth.updateUser).not.toHaveBeenCalled();
});

test.each(["profile", "subscription"])("a foreign %s cannot be attached to the session", async kind => {
  mockResponses["profiles:read"] = Array.from({ length: 4 }, () => ({ data: { id: kind === "profile" ? "foreign" : "user", role: "super_admin" } }));
  mockResponses["subscriptions:read"] = Array.from({ length: 4 }, () => ({ data: kind === "subscription" ? { user_id: "foreign", plan: "pro" } : null }));
  await expect(auth.me()).rejects.toMatchObject({ response: { status: 503, data: { detail: expect.stringContaining("ne correspond pas") } } });
});

test("valid CSV timestamps/currency survive the adapter and nullable defaults do not fail the DB schema", async () => {
  mockResponses["trades:insert"] = [{ data: [{ id: "saved", ...row() }] }];
  const result = await trades.importCsv({ fileName: "fixture.csv", rows: [row()], totalRows: 1 });
  expect(result.data.trades).toHaveLength(1);
  const payload = mockCalls.find(call => call.table === "trades" && call.op === "insert").payload[0];
  expect(payload).toMatchObject({ user_id: "user", provider_currency: "USD", entry_time: "09:30:00", import_fingerprint: "id|a1|fixture-1", import_batch_id: "batch" });
  expect(payload).not.toHaveProperty("size"); expect(payload).not.toHaveProperty("commission");
});

test("trade reads use stored native account currency, not display preferences", async () => {
  mockResponses["integration_accounts:read"] = [{ data: [{ id: "linked", user_id: "user", account_id: "a1", currency: "EUR", provider: "ctrader" }] }, { data: [] }];
  mockResponses["trades:read"] = [{ data: [{ id: "trade", account_id: "a1", source_provider: "ctrader", pnl: 100, result_status: "closed", provider_metadata: { pnl_source: "provider" } }] }, { data: [] }];
  const result = await trades.list();
  expect(result.data[0]).toMatchObject({ pnl: 100, provider_currency: "EUR", currency_available: true });
});

test("an explicit stored native currency is preserved without a linked platform", async () => {
  mockResponses["accounts:read"] = [{ data: [{ ...account, currency: "EUR" }] }, { data: [] }];
  mockResponses["trades:read"] = [{ data: [{ id: "trade", account_id: "a1", pnl: 100 }] }, { data: [] }];
  const result = await trades.list();
  expect(result.data[0]).toMatchObject({ pnl: 100, provider_currency: "EUR", currency_available: true });
});

test("annotations remain editable on a provider trade with unknown native currency", async () => {
  mockResponses["integration_accounts:read"] = [{ data: [{ id: "linked", user_id: "user", account_id: "a1", provider: "ctrader" }] }, { data: [] }];
  mockResponses["trades:read"] = [{ data: { id: "saved", account_id: "a1", source_provider: "ctrader", pnl: null } }];
  mockResponses["trades:update"] = [{ data: { id: "saved", account_id: "a1", source_provider: "ctrader", pnl: null, notes: "My review" } }];
  await trades.update("saved", { notes: "My review", plan_respected: true });
  const mutation = mockCalls.find(call => call.table === "trades" && call.op === "update");
  expect(mutation.payload).toEqual({ notes: "My review", plan_respected: true });
  expect(mutation.filters).toContainEqual(["user_id", "user"]);
});

test("fresh duplicate check protects reimports even when the preview was stale", async () => {
  mockResponses["trades:read"] = [{ data: [{ id: "saved", ...row() }] }, { data: [] }];
  const result = await trades.importCsv({ fileName: "fixture.csv", rows: [row()], totalRows: 1 });
  expect(result.data.trades).toHaveLength(0);
  expect(result.data.batch.skipped_rows).toBe(1);
  expect(mockCalls.some(call => call.table === "trades" && call.op === "insert")).toBe(false);
});

test("a duplicate inserted by another tab is verified by owner and fingerprint", async () => {
  mockResponses["trades:insert"] = [{ error: { code: "23505" } }, { error: { code: "23505" } }];
  mockResponses["trades:read"].push({ data: { id: "concurrent" } });
  const result = await trades.importCsv({ fileName: "fixture.csv", rows: [row()], totalRows: 1 });
  expect(result.data.batch.skipped_rows).toBe(1);
  expect(mockCalls.find(call => call.table === "trades" && call.op === "read" && call.filters.some(([key]) => key === "import_fingerprint")).filters).toContainEqual(["user_id", "user"]);
});

test("report failure preserves saved trades and reports pending status", async () => {
  mockResponses["trades:insert"] = [{ data: [{ id: "saved", ...row() }] }];
  mockResponses["trade_imports:update"] = [{ error: { message: "report unavailable" } }];
  const result = await trades.importCsv({ fileName: "fixture.csv", rows: [row()], totalRows: 1 });
  expect(result.data.report_pending).toBe(true);
  expect(result.data.trades).toHaveLength(1);
  expect(mockCalls.some(call => call.op === "delete")).toBe(false);
});

test("later chunk failure never rolls back earlier successful trades implicitly", async () => {
  const rows = Array.from({ length: 201 }, (_, index) => row(index));
  mockResponses["trades:insert"] = [{ data: rows.slice(0, 200) }, { error: { message: "network interrupted" } }];
  await expect(trades.importCsv({ fileName: "fixture.csv", rows, totalRows: 201 })).rejects.toMatchObject({ response: { status: 503, data: { detail: expect.stringContaining("200 trade(s) ont été conservés") } } });
  expect(mockCalls.some(call => call.op === "delete")).toBe(false);
  expect(mockCalls.find(call => call.table === "trade_imports" && call.op === "update").payload.imported_rows).toBe(200);
});

test("a wrong currency is rejected before any batch or trade is inserted", async () => {
  await expect(trades.importCsv({ fileName: "fixture.csv", rows: [{ ...row(), provider_currency: "EUR" }], totalRows: 1 })).rejects.toThrow("devise");
  expect(mockCalls.some(call => call.op === "insert")).toBe(false);
});

test("manual account updates do not keep stale drawdown at zero", async () => {
  mockResponses["accounts:update"] = [{ data: { ...account, balance: 48000 } }];
  await accounts.update("a1", { balance: 48000 });
  expect(mockCalls.find(call => call.table === "accounts" && call.op === "update").payload).toMatchObject({ current_drawdown: 2000 });
});

test("account deletion is coordinated; failed confirmation never purges Backtest Lab", async () => {
  await expect(auth.deleteAccount("wrong")).rejects.toMatchObject({ response: { status: 422 } });
  expect(mockHttp.post).not.toHaveBeenCalled();
  mockHttp.post.mockResolvedValue({ data: { ok: true, cleanup_pending: true } });
  expect(await auth.deleteAccount("SUPPRIMER")).toEqual({ data: { ok: true, cleanup_pending: true } });
  expect(mockHttp.post).toHaveBeenCalledWith("/account/delete", { confirmation: "SUPPRIMER" });
  expect(mockHttp.delete).not.toHaveBeenCalled();
});
