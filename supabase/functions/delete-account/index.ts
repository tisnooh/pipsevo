// Legacy clients must not erase Supabase independently of the private Lab.
// The authenticated backend owns the resumable cross-store erasure job.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
Deno.serve((request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  return new Response(JSON.stringify({ ok: false, error: "Mets PipsEvo à jour et utilise la suppression dans les paramètres." }), {
    status: 410, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
