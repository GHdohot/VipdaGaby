import { currentOperation } from "../_lib/operations.js";
import { readJson } from "../_lib/read-json.js";

const EVENTS = new Set([
  "page_view", "country_detected", "country_selected", "offer_click",
  "payment_method", "checkout_started", "checkout_created", "payment_confirmed", "payment_failed",
  "payment_asset_selected", "payment_dialog_open", "page_engaged", "page_exit", "navigation_back",
  "interaction_click", "scroll_depth", "preview_paywall_view", "plan_selected", "lead_context"
]);
const LANGUAGES = new Set(["pt", "es", "en", "fr", "de", "it", "ru", "ja", "ko", "zh", "ar", "tr", "hi", "nl", "pl", "sv", "th", "id", "vi"]);
const DEVICE_TYPES = new Set(["mobile", "tablet", "desktop", "unknown"]);
const BROWSERS = new Set(["chrome", "safari", "firefox", "edge", "other", "unknown"]);
const SYSTEMS = new Set(["android", "ios", "windows", "macos", "linux", "other", "unknown"]);
const PAGES = new Set(["landing", "checkout"]);
const OFFERS = new Set(["primary", "brazil", "english", "spanish", "arabic", "crypto", "card", "USDC", "USDT", "SOL", "template_funnel", "seven_days", "monthly", "lifetime"]);
const BUTTONS = new Set(["primary", "brazil", "english", "spanish", "arabic", "funnel_continue", "funnel_crypto", "funnel_card", "funnel_back", "payment_close", "stripe_close", "crypto_close", "plan_seven_days", "plan_monthly", "plan_lifetime", "country_selector", "scroll_25", "scroll_50", "scroll_75", "scroll_100"]);
const PAYMENT_METHODS = new Set(["crypto", "card"]);
const DESTINATIONS = new Set(["payment_selector", "telegram", "crypto_checkout", "funnel_offer"]);
const VARIANTS = new Set(["control", "short", "full", "cover", "checkout", "funnel_entry", "funnel_offer"]);

function safeEnum(value, choices) {
  return typeof value === "string" && choices.has(value) ? value : null;
}

function safeCountry(value) {
  return typeof value === "string" && /^[A-Z]{2}$/.test(value) ? value : null;
}

function safeUtm(value) {
  if (typeof value !== "string") return null;
  return value.replace(/[^\p{L}\p{N}._ -]/gu, "").trim().slice(0, 80) || null;
}

function safeHostname(value) {
  if (typeof value !== "string") return null;
  const host = value.toLowerCase().trim().slice(0, 180);
  return /^[a-z0-9.-]+$/.test(host) && !host.startsWith(".") && !host.endsWith(".") && !host.includes("..") ? host : null;
}

function validId(value) {
  return typeof value === "string" && /^[0-9a-f-]{36}$/i.test(value);
}

function json(data, status = 200) {
  return Response.json(data, {
    status,
    headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" }
  });
}

export async function onRequestPost({ request, env }) {
  if (!env.DB) return json({ error: "Analytics indisponível." }, 503);
  const origin = request.headers.get("Origin");
  try {
    const originUrl = origin ? new URL(origin) : null;
    const isLocalOrigin = originUrl && (env.ENVIRONMENT === "development" || env.CF_PAGES_BRANCH === "local") &&
      /^https?:$/.test(originUrl.protocol) && ["localhost", "127.0.0.1"].includes(originUrl.hostname);
    if (origin && originUrl.origin !== new URL(env.SITE_ORIGIN).origin && !isLocalOrigin) return json({ error: "Origem inválida." }, 403);
  } catch {
    return json({ error: "Origem inválida." }, 403);
  }

  let body;
  try {
    body = await readJson(request, 4096);
  } catch {
    return json({ error: "Evento inválido." }, 400);
  }

  if (!validId(body?.id) || !validId(body?.sessionId) || !EVENTS.has(body?.type)) {
    return json({ error: "Evento inválido." }, 400);
  }

  const now = Math.floor(Date.now() / 1000);
  const operationId = currentOperation(env);
  const page = safeEnum(body.page, PAGES) || "landing";
  const referrer = safeHostname(body.referrerHost);
  const utm = body.utm && typeof body.utm === "object" ? body.utm : {};
  const duration = body.durationSeconds == null ? null : Math.max(0, Math.min(3600, Math.floor(Number(body.durationSeconds) || 0)));
  try {
    const recent = await env.DB.prepare(`SELECT COUNT(*) AS count FROM analytics_events
      WHERE operation_id = ? AND session_id = ? AND created_at >= ?`)
      .bind(operationId, body.sessionId, now - 86400).first();
    if (Number(recent?.count) >= 1200) return json({ error: "Limite de eventos desta sessão atingido." }, 429);

    await env.DB.prepare(`
      INSERT OR IGNORE INTO analytics_events (
        id, operation_id, session_id, event_type, country_code, language, offer_key,
        device_type, browser_family, os_family, page_key, referrer_host,
        utm_source, utm_medium, utm_campaign, utm_content, utm_term, duration_seconds,
        button_key, payment_method, destination_type, variant_key, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      body.id, operationId, body.sessionId, body.type,
      safeCountry(body.country), safeEnum(body.language, LANGUAGES), safeEnum(body.offer, OFFERS),
      safeEnum(body.device, DEVICE_TYPES), safeEnum(body.browser, BROWSERS), safeEnum(body.os, SYSTEMS),
      page, referrer,
      safeUtm(utm.source), safeUtm(utm.medium), safeUtm(utm.campaign), safeUtm(utm.content), safeUtm(utm.term), duration,
      safeEnum(body.button, BUTTONS), safeEnum(body.paymentMethod, PAYMENT_METHODS), safeEnum(body.destination, DESTINATIONS), safeEnum(body.variant, VARIANTS), now
    ).run();

    const day = new Date(now * 1000).toISOString().slice(0, 10);
    const cleanup = await env.DB.prepare(`
      INSERT INTO analytics_maintenance (operation_id, cleanup_day) VALUES (?, ?)
      ON CONFLICT(operation_id) DO UPDATE SET cleanup_day = excluded.cleanup_day
      WHERE analytics_maintenance.cleanup_day != excluded.cleanup_day
    `).bind(operationId, day).run();
    if (cleanup.meta?.changes) {
      await env.DB.prepare("DELETE FROM analytics_events WHERE operation_id = ? AND created_at < ?")
        .bind(operationId, now - 365 * 86400).run();
    }
    return json({ accepted: true }, 202);
  } catch (error) {
    console.error(JSON.stringify({ message: "analytics_event_failed", error: String(error) }));
    return json({ error: "Não foi possível registrar o evento." }, 503);
  }
}
