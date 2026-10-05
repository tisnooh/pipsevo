const date = new Date();
const day = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
const sampleAccounts = [{ id: 'demo-account', name: 'Compte fictif', firm: 'Démo', balance: 50490, capital: 50000, initial_balance: 50000, max_drawdown: 4000, profit_target: 3000, status: 'active' }];
const sampleTrades = [
  { id: 'demo-1', account_id: 'demo-account', date: day, instrument: 'NQ', direction: 'long', pnl: 650, result_status: 'closed', plan_respected: true, entry_time: '09:30:00', tags: [], screenshots: [] },
  { id: 'demo-2', account_id: 'demo-account', date: day, instrument: 'ES', direction: 'short', pnl: -160, result_status: 'closed', plan_respected: false, entry_time: '10:30:00', tags: [], screenshots: [] },
];
const readonly = async () => { throw new Error('Visual fixture is read-only'); };
export const dashboard = async () => ({ data: { kpis: { total_trades: 2, total_profit: 490, remaining_drawdown: 4000, active_accounts: 1, discipline_score: 50 }, metrics: { plan_respect_rate: 50 } } });
export const trades = { list: async () => ({ data: sampleTrades }), create: readonly, update: readonly, delete: readonly };
export const accounts = { list: async () => ({ data: sampleAccounts }), create: readonly, update: readonly, delete: readonly };
export const coach = { briefing: async () => ({ data: { alerts: [] } }) };
export const tradeScreenshots = { upload: readonly, delete: readonly, get: readonly };
