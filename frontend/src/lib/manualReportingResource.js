import { trades, accounts } from "@/lib/api";

export const EMPTY_MANUAL_REPORT = { trades: [], accounts: [] };

export async function fetchManualReport() {
  const [tradeResponse, accountResponse] = await Promise.all([trades.list(), accounts.list()]);
  if (!Array.isArray(tradeResponse?.data) || !Array.isArray(accountResponse?.data)) {
    throw new Error("La réponse du journal est incomplète. Réessaie le chargement.");
  }
  return { trades: tradeResponse.data, accounts: accountResponse.data };
}
