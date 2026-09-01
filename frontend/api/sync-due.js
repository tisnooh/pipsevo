export default async function handler(request, response) {
  if (request.method !== "GET") {
    return response.status(405).json({ error: "Method not allowed" });
  }
  const secret = process.env.CRON_SECRET;
  const backend = (process.env.BACKEND_INTERNAL_URL || "").replace(/\/$/, "");
  if (!secret || !backend || request.headers.authorization !== `Bearer ${secret}`) {
    return response.status(401).json({ error: "Unauthorized" });
  }
  try {
    const upstream = await fetch(`${backend}/api/integrations/internal/sync-due`, {
      method: "POST",
      headers: { Authorization: `Bearer ${secret}` },
    });
    const body = await upstream.json().catch(() => ({}));
    return response.status(upstream.status).json(body);
  } catch {
    return response.status(503).json({ error: "Synchronization backend unavailable" });
  }
}
