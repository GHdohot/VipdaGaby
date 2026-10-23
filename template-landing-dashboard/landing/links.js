(function (global, document) {
  "use strict";
  var app = global.HotGlobalApp, catalog = global.HotGlobalCountries;
  var i18n = global.HotGlobalI18n, analytics = global.HotGlobalAnalytics;
  var select = document.getElementById("country-select");
  var primary = document.querySelector("[data-primary-offer]");
  if (!app || !catalog || !select || !primary) return;
  var routes = null, manuallySelected = false;
  function destination() {
    if (!routes) return "";
    return (select.value === "BR" ? routes.landingBrUrl : routes.landingForeignUrl) || routes.landingUrl || app.resolveDestination(select.value === "BR" ? "BR" : "US", routes);
  }
  function updateLink() {
    var target = destination();
    primary.href = target || "#";
    primary.setAttribute("aria-disabled", target ? "false" : "true");
  }
  function setFlag(container, code) {
    var img = document.createElement("img"); img.alt = "";
    img.src = "https://flagcdn.com/32x24/" + code.toLowerCase() + ".png";
    img.onerror = function () { container.textContent = code; };
    container.replaceChildren(img);
  }
  function showCountry(code) {
    var language = catalog.getLanguage(code), names;
    try { names = new Intl.DisplayNames([language], { type: "region" }); } catch (_) {}
    var name = function (country) { return names ? names.of(country.code) : country.name; };
    var options = catalog.list.map(function (c) { return { code: c.code, name: name(c) }; });
    options.sort(function (a, b) { return a.name.localeCompare(b.name, language); });
    select.replaceChildren();
    options.forEach(function (c) { var option = document.createElement("option"); option.value = c.code; option.textContent = c.name; select.appendChild(option); });
    select.value = code; i18n.setLanguage(language);
    primary.querySelector(".offer-destination").textContent = "· " + name(catalog.get(code));
    setFlag(document.getElementById("country-flag"), code);
    setFlag(primary.querySelector(".offer-flag"), code);
    primary.setAttribute("aria-label", "VIP · " + name(catalog.get(code)));
    if (analytics) analytics.setContext(code, language);
    updateLink();
  }
  var requested = new URLSearchParams(global.location.search).get("country");
  manuallySelected = catalog.has(requested);
  var locale = (global.navigator.language || "").match(/[-_]([a-z]{2})(?:$|[-_])/i);
  showCountry(manuallySelected ? requested.toUpperCase() : locale && catalog.has(locale[1]) ? locale[1].toUpperCase() : "BR");
  select.addEventListener("change", function () {
    manuallySelected = true; showCountry(select.value);
    if (analytics) analytics.track("country_selected", { country: select.value, language: catalog.getLanguage(select.value) });
  });
  if (!manuallySelected) app.detectCountry().then(function (code) {
    if (!manuallySelected) showCountry(code);
  }).catch(function () {});
  var controller = new AbortController();
  var timeout = global.setTimeout(function () { controller.abort(); }, 4000);
  var ready = fetch("/api/config", { cache: "no-store", signal: controller.signal })
    .then(function (res) { if (!res.ok) throw new Error("Config unavailable"); return res.json(); })
    .then(function (data) { routes = app.sanitizeRoutes(data.routes); })
    .catch(function () { routes = app.sanitizeRoutes(app.DEFAULT_ROUTES); })
    .finally(function () { global.clearTimeout(timeout); updateLink(); });
  primary.addEventListener("click", function (event) {
    event.preventDefault();
    ready.then(function () {
      var target = destination();
      if (!target) {
        var status = document.getElementById("route-status");
        if (!status) { status = document.createElement("p"); status.id = "route-status"; status.className = "route-status"; status.setAttribute("role", "status"); primary.parentNode.after(status); }
        status.textContent = i18n.strings[document.documentElement.lang].subtitle;
        return;
      }
      if (analytics) analytics.track("offer_click", { offer: "primary", button: "primary", destination: "telegram", country: select.value, language: catalog.getLanguage(select.value) });
      global.location.assign(target);
    });
  });
})(window, document);
