import { OPERATION_IDS, validOperation } from "../../_lib/operations.js";
import { json } from "../../_lib/admin-auth.js";

export async function onRequestGet({ request, env }) {
  if (!env.DB) return json({ error: "Banco de dados indisponível." }, 503);
  const url = new URL(request.url);
  const operationId = validOperation(url.searchParams.get("operation"));
  if (!operationId || !OPERATION_IDS.includes(operationId)) return json({ error: "Operação inválida." }, 400);
  const limit = Math.min(300, Math.max(1, Number(url.searchParams.get("limit")) || 100));
  const before = Math.floor(Date.now() / 1000) - 365 * 86400;
  try {
    const result = await env.DB.prepare(`SELECT session_id, event_type, country_code, language, offer_key, button_key, payment_method, destination_type, variant_key, device_type,
      browser_family, os_family, page_key, referrer_host, utm_source, utm_medium, utm_campaign,
      utm_content, utm_term, duration_seconds, created_at
      FROM analytics_events WHERE operation_id = ? AND created_at >= ? ORDER BY created_at DESC LIMIT ?`)
      .bind(operationId, before, limit).all();
    return json({ events: result.results || [] });
  } catch (error) {
    console.error(JSON.stringify({ message: "admin_events_failed", operationId, error: String(error) }));
    return json({ error: "Não foi possível carregar os eventos." }, 503);
  }
}
