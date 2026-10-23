/* HotGlobalI18n.setLanguage("pt") atualiza toda a interface e o aria-label do select. */
(function () {
  var STRINGS = {
    pt: { eyebrow: "HOT GLOBAL", title: "Em qual país você está?", subtitle: "Confirme sua localização para acessar o conteúdo certo para você.", continue: "Continuar", countryLabel: "Selecione seu país", trust: "Seu país define o destino mais relevante.", linksPageTitle: "Acessos Maizdos", linksTitle: "Escolha seu acesso", linksSubtitle: "Acesse a oferta disponível para cada país.", linkTo: "Acessar oferta", recommended: "Recomendado", chooseCountry: "Prefere escolher seu país?" },
    es: { eyebrow: "HOT GLOBAL", title: "¿En qué país estás?", subtitle: "Confirma tu ubicación para acceder al contenido adecuado para ti.", continue: "Continuar", countryLabel: "Selecciona tu país", trust: "Tu país define el destino más relevante.", linksPageTitle: "Acessos Maizdos", linksTitle: "Elige tu acceso", linksSubtitle: "Accede a la oferta disponible para cada país.", linkTo: "Acceder a la oferta", recommended: "Recomendado", chooseCountry: "¿Prefieres elegir tu país?" },
    en: { eyebrow: "HOT GLOBAL", title: "Which country are you in?", subtitle: "Confirm your location to access the right content for you.", continue: "Continue", countryLabel: "Select your country", trust: "Your country determines the most relevant destination.", linksPageTitle: "Acessos Maizdos", linksTitle: "Choose your access", linksSubtitle: "Open the offer available for each country.", linkTo: "Open offer for", recommended: "Recommended", chooseCountry: "Would you rather choose your country?" },
    fr: { eyebrow: "HOT GLOBAL", title: "Dans quel pays êtes-vous ?", subtitle: "Confirmez votre localisation pour accéder au contenu qui vous correspond.", continue: "Continuer", countryLabel: "Sélectionnez votre pays", trust: "Votre pays détermine la destination la plus pertinente.", linksPageTitle: "Acessos Maizdos", linksTitle: "Choisissez votre accès", linksSubtitle: "Accédez à l’offre disponible pour chaque pays.", linkTo: "Accéder à l’offre pour", recommended: "Recommandé", chooseCountry: "Vous préférez choisir votre pays ?" },
    de: { eyebrow: "HOT GLOBAL", title: "In welchem Land sind Sie?", subtitle: "Bestätigen Sie Ihren Standort, um passende Inhalte aufzurufen.", continue: "Weiter", countryLabel: "Wählen Sie Ihr Land", trust: "Ihr Land bestimmt das relevanteste Ziel.", linksPageTitle: "Acessos Maizdos", linksTitle: "Zugang auswählen", linksSubtitle: "Öffnen Sie das verfügbare Angebot für jedes Land.", linkTo: "Angebot öffnen für", recommended: "Empfohlen", chooseCountry: "Möchten Sie lieber Ihr Land auswählen?" },
    it: { eyebrow: "HOT GLOBAL", title: "In quale Paese ti trovi?", subtitle: "Conferma la tua posizione per accedere ai contenuti più adatti a te.", continue: "Continua", countryLabel: "Seleziona il tuo Paese", trust: "Il tuo Paese determina la destinazione più pertinente.", linksPageTitle: "Acessos Maizdos", linksTitle: "Scegli il tuo accesso", linksSubtitle: "Apri l’offerta disponibile per ogni Paese.", linkTo: "Apri l’offerta per", recommended: "Consigliato", chooseCountry: "Preferisci scegliere il tuo Paese?" },
    ru: { eyebrow: "HOT GLOBAL", title: "В какой стране вы находитесь?", subtitle: "Подтвердите местоположение, чтобы открыть подходящий контент.", continue: "Продолжить", countryLabel: "Выберите страну", trust: "Страна определяет наиболее подходящее направление.", linksPageTitle: "Acessos Maizdos", linksTitle: "Выберите доступ", linksSubtitle: "Откройте предложение для нужной страны.", linkTo: "Открыть предложение: ", recommended: "Рекомендуем", chooseCountry: "Хотите выбрать страну самостоятельно?" },
    ja: { eyebrow: "HOT GLOBAL", title: "どの国にいますか？", subtitle: "現在地を確認して、あなたに合ったコンテンツへ進んでください。", continue: "続ける", countryLabel: "国を選択", trust: "国に応じて最適なページをご案内します。", linksPageTitle: "Acessos Maizdos", linksTitle: "アクセス先を選択", linksSubtitle: "各国で利用できるオファーを開きます。", linkTo: "オファーを開く：", recommended: "おすすめ", chooseCountry: "国を選んで移動しますか？" },
    ko: { eyebrow: "HOT GLOBAL", title: "어느 국가에 계신가요?", subtitle: "위치를 확인하고 나에게 맞는 콘텐츠를 이용하세요.", continue: "계속", countryLabel: "국가 선택", trust: "선택한 국가에 가장 알맞은 페이지로 이동합니다.", linksPageTitle: "Acessos Maizdos", linksTitle: "접속할 곳을 선택하세요", linksSubtitle: "국가별로 이용 가능한 오퍼를 엽니다.", linkTo: "오퍼 열기:", recommended: "추천", chooseCountry: "국가를 직접 선택하시겠어요?" },
    zh: { eyebrow: "HOT GLOBAL", title: "您在哪个国家？", subtitle: "确认您的位置，以访问最适合您的内容。", continue: "继续", countryLabel: "选择您的国家", trust: "您的国家将决定最相关的目的地。", linksPageTitle: "Acessos Maizdos", linksTitle: "选择访问入口", linksSubtitle: "打开各国家/地区可用的优惠。", linkTo: "打开优惠：", recommended: "推荐", chooseCountry: "想自己选择国家吗？" },
    ar: { eyebrow: "HOT GLOBAL", title: "في أي بلد أنت؟", subtitle: "أكد موقعك للوصول إلى المحتوى الأنسب لك.", continue: "متابعة", countryLabel: "اختر بلدك", trust: "يحدد بلدك الوجهة الأكثر ملاءمة.", linksPageTitle: "Acessos Maizdos", linksTitle: "اختر وجهتك", linksSubtitle: "افتح العرض المتاح لكل بلد.", linkTo: "افتح العرض في", recommended: "موصى به", chooseCountry: "هل تفضل اختيار بلدك؟" },
    tr: { eyebrow: "HOT GLOBAL", title: "Hangi ülkedesiniz?", subtitle: "Size uygun içeriğe erişmek için konumunuzu doğrulayın.", continue: "Devam et", countryLabel: "Ülkenizi seçin", trust: "Ülkeniz en uygun hedefi belirler.", linksPageTitle: "Acessos Maizdos", linksTitle: "Erişiminizi seçin", linksSubtitle: "Her ülke için sunulan teklifi açın.", linkTo: "Teklifi aç:", recommended: "Önerilen", chooseCountry: "Ülkenizi kendiniz seçmek ister misiniz?" },
    hi: { eyebrow: "HOT GLOBAL", title: "आप किस देश में हैं?", subtitle: "अपने लिए सही सामग्री पाने के लिए अपना स्थान पक्का करें।", continue: "जारी रखें", countryLabel: "अपना देश चुनें", trust: "आपका देश सबसे उपयुक्त गंतव्य तय करता है।", linksPageTitle: "Acessos Maizdos", linksTitle: "अपना विकल्प चुनें", linksSubtitle: "हर देश के लिए उपलब्ध ऑफ़र खोलें।", linkTo: "ऑफ़र खोलें:", recommended: "अनुशंसित", chooseCountry: "क्या आप अपना देश चुनना चाहेंगे?" },
    nl: { eyebrow: "HOT GLOBAL", title: "In welk land bent u?", subtitle: "Bevestig uw locatie om de juiste inhoud te bekijken.", continue: "Doorgaan", countryLabel: "Selecteer uw land", trust: "Uw land bepaalt de meest relevante bestemming.", linksPageTitle: "Acessos Maizdos", linksTitle: "Kies uw toegang", linksSubtitle: "Open het aanbod dat beschikbaar is per land.", linkTo: "Aanbod openen voor", recommended: "Aanbevolen", chooseCountry: "Wilt u liever zelf uw land kiezen?" },
    pl: { eyebrow: "HOT GLOBAL", title: "W jakim kraju jesteś?", subtitle: "Potwierdź lokalizację, aby przejść do odpowiednich treści.", continue: "Kontynuuj", countryLabel: "Wybierz swój kraj", trust: "Twój kraj określa najbardziej odpowiednie miejsce docelowe.", linksPageTitle: "Acessos Maizdos", linksTitle: "Wybierz dostęp", linksSubtitle: "Otwórz ofertę dostępną dla danego kraju.", linkTo: "Otwórz ofertę dla", recommended: "Polecane", chooseCountry: "Wolisz wybrać kraj samodzielnie?" },
    sv: { eyebrow: "HOT GLOBAL", title: "Vilket land befinner du dig i?", subtitle: "Bekräfta din plats för att få rätt innehåll för dig.", continue: "Fortsätt", countryLabel: "Välj ditt land", trust: "Ditt land avgör den mest relevanta destinationen.", linksPageTitle: "Acessos Maizdos", linksTitle: "Välj åtkomst", linksSubtitle: "Öppna erbjudandet som finns för varje land.", linkTo: "Öppna erbjudandet för", recommended: "Rekommenderad", chooseCountry: "Vill du hellre välja land själv?" },
    th: { eyebrow: "HOT GLOBAL", title: "คุณอยู่ประเทศใด?", subtitle: "ยืนยันตำแหน่งของคุณเพื่อเข้าถึงเนื้อหาที่เหมาะกับคุณ", continue: "ดำเนินการต่อ", countryLabel: "เลือกประเทศของคุณ", trust: "ประเทศของคุณจะกำหนดปลายทางที่เหมาะสมที่สุด", linksPageTitle: "Acessos Maizdos", linksTitle: "เลือกช่องทางของคุณ", linksSubtitle: "เปิดข้อเสนอที่มีให้สำหรับแต่ละประเทศ", linkTo: "เปิดข้อเสนอ:", recommended: "แนะนำ", chooseCountry: "ต้องการเลือกประเทศเองหรือไม่?" },
    id: { eyebrow: "HOT GLOBAL", title: "Di negara mana Anda berada?", subtitle: "Konfirmasikan lokasi Anda untuk mengakses konten yang tepat.", continue: "Lanjutkan", countryLabel: "Pilih negara Anda", trust: "Negara Anda menentukan tujuan yang paling relevan.", linksPageTitle: "Acessos Maizdos", linksTitle: "Pilih akses Anda", linksSubtitle: "Buka penawaran yang tersedia untuk setiap negara.", linkTo: "Buka penawaran untuk", recommended: "Disarankan", chooseCountry: "Ingin memilih negara sendiri?" },
    vi: { eyebrow: "HOT GLOBAL", title: "Bạn đang ở quốc gia nào?", subtitle: "Xác nhận vị trí để truy cập nội dung phù hợp với bạn.", continue: "Tiếp tục", countryLabel: "Chọn quốc gia của bạn", trust: "Quốc gia của bạn quyết định điểm đến phù hợp nhất.", linksPageTitle: "Acessos Maizdos", linksTitle: "Chọn đường dẫn", linksSubtitle: "Mở ưu đãi hiện có cho từng quốc gia.", linkTo: "Mở ưu đãi tại", recommended: "Đề xuất", chooseCountry: "Bạn muốn tự chọn quốc gia?" }
  };

  var PROMO_HEADLINE = {
    pt: "Seu lado mais ousado tem lugar aqui — sem julgamentos e sem fronteiras.",
    es: "Tu lado más atrevido tiene su espacio aquí, sin juicios ni fronteras.",
    en: "Your bold side belongs here—without judgment or borders.",
    fr: "Votre côté audacieux a sa place ici — sans jugement ni frontières.",
    de: "Deine mutige Seite hat hier Platz – ohne Vorurteile und ohne Grenzen.",
    it: "Il tuo lato più audace qui è il benvenuto, senza giudizi né confini.",
    ru: "Здесь найдётся место вашей смелой стороне — без осуждения и границ.",
    ja: "大胆なあなたも、ここでは気兼ねなく。国境を越えて楽しめます。",
    ko: "당신의 대담한 취향을 편견과 국경 없이 즐겨보세요.",
    zh: "大胆做自己，不受评判与地域限制。",
    ar: "مساحة لجرأتك بلا أحكام أو حدود.",
    tr: "Cesur yanınız burada, yargı ve sınır olmadan.",
    hi: "आपके बेबाक अंदाज़ के लिए यहाँ जगह है—बिना जजमेंट, बिना सरहदों के।",
    nl: "Jouw gedurfde kant is hier welkom, zonder oordeel of grenzen.",
    pl: "Jest tu miejsce na Twoją odważną stronę — bez oceniania i granic.",
    sv: "Här får din djärva sida plats, utan dömande eller gränser.",
    th: "พื้นที่สำหรับด้านที่กล้าของคุณ ไร้คำตัดสินและไร้พรมแดน",
    id: "Sisi beranimu punya tempat di sini—tanpa menghakimi, tanpa batas.",
    vi: "Nơi dành cho cá tính táo bạo của bạn, không phán xét, không biên giới."
  };

  PROMO_HEADLINE = {
    pt: "🔥 Milhares de mídias vazadas do mundo inteiro, com atualizações diárias.",
    es: "🔥 Miles de contenidos filtrados de todo el mundo, con actualizaciones diarias.",
    en: "🔥 Thousands of leaked media from around the world, updated daily.",
    fr: "🔥 Des milliers de contenus divulgués du monde entier, mis à jour chaque jour.",
    de: "🔥 Tausende geleakte Inhalte aus aller Welt, täglich aktualisiert.",
    it: "🔥 Migliaia di contenuti trapelati da tutto il mondo, aggiornati ogni giorno.",
    ru: "🔥 Тысячи слитых материалов со всего мира, обновления каждый день.",
    ja: "🔥 世界中から集めた数千点の流出メディアを毎日更新。",
    ko: "🔥 전 세계의 유출 콘텐츠 수천 개, 매일 업데이트.",
    zh: "🔥 数千条来自世界各地的泄露内容，每日更新。",
    ar: "🔥 آلاف المواد المسربة من جميع أنحاء العالم، مع تحديثات يومية.",
    tr: "🔥 Dünyanın dört bir yanından binlerce sızdırılmış içerik, her gün güncelleniyor.",
    hi: "🔥 दुनिया भर की हज़ारों लीक हुई मीडिया फ़ाइलें, रोज़ाना अपडेट।",
    nl: "🔥 Duizenden gelekte media van over de hele wereld, dagelijks bijgewerkt.",
    pl: "🔥 Tysiące wyciekłych materiałów z całego świata, aktualizowanych codziennie.",
    sv: "🔥 Tusentals läckta medier från hela världen, uppdateras dagligen.",
    th: "🔥 สื่อหลุดนับพันจากทั่วโลก อัปเดตทุกวัน",
    id: "🔥 Ribuan media bocor dari seluruh dunia, diperbarui setiap hari.",
    vi: "🔥 Hàng nghìn nội dung bị rò rỉ từ khắp nơi trên thế giới, cập nhật mỗi ngày."
  };

  Object.keys(PROMO_HEADLINE).forEach(function (language) {
    STRINGS[language].promoHeadline = PROMO_HEADLINE[language];
  });

  var TELEGRAM_BADGE = {
    pt: "Acesso pelo Telegram",
    es: "Acceso por Telegram",
    en: "Access via Telegram",
    fr: "Accès via Telegram",
    de: "Zugang über Telegram",
    it: "Accesso via Telegram",
    ru: "Доступ через Telegram",
    ja: "Telegramでアクセス",
    ko: "Telegram에서 접속",
    zh: "通过 Telegram 访问",
    ar: "الوصول عبر تيليجرام",
    tr: "Telegram üzerinden erişim",
    hi: "Telegram के ज़रिए पहुँचें",
    nl: "Toegang via Telegram",
    pl: "Dostęp przez Telegram",
    sv: "Åtkomst via Telegram",
    th: "เข้าใช้งานผ่าน Telegram",
    id: "Akses lewat Telegram",
    vi: "Truy cập qua Telegram"
  };

  Object.keys(TELEGRAM_BADGE).forEach(function (language) {
    STRINGS[language].telegramBadge = TELEGRAM_BADGE[language];
  });

  var LANDING_FOOTER = {
    pt: "🌎 Suporte a todos os idiomas",
    es: "🌎 Soporte en todos los idiomas",
    en: "🌎 Support in every language",
    fr: "🌎 Assistance dans toutes les langues",
    de: "🌎 Unterstützung in allen Sprachen",
    it: "🌎 Supporto in tutte le lingue",
    ru: "🌎 Поддержка всех языков",
    ja: "🌎 あらゆる言語に対応",
    ko: "🌎 모든 언어 지원",
    zh: "🌎 支持所有语言",
    ar: "🌎 دعم جميع اللغات",
    tr: "🌎 Tüm dillerde destek",
    hi: "🌎 सभी भाषाओं में सहायता",
    nl: "🌎 Ondersteuning in alle talen",
    pl: "🌎 Obsługa wszystkich języków",
    sv: "🌎 Support på alla språk",
    th: "🌎 รองรับทุกภาษา",
    id: "🌎 Dukungan semua bahasa",
    vi: "🌎 Hỗ trợ mọi ngôn ngữ"
  };

  Object.keys(LANDING_FOOTER).forEach(function (language) {
    STRINGS[language].landingFooter = LANDING_FOOTER[language];
  });

  var COUNTRY_LANG = {
    AO: "pt", BR: "pt", CV: "pt", GW: "pt", MZ: "pt", PT: "pt", ST: "pt", TL: "pt",
    AR: "es", BO: "es", CL: "es", CO: "es", CR: "es", CU: "es", DO: "es", EC: "es",
    ES: "es", GT: "es", HN: "es", MX: "es", NI: "es", PA: "es", PE: "es", PY: "es",
    SV: "es", UY: "es", VE: "es",
    BF: "fr", BI: "fr", BJ: "fr", CD: "fr", CF: "fr", CG: "fr", CI: "fr", CM: "fr",
    FR: "fr", GA: "fr", GN: "fr", HT: "fr", LU: "fr", MC: "fr", MG: "fr", ML: "fr",
    NE: "fr", RW: "fr", SC: "fr", SN: "fr", TG: "fr",
    AT: "de", CH: "de", DE: "de", LI: "de",
    IT: "it", SM: "it", VA: "it",
    BY: "ru", KG: "ru", KZ: "ru", RU: "ru", TJ: "ru", TM: "ru", UZ: "ru",
    JP: "ja",
    KP: "ko", KR: "ko",
    CN: "zh", SG: "zh",
    AE: "ar", BH: "ar", DJ: "ar", DZ: "ar", EG: "ar", IQ: "ar", JO: "ar", KM: "ar",
    KW: "ar", LB: "ar", LY: "ar", MA: "ar", MR: "ar", OM: "ar", PS: "ar", QA: "ar",
    SA: "ar", SD: "ar", SO: "ar", SY: "ar", TD: "ar", TN: "ar", YE: "ar",
    TR: "tr",
    IN: "hi",
    BE: "nl", NL: "nl", SR: "nl",
    PL: "pl",
    SE: "sv",
    TH: "th",
    ID: "id",
    VN: "vi"
  };

  function langForCountry(code) {
    if (window.HotGlobalCountries && typeof window.HotGlobalCountries.getLanguage === "function") {
      return window.HotGlobalCountries.getLanguage(code);
    }
    var key = String(code || "").trim().toUpperCase();
    return COUNTRY_LANG[key] || "en";
  }

  function normalizeLang(lang) {
    var code = String(lang || "").trim().toLowerCase();
    return STRINGS[code] ? code : "en";
  }

  function setLanguage(lang) {
    var code = normalizeLang(lang);
    var pack = STRINGS[code];
    var root = document.documentElement;
    root.lang = code;
    root.dir = code === "ar" ? "rtl" : "ltr";
    var nodes = document.querySelectorAll("[data-i18n]");
    for (var i = 0; i < nodes.length; i++) {
      var key = nodes[i].getAttribute("data-i18n");
      if (pack[key]) nodes[i].textContent = pack[key];
    }
    var select = document.getElementById("country-select");
    if (select) select.setAttribute("aria-label", pack.countryLabel);
    document.title = document.body && /^(?:links|offers)$/.test(document.body.getAttribute("data-page"))
      ? pack.linksPageTitle
      : pack.title;
  }

  setLanguage("pt");

  window.HotGlobalI18n = {
    strings: STRINGS,
    langForCountry: langForCountry,
    setLanguage: setLanguage
  };
})();
