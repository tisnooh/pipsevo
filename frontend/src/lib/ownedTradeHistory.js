export async function fetchOwnedTradeHistory(client, userId, accountId) {
  const rows = [];
  const pageSize = 500;
  for (let from = 0; ; ) {
    let query = client.from("trades").select("*").eq("user_id", userId)
      .order("date", { ascending: false }).order("created_at", { ascending: false }).order("id", { ascending: true });
    if (accountId) query = query.eq("account_id", accountId);
    const { data, error } = await query.range(from, from + pageSize - 1);
    if (error) throw error;
    if (!data?.length) break;
    rows.push(...data);
    // Advance by the actual result size, including when the server cap is lower
    // than our requested page size. Stop only after an empty page.
    from += data.length;
  }
  return rows;
}
