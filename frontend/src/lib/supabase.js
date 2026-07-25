import { createClient } from "@supabase/supabase-js";

// Ces deux valeurs sont publiques par conception. Les variables d’environnement
// permettent de les remplacer par environnement, et le fallback garde les
// déploiements Vercel existants fonctionnels dès le premier push.
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || "https://zwnrmnoutwhazhgoomoi.supabase.co";
const publishableKey = process.env.REACT_APP_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_HkC7wGQyOhDuUJFINnwE-g_U-Nxwt1a";
export const SUPABASE_AUTH_STORAGE_KEY = "pipsevo_supabase_auth";

if (!supabaseUrl || !publishableKey) {
  throw new Error("Configuration Supabase manquante. Renseigne REACT_APP_SUPABASE_URL et REACT_APP_SUPABASE_PUBLISHABLE_KEY.");
}

export const supabase = createClient(supabaseUrl, publishableKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: SUPABASE_AUTH_STORAGE_KEY,
  },
});
