(function () {
  "use strict";

  var loginView = document.getElementById("login-view");
  var dashboardView = document.getElementById("dashboard-view");
  var loginForm = document.getElementById("login-form");
  var loginStatus = document.getElementById("login-status");
  var dashboardStatus = document.getElementById("dashboard-status");
  var operationSelect = document.getElementById("operation-select");
  var rangeSelect = document.getElementById("range-select");
  var csrf = "";
  var lastDashboard = null;
  var lastEvents = [];
  var lastSessions = [];
  var activeSessionId = "";
  var currentView = "overview";
  var dimensionNames = { primary: "Oferta recomendada", brazil: "VIP Brasil", english: "VIP English", spanish: "VIP Español", arabic: "VIP العربية", crypto: "Cripto", card: "Cartão", telegram: "Telegram", payment_selector: "Seletor de pagamento", crypto_checkout: "Checkout cripto", control: "Controle direto", short: "Prévia curta", full: "Prévia completa", cover: "Capa vertical", checkout: "Checkout" };
  var eventNames = { page_view: "Abriu a página", page_engaged: "Tempo ativo", country_detected: "País estimado", country_selected: "Trocou o país", offer_click: "Clicou em oferta", payment_method: "Escolheu pagamento", checkout_started: "Iniciou checkout", payment_asset_selected: "Escolheu ativo", preview_paywall_view: "Viu o bloqueio VIP" };

  function dimensionLabel(value) {
    return dimensionNames[value] || value || "—";
  }

  function formatDate(value, includeTime) {
    if (!value) return "—";
    return new Intl.DateTimeFormat("pt-BR", includeTime
      ? { dateStyle: "short", timeStyle: "short" }
      : { day: "2-digit", month: "2-digit" }).format(new Date(Number(value) * 1000));
  }

  function number(value) {
    return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 }).format(Number(value) || 0);
  }

  function setStatus(node, message, isError) {
    node.textContent = message || "";
    node.classList.toggle("is-error", Boolean(isError));
  }

  async function api(url, options) {
    var config = Object.assign({ credentials: "same-origin", cache: "no-store" }, options || {});
    config.headers = Object.assign({ Accept: "application/json" }, config.headers || {});
    if (config.method && config.method !== "GET") config.headers["X-Admin-CSRF"] = csrf;
    var response = await fetch(url, config);
    var data = await response.json().catch(function () { return {}; });
    if (!response.ok) {
      var error = new Error(data.error || "A solicitação não pôde ser concluída.");
      error.status = response.status;
      throw error;
    }
    return data;
  }

  function showLogin(message) {
    loginView.hidden = false;
    dashboardView.hidden = true;
    if (message) setStatus(loginStatus, message, true);
  }

  function showDashboard() {
    loginView.hidden = true;
    dashboardView.hidden = false;
    setStatus(loginStatus, "", false);
    refresh();
  }

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function fillBreakdown(id, rows, labelKey) {
    var host = document.getElementById(id);
    host.replaceChildren();
    var items = (rows || []).map(function (row) {
      return { label: dimensionLabel(row[labelKey] || "Desconhecido"), count: Number(row.sessions) || 0 };
    }).filter(function (row) { return row.count > 0; });
    if (!items.length) {
      host.appendChild(el("p", "empty-state", "Ainda não há dados para este período."));
      return;
    }
    var max = Math.max.apply(Math, items.map(function (row) { return row.count; }));
    items.forEach(function (row) {
      var item = el("div", "breakdown-row");
      var label = el("span", "breakdown-label", row.label);
      var track = el("span", "breakdown-track");
      var bar = document.createElement("span");
      bar.style.width = Math.max(3, row.count / max * 100) + "%";
      track.appendChild(bar);
      item.append(label, track, el("strong", "", number(row.count)));
      host.appendChild(item);
    });
  }

  function renderTrend(rows, days) {
    var host = document.getElementById("trend-chart");
    host.replaceChildren();
    var period = Math.max(1, Number(days) || 7);
    var step = Math.max(1, Math.ceil(period / 14));
    var ordered = (rows || []).slice().sort(function (a, b) { return a.day.localeCompare(b.day); });
    var buckets = [];
    for (var i = 0; i < ordered.length; i += step) {
      var group = ordered.slice(i, i + step);
      if (!group.length) continue;
      buckets.push({
        day: group[0].day,
        sessions: group.reduce(function (sum, row) { return sum + (Number(row.sessions) || 0); }, 0),
        offer_clicks: group.reduce(function (sum, row) { return sum + (Number(row.offer_clicks) || 0); }, 0),
        checkouts: group.reduce(function (sum, row) { return sum + (Number(row.checkouts) || 0); }, 0)
      });
    }
    if (!buckets.length) {
      host.style.gridTemplateColumns = "1fr";
      host.appendChild(el("p", "empty-state", "Ainda não há atividade neste período."));
      return;
    }
    host.style.gridTemplateColumns = "repeat(" + buckets.length + ", minmax(20px, 1fr))";
    var max = Math.max(1, ...buckets.map(function (item) { return Math.max(item.sessions, item.offer_clicks, item.checkouts); }));
    buckets.forEach(function (item) {
      var day = el("div", "chart-day");
      day.dataset.label = formatChartLabel(item.day);
      [[item.sessions, "chart-bar"], [item.offer_clicks, "chart-bar chart-bar--clicks"], [item.checkouts, "chart-bar chart-bar--checkouts"]].forEach(function (part) {
        var bar = el("span", part[1]);
        bar.style.height = Math.max(2, part[0] / max * 100) + "%";
        bar.title = number(part[0]);
        day.appendChild(bar);
      });
      host.appendChild(day);
    });
  }

  function renderSourceSales(rows) {
    var host = document.getElementById("source-sales");
    host.replaceChildren();
    if (!rows || !rows.length) {
      host.appendChild(el("p", "empty-state", "Ainda não há sessões atribuíveis neste período."));
      return;
    }
    rows.forEach(function (row) {
      var sessions = Number(row.sessions) || 0;
      var sales = Number(row.sales) || 0;
      var item = el("div", "sales-row");
      item.appendChild(el("strong", "sales-row__source", row.label || "direto"));
      item.appendChild(el("span", "", number(sessions) + " sessões"));
      var rate = sessions ? (sales / sessions * 100).toFixed(1) : "0.0";
      item.appendChild(el("span", "sales-row__result", number(sales) + " vendas · " + rate + "%"));
      host.appendChild(item);
    });
  }

  function formatChartLabel(day) {
    var parts = day.split("-");
    return parts.length === 3 ? parts[2] + "/" + parts[1] : day;
  }

  function renderPaymentCountries(rows) {
    var body = document.getElementById("payment-country-body");
    body.replaceChildren();
    var countries = {};
    (rows || []).forEach(function (item) {
      var code = item.country || "??";
      if (!countries[code]) countries[code] = { crypto: 0, card: 0 };
      countries[code][item.method] = Number(item.sessions) || 0;
    });
    var entries = Object.keys(countries).map(function (code) {
      return { code: code, crypto: countries[code].crypto || 0, card: countries[code].card || 0 };
    }).sort(function (a, b) { return (b.crypto + b.card) - (a.crypto + a.card); });
    if (!entries.length) {
      var empty = el("td", "empty-state", "Ainda não há escolhas de pagamento neste período.");
      empty.colSpan = 4;
      var emptyRow = document.createElement("tr");
      emptyRow.appendChild(empty);
      body.appendChild(emptyRow);
      return;
    }
    entries.forEach(function (item) {
      var row = document.createElement("tr");
      [item.code === "??" ? "Não identificado" : item.code, number(item.crypto), number(item.card), number(item.crypto + item.card)].forEach(function (value) {
        row.appendChild(el("td", "", value));
      });
      body.appendChild(row);
    });
  }

  function renderOfferFunnels(rows) {
    var body = document.getElementById("offer-funnel-body");
    body.replaceChildren();
    if (!rows || !rows.length) {
      var empty = el("td", "empty-state", "Ainda não há cliques em ofertas neste período.");
      empty.colSpan = 5;
      var emptyRow = document.createElement("tr");
      emptyRow.appendChild(empty);
      body.appendChild(emptyRow);
      return;
    }
    rows.forEach(function (item) {
      var row = document.createElement("tr");
      [dimensionLabel(item.label), number(item.sessions), number(item.crypto), number(item.card), number(item.checkouts)].forEach(function (value) {
        row.appendChild(el("td", "", value));
      });
      body.appendChild(row);
    });
  }

  function renderVariants(rows) {
    var body = document.getElementById("variants-body");
    body.replaceChildren();
    if (!rows || !rows.length) {
      var empty = el("td", "empty-state", "Ainda não há sessões para comparar neste período.");
      empty.colSpan = 7;
      var emptyRow = document.createElement("tr"); emptyRow.appendChild(empty); body.appendChild(emptyRow); return;
    }
    rows.forEach(function (item) {
      var sessions = Number(item.sessions) || 0;
      var clicks = Number(item.clicks) || 0;
      var row = document.createElement("tr");
      [dimensionLabel(item.label), number(sessions), number(clicks), number(item.methods), number(item.checkouts), number(item.paid), (sessions ? clicks / sessions * 100 : 0).toFixed(1) + "%"].forEach(function (value) {
        row.appendChild(el("td", "", value));
      });
      body.appendChild(row);
    });
  }

  function setMetric(name, value) {
    var node = document.querySelector('[data-metric="' + name + '"]');
    if (node) node.textContent = value;
  }

  function durationLabel(value) {
    var seconds = Math.max(0, Number(value) || 0);
    var minutes = Math.floor(seconds / 60);
    var remaining = Math.floor(seconds % 60);
    return minutes ? minutes + "m " + String(remaining).padStart(2, "0") + "s" : remaining + "s";
  }

  function operationLabel(value) {
    return value === "second" ? "02 · OPERAÇÃO 2" : "01 · PRINCIPAL";
  }

  function syncOperationSwitch() {
    document.getElementById("active-operation-badge").textContent = operationLabel(operationSelect.value);
    document.querySelectorAll("[data-operation]").forEach(function (button) {
      var active = button.dataset.operation === operationSelect.value;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", active ? "true" : "false");
    });
  }

  function renderCampaigns(rows) {
    var body = document.getElementById("campaigns-body");
    body.replaceChildren();
    if (!rows || !rows.length) {
      var empty = el("td", "empty-state", "Ainda não há visitas atribuídas a campanhas neste período.");
      empty.colSpan = 8;
      var emptyRow = document.createElement("tr"); emptyRow.appendChild(empty); body.appendChild(emptyRow);
      return;
    }
    rows.forEach(function (item) {
      var row = document.createElement("tr");
      [item.source || "direto", item.medium || "—", item.campaign || "—", item.content || "—", number(item.sessions), number(item.clicks), number(item.checkouts), number(item.paid_orders)].forEach(function (value) {
        row.appendChild(el("td", "", value));
      });
      body.appendChild(row);
    });
  }

  function sessionSearchText(session) {
    return [session.session_id, session.country_code, session.language, session.variant_key, session.device_type,
      session.browser_family, session.os_family, session.referrer_host, session.utm_source,
      session.utm_medium, session.utm_campaign, session.utm_content, session.utm_term]
      .filter(Boolean).join(" ").toLowerCase();
  }

  function renderSessions() {
    var body = document.getElementById("sessions-body");
    var query = document.getElementById("session-search").value.trim().toLowerCase();
    var rows = lastSessions.filter(function (session) { return !query || sessionSearchText(session).includes(query); });
    body.replaceChildren();
    document.getElementById("session-count").textContent = number(rows.length) + (rows.length === 1 ? " sessão" : " sessões");
    document.getElementById("sessions-empty").hidden = rows.length > 0;
    if (!rows.length) return;
    rows.forEach(function (session) {
      var row = document.createElement("tr");
      var identity = el("td", "session-id-cell");
      identity.appendChild(el("strong", "session-id", session.session_id.slice(0, 8).toUpperCase()));
      identity.appendChild(el("small", "", formatDate(session.first_seen, true)));
      row.appendChild(identity);
      row.appendChild(el("td", "", [session.country_code, session.language, session.variant_key ? dimensionLabel(session.variant_key) : ""].filter(Boolean).join(" · ") || "—"));
      row.appendChild(el("td", "", [session.device_type, session.os_family].filter(Boolean).join(" · ") || "—"));
      row.appendChild(el("td", "", [session.utm_source || session.referrer_host || "direto", session.utm_campaign, session.utm_content].filter(Boolean).join(" / ")));
      var activity = number(session.offer_clicks) + " cliques";
      if (session.crypto_choices) activity += " · " + number(session.crypto_choices) + " cripto";
      if (session.card_choices) activity += " · " + number(session.card_choices) + " cartão";
      if (session.checkout_starts) activity += " · " + number(session.checkout_starts) + " pedidos";
      if (session.paid_orders) activity += " · " + number(session.paid_orders) + " pagos";
      row.appendChild(el("td", "", activity));
      row.appendChild(el("td", "session-duration", durationLabel(session.engaged_seconds)));
      var action = document.createElement("td");
      var button = el("button", "button button--quiet session-open", "Ver jornada");
      button.type = "button"; button.dataset.sessionId = session.session_id;
      button.setAttribute("aria-label", "Ver jornada da sessão " + session.session_id.slice(0, 8));
      action.appendChild(button); row.appendChild(action);
      body.appendChild(row);
    });
  }

  async function loadSessions() {
    var query = new URLSearchParams({ operation: operationSelect.value, days: rangeSelect.value, limit: "300" });
    try {
      var data = await api("/api/admin/sessions?" + query.toString());
      lastSessions = data.sessions || [];
      document.getElementById("sessions-caption").textContent = "Até 300 sessões, ordenadas pela atividade mais recente no período.";
      renderSessions();
    } catch (error) {
      if (error.status === 401) { showLogin("Sua sessão expirou. Entre novamente."); return; }
      setStatus(dashboardStatus, error.message, true);
    }
  }

  function appendAttribution(host, session) {
    host.replaceChildren();
    [["Origem", session.utm_source || session.referrer_host || "Direto"], ["Posicionamento", session.utm_medium],
      ["Perfil / campanha", session.utm_campaign], ["Conteúdo", session.utm_content], ["Termo", session.utm_term]]
      .forEach(function (entry) {
        if (!entry[1] && entry[0] !== "Origem") return;
        var item = el("div", "attribution-item");
        item.appendChild(el("small", "", entry[0])); item.appendChild(el("strong", "", entry[1] || "—")); host.appendChild(item);
      });
  }

  async function openSession(sessionId) {
    activeSessionId = sessionId;
    var detail = document.getElementById("session-detail");
    detail.hidden = false;
    document.getElementById("session-detail-title").textContent = "Sessão " + sessionId.slice(0, 8).toUpperCase();
    document.getElementById("session-detail-meta").textContent = "Carregando a jornada…";
    document.getElementById("session-timeline").replaceChildren();
    detail.scrollIntoView({ behavior: "smooth", block: "start" });
    try {
      var query = new URLSearchParams({ operation: operationSelect.value, session: sessionId });
      var data = await api("/api/admin/sessions?" + query.toString());
      if (activeSessionId !== sessionId) return;
      var events = data.events || [];
      var first = events[0];
      var last = events[events.length - 1];
      document.getElementById("session-detail-meta").textContent = [formatDate(first && first.created_at, true), first && first.country_code, first && first.language, first && first.device_type, first && first.os_family].filter(Boolean).join(" · ");
      appendAttribution(document.getElementById("session-attribution"), first || {});
      var timeline = document.getElementById("session-timeline");
      timeline.replaceChildren();
      events.forEach(function (event) {
        var item = document.createElement("li");
        item.className = "timeline-event";
        var time = el("time", "timeline-time", formatDate(event.created_at, true));
        var content = el("div", "timeline-content");
        content.appendChild(el("strong", "", eventNames[event.event_type] || event.event_type));
        var details = [dimensionLabel(event.button_key || event.offer_key), event.variant_key ? "Variante: " + dimensionLabel(event.variant_key) : "", event.payment_method ? "Pagamento: " + dimensionLabel(event.payment_method) : "", event.destination_type ? "Destino: " + dimensionLabel(event.destination_type) : "", event.country_code, event.event_type === "page_engaged" ? durationLabel(event.duration_seconds) + " visíveis" : "", event.utm_campaign].filter(Boolean).join(" · ");
        if (details) content.appendChild(el("span", "", details));
        item.append(time, content); timeline.appendChild(item);
      });
      if (!events.length) timeline.appendChild(el("li", "empty-state", "Nenhum evento encontrado para esta sessão."));
      var purchases = document.getElementById("session-purchases");
      var ordersHost = document.getElementById("session-orders");
      ordersHost.replaceChildren();
      purchases.hidden = !(data.orders || []).length;
      (data.orders || []).forEach(function (order) {
        var label = order.status === "paid" ? "Pago" : order.status === "pending" ? "Pendente" : "Expirado";
        ordersHost.appendChild(el("p", "", label + " · " + order.amount + " " + order.asset + " · " + formatDate(order.created_at, true)));
      });
      if (last && last.event_type === "page_engaged") document.getElementById("session-detail-meta").textContent += " · Última atividade: " + formatDate(last.created_at, true);
    } catch (error) {
      document.getElementById("session-detail-meta").textContent = error.message;
    }
  }

  function renderOrders(rows) {
    var body = document.getElementById("orders-body");
    body.replaceChildren();
    if (!rows.length) {
      var empty = document.createElement("tr");
      var cell = el("td", "empty-state", "Nenhum pedido neste período.");
      cell.colSpan = 6;
      empty.appendChild(cell);
      body.appendChild(empty);
      return;
    }
    rows.forEach(function (order) {
      var row = document.createElement("tr");
      row.appendChild(el("td", "", order.id.slice(0, 8)));
      row.appendChild(el("td", "", order.asset));
      row.appendChild(el("td", "", order.amount + " " + order.asset));
      var status = el("span", "status-pill status-pill--" + order.status, ({ paid: "Pago", pending: "Pendente", expired: "Expirado" })[order.status] || order.status);
      var statusCell = document.createElement("td"); statusCell.appendChild(status); row.appendChild(statusCell);
      row.appendChild(el("td", "", formatDate(order.created_at, true)));
      var transaction = document.createElement("td");
      if (order.signature) {
        var anchor = el("a", "", order.signature.slice(0, 10) + "…");
        anchor.href = "https://solscan.io/tx/" + encodeURIComponent(order.signature);
        anchor.target = "_blank"; anchor.rel = "noopener noreferrer";
        transaction.appendChild(anchor);
      } else transaction.textContent = "—";
      row.appendChild(transaction);
      body.appendChild(row);
    });
  }

  function renderDashboard(data) {
    var metrics = data.metrics;
    setMetric("sessions", number(metrics.sessions));
    setMetric("pageViews", number(metrics.pageViews));
    setMetric("offerClicks", number(metrics.offerClicks));
    setMetric("paymentOrders", number(metrics.paymentOrders));
    setMetric("pendingOrders", number(metrics.pendingOrders));
    setMetric("paidOrders", number(metrics.paidOrders));
    setMetric("grossUsd", Number(metrics.grossUsd || 0).toFixed(2));
    setMetric("conversionRate", Number(metrics.conversionRate || 0).toFixed(1));
    ["sessions", "offerClicks", "paymentOrders", "paidOrders"].forEach(function (key) {
      var count = Number(metrics[key]) || 0;
      var label = document.querySelector('[data-funnel="' + key + '"]');
      if (label) label.textContent = number(count);
      var bar = document.querySelector('[data-funnel-bar="' + key + '"]');
      if (bar) bar.style.width = Math.max(0, Math.min(100, metrics.sessions ? count / metrics.sessions * 100 : 0)) + "%";
    });
    fillBreakdown("country-breakdown", data.countries, "code");
    fillBreakdown("language-breakdown", data.languages, "label");
    fillBreakdown("device-breakdown", data.devices, "label");
    fillBreakdown("source-breakdown", data.sources, "label");
    renderSourceSales(data.sourceSales);
    fillBreakdown("offer-breakdown", data.offers, "label");
    fillBreakdown("payment-method-breakdown", data.paymentMethods, "label");
    fillBreakdown("asset-breakdown", data.paymentAssets.map(function (item) { return { label: item.asset, sessions: item.count }; }), "label");
    renderPaymentCountries(data.methodsByCountry || []);
    renderOfferFunnels(data.offerFunnels || []);
    renderVariants(data.variants || []);
    renderTrend(data.daily, data.days);
    renderOrders(data.orders || []);
    renderCampaigns(data.campaigns || []);
    document.getElementById("last-updated").textContent = "Atualizado às " + new Intl.DateTimeFormat("pt-BR", { timeStyle: "short" }).format(new Date());
  }

  function renderEvents(rows) {
    var body = document.getElementById("events-body");
    body.replaceChildren();
    if (!rows.length) {
      var row = document.createElement("tr");
      var cell = el("td", "empty-state", "Nenhum evento neste período." );
      cell.colSpan = 14; row.appendChild(cell); body.appendChild(row); return;
    }
    rows.forEach(function (item) {
      var row = document.createElement("tr");
      var detail = [item.variant_key && "Variante: " + dimensionLabel(item.variant_key), item.payment_method && "Pagamento: " + dimensionLabel(item.payment_method), item.destination_type && "Destino: " + dimensionLabel(item.destination_type), item.button_key && "Botão: " + dimensionLabel(item.button_key)].filter(Boolean).join(" · ") || "—";
      [formatDate(item.created_at, true), (item.session_id || "").slice(0, 8).toUpperCase() || "—", eventNames[item.event_type] || item.event_type, item.country_code || "—", item.language || "—", dimensionLabel(item.offer_key), detail, [item.device_type, item.browser_family, item.os_family].filter(Boolean).join(" · ") || "—", item.page_key || "—", item.utm_source || item.referrer_host || "direto", item.utm_medium || "—", item.utm_campaign || "—", item.utm_content || "—", item.duration_seconds == null ? "—" : number(item.duration_seconds)].forEach(function (value) { row.appendChild(el("td", "", value)); });
      body.appendChild(row);
    });
  }

  async function loadEvents() {
    var query = new URLSearchParams({ operation: operationSelect.value, limit: "300" });
    try {
      var data = await api("/api/admin/events?" + query.toString());
      lastEvents = data.events || [];
      renderEvents(lastEvents);
    } catch (error) {
      if (error.status === 401) { showLogin("Sua sessão expirou. Entre novamente."); return; }
      dashboardStatus.textContent = error.message;
    }
  }

  async function refresh() {
    if (!csrf) return;
    setStatus(dashboardStatus, "Carregando…", false);
    var query = new URLSearchParams({ operation: operationSelect.value, days: rangeSelect.value });
    try {
      var results = await Promise.all([api("/api/admin/dashboard?" + query.toString()), loadEvents()]);
      lastDashboard = results[0];
      renderDashboard(lastDashboard);
      setStatus(dashboardStatus, "", false);
      if (currentView === "sessions") loadSessions();
      if (currentView === "routes") loadRoutes(operationSelect.value);
    } catch (error) {
      if (error.status === 401) { showLogin("Sua sessão expirou. Entre novamente."); return; }
      setStatus(dashboardStatus, error.message, true);
    }
  }

  function fillRouteForm(operationId, settings) {
    var form = document.getElementById("routes-form");
    form.elements.namedItem("operationId").value = operationId;
    form.elements.namedItem("landingUrl").value = settings.landingUrl || "";
    form.elements.namedItem("accessUrl").value = settings.accessUrl || "";
    form.elements.namedItem("global").value = settings.global || "";
    Object.keys(settings.regions || {}).forEach(function (key) { form.elements.namedItem("region." + key).value = settings.regions[key] || ""; });
    Object.keys(settings.countries || {}).forEach(function (key) { form.elements.namedItem("country." + key).value = settings.countries[key] || ""; });
    renderRouteMap(settings);
  }

  function renderRouteMap(settings) {
    var body = document.getElementById("route-map-body");
    var note = document.getElementById("route-map-note");
    if (!body || !note) return;
    body.replaceChildren();
    var rows = [
      ["Brasil · BR", "Botão principal para Brasil", settings.landingBrUrl || settings.landingUrl || settings.countries.BR, ""],
      ["Exterior", "Botão principal para todos os outros países", settings.landingForeignUrl || settings.landingUrl || settings.countries.US, ""],
      ["Link geral", "Se preenchido, substitui as rotas por país", settings.landingUrl, ""]
    ];
    var placeholders = [];
    rows.forEach(function (item) {
      var row = document.createElement("tr");
      row.appendChild(el("td", "route-map-name", item[0]));
      row.appendChild(el("td", "route-map-flow", item[1]));
      var destination = document.createElement("td");
      var state = item[2] ? item[3] : "Não configurado";
      if (item[2]) {
        var url;
        try { url = new URL(item[2], location.origin); } catch (_error) { url = null; }
        if (url && (url.hostname === "example.com" || url.hostname.endsWith(".example.com"))) {
          state = "Placeholder";
          placeholders.push(item[0]);
        }
        var link = el("a", "route-map-url", item[2]);
        link.href = url ? url.href : "#";
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        destination.appendChild(link);
      } else {
        destination.appendChild(el("span", "route-map-url", "Ainda não configurado"));
      }
      row.appendChild(destination);
      var stateCell = document.createElement("td");
      stateCell.appendChild(el("span", "route-map-state" + (state === "Placeholder" || state === "Não configurado" ? " is-placeholder" : ""), state || "Configurado"));
      row.appendChild(stateCell);
      body.appendChild(row);
    });
    note.textContent = placeholders.length
      ? "Atenção: destinos example.com ainda são placeholders e precisam ser substituídos antes de divulgar essas rotas (" + placeholders.join(", ") + ")."
      : "Os destinos acima refletem a configuração salva para a operação ativa.";
  }

  async function loadRoutes(operationId) {
    try {
      var data = await api("/api/admin/settings?operation=" + encodeURIComponent(operationId));
      fillRouteForm(operationId, data[operationId].routes);
      setStatus(document.getElementById("routes-status"), "", false);
    } catch (error) {
      if (error.status === 401) { showLogin("Sua sessão expirou. Entre novamente."); return; }
      setStatus(document.getElementById("routes-status"), error.message, true);
    }
  }

  function downloadCsv() {
    if (currentView === "sessions") {
      if (!lastSessions.length) { setStatus(dashboardStatus, "Não há sessões para exportar.", false); return; }
      var sessionColumns = ["session_id", "first_seen", "last_seen", "country_code", "language", "variant_key", "device_type", "browser_family", "os_family", "referrer_host", "utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "page_views", "offer_clicks", "crypto_choices", "card_choices", "checkout_starts", "order_count", "paid_orders", "engaged_seconds"];
      var safeCsv = function (value) {
        var text = value == null ? "" : String(value);
        if (/^[=+@\-\t\r]/.test(text)) text = "'" + text;
        return '"' + text.replace(/"/g, '""') + '"';
      };
      var sessionLines = [sessionColumns.join(",")].concat(lastSessions.map(function (item) { return sessionColumns.map(function (key) { return safeCsv(item[key]); }).join(","); }));
      var sessionBlob = new Blob(["\uFEFF" + sessionLines.join("\r\n")], { type: "text/csv;charset=utf-8" });
      var sessionUrl = URL.createObjectURL(sessionBlob);
      var sessionAnchor = el("a", "");
      sessionAnchor.href = sessionUrl; sessionAnchor.download = "sessoes-" + operationSelect.value + "-" + new Date().toISOString().slice(0, 10) + ".csv";
      document.body.appendChild(sessionAnchor); sessionAnchor.click(); sessionAnchor.remove(); URL.revokeObjectURL(sessionUrl);
      return;
    }
    if (!lastEvents.length) { setStatus(dashboardStatus, "Não há eventos para exportar.", false); return; }
    var columns = ["created_at", "session_id", "event_type", "country_code", "language", "variant_key", "offer_key", "button_key", "payment_method", "destination_type", "device_type", "browser_family", "os_family", "page_key", "referrer_host", "utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "duration_seconds"];
    function csv(value) {
      var text = value == null ? "" : String(value);
      if (/^[=+@\-\t\r]/.test(text)) text = "'" + text;
      return '"' + text.replace(/"/g, '""') + '"';
    }
    var lines = [columns.join(",")].concat(lastEvents.map(function (item) { return columns.map(function (key) { return csv(item[key]); }).join(","); }));
    var blob = new Blob(["\uFEFF" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
    var url = URL.createObjectURL(blob);
    var anchor = el("a", "");
    anchor.href = url; anchor.download = "analytics-" + operationSelect.value + "-" + new Date().toISOString().slice(0, 10) + ".csv";
    document.body.appendChild(anchor); anchor.click(); anchor.remove(); URL.revokeObjectURL(url);
  }

  function showView(view) {
    currentView = view;
    document.querySelectorAll("[data-view]").forEach(function (button) { button.classList.toggle("is-active", button.dataset.view === view); });
    document.querySelectorAll(".view-panel").forEach(function (panel) { panel.hidden = panel.id !== "view-" + view; });
    document.getElementById("page-title").textContent = ({ overview: "Visão geral", sessions: "Sessões / Leads", events: "Atividade detalhada", routes: "Rotas e links" })[view];
    document.getElementById("page-subtitle").textContent = ({ overview: "Acompanhe a jornada da visita ao pagamento.", sessions: "Explore sessões anônimas, campanhas e jornadas individuais.", events: "Eventos recentes com origem e dados da sessão.", routes: "Configure os destinos e o link liberado após o pagamento." })[view];
    document.getElementById("active-operation-badge").textContent = operationLabel(operationSelect.value);
    document.getElementById("export-button").textContent = view === "sessions" ? "Exportar sessões CSV" : "Exportar eventos CSV";
    if (view === "routes") loadRoutes(operationSelect.value);
    if (view === "sessions") loadSessions();
  }

  loginForm.addEventListener("submit", async function (event) {
    event.preventDefault();
    setStatus(loginStatus, "Validando…", false);
    var password = loginForm.elements.namedItem("password").value;
    try {
      var data = await api("/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: password }) });
      csrf = data.csrf;
      loginForm.reset();
      showDashboard();
    } catch (error) {
      setStatus(loginStatus, error.message, true);
    }
  });

  document.querySelectorAll("[data-view]").forEach(function (button) { button.addEventListener("click", function () { showView(button.dataset.view); }); });
  document.getElementById("refresh-button").addEventListener("click", refresh);
  document.getElementById("export-button").addEventListener("click", downloadCsv);
  rangeSelect.addEventListener("change", refresh);
  document.querySelectorAll("[data-operation]").forEach(function (button) {
    button.addEventListener("click", function () {
      if (operationSelect.value === button.dataset.operation) return;
      operationSelect.value = button.dataset.operation;
      syncOperationSwitch();
      activeSessionId = "";
      document.getElementById("session-detail").hidden = true;
      refresh();
    });
  });
  document.getElementById("session-search").addEventListener("input", renderSessions);
  document.getElementById("sessions-body").addEventListener("click", function (event) {
    var button = event.target.closest("[data-session-id]");
    if (button) openSession(button.dataset.sessionId);
  });
  document.getElementById("close-session-detail").addEventListener("click", function () {
    activeSessionId = "";
    document.getElementById("session-detail").hidden = true;
  });
  document.getElementById("logout-button").addEventListener("click", async function () {
    try { await api("/api/admin/logout", { method: "POST" }); } catch (_error) {}
    csrf = "";
    showLogin("Sessão encerrada.");
  });

  document.getElementById("routes-form").addEventListener("submit", async function (event) {
    event.preventDefault();
    var form = event.currentTarget;
    if (!form.reportValidity()) return;
    var routes = { landingUrl: form.elements.namedItem("landingUrl").value, accessUrl: form.elements.namedItem("accessUrl").value, global: form.elements.namedItem("global").value, regions: {}, countries: {} };
    ["latam", "na", "europe", "asia", "africa", "oceania"].forEach(function (key) { routes.regions[key] = form.elements.namedItem("region." + key).value; });
    ["BR", "IN", "RU", "US", "ES", "SE"].forEach(function (key) { routes.countries[key] = form.elements.namedItem("country." + key).value; });
    setStatus(document.getElementById("routes-status"), "Salvando…", false);
    try {
      var saved = await api("/api/admin/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ operationId: operationSelect.value, routes: routes }) });
      renderRouteMap(saved.routes);
      setStatus(document.getElementById("routes-status"), "Rotas salvas e publicadas para esta operação.", false);
    } catch (error) {
      if (error.status === 401) { showLogin("Sua sessão expirou. Entre novamente."); return; }
      setStatus(document.getElementById("routes-status"), error.message, true);
    }
  });

  operationSelect.value = "primary";
  syncOperationSwitch();
  api("/api/admin/session").then(function (data) { csrf = data.csrf; showDashboard(); }).catch(function () { showLogin(""); });
})();
