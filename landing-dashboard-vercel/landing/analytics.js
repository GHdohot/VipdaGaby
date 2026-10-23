(function (global, document) {
  "use strict";

  var SESSION_KEY = "hotglobal.analytics-session.v1";
  var TRAFFIC_KEY = "hotglobal.analytics-traffic.v1";
  var currentCountry = "";
  var currentLanguage = "";
  var visibleSince = 0;
  var highestScroll = 0;
  var page = document.body && document.body.dataset.page === "checkout" ? "checkout" : "landing";
  var variant = document.body && document.body.dataset.variant || (page === "checkout" ? "checkout" : "control");

  function uuid() {
    if (global.crypto && typeof global.crypto.randomUUID === "function") return global.crypto.randomUUID();
    var bytes = new Uint8Array(16);
    global.crypto.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 15) | 64;
    bytes[8] = (bytes[8] & 63) | 128;
    return Array.from(bytes, function (byte) { return byte.toString(16).padStart(2, "0"); }).join("");
  }

  function getSessionId() {
    try {
      var value = global.sessionStorage.getItem(SESSION_KEY);
      if (value && /^[0-9a-f-]{36}$/i.test(value)) return value;
      value = uuid();
      global.sessionStorage.setItem(SESSION_KEY, value);
      return value;
    } catch (_error) {
      return uuid();
    }
  }

  function classify() {
    var ua = global.navigator.userAgent || "";
    var touch = global.navigator.maxTouchPoints > 0;
    var tablet = /iPad|Tablet|PlayBook|Silk/i.test(ua) || (touch && global.innerWidth >= 700 && global.innerWidth < 1100);
    var mobile = !tablet && (/Mobi|Android|iPhone|iPod/i.test(ua) || global.innerWidth < 700);
    var browser = /Edg\//.test(ua) ? "edge" : /Firefox\//.test(ua) ? "firefox" : /Chrome\//.test(ua) && !/Edg\//.test(ua) ? "chrome" : /Safari\//.test(ua) && !/Chrome\//.test(ua) ? "safari" : "other";
    var os = /Android/i.test(ua) ? "android" : /iPhone|iPad|iPod/i.test(ua) ? "ios" : /Windows/i.test(ua) ? "windows" : /Mac OS/i.test(ua) ? "macos" : /Linux/i.test(ua) ? "linux" : "other";
    return { device: tablet ? "tablet" : mobile ? "mobile" : "desktop", browser: browser, os: os };
  }

  function queryUtmValues() {
    var query = new URLSearchParams(global.location.search);
    return {
      source: query.get("utm_source") || "",
      medium: query.get("utm_medium") || "",
      campaign: query.get("utm_campaign") || "",
      content: query.get("utm_content") || "",
      term: query.get("utm_term") || ""
    };
  }

  function hasUtm(utm) {
    return Object.keys(utm).some(function (key) { return Boolean(utm[key]); });
  }

  function sameUtm(left, right) {
    return ["source", "medium", "campaign", "content", "term"].every(function (key) {
      return (left[key] || "") === (right[key] || "");
    });
  }

  function trafficContext() {
    var queryUtm = queryUtmValues();
    var utm = queryUtm;
    var referrerHost = "";
    try {
      var saved = global.sessionStorage.getItem(TRAFFIC_KEY);
      var previous = saved ? JSON.parse(saved) : null;
      if (previous && previous.utm) utm = previous.utm;
      if (hasUtm(queryUtm)) {
        utm = queryUtm;
        if (previous && previous.utm && !sameUtm(previous.utm, queryUtm)) {
          // A newly tagged landing link represents a new acquisition visit,
          // even if a tester opens it in the same browser tab/session.
          try { global.sessionStorage.removeItem(SESSION_KEY); } catch (_error) {}
          getSessionId();
        }
      }
      if (hasUtm(queryUtm) || !previous) {
        referrerHost = "";
      } else if (previous) {
        referrerHost = previous.referrerHost || "";
      }
      if (!referrerHost && document.referrer) {
        var referrer = new URL(document.referrer);
        if (referrer.origin !== global.location.origin) referrerHost = referrer.hostname.toLowerCase();
      }
      if (!saved || hasUtm(queryUtm)) {
        global.sessionStorage.setItem(TRAFFIC_KEY, JSON.stringify({ utm: utm, referrerHost: referrerHost }));
      }
    } catch (_error) {}
    return { utm: utm, referrerHost: referrerHost };
  }

  function send(event) {
    var details = classify();
    var traffic = trafficContext();
    var payload = {
      id: uuid(),
      sessionId: getSessionId(),
      type: event.type,
      country: event.country || currentCountry || null,
      language: event.language || currentLanguage || (document.documentElement.lang || "en").split("-")[0],
      offer: event.offer || null,
      button: event.button || null,
      paymentMethod: event.paymentMethod || null,
      destination: event.destination || null,
      variant: event.variant || variant,
      page: page,
      device: details.device,
      browser: details.browser,
      os: details.os,
      utm: traffic.utm,
      referrerHost: traffic.referrerHost
    };
    if (Number.isFinite(event.durationSeconds)) payload.durationSeconds = event.durationSeconds;
    global.fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
      credentials: "same-origin"
    }).catch(function () {});
  }

  function track(type, data) {
    send(Object.assign({ type: type }, data || {}));
  }

  function setContext(country, language) {
    if (country) currentCountry = country;
    if (language) currentLanguage = language;
  }

  function initialize() {
    track("page_view");
    try {
      var navigation = global.performance && global.performance.getEntriesByType("navigation")[0];
      if (navigation && navigation.type === "back_forward") track("navigation_back", { button: "funnel_back" });
    } catch (_error) {}
    if (document.visibilityState !== "hidden") visibleSince = Date.now();
  }

  function interactionKey(target) {
    if (target.matches("[data-primary-offer]")) return "primary";
    if (target.matches("[data-funnel-jump]")) return "funnel_continue";
    if (target.matches("[data-funnel-card]")) return "funnel_card";
    if (target.matches("[data-funnel-crypto]")) return "funnel_crypto";
    if (target.matches("[data-funnel-back]")) return "funnel_back";
    if (target.matches("[data-payment-close]")) return "payment_close";
    if (target.matches("[data-stripe-close]")) return "stripe_close";
    if (target.matches("[data-crypto-close]")) return "crypto_close";
    var plan = target.closest("label") && target.closest("label").querySelector("input[name='vip-plan']");
    if (plan) return "plan_" + plan.value;
    return "";
  }

  function flushEngagement() {
    if (!visibleSince) return;
    var seconds = Math.floor((Date.now() - visibleSince) / 1000);
    visibleSince = 0;
    if (seconds > 0) track("page_engaged", { durationSeconds: seconds });
  }

  global.HotGlobalAnalytics = Object.freeze({ track: track, setContext: setContext, getSessionId: getSessionId });
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "hidden") flushEngagement();
    else if (!visibleSince) visibleSince = Date.now();
  });
  global.addEventListener("pagehide", flushEngagement);
  global.addEventListener("pagehide", function () { track("page_exit"); });
  document.addEventListener("click", function (event) {
    var target = event.target.closest("a,button,label");
    if (!target) return;
    var key = interactionKey(target);
    if (key) track("interaction_click", { button: key });
  }, { capture: true });
  global.addEventListener("scroll", function () {
    var root = document.documentElement;
    var range = Math.max(1, root.scrollHeight - global.innerHeight);
    var depth = Math.min(100, Math.round((global.scrollY / range) * 100));
    [25, 50, 75, 100].forEach(function (threshold) {
      if (depth >= threshold && highestScroll < threshold) track("scroll_depth", { button: "scroll_" + threshold });
    });
    highestScroll = Math.max(highestScroll, depth);
  }, { passive: true });
  global.addEventListener("pageshow", function (event) {
    if (event.persisted && document.visibilityState !== "hidden") {
      visibleSince = Date.now();
      track("page_view");
    }
  });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initialize, { once: true });
  else initialize();
})(window, document);
