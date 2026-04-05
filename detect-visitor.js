// ── VISITOR GEO-DETECTION ──
// Two-layer detection:
//   Layer 1 (synchronous): navigator.language + timezone → instant best-guess
//   Layer 2 (async):       Cloudflare /cdn-cgi/trace → authoritative override
// Populates window.visitorData for use by form submission handlers.
// Non-blocking: Layer 1 defaults are always available even if Layer 2 fails.

(function () {
  var LANG_MAP = {
    VN: 'vi',
    JP: 'ja',
    KR: 'ko',
    CN: 'zh',
    TW: 'zh',
    HK: 'zh',
    TH: 'th',
    RU: 'ru',
  };

  // Timezone → country code mapping for Layer 1 fallback
  var TZ_COUNTRY = {
    'Australia/Sydney': 'AU', 'Australia/Melbourne': 'AU', 'Australia/Brisbane': 'AU',
    'Australia/Perth': 'AU', 'Australia/Adelaide': 'AU', 'Australia/Hobart': 'AU',
    'Australia/Darwin': 'AU', 'Australia/Lord_Howe': 'AU',
    'Asia/Ho_Chi_Minh': 'VN', 'Asia/Saigon': 'VN',
    'Europe/London': 'GB',
    'Asia/Seoul': 'KR',
    'Asia/Tokyo': 'JP',
    'Asia/Shanghai': 'CN', 'Asia/Chongqing': 'CN',
    'Asia/Taipei': 'TW',
    'Asia/Hong_Kong': 'HK',
    'Asia/Bangkok': 'TH',
    'Europe/Moscow': 'RU',
    'Pacific/Auckland': 'NZ', 'Pacific/Chatham': 'NZ',
    'Asia/Singapore': 'SG',
    'Asia/Kuala_Lumpur': 'MY',
  };

  function resolveCountryName(code) {
    try {
      var displayNames = new Intl.DisplayNames(['en'], { type: 'region' });
      return displayNames.of(code) || null;
    } catch (_) {
      return null;
    }
  }

  // ── Layer 1: Synchronous best-guess from browser signals ──
  var initLang = 'en';
  var initCode = null;

  try {
    var navLang = navigator.language || navigator.userLanguage || '';
    if (navLang) {
      // Extract language (first 2 chars): 'en-AU' → 'en', 'vi' → 'vi'
      initLang = navLang.substring(0, 2).toLowerCase();

      // Extract region if available: 'en-AU' → 'AU'
      var regionMatch = navLang.match(/[-_]([A-Za-z]{2})$/);
      if (regionMatch) {
        initCode = regionMatch[1].toUpperCase();
      }
    }

    // If no region from navigator.language, infer from timezone
    if (!initCode) {
      var tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
      if (TZ_COUNTRY[tz]) {
        initCode = TZ_COUNTRY[tz];
      } else if (tz.indexOf('America/') === 0) {
        initCode = 'US';
      } else if (tz.indexOf('Australia/') === 0) {
        initCode = 'AU';
      }
    }
  } catch (_) {
    // Browser doesn't support Intl — defaults remain
  }

  // Set Layer 1 defaults immediately so forms always have something to read
  window.visitorData = {
    countryCode: initCode,
    country: initCode ? resolveCountryName(initCode) : null,
    preferredLanguage: initLang || 'en',
  };

  // ── Layer 2: Async authoritative override from Cloudflare ──
  var ctrl = new AbortController();
  var timer = setTimeout(function () { ctrl.abort(); }, 3000);

  fetch('/cdn-cgi/trace', { signal: ctrl.signal })
    .then(function (res) { return res.text(); })
    .then(function (text) {
      clearTimeout(timer);
      var match = text.match(/loc=([A-Z]{2})/);
      if (!match) return;

      var code = match[1];
      window.visitorData.countryCode = code;
      window.visitorData.country = resolveCountryName(code);
      window.visitorData.preferredLanguage = LANG_MAP[code] || window.visitorData.preferredLanguage;
    })
    .catch(function () {
      clearTimeout(timer);
      // Layer 1 defaults already set — nothing to do
    });
})();
