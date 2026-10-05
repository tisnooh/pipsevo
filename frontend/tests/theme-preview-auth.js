const user = { id: 'theme-fixture', name: 'Démo locale', trader_type: 'futures', plan: 'pro', rules: {} };
export const useAuth = () => ({ user, logout: async () => { throw new Error('Fixture read-only'); } });
