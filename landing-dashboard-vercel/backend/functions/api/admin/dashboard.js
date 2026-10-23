import { OPERATION_IDS, validOperation } from "../../_lib/operations.js";
import { json } from "../../_lib/admin-auth.js";

function parseDays(value) {
  const days = Number(value);
  return [1, 7, 30, 90, 365].includes(days) ? days : 7;
}

function isIsoDate(value) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function dateBoundary(value, fallback) {
  if (!isIsoDate(value)) return fallback;
  const parsed = Date.parse(`${value}T00:00:00Z`);
  return Number.isFinite(parsed) ? Math.floor(parsed / 1000) : fallback;
}

export async function onRequestGet({ request, env }) {
  if (!env.DB) return json({ error: "Banco de dados indisponível." }, 503);
  const url = new URL(request.url);
  const operationId = validOperation(url.searchParams.get("operation"));
  if (!operationId || !OPERATION_IDS.includes(operationId)) return json({ error: "Operação inválida." }, 400);
  const now = Math.floor(Date.now() / 1000);
  const days = parseDays(url.searchParams.get("days"));
  const start = dateBoundary(url.searchParams.get("from"), now - days * 86400);
  const end = dateBoundary(url.searchParams.get("to"), now + 86400);
  if (end <= start || end - start > 365 * 86400 + 86400) return json({ error: "Intervalo inválido (máximo de 365 dias)." }, 400);

  try {
    const [events, orders, orderStats, assets, countries, languages, offers, paymentMethods, methodsByCountry, offerFunnels, variants, devices, sources, sourceSales, daily, campaigns] = await Promise.all([
      env.DB.prepare(`SELECT event_type, COUNT(*) AS events, COUNT(DISTINCT session_id) AS sessions
        FROM analytics_events WHERE operation_id = ? AND created_at >= ? AND created_at < ? GROUP BY event_type`)
        .bind(operationId, start, end).all(),
      env.DB.prepare(`SELECT id, asset, amount, status, created_at, paid_at, signature
        FROM orders WHERE operation_id = ? AND created_at >= ? AND created_at < ? ORDER BY created_at DESC LIMIT 100`)
        .bind(operationId, start, end).all(),
      env.DB.prepare(`SELECT COUNT(*) AS total,
          SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END) AS paid,
          SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending
        FROM orders WHERE operation_id = ? AND created_at >= ? AND created_at < ?`)
        .bind(operationId, start, end).first(),
      env.DB.prepare(`SELECT asset, COUNT(*) AS count FROM orders
        WHERE operation_id = ? AND status = 'paid' AND created_at >= ? AND created_at < ? GROUP BY asset ORDER BY count DESC`)
        .bind(operationId, start, end).all(),
      env.DB.prepare(`SELECT country_code AS code, COUNT(DISTINCT session_id) AS sessions
        FROM analytics_events WHERE operation_id = ? AND created_at >= ? AND created_at < ? AND country_code IS NOT NULL
        GROUP BY country_code ORDER BY sessions DESC LIMIT 15`)
        .bind(operationId, start, end).all(),
      env.DB.prepare(`SELECT language AS label, COUNT(DISTINCT session_id) AS sessions
        FROM analytics_events WHERE operation_id = ? AND created_at >= ? AND created_at < ? AND language IS NOT NULL
        GROUP BY language ORDER BY sessions DESC LIMIT 12`)
        .bind(operationId, start, end).all(),
      env.DB.prepare(`SELECT COALESCE(button_key, offer_key) AS label, COUNT(*) AS events, COUNT(DISTINCT session_id) AS sessions
        FROM analytics_events WHERE operation_id = ? AND created_at >= ? AND created_at < ?
          AND event_type = 'offer_click' AND COALESCE(button_key, offer_key) IS NOT NULL
        GROUP BY label ORDER BY events DESC LIMIT 12`)
        .bind(operationId, start, end).all(),
      env.DB.prepare(`SELECT COALESCE(payment_method, offer_key) AS label, COUNT(*) AS events, COUNT(DISTINCT session_id) AS sessions
        FROM analytics_events WHERE operation_id = ? AND created_at >= ? AND created_at < ?
          AND event_type = 'payment_method' AND COALESCE(payment_method, offer_key) IN ('crypto', 'card')
        GROUP BY label ORDER BY events DESC`)
        .bind(operationId, start, end).all(),
      env.DB.prepare(`SELECT COALESCE(country_code, '??') AS country, COALESCE(payment_method, offer_key) AS method,
          COUNT(*) AS events, COUNT(DISTINCT session_id) AS sessions
        FROM analytics_events WHERE operation_id = ? AND created_at >= ? AND created_at < ?
          AND event_type = 'payment_method' AND COALESCE(payment_method, offer_key) IN ('crypto', 'card')
        GROUP BY country, method ORDER BY sessions DESC, country ASC`)
        .bind(operationId, start, end).all(),
      env.DB.prepare(`WITH clicked AS (
          SELECT session_id, COALESCE(button_key, offer_key) AS offer
          FROM analytics_events WHERE operation_id = ? AND created_at >= ? AND created_at < ? AND event_type = 'offer_click'
          GROUP BY session_id, offer
        ), methods AS (
          SELECT session_id, offer_key AS offer,
            MAX(CASE WHEN COALESCE(payment_method, offer_key) = 'crypto' THEN 1 ELSE 0 END) AS crypto,
            MAX(CASE WHEN COALESCE(payment_method, offer_key) = 'card' THEN 1 ELSE 0 END) AS card
          FROM analytics_events WHERE operation_id = ? AND created_at >= ? AND created_at < ? AND event_type = 'payment_method'
          GROUP BY session_id, offer_key
        ), checkouts AS (
          SELECT session_id, offer_key AS offer, 1 AS checkout
          FROM analytics_events WHERE operation_id = ? AND created_at >= ? AND created_at < ? AND event_type = 'checkout_started'
          GROUP BY session_id, offer_key
        )
        SELECT clicked.offer AS label, COUNT(DISTINCT clicked.session_id) AS sessions,
          SUM(COALESCE(methods.crypto, 0)) AS crypto, SUM(COALESCE(methods.card, 0)) AS card,
          SUM(COALESCE(checkouts.checkout, 0)) AS checkouts
        FROM clicked
        LEFT JOIN methods ON methods.session_id = clicked.session_id AND methods.offer = clicked.offer
        LEFT JOIN checkouts ON checkouts.session_id = clicked.session_id AND checkouts.offer = clicked.offer
        WHERE clicked.offer IS NOT NULL GROUP BY clicked.offer ORDER BY sessions DESC`)
        .bind(operationId, start, end, operationId, start, end, operationId, start, end).all(),
      env.DB.prepare(`WITH entries AS (
          SELECT session_id, COALESCE(MAX(variant_key), 'control') AS variant
          FROM analytics_events WHERE operation_id = ? AND created_at >= ? AND created_at < ?
            AND event_type = 'page_view' AND page_key = 'landing'
          GROUP BY session_id
        ), behavior AS (
          SELECT session_id,
            MAX(CASE WHEN event_type = 'offer_click' THEN 1 ELSE 0 END) AS clicked,
            MAX(CASE WHEN event_type = 'payment_method' THEN 1 ELSE 0 END) AS method_chosen,
            MAX(CASE WHEN event_type = 'checkout_started' THEN 1 ELSE 0 END) AS checkout
          FROM analytics_events WHERE operation_id = ? AND created_at >= ? AND created_at < ? GROUP BY session_id
        ), sales AS (
          SELECT session_id, MAX(CASE WHEN status = 'paid' THEN 1 ELSE 0 END) AS paid
          FROM orders WHERE operation_id = ? AND created_at >= ? AND created_at < ? AND session_id IS NOT NULL GROUP BY session_id
        )
        SELECT entries.variant AS label, COUNT(*) AS sessions,
          SUM(COALESCE(behavior.clicked, 0)) AS clicks,
          SUM(COALESCE(behavior.method_chosen, 0)) AS methods,
          SUM(COALESCE(behavior.checkout, 0)) AS checkouts,
          SUM(COALESCE(sales.paid, 0)) AS paid
        FROM entries LEFT JOIN behavior ON behavior.session_id = entries.session_id
        LEFT JOIN sales ON sales.session_id = entries.session_id
        GROUP BY entries.variant ORDER BY sessions DESC`)
        .bind(operationId, start, end, operationId, start, end, operationId, start, end).all(),
      env.DB.prepare(`SELECT device_type AS label, COUNT(DISTINCT session_id) AS sessions
        FROM analytics_events WHERE operation_id = ? AND created_at >= ? AND created_at < ? AND device_type IS NOT NULL
        GROUP BY device_type ORDER BY sessions DESC`)
        .bind(operationId, start, end).all(),
      env.DB.prepare(`SELECT COALESCE(utm_source, referrer_host, 'direto') AS label, COUNT(DISTINCT session_id) AS sessions
        FROM analytics_events WHERE operation_id = ? AND created_at >= ? AND created_at < ? AND event_type = 'page_view'
        GROUP BY label ORDER BY sessions DESC LIMIT 12`)
        .bind(operationId, start, end).all(),
      env.DB.prepare(`WITH source_sessions AS (
          SELECT session_id, COALESCE(utm_source, referrer_host, 'direto') AS label
          FROM analytics_events WHERE operation_id = ? AND event_type = 'page_view' AND created_at >= ? AND created_at < ?
          GROUP BY session_id, label
        )
        SELECT source_sessions.label, COUNT(DISTINCT source_sessions.session_id) AS sessions,
          COUNT(DISTINCT CASE WHEN orders.status = 'paid' THEN orders.id END) AS sales
        FROM source_sessions LEFT JOIN orders
          ON orders.operation_id = ? AND orders.session_id = source_sessions.session_id
          AND orders.created_at >= ? AND orders.created_at < ?
        GROUP BY source_sessions.label ORDER BY sessions DESC LIMIT 12`)
        .bind(operationId, start, end, operationId, start, end).all(),
      env.DB.prepare(`SELECT strftime('%Y-%m-%d', created_at, 'unixepoch') AS day,
          COUNT(DISTINCT CASE WHEN event_type = 'page_view' THEN session_id END) AS sessions,
          SUM(CASE WHEN event_type = 'offer_click' THEN 1 ELSE 0 END) AS offer_clicks,
          SUM(CASE WHEN event_type = 'checkout_started' THEN 1 ELSE 0 END) AS checkouts
        FROM analytics_events WHERE operation_id = ? AND created_at >= ? AND created_at < ?
        GROUP BY day ORDER BY day`)
        .bind(operationId, start, end).all(),
      env.DB.prepare(`WITH attributed AS (
          SELECT session_id,
            COALESCE(MAX(utm_source), MAX(referrer_host), 'direto') AS source,
            COALESCE(MAX(utm_medium), '') AS medium,
            COALESCE(MAX(utm_campaign), '') AS campaign,
            COALESCE(MAX(utm_content), '') AS content,
            COALESCE(MAX(utm_term), '') AS term
          FROM analytics_events
          WHERE operation_id = ? AND event_type = 'page_view' AND created_at >= ? AND created_at < ?
          GROUP BY session_id
        ), behavior AS (
          SELECT session_id,
            SUM(CASE WHEN event_type = 'offer_click' THEN 1 ELSE 0 END) AS clicks,
            SUM(CASE WHEN event_type = 'checkout_started' THEN 1 ELSE 0 END) AS checkouts,
            SUM(COALESCE(duration_seconds, 0)) AS engaged_seconds
          FROM analytics_events WHERE operation_id = ? AND created_at >= ? AND created_at < ?
          GROUP BY session_id
        ), sales AS (
          SELECT session_id, COUNT(*) AS orders,
            SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END) AS paid_orders
          FROM orders WHERE operation_id = ? AND created_at >= ? AND created_at < ?
            AND session_id IS NOT NULL GROUP BY session_id
        )
        SELECT a.source, a.medium, a.campaign, a.content, a.term, COUNT(*) AS sessions,
          SUM(COALESCE(b.clicks, 0)) AS clicks,
          SUM(COALESCE(b.checkouts, 0)) AS checkouts,
          SUM(COALESCE(s.orders, 0)) AS orders,
          SUM(COALESCE(s.paid_orders, 0)) AS paid_orders,
          SUM(COALESCE(b.engaged_seconds, 0)) AS engaged_seconds
        FROM attributed a
        LEFT JOIN behavior b ON b.session_id = a.session_id
        LEFT JOIN sales s ON s.session_id = a.session_id
        GROUP BY a.source, a.medium, a.campaign, a.content, a.term
        ORDER BY sessions DESC, paid_orders DESC LIMIT 100`)
        .bind(operationId, start, end, operationId, start, end, operationId, start, end).all()
    ]);

    const counts = Object.fromEntries((events.results || []).map((row) => [row.event_type, Number(row.events) || 0]));
    const sessionsRow = await env.DB.prepare(`SELECT COUNT(DISTINCT session_id) AS value FROM analytics_events
      WHERE operation_id = ? AND event_type = 'page_view' AND created_at >= ? AND created_at < ?`)
      .bind(operationId, start, end).first();
    const paidCount = Number(orderStats?.paid) || 0;
    const pendingCount = Number(orderStats?.pending) || 0;
    const totalOrders = Number(orderStats?.total) || 0;
    const revenue = paidCount * 4.99;

    return json({
      operationId, start, end, days,
      metrics: {
        sessions: Number(sessionsRow?.value) || 0,
        pageViews: counts.page_view || 0,
        offerClicks: counts.offer_click || 0,
        checkoutStarts: counts.checkout_started || 0,
        paymentOrders: totalOrders,
        paidOrders: paidCount,
        pendingOrders: pendingCount,
        grossUsd: revenue,
        conversionRate: Number(sessionsRow?.value) ? paidCount / Number(sessionsRow.value) * 100 : 0
      },
      paymentAssets: assets.results || [],
      countries: countries.results || [],
      languages: languages.results || [],
      offers: offers.results || [],
      paymentMethods: paymentMethods.results || [],
      methodsByCountry: methodsByCountry.results || [],
      offerFunnels: offerFunnels.results || [],
      variants: variants.results || [],
      devices: devices.results || [],
      sources: sources.results || [],
      sourceSales: sourceSales.results || [],
      campaigns: campaigns.results || [],
      daily: daily.results || [],
      orders: orders.results || []
    });
  } catch (error) {
    console.error(JSON.stringify({ message: "admin_dashboard_failed", operationId, error: String(error) }));
    return json({ error: "Não foi possível carregar os dados do painel." }, 503);
  }
}
