import { createClient } from "npm:@supabase/supabase-js@2.110.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: Record<string, unknown>, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, "Content-Type": "application/json" },
});

async function listStoragePaths(
  admin: ReturnType<typeof createClient>,
  prefix: string,
  depth = 0,
): Promise<string[]> {
  if (depth > 8) return [];
  const paths: string[] = [];
  let offset = 0;

  while (true) {
    const { data, error } = await admin.storage.from("trade-screenshots").list(prefix, {
      limit: 100,
      offset,
      sortBy: { column: "name", order: "asc" },
    });
    if (error) throw error;
    if (!data?.length) break;

    for (const item of data) {
      const path = `${prefix}/${item.name}`;
      if (item.id || item.metadata) paths.push(path);
      else paths.push(...await listStoragePaths(admin, path, depth + 1));
    }
    if (data.length < 100) break;
    offset += data.length;
  }

  return paths;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ ok: false, error: "Méthode non autorisée." }, 405);

  const authorization = request.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) return json({ ok: false, error: "Session requise." }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceRoleKey) return json({ ok: false, error: "Configuration serveur incomplète." }, 500);

  let payload: { confirmation?: string };
  try {
    payload = await request.json();
  } catch {
    return json({ ok: false, error: "Requête invalide." }, 400);
  }
  if (payload.confirmation !== "SUPPRIMER") return json({ ok: false, error: "Confirmation invalide." }, 400);

  const token = authorization.slice("Bearer ".length);
  const caller = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: { user }, error: userError } = await caller.auth.getUser(token);
  if (userError || !user) return json({ ok: false, error: "Session invalide ou expirée." }, 401);

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    const storagePaths = await listStoragePaths(admin, user.id);
    if (storagePaths.length) {
      const { error: storageError } = await admin.storage.from("trade-screenshots").remove(storagePaths);
      if (storageError) throw storageError;
    }

    // La clé service_role reste exclusivement dans cette fonction serveur.
    // La suppression de auth.users déclenche les cascades vers les données métier.
    const { error: deleteError } = await admin.auth.admin.deleteUser(user.id, false);
    if (deleteError) throw deleteError;
    return json({ ok: true });
  } catch (error) {
    console.error("delete-account", error);
    return json({ ok: false, error: "La suppression n’a pas pu être finalisée." }, 500);
  }
});
