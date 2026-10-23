(function (global, document) {
  "use strict";
  var catalog = global.HotGlobalCountries;
  var i18n = global.HotGlobalI18n;
  var config = global.LandingConfig;
  var select = document.getElementById("country-select");
  var primary = document.getElementById("primary-offer");
  if (!catalog || !i18n || !config || !select || !primary) return;

  function countryName(country, language) {
    try { return new Intl.DisplayNames([language], { type: "region" }).of(country.code); }
    catch (_error) { return country.name; }
  }
  function flag(container, code) {
    var img = document.createElement("img");
    img.alt = "";
    img.src = "https://flagcdn.com/32x24/" + code.toLowerCase() + ".png";
    img.onerror = function () { container.textContent = code; };
    container.replaceChildren(img);
  }
  function showCountry(code) {
    if (!catalog.has(code)) return;
    code = code.toUpperCase();
    var language = catalog.getLanguage(code);
    var options = catalog.list.map(function (country) {
      return { code: country.code, name: countryName(country, language) };
    }).sort(function (a, b) { return a.name.localeCompare(b.name, language); });
    select.replaceChildren();
    options.forEach(function (country) {
      var option = document.createElement("option");
      option.value = country.code; option.textContent = country.name;
      select.appendChild(option);
    });
    select.value = code;
    i18n.setLanguage(language);
    var name = countryName(catalog.get(code), language);
    primary.querySelector(".offer-destination").textContent = "· " + name;
    primary.href = code === "BR" ? config.brazil : config.international;
    primary.setAttribute("aria-label", "VIP · " + name);
    flag(document.getElementById("country-flag"), code);
    flag(primary.querySelector(".offer-flag"), code);
  }

  var requested = new URLSearchParams(global.location.search).get("country");
  var manuallySelected = catalog.has(requested);
  var locale = ((global.navigator.languages && global.navigator.languages[0]) || global.navigator.language || "").match(/[-_]([a-z]{2})(?:$|[-_])/i);
  showCountry(manuallySelected ? requested.toUpperCase() : locale && catalog.has(locale[1]) ? locale[1].toUpperCase() : "BR");
  select.addEventListener("change", function () { manuallySelected = true; showCountry(select.value); });

  function detect(url, key) {
    var controller = new AbortController();
    var timeout = global.setTimeout(function () { controller.abort(); }, 3000);
    return fetch(url, { signal: controller.signal, headers: { Accept: "application/json" } })
      .then(function (response) { if (!response.ok) throw new Error("Country unavailable"); return response.json(); })
      .then(function (data) {
        if (data.success === false || !catalog.has(data[key])) throw new Error("Unknown country");
        return data[key].toUpperCase();
      }).finally(function () { global.clearTimeout(timeout); });
  }
  if (!manuallySelected) {
    detect("https://ipwho.is/", "country_code")
      .catch(function () { if (manuallySelected) return null; return detect("https://ipapi.co/json/", "country_code"); })
      .then(function (code) { if (code && !manuallySelected) showCountry(code); })
      .catch(function () {});
  }
})(window, document);
