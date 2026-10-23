(function (global) {
  "use strict";

  var supportedLanguages = [
    "pt", "es", "en", "fr", "de", "it", "ru", "ja", "ko", "zh",
    "ar", "tr", "hi", "nl", "pl", "sv", "th", "id", "vi"
  ];

  var countryNames = {
    AF: "Afeganistão", ZA: "África do Sul", AL: "Albânia", DE: "Alemanha",
    AD: "Andorra", AO: "Angola", AG: "Antígua e Barbuda", SA: "Arábia Saudita",
    DZ: "Argélia", AR: "Argentina", AM: "Armênia", AU: "Austrália",
    AT: "Áustria", AZ: "Azerbaijão", BS: "Bahamas", BH: "Bahrein",
    BD: "Bangladesh", BB: "Barbados", BE: "Bélgica", BZ: "Belize",
    BJ: "Benim", BY: "Bielorrússia", BO: "Bolívia", BA: "Bósnia e Herzegovina",
    BW: "Botsuana", BR: "Brasil", BN: "Brunei", BG: "Bulgária",
    BF: "Burkina Faso", BI: "Burundi", BT: "Butão", CV: "Cabo Verde",
    CM: "Camarões", KH: "Camboja", CA: "Canadá", QA: "Catar",
    KZ: "Cazaquistão", TD: "Chade", CL: "Chile", CN: "China",
    CY: "Chipre", CO: "Colômbia", KM: "Comores", CG: "Congo",
    CD: "Congo, República Democrática", KP: "Coreia do Norte", KR: "Coreia do Sul",
    CI: "Costa do Marfim", CR: "Costa Rica", HR: "Croácia", CU: "Cuba",
    DK: "Dinamarca", DJ: "Djibuti", DM: "Dominica", EG: "Egito",
    SV: "El Salvador", AE: "Emirados Árabes Unidos", EC: "Equador",
    ER: "Eritreia", SK: "Eslováquia", SI: "Eslovênia", ES: "Espanha",
    US: "Estados Unidos", EE: "Estônia", SZ: "Essuatíni", ET: "Etiópia",
    FJ: "Fiji", PH: "Filipinas", FI: "Finlândia", FR: "França",
    GA: "Gabão", GM: "Gâmbia", GH: "Gana", GE: "Geórgia",
    GD: "Granada", GR: "Grécia", GT: "Guatemala", GY: "Guiana",
    GN: "Guiné", GQ: "Guiné Equatorial", GW: "Guiné-Bissau", HT: "Haiti",
    HN: "Honduras", HU: "Hungria", YE: "Iêmen", MH: "Ilhas Marshall",
    SB: "Ilhas Salomão", IN: "Índia", ID: "Indonésia", IR: "Irã",
    IQ: "Iraque", IE: "Irlanda", IS: "Islândia", IL: "Israel",
    IT: "Itália", JM: "Jamaica", JP: "Japão", JO: "Jordânia",
    KI: "Kiribati", KW: "Kuwait", LA: "Laos", LS: "Lesoto",
    LV: "Letônia", LB: "Líbano", LR: "Libéria", LY: "Líbia",
    LI: "Liechtenstein", LT: "Lituânia", LU: "Luxemburgo", MK: "Macedônia do Norte",
    MG: "Madagascar", MY: "Malásia", MW: "Maláui", MV: "Maldivas",
    ML: "Mali", MT: "Malta", MA: "Marrocos", MU: "Maurício",
    MR: "Mauritânia", MX: "México", FM: "Micronésia", MZ: "Moçambique",
    MD: "Moldávia", MC: "Mônaco", MN: "Mongólia", ME: "Montenegro",
    MM: "Mianmar", NA: "Namíbia", NR: "Nauru", NP: "Nepal",
    NI: "Nicarágua", NE: "Níger", NG: "Nigéria", NO: "Noruega",
    NZ: "Nova Zelândia", OM: "Omã", NL: "Países Baixos", PW: "Palau",
    PS: "Palestina", PA: "Panamá", PG: "Papua-Nova Guiné", PK: "Paquistão",
    PY: "Paraguai", PE: "Peru", PL: "Polônia", PT: "Portugal",
    KE: "Quênia", KG: "Quirguistão", GB: "Reino Unido", CF: "República Centro-Africana",
    CZ: "República Tcheca", DO: "República Dominicana", RO: "Romênia", RW: "Ruanda",
    RU: "Rússia", WS: "Samoa", SM: "San Marino", LC: "Santa Lúcia",
    KN: "São Cristóvão e Névis", ST: "São Tomé e Príncipe", VC: "São Vicente e Granadinas",
    SN: "Senegal", SL: "Serra Leoa", RS: "Sérvia", SC: "Seychelles",
    SG: "Singapura", SY: "Síria", SO: "Somália", LK: "Sri Lanka",
    SD: "Sudão", SS: "Sudão do Sul", SE: "Suécia", CH: "Suíça",
    SR: "Suriname", TJ: "Tajiquistão", TH: "Tailândia", TZ: "Tanzânia",
    TL: "Timor-Leste", TG: "Togo", TO: "Tonga", TT: "Trinidad e Tobago",
    TN: "Tunísia", TM: "Turcomenistão", TR: "Turquia", TV: "Tuvalu",
    UA: "Ucrânia", UG: "Uganda", UY: "Uruguai", UZ: "Uzbequistão",
    VU: "Vanuatu", VA: "Vaticano", VE: "Venezuela", VN: "Vietnã",
    ZM: "Zâmbia", ZW: "Zimbábue"
  };

  var regionCodes = {
    latam: "AG AR BS BB BO BR BZ CL CO CR CU DM DO EC SV GD GT GY HT HN JM LC MX NI PA PY PE KN VC SR TT UY VE",
    na: "CA US",
    europe: "AL DE AD AM AT AZ BY BE BA BG CY HR DK SK SI ES EE FI FR GE GR HU IE IS IT KZ LV LI LT LU MK MT MD MC ME NO NL PL PT GB CZ RO RU SM RS SE CH TR UA VA",
    asia: "AF SA BH BD BT BN KH QA CN KP KR AE PH IN ID IR IQ IL JP JO KG KW LA LB MY MV MN MM NP OM PK PS SG LK SY TJ TH TL TM UZ VN YE",
    africa: "ZA AO DZ BJ BW BF BI CV CM TD KM CG CD CI DJ EG ER SZ ET GA GM GH GN GQ GW KE LS LR LY MG MW ML MA MU MR MZ NA NE NG CF RW ST SN SL SC SO SD SS TZ TG TN UG ZM ZW",
    oceania: "AU FJ KI MH FM NR NZ PW PG SB WS TO TV VU"
  };

  var languageCodes = {
    pt: "AO BR CV GW MZ PT ST TL",
    es: "AR BO CL CO CR CU DO EC SV ES GT HN MX NI PA PY PE UY VE",
    fr: "BJ BF BI CM CF TD KM CD CG CI DJ FR GA GN HT LU MG ML MC NE RW SN SC TG",
    de: "AT DE LI CH",
    it: "IT SM VA",
    ru: "BY KZ KG RU TJ TM UZ",
    ja: "JP",
    ko: "KP KR",
    zh: "CN SG",
    ar: "DZ BH TD KM DJ EG IQ JO KW LB LY MR MA OM PS QA SA SO SD SY TN AE YE",
    tr: "TR",
    hi: "IN",
    nl: "BE NL SR",
    pl: "PL",
    sv: "SE",
    th: "TH",
    id: "ID",
    vi: "VN"
  };

  function invertGroups(groups) {
    var result = Object.create(null);
    Object.keys(groups).forEach(function (group) {
      groups[group].split(" ").forEach(function (code) {
        result[code] = group;
      });
    });
    return result;
  }

  var regionsByCountry = invertGroups(regionCodes);
  var languagesByCountry = invertGroups(languageCodes);
  var list = Object.keys(countryNames).map(function (code) {
    return Object.freeze({
      code: code,
      name: countryNames[code],
      region: regionsByCountry[code] || "global",
      language: languagesByCountry[code] || "en"
    });
  }).sort(function (a, b) {
    return a.name.localeCompare(b.name, "pt-BR");
  });

  var byCode = Object.create(null);
  list.forEach(function (country) {
    byCode[country.code] = country;
  });

  function normalizeCode(code) {
    return typeof code === "string" ? code.trim().toUpperCase() : "";
  }

  function get(code) {
    return byCode[normalizeCode(code)] || null;
  }

  global.HotGlobalCountries = Object.freeze({
    list: Object.freeze(list),
    supportedLanguages: Object.freeze(supportedLanguages),
    get: get,
    has: function (code) { return Boolean(get(code)); },
    getLanguage: function (code) {
      var country = get(code);
      return country ? country.language : "en";
    },
    getRegion: function (code) {
      var country = get(code);
      return country ? country.region : "global";
    }
  });
})(window);
