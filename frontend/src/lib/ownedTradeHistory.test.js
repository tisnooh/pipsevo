import { fetchOwnedTradeHistory } from "./ownedTradeHistory";

function mockClient(rows, cap = 500, failureAt = -1) {
  const builder = {
    select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), order: jest.fn().mockReturnThis(),
    range: jest.fn(async (from, to) => from === failureAt
      ? { data: null, error: new Error("Page indisponible") }
      : { data: rows.slice(from, Math.min(to + 1, from + cap)), error: null }),
  };
  return { from: jest.fn(() => builder), builder };
}

test("loads more than 1000 trades with stable ordering and an owner filter on every page", async () => {
  const rows = Array.from({ length: 1251 }, (_, i) => ({ id: String(i) }));
  const client = mockClient(rows);
  expect(await fetchOwnedTradeHistory(client, "owner", "account")).toEqual(rows);
  expect(client.builder.range.mock.calls).toEqual([[0, 499], [500, 999], [1000, 1499], [1251, 1750]]);
  expect(client.builder.eq.mock.calls.filter(([key]) => key === "user_id")).toEqual(Array(4).fill(["user_id", "owner"]));
  expect(client.builder.eq.mock.calls.filter(([key]) => key === "account_id")).toHaveLength(4);
  expect(client.builder.order).toHaveBeenCalledWith("id", { ascending: true });
});

test("does not truncate when the server imposes a lower result cap", async () => {
  const rows = Array.from({ length: 205 }, (_, i) => ({ id: String(i) }));
  expect(await fetchOwnedTradeHistory(mockClient(rows, 100), "owner")).toEqual(rows);
});

test("fails instead of returning partial history when a later page is unavailable", async () => {
  const client = mockClient(Array(501).fill({ id: "row" }), 500, 500);
  await expect(fetchOwnedTradeHistory(client, "owner")).rejects.toThrow("Page indisponible");
});
