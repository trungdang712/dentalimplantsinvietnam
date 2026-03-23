
# Lead Capture Landing Page Skill

Build landing pages with Greenfield's 5-layer lead protection pattern, CRM integration, and full analytics tracking.

## When to Use

- Creating a new landing page (e.g. allon4vietnam.com, implant page, ortho page)
- Adding lead capture forms to any page
- Setting up tracking (GTM, Facebook Pixel, Google Ads conversions)
- Integrating forms with Greenfield CRM (staff portal)
- Adding Google Sheet backup for lead protection
- Building price estimators or quiz funnels

## Architecture Overview

Every form submission goes through 5 layers — if any layer fails, the next catches the lead:

```
Layer 1: Greenfield API (primary CRM)
Layer 2: Google Sheet (backup, every submission)
Layer 3: Email Alert (on API failure only)
Layer 4: localStorage Queue (retry on next visit)
Layer 5: WhatsApp Fallback (popup with lead details)
```

## Step-by-Step Process

### Step 1: Backend Setup

**Add CORS origin** in `apps/api/src/main.ts`:
```typescript
// Find the CORS whitelist array and add the new domain
origin: [
  // ... existing origins
  'https://newlandingpage.com',
]
```

**Add LeadSource** (if new source needed) in `apps/api/src/leads/leads.service.ts`:
```typescript
// Find BUILT_IN_SOURCES array
{ sourceDetails: 'newlandingpage.com', name: 'New Landing Page', channel: 'WEBSITE' }
```

**Create or reuse API endpoint** in `apps/api/src/leads/leads.controller.ts`:
```typescript
// Simple forms can reuse /api/contacts/contact-form
// Custom forms need a new endpoint:
@Public()
@Post('new-source')
async createNewSourceLead(@Body() dto: CreateLeadDto) {
  return this.leadsService.createFromLandingPage(dto, 'newlandingpage.com');
}
```

### Step 2: Form Submission Handler

Every form needs this exact pattern:

```javascript
async function handleFormSubmit(formData) {
  const leadData = {
    name: formData.name,
    phone: formData.phone,
    email: formData.email || '',
    // Optional fields
    condition: formData.condition || '',
    travel: formData.travel || '',
    contactPreference: formData.contactPreference || 'whatsapp',
    // UTM (captured on page load)
    ...utmData,
  };

  let apiOk = false;

  // Layer 1: Greenfield API
  try {
    const res = await fetch('https://api.greenfield.clinic/api/contacts/{source}', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(leadData),
    });
    apiOk = res.ok;
  } catch (e) {
    apiOk = false;
  }

  // Layer 2: Google Sheet (ALWAYS, success or fail)
  sendToSheet(leadData, 'form_name', apiOk);

  // Layer 3 & 4: On failure only
  if (!apiOk) {
    // Layer 4: localStorage queue
    queueLead(leadData);
    // Layer 5: WhatsApp fallback
    const msg = `Tôi muốn tư vấn:%0A${leadData.name}%0A${leadData.phone}`;
    window.open(`https://wa.me/84906621988?text=${msg}`);
  }

  // Tracking (always fire, regardless of API success)
  gtag('event', 'conversion', { send_to: 'AW-11508258289/ak2wCKyC3PwZEPGryO8q' });
  gtag('event', 'generate_lead', { currency: 'AUD', value: 1.0 });
  fbq('track', 'Lead', { content_name: 'form_name' });
  window.dataLayer.push({ event: 'form_submit', formName: 'form_name', api_success: apiOk });

  // Show thank you / redirect
}
```

### Step 3: Google Sheet Backup

**Create Sheet** — 1 file for all landing pages (each gets its own tab auto-created):
1. Create Google Spreadsheet (e.g. "Greenfield Leads")
2. First tab can be "allon4" or any name — script auto-creates new tabs per formName
3. Headers auto-added: Timestamp | Name | Phone | Email | Condition | Travel | Form | API Status | UTM Source | UTM Medium | UTM Campaign | Estimate

**Apps Script** (Extensions → Apps Script → paste):

Supports multiple landing pages in 1 file — each `formName` gets its own tab (auto-created):

```javascript
function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var sheetName = data.form || 'Default';
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(sheetName);

    // Auto-create tab with headers if doesn't exist
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      sheet.appendRow([
        'Timestamp', 'Name', 'Phone', 'Email', 'Condition', 'Travel',
        'Form', 'API Status', 'UTM Source', 'UTM Medium', 'UTM Campaign', 'Estimate'
      ]);
    }

    sheet.appendRow([
      new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }),
      data.name, data.phone, data.email, data.condition, data.travel,
      data.form, data.apiStatus, data.utmSource, data.utmMedium,
      data.utmCampaign, data.estimate
    ]);

    // Layer 3: Email on API failure
    if (data.apiStatus === 'failed') {
      MailApp.sendEmail({
        to: 'hello@nhakhoagreenfield.com,anass.l@nhakhoagreenfield.com,trung@nhakhoagreenfield.com',
        subject: '⚠️ LEAD MẤT - ' + data.name + ' - ' + data.phone + ' (' + sheetName + ')',
        body: 'API failed on ' + sheetName + '. Lead details:\n' + JSON.stringify(data, null, 2)
      });
    }
    return ContentService.createTextOutput('OK');
  } catch (err) {
    return ContentService.createTextOutput('ERROR: ' + err);
  }
}
function doGet() { return ContentService.createTextOutput('Sheet webhook active'); }
```

**Key:** `data.form` determines which tab. 1 webhook URL for ALL landing pages.
- `sendToSheet(leadData, 'allon4', apiOk)` → tab "allon4"
- `sendToSheet(leadData, 'ortho', apiOk)` → tab "ortho"
- New landing page? Just use a new `formName` — tab auto-creates.

Deploy: Web App → Execute as Me → Anyone can access → Copy URL.
1 deployment, 1 URL — reuse for all landing pages.

**sendToSheet function:**
```javascript
const SHEET_WEBHOOK = 'https://script.google.com/macros/s/.../exec';

