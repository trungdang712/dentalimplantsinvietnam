/**
 * Clinic Info Sync — runtime synchronization of clinic contact details
 * across Greenfield Dental static landing pages.
 *
 * Single source of truth: ClinicSetting table in greenfield-platform, edited via
 *   https://staff.greenfield.clinic/vi/settings/clinic-profile
 *
 * On DOMContentLoaded this script fetches the public clinic profile endpoint
 *   GET https://api.greenfield.clinic/api/settings/clinic-profile   (no auth, Redis-cached 24h)
 * and updates any element tagged with `data-clinic="<field>"`. A MutationObserver
 * re-applies updates to elements inserted later by client-side JS (e.g. thankyou
 * page template rendering).
 *
 * Hardcoded HTML values act as SEO-safe defaults — if the API is unreachable
 * or the response is stale, the page still renders correctly.
 *
 * Supported data-clinic values:
 *   phone          → textContent = formatted display phone ("+84 90 662 1988")
 *   phoneRaw       → textContent = E.164 form ("+84906621988")
 *   phoneHref      → href = "tel:+84906621988"
 *   whatsapp       → textContent = formatted display phone
 *   whatsappHref   → href = "https://wa.me/84906621988" (preserves existing ?text= query)
 *   email          → textContent
 *   emailHref      → href = "mailto:..."
 *   address        → textContent
 *   addressVi      → textContent
 *   clinicName     → textContent
 *   clinicNameVi   → textContent
 *   facebookHref   → href = facebook URL
 *   instagramHref  → href = instagram URL
 *   youtubeHref    → href = youtube URL
 *
 * JSON-LD (<script type="application/ld+json">) is NOT updated — search crawlers
 * need it in the initial HTML. Keep those blocks in sync manually if clinic
 * details change.
 *
 * Exposes window.GreenfieldClinic.sync() if a page wants to force-re-apply
 * after a dynamic render without waiting for the MutationObserver.
 */
(function () {
  'use strict';
  var API_URL = 'https://api.greenfield.clinic/api/settings/clinic-profile';
  var cachedData = null;

  function formatPhoneDisplay(e164) {
    if (!e164) return '';
    var m = String(e164).match(/^\+?84(\d{2,3})(\d{3})(\d{3,4})$/);
    if (!m) return e164;
    return '+84 ' + m[1] + ' ' + m[2] + ' ' + m[3];
  }

  function stripPlus(e164) {
    return String(e164 || '').replace(/^\+/, '');
  }

  function applyToElement(el, data) {
    if (!el || !data) return;
    var key = el.getAttribute('data-clinic');
    if (!key) return;

    var phone = data.phone || data.whatsapp || '';
    var whatsapp = data.whatsapp || data.phone || '';
    var phoneE164 = String(phone || '').replace(/[^\d+]/g, '');
    var whatsappDigits = stripPlus(whatsapp).replace(/\D/g, '');
    var social = data.socialLinks || {};

    switch (key) {
      case 'phone':
        if (phone) el.textContent = formatPhoneDisplay(phone);
        break;
      case 'phoneRaw':
        if (phoneE164) el.textContent = phoneE164;
        break;
      case 'phoneHref':
        if (phoneE164) el.setAttribute('href', 'tel:' + phoneE164);
        break;
      case 'whatsapp':
        if (whatsapp) el.textContent = formatPhoneDisplay(whatsapp);
        break;
      case 'whatsappHref':
        if (whatsappDigits) {
          var existing = el.getAttribute('href') || '';
          var query = '';
          var q = existing.indexOf('?');
          if (q >= 0) query = existing.substring(q);
          el.setAttribute('href', 'https://wa.me/' + whatsappDigits + query);
        }
        break;
      case 'email':
        if (data.email) el.textContent = data.email;
        break;
      case 'emailHref':
        if (data.email) el.setAttribute('href', 'mailto:' + data.email);
        break;
      case 'address':
        if (data.address) el.textContent = data.address;
        break;
      case 'addressVi':
        if (data.addressVi) el.textContent = data.addressVi;
        break;
      case 'clinicName':
        if (data.clinicName) el.textContent = data.clinicName;
        break;
      case 'clinicNameVi':
        if (data.clinicNameVi) el.textContent = data.clinicNameVi;
        break;
      case 'facebookHref':
        if (social.facebook) el.setAttribute('href', social.facebook);
        break;
      case 'instagramHref':
        if (social.instagram) el.setAttribute('href', social.instagram);
        break;
      case 'youtubeHref':
        if (social.youtube) el.setAttribute('href', social.youtube);
        break;
      // unknown key → silent ignore
    }
  }

  function applyAll(root) {
    if (!cachedData) return;
    var scope = root || document;
    if (scope.nodeType === 1 && scope.hasAttribute && scope.hasAttribute('data-clinic')) {
      applyToElement(scope, cachedData);
    }
    var nodes = (scope.querySelectorAll ? scope.querySelectorAll('[data-clinic]') : []);
    for (var i = 0; i < nodes.length; i++) {
      applyToElement(nodes[i], cachedData);
    }
  }

  function installObserver() {
    if (!window.MutationObserver) return;
    var observer = new MutationObserver(function (mutations) {
      if (!cachedData) return;
      for (var i = 0; i < mutations.length; i++) {
        var m = mutations[i];
        for (var j = 0; j < m.addedNodes.length; j++) {
          var node = m.addedNodes[j];
          if (node.nodeType === 1) applyAll(node);
        }
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  function run() {
    try {
      fetch(API_URL, { credentials: 'omit', mode: 'cors' })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (data) {
          if (!data) return;
          cachedData = data;
          applyAll(document);
          installObserver();
        })
        .catch(function () { /* silent — hardcoded defaults remain */ });
    } catch (e) {
      /* silent */
    }
  }

  window.GreenfieldClinic = {
    sync: function () { applyAll(document); },
    getData: function () { return cachedData; },
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }
})();
