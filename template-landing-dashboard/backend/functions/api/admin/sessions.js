import { OPERATION_IDS, validOperation } from "../../_lib/operations.js";
import { json } from "../../_lib/admin-auth.js";

const SESSION_ID = /^[0-9a-f-]{36}$/i;
const RANGES = new Set([1, 7, 30, 90, 365]);

export async function onRequestGet({ request, env }) {
  if (!env.DB) return json({ error: "Banco de dados indisponível." }, 503);
  const url = new URL(request.url);
  const operationId = validOperation(url.searchParams.get("operation"));
  if (!operationId || !OPERATION_IDS.includes(operationId)) return json({ error: "Operação inválida." }, 400);

  try {
    const sessionId = url.searchParams.get("session");
    if (sessionId) {
      if (!SESSION_ID.test(sessionId)) return json({ error: "Sessão inválida." }, 400);
      const [events, orders, stripePayments] = await Promise.all([
        env.DB.prepare(`SELECT event_type, country_code, language, offer_key, button_key, payment_method, destination_type, variant_key, page_key,
            device_type, browser_family, os_family, referrer_host, utm_source, utm_medium,
            utm_campaign, utm_content, utm_term, duration_seconds, created_at
          FROM analytics_events WHERE operation_id = ? AND session_id = ?
          ORDER BY created_at ASC LIMIT 250`).bind(operationId, sessionId).all(),
        env.DB.prepare(`SELECT id, asset, amount, status, created_at, paid_at, signature
          FROM orders WHERE operation_id = ? AND session_id = ? ORDER BY created_at ASC LIMIT 20`)
          .bind(operationId, sessionId).all(),
        env.DB.prepare(`SELECT stripe_session_id AS id, plan_key, amount_total, currency, checkout_status AS status,
            payment_status, customer_email, created_at, paid_at
          FROM stripe_payments WHERE operation_id = ? AND analytics_session_id = ? ORDER BY created_at ASC LIMIT 20`)
          .bind(operationId, sessionId).all()
      ]);
      return json({ operationId, sessionId, events: events.results || [], orders: orders.results || [], stripePayments: stripePayments.results || [] });
    }

    const requestedDays = Number(url.searchParams.get("days")) || 7;
    const days = RANGES.has(requestedDays) ? requestedDays : 7;
    const now = Math.floor(Date.now() / 1000);
    const start = now - days * 86400;
    const limit = Math.min(500, Math.max(1, Number(url.searchParams.get("limit")) || 300));
    const [sessions, orders, stripePayments] = await Promise.all([
      env.DB.prepare(`SELECT e.session_id,
          MIN(e.created_at) AS first_seen, MAX(e.created_at) AS last_seen,
          COUNT(*) AS event_count,
          SUM(CASE WHEN e.event_type = 'page_view' THEN 1 ELSE 0 END) AS page_views,
          SUM(CASE WHEN e.event_type = 'offer_click' THEN 1 ELSE 0 END) AS offer_clicks,
          SUM(CASE WHEN e.event_type = 'checkout_started' THEN 1 ELSE 0 END) AS checkout_starts,
          SUM(CASE WHEN e.event_type = 'checkout_created' THEN 1 ELSE 0 END) AS stripe_checkouts,
          SUM(CASE WHEN e.event_type = 'payment_dialog_open' THEN 1 ELSE 0 END) AS payment_dialogs,
          SUM(CASE WHEN e.event_type = 'plan_selected' THEN 1 ELSE 0 END) AS plan_selections,
          SUM(CASE WHEN e.event_type = 'interaction_click' THEN 1 ELSE 0 END) AS interaction_clicks,
          SUM(CASE WHEN e.event_type = 'navigation_back' THEN 1 ELSE 0 END) AS back_navigations,
          SUM(CASE WHEN e.event_type = 'page_exit' THEN 1 ELSE 0 END) AS page_exits,
          SUM(CASE WHEN e.event_type = 'country_selected' THEN 1 ELSE 0 END) AS country_changes,
          SUM(CASE WHEN e.event_type = 'page_view' AND e.variant_key = 'funnel_entry' THEN 1 ELSE 0 END) AS entry_views,
          SUM(CASE WHEN e.event_type = 'page_view' AND e.variant_key = 'funnel_offer' THEN 1 ELSE 0 END) AS offer_views,
          MAX(CASE WHEN e.variant_key IN ('funnel_entry', 'funnel_offer') THEN 1 ELSE 0 END) AS funnel_session,
          MAX(CASE e.button_key WHEN 'scroll_100' THEN 100 WHEN 'scroll_75' THEN 75 WHEN 'scroll_50' THEN 50 WHEN 'scroll_25' THEN 25 ELSE 0 END) AS max_scroll,
          SUM(CASE WHEN e.event_type = 'payment_method' AND COALESCE(e.payment_method, e.offer_key) = 'crypto' THEN 1 ELSE 0 END) AS crypto_choices,
          SUM(CASE WHEN e.event_type = 'payment_method' AND COALESCE(e.payment_method, e.offer_key) = 'card' THEN 1 ELSE 0 END) AS card_choices,
          SUM(COALESCE(e.duration_seconds, 0)) AS engaged_seconds,
          (SELECT x.offer_key FROM analytics_events x WHERE x.operation_id = e.operation_id
            AND x.session_id = e.session_id AND x.event_type = 'plan_selected'
            ORDER BY x.created_at DESC LIMIT 1) AS selected_plan,
          (SELECT x.payment_method FROM analytics_events x WHERE x.operation_id = e.operation_id
            AND x.session_id = e.session_id AND x.event_type = 'payment_method'
            ORDER BY x.created_at DESC LIMIT 1) AS selected_payment,
          (SELECT x.country_code FROM analytics_events x WHERE x.operation_id = e.operation_id
            AND x.session_id = e.session_id AND x.created_at >= ? AND x.created_at <= ?
            AND x.country_code IS NOT NULL ORDER BY x.created_at DESC LIMIT 1) AS country_code,
          (SELECT x.language FROM analytics_events x WHERE x.operation_id = e.operation_id
            AND x.session_id = e.session_id AND x.created_at >= ? AND x.created_at <= ?
            AND x.language IS NOT NULL ORDER BY x.created_at DESC LIMIT 1) AS language,
          (SELECT x.device_type FROM analytics_events x WHERE x.operation_id = e.operation_id
            AND x.session_id = e.session_id AND x.created_at >= ? AND x.created_at <= ?
            AND x.device_type IS NOT NULL ORDER BY x.created_at DESC LIMIT 1) AS device_type,
          (SELECT x.browser_family FROM analytics_events x WHERE x.operation_id = e.operation_id
            AND x.session_id = e.session_id AND x.created_at >= ? AND x.created_at <= ?
            AND x.browser_family IS NOT NULL ORDER BY x.created_at DESC LIMIT 1) AS browser_family,
          (SELECT x.os_family FROM analytics_events x WHERE x.operation_id = e.operation_id
            AND x.session_id = e.session_id AND x.created_at >= ? AND x.created_at <= ?
            AND x.os_family IS NOT NULL ORDER BY x.created_at DESC LIMIT 1) AS os_family,
          MAX(e.referrer_host) AS referrer_host,
          MAX(e.utm_source) AS utm_source, MAX(e.utm_medium) AS utm_medium,
          MAX(e.utm_campaign) AS utm_campaign, MAX(e.utm_content) AS utm_content,
          MAX(e.utm_term) AS utm_term
          , MAX(e.variant_key) AS variant_key
        FROM analytics_events e
        WHERE e.operation_id = ? AND e.created_at >= ? AND e.created_at <= ?
        GROUP BY e.operation_id, e.session_id
        ORDER BY last_seen DESC LIMIT ?`)
        .bind(start, now, start, now, start, now, start, now, start, now, operationId, start, now, limit).all(),
      env.DB.prepare(`SELECT session_id, COUNT(*) AS order_count,
          SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END) AS paid_orders
        FROM orders WHERE operation_id = ? AND created_at >= ? AND created_at <= ?
          AND session_id IS NOT NULL GROUP BY session_id`)
        .bind(operationId, start, now).all(),
      env.DB.prepare(`SELECT analytics_session_id AS session_id, COUNT(*) AS stripe_count,
          SUM(CASE WHEN payment_status = 'paid' THEN 1 ELSE 0 END) AS stripe_paid
        FROM stripe_payments WHERE operation_id = ? AND created_at >= ? AND created_at <= ?
          AND analytics_session_id IS NOT NULL GROUP BY analytics_session_id`)
        .bind(operationId, start, now).all()
    ]);

    const ordersBySession = new Map((orders.results || []).map((row) => [row.session_id, {
      orderCount: Number(row.order_count) || 0,
      paidOrders: Number(row.paid_orders) || 0
    }]));
    const stripeBySession = new Map((stripePayments.results || []).map((row) => [row.session_id, {
      stripeCount: Number(row.stripe_count) || 0,
      stripePaid: Number(row.stripe_paid) || 0
    }]));
    const rows = (sessions.results || []).map((row) => {
      const sessionOrders = ordersBySession.get(row.session_id) || { orderCount: 0, paidOrders: 0 };
      const sessionStripe = stripeBySession.get(row.session_id) || { stripeCount: 0, stripePaid: 0 };
      return {
        ...row,
        event_count: Number(row.event_count) || 0,
        page_views: Number(row.page_views) || 0,
        offer_clicks: Number(row.offer_clicks) || 0,
        checkout_starts: Number(row.checkout_starts) || 0,
        stripe_checkouts: Number(row.stripe_checkouts) || 0,
        checkout_attempts: (Number(row.checkout_starts) || 0) + (Number(row.stripe_checkouts) || 0),
        payment_dialogs: Number(row.payment_dialogs) || 0,
        plan_selections: Number(row.plan_selections) || 0,
        interaction_clicks: Number(row.interaction_clicks) || 0,
        back_navigations: Number(row.back_navigations) || 0,
        page_exits: Number(row.page_exits) || 0,
        country_changes: Number(row.country_changes) || 0,
        entry_views: Number(row.entry_views) || 0,
        offer_views: Number(row.offer_views) || 0,
        funnel_session: Number(row.funnel_session) || 0,
        max_scroll: Number(row.max_scroll) || 0,
        crypto_choices: Number(row.crypto_choices) || 0,
        card_choices: Number(row.card_choices) || 0,
        engaged_seconds: Number(row.engaged_seconds) || 0,
        order_count: sessionOrders.orderCount,
        paid_orders: sessionOrders.paidOrders + sessionStripe.stripePaid,
        payment_attempts: sessionOrders.orderCount + sessionStripe.stripeCount
      };
    });
    return json({ operationId, days, sessions: rows });
  } catch (error) {
    console.error(JSON.stringify({ message: "admin_sessions_failed", error: String(error) }));
    return json({ error: "Não foi possível carregar as sessões." }, 503);
  }
}