function sendToSheet(leadData, formName, apiOk) {
  if (!SHEET_WEBHOOK) return;
  fetch(SHEET_WEBHOOK, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: leadData.name || '', phone: leadData.phone || '',
      email: leadData.email || '', condition: leadData.condition || '',
      travel: leadData.travel || '', form: formName,
      apiStatus: apiOk ? 'success' : 'failed',
      utmSource: leadData.utmSource || '', utmMedium: leadData.utmMedium || '',
      utmCampaign: leadData.utmCampaign || '',
      estimate: leadData.estimate ? JSON.stringify(leadData.estimate) : '',
    }),
    mode: 'no-cors',
  }).catch(() => {});
}
```

### Step 4: localStorage Queue

```javascript
function queueLead(leadData) {
  try {
    const queue = JSON.parse(localStorage.getItem('leadQueue') || '[]');
    queue.push({ ...leadData, queuedAt: new Date().toISOString() });
    localStorage.setItem('leadQueue', JSON.stringify(queue));
  } catch (e) {}
}

function flushLeadQueue() {
  try {
    const queue = JSON.parse(localStorage.getItem('leadQueue') || '[]');
    if (!queue.length) return;
    const fresh = queue.filter(l => {
      const age = Date.now() - new Date(l.queuedAt).getTime();
      return age < 7 * 24 * 60 * 60 * 1000; // 7 days max
    });
    fresh.forEach(async (lead) => {
      try {
        const res = await fetch('https://api.greenfield.clinic/api/contacts/{source}', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(lead),
        });
        if (res.ok) {
          const remaining = JSON.parse(localStorage.getItem('leadQueue') || '[]');
          localStorage.setItem('leadQueue',
            JSON.stringify(remaining.filter(l => l.queuedAt !== lead.queuedAt)));
        }
      } catch (e) {}
    });
  } catch (e) {}
}

