(function (global, document) {
  "use strict";

  var STORAGE_KEY = "landing-template.routes.v1";
  var DEFAULT_ROUTES = Object.freeze({
  "global": "",
  "landingUrl": "",
  "landingBrUrl": "",
  "landingForeignUrl": "",
  "regions": {
    "latam": "",
    "na": "",
    "europe": "",
    "asia": "",
    "africa": "",
    "oceania": ""
  },
  "countries": {
    "BR": "",
    "IN": "",
    "RU": "",
    "US": "",
    "ES": "",
    "SE": ""
  }
});

  var fallbackTranslations = {
    pt: { title: "Em qual país você está?", countryLabel: "Selecione seu país", continue: "Continuar" },
    es: { title: "¿En qué país estás?", countryLabel: "Selecciona tu país", continue: "Continuar" },
    en: { title: "Which country are you in?", countryLabel: "Select your country", continue: "Continue" },
    fr: { title: "Dans quel pays êtes-vous ?", countryLabel: "Sélectionnez votre pays", continue: "Continuer" },
    de: { title: "In welchem Land sind Sie?", countryLabel: "Wählen Sie Ihr Land", continue: "Weiter" },
    it: { title: "In quale Paese ti trovi?", countryLabel: "Seleziona il tuo Paese", continue: "Continua" },
    ru: { title: "В какой стране вы находитесь?", countryLabel: "Выберите страну", continue: "Продолжить" },
    ja: { title: "どの国にいますか？", countryLabel: "国を選択", continue: "続ける" },
    ko: { title: "어느 국가에 계신가요?", countryLabel: "국가 선택", continue: "계속" },
    zh: { title: "您在哪个国家？", countryLabel: "选择您的国家", continue: "继续" },
    ar: { title: "في أي بلد أنت؟", countryLabel: "اختر بلدك", continue: "متابعة" },
    tr: { title: "Hangi ülkedesiniz?", countryLabel: "Ülkenizi seçin", continue: "Devam et" },
    hi: { title: "आप किस देश में हैं?", countryLabel: "अपना देश चुनें", continue: "जारी रखें" },
    nl: { title: "In welk land bent u?", countryLabel: "Selecteer uw land", continue: "Doorgaan" },
    pl: { title: "W jakim kraju jesteś?", countryLabel: "Wybierz swój kraj", continue: "Kontynuuj" },
    sv: { title: "Vilket land befinner du dig i?", countryLabel: "Välj ditt land", continue: "Fortsätt" },
    th: { title: "คุณอยู่ประเทศใด?", countryLabel: "เลือกประเทศของคุณ", continue: "ดำเนินการต่อ" },
    id: { title: "Di negara mana Anda berada?", countryLabel: "Pilih negara Anda", continue: "Lanjutkan" },
    vi: { title: "Bạn đang ở quốc gia nào?", countryLabel: "Chọn quốc gia của bạn", continue: "Tiếp tục" }
  };

  function cloneDefaults() {
    return {
      global: DEFAULT_ROUTES.global,
      landingUrl: DEFAULT_ROUTES.landingUrl,
      landingBrUrl: DEFAULT_ROUTES.landingBrUrl,
      landingForeignUrl: DEFAULT_ROUTES.landingForeignUrl,
      regions: Object.assign({}, DEFAULT_ROUTES.regions),
      countries: Object.assign({}, DEFAULT_ROUTES.countries)
    };
  }

  function isHttpUrl(value) {
    if (typeof value !== "string" || !value.trim()) return false;
    try {
      var url = new URL(value.trim());
      return url.protocol === "http:" || url.protocol === "https:";
    } catch (_error) {
      return false;
    }
  }

  function sanitizeRoutes(candidate) {
    var clean = cloneDefaults();
    if (!candidate || typeof candidate !== "object") return clean;

    if (isHttpUrl(candidate.landingUrl)) clean.landingUrl = candidate.landingUrl.trim();
    if (isHttpUrl(candidate.landingBrUrl)) clean.landingBrUrl = candidate.landingBrUrl.trim();
    if (isHttpUrl(candidate.landingForeignUrl)) clean.landingForeignUrl = candidate.landingForeignUrl.trim();
    if (isHttpUrl(candidate.global)) clean.global = candidate.global.trim();
    Object.keys(clean.regions).forEach(function (region) {
      if (candidate.regions && Object.prototype.hasOwnProperty.call(candidate.regions, region)) {
        clean.regions[region] = isHttpUrl(candidate.regions[region])
          ? candidate.regions[region].trim()
          : "";
      }
    });
    Object.keys(clean.countries).forEach(function (code) {
      if (candidate.countries && Object.prototype.hasOwnProperty.call(candidate.countries, code)) {
        clean.countries[code] = isHttpUrl(candidate.countries[code])
          ? candidate.countries[code].trim()
          : "";
      }
    });
    return clean;
  }

  function loadRoutes() {
    try {
      var stored = global.localStorage.getItem(STORAGE_KEY);
      return stored ? sanitizeRoutes(JSON.parse(stored)) : cloneDefaults();
    } catch (_error) {
      return cloneDefaults();
    }
  }

  function saveRoutes(routes) {
    var clean = sanitizeRoutes(routes);
    global.localStorage.setItem(STORAGE_KEY, JSON.stringify(clean));
    return clean;
  }

  function resolveDestination(countryCode, routes) {
    var catalog = global.HotGlobalCountries;
    var code = typeof countryCode === "string" ? countryCode.trim().toUpperCase() : "";
    var config = sanitizeRoutes(routes || loadRoutes());
    var countryUrl = config.countries[code];
    if (isHttpUrl(countryUrl)) return countryUrl;

    var region = catalog ? catalog.getRegion(code) : "global";
    var regionUrl = config.regions[region];
    return isHttpUrl(regionUrl) ? regionUrl : config.global;
  }

  function fetchJson(url, timeoutMs) {
    var controller = typeof AbortController === "function" ? new AbortController() : null;
    var timeout = controller ? global.setTimeout(function () { controller.abort(); }, timeoutMs) : null;
    return global.fetch(url, {
      headers: { Accept: "application/json" },
      signal: controller ? controller.signal : undefined
    }).then(function (response) {
      if (!response.ok) throw new Error("Geolocation service unavailable");
      return response.json();
    }).finally(function () {
      if (timeout) global.clearTimeout(timeout);
    });
  }

  function validDetectedCountry(code) {
    var normalized = typeof code === "string" ? code.trim().toUpperCase() : "";
    if (!global.HotGlobalCountries || !global.HotGlobalCountries.has(normalized)) {
      throw new Error("Unsupported country code");
    }
    return normalized;
  }

  function detectCountry() {
    var providers = [
      function () {
        return fetchJson("/api/location", 2500).then(function (data) {
          return validDetectedCountry(data.countryCode);
        });
      },
      function () {
        return fetchJson("https://ipwho.is/", 3500).then(function (data) {
          if (data.success === false) throw new Error("IP country unavailable");
          return validDetectedCountry(data.country_code);
        });
      },
      function () {
        return fetchJson("https://ipapi.co/json/", 3500).then(function (data) {
          return validDetectedCountry(data.country_code);
        });
      }
    ];

    return providers.reduce(function (attempt, provider) {
      return attempt.catch(provider);
    }, Promise.reject());
  }

  function localeCountry() {
    var locale = (global.navigator.languages && global.navigator.languages[0]) || global.navigator.language || "";
    var match = locale.match(/[-_]([A-Za-z]{2})(?:$|[-_])/);
    var code = match ? match[1].toUpperCase() : "";
    return global.HotGlobalCountries && global.HotGlobalCountries.has(code) ? code : "BR";
  }

  function applyLanguage(language) {
    var languageCode = fallbackTranslations[language] ? language : "en";
    var external = global.HotGlobalI18n;
    if (external && typeof external.setLanguage === "function") {
      external.setLanguage(languageCode);
    }

    var messages = fallbackTranslations[languageCode];
    document.documentElement.lang = languageCode;
    document.documentElement.dir = languageCode === "ar" ? "rtl" : "ltr";

    var title = document.querySelector("[data-i18n='title'], #hero-title, main h1");
    var label = document.querySelector("[data-i18n='countryLabel'], label[for='country-select']");
    var button = document.querySelector("[data-i18n='continue'], #continue-button, [data-continue]");
    if (title) title.textContent = messages.title;
    if (label) label.textContent = messages.countryLabel;
    if (button) button.textContent = messages.continue;
  }

  function initializeLanding() {
    var catalog = global.HotGlobalCountries;
    var select = document.querySelector("#country-select, [data-country-select]");
    var button = document.querySelector("#continue-button, [data-continue]");
    if (!catalog || !select || !button) return;

    select.replaceChildren();
    catalog.list.forEach(function (country) {
      var option = document.createElement("option");
      option.value = country.code;
      option.textContent = country.name;
      select.appendChild(option);
    });

    var manuallySelected = false;
    var initialCountry = localeCountry();
    select.value = initialCountry;
    applyLanguage(catalog.getLanguage(initialCountry));

    select.addEventListener("change", function () {
      manuallySelected = true;
      applyLanguage(catalog.getLanguage(select.value));
    });

    button.addEventListener("click", function (event) {
      event.preventDefault();
      global.location.assign(resolveDestination(select.value));
    });

    detectCountry().then(function (detectedCountry) {
      if (manuallySelected) return;
      select.value = detectedCountry;
      applyLanguage(catalog.getLanguage(detectedCountry));
    }).catch(function () {
      // The locale-based selection remains active when both IP services fail.
    });
  }

  global.HotGlobalApp = Object.freeze({
    STORAGE_KEY: STORAGE_KEY,
    DEFAULT_ROUTES: DEFAULT_ROUTES,
    isHttpUrl: isHttpUrl,
    sanitizeRoutes: sanitizeRoutes,
    loadRoutes: loadRoutes,
    saveRoutes: saveRoutes,
    resolveDestination: resolveDestination,
    detectCountry: detectCountry,
    applyLanguage: applyLanguage,
    initializeLanding: initializeLanding
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeLanding, { once: true });
  } else {
    initializeLanding();
  }
})(window, document);