// Call on page load
document.addEventListener('DOMContentLoaded', flushLeadQueue);
```

### Step 5: Analytics & Tracking

**Google Tag Manager** — add to `<head>` (synchronous, NOT deferred):
```html
<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-P9F52DWS');</script>
```

Add noscript after `<body>`:
```html
<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-P9F52DWS"
height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
```

**Google Consent Mode v2** — add BEFORE GTM:
```html
<script>
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('consent', 'default', {
  'analytics_storage': 'denied',
  'ad_storage': 'denied',
  'ad_user_data': 'denied',
  'ad_personalization': 'denied',
});
</script>
```

**Facebook Pixel** — add to all pages:
```html
<script>
!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '26443098325275263');
fbq('track', 'PageView');
</script>
```

**UTM Capture** — run on page load:
```javascript
const urlParams = new URLSearchParams(window.location.search);
const utmData = {
  utmSource: urlParams.get('utm_source') || '',
  utmMedium: urlParams.get('utm_medium') || '',
  utmCampaign: urlParams.get('utm_campaign') || '',
  utmTerm: urlParams.get('utm_term') || '',
  utmContent: urlParams.get('utm_content') || '',
};
```

**Conversion tracking** — fire on form submit:
```javascript
// Google Ads
gtag('event', 'conversion', { send_to: 'AW-11508258289/ak2wCKyC3PwZEPGryO8q' });
gtag('event', 'generate_lead', { currency: 'AUD', value: 1.0 });
// Facebook
fbq('track', 'Lead', { content_name: 'form_name' });
// DataLayer
window.dataLayer.push({ event: 'form_submit', formName: 'form_name', api_success: true });
```

### Step 6: WhatsApp Fallback

```javascript
const WHATSAPP_NUMBER = '84906621988';

function whatsappFallback(leadData) {
  const msg = encodeURIComponent(
    `Tôi muốn tư vấn:\nTên: ${leadData.name}\nSĐT: ${leadData.phone}\nEmail: ${leadData.email || 'N/A'}`
  );
  window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${msg}`);
}
```

## Checklist

Before going live, verify all items:

```
Backend:
  [ ] CORS origin added to apps/api/src/main.ts
  [ ] LeadSource added to BUILT_IN_SOURCES (or reusing existing)
  [ ] API endpoint created or reusing /api/contacts/contact-form

Frontend:
  [ ] Form submission handler with 5-layer pattern
  [ ] UTM capture on page load
  [ ] localStorage queue + flushLeadQueue on DOMContentLoaded

Tracking:
  [ ] GTM (GTM-P9F52DWS) — synchronous in <head>
  [ ] Google Consent Mode v2 — BEFORE GTM
  [ ] Facebook Pixel (26443098325275263) — all pages
  [ ] Google Ads conversion on form submit
  [ ] FB Lead event on form submit
  [ ] dataLayer.push with api_success flag

Backup:
  [ ] Google Sheet exists (1 file, tabs auto-created per formName)
  [ ] Apps Script deployed as Web App (1 URL for all landing pages)
  [ ] sendToSheet() fires on every submission with correct formName
  [ ] Email alert on API failure (in Apps Script)
  [ ] WhatsApp fallback on API failure

Testing:
  [ ] Submit form → appears in CRM pipeline (staff portal leads page)
  [ ] Submit form → appears in Google Sheet
  [ ] Block API (wrong URL) → email alert received
  [ ] Block API → WhatsApp popup opens
  [ ] Reload page → localStorage queue retries
  [ ] UTM params preserved through form submission
  [ ] Google Ads conversion fires (check Tag Assistant)
  [ ] FB Pixel fires (check FB Pixel Helper)
```

## Reference Implementation

AllOn4 Vietnam (allon4vietnam.com) is the reference. Key files:
- `allon4vietnam/script.js` — all form handlers, tracking, backup layers
- `allon4vietnam/price-estimator.html` — price estimator with same patterns
- `allon4vietnam/google-apps-script.js` — Apps Script for Sheet + email alerts
- `apps/api/src/leads/leads.controller.ts` — API endpoints
- `apps/api/src/leads/leads.service.ts` — Lead creation + auto-assignment
- `apps/api/src/leads/lead-notification.service.ts` — Email notifications

## Constants

```
API Base:         https://api.greenfield.clinic/api/contacts/
GTM Container:    GTM-P9F52DWS
Google Ads ID:    AW-11508258289
Conversion Label: ak2wCKyC3PwZEPGryO8q
Facebook Pixel:   26443098325275263
WhatsApp:         +84906621988 (wa.me/84906621988)
Alert Emails:     hello@, anass.l@, trung@ nhakhoagreenfield.com
```
