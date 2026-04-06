/**
 * Google Apps Script — Greenfield Lead Backup (all landing pages)
 *
 * Routes leads to different tabs by data.form prefix:
 *   - "dental-tourism-*" forms → "dentalvietnam" tab
 *   - everything else (allon4, etc.) → "Trang tính1" tab
 *
 * DEPLOY: Manage deployments → edit existing → Version: New version → Deploy
 * Same webhook URL works for ALL landing pages.
 */

var ALERT_EMAIL = 'anass.l@nhakhoagreenfield.com';
var CC_EMAIL = 'trung@nhakhoagreenfield.com, hello@nhakhoagreenfield.com';

// Map form prefixes to sheet tabs
function getSheetName(formName) {
  if (formName && formName.indexOf('dental-tourism') === 0) return 'dentalvietnam';
  return 'allon4vietnam'; // default = allon4 tab
}

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var sheetName = getSheetName(data.form);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(sheetName);

    // Auto-create tab with headers if it doesn't exist
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      if (sheetName === 'dentalvietnam') {
        sheet.appendRow([
          'Timestamp', 'Name', 'Phone', 'Email', 'Treatment', 'Timeline',
          'Country', 'Contact Preference', 'Notes', 'Form', 'API Status',
          'UTM Source', 'UTM Medium', 'UTM Campaign'
        ]);
      } else {
        sheet.appendRow([
          'Timestamp', 'Name', 'Phone', 'Email', 'Condition', 'Travel',
          'Form', 'API Status', 'UTM Source', 'UTM Medium', 'UTM Campaign', 'Estimate'
        ]);
      }
      sheet.getRange(1, 1, 1, sheet.getLastColumn()).setFontWeight('bold');
    }

    // Write row — dental-tourism has different columns than allon4
    if (sheetName === 'dentalvietnam') {
      sheet.appendRow([
        new Date().toISOString(),
        data.name || '',
        data.phone || '',
        data.email || '',
        data.treatment || '',
        data.timeline || '',
        data.country || '',
        data.contactPreference || '',
        data.notes || '',
        data.form || '',
        data.apiStatus || '',
        data.utmSource || '',
        data.utmMedium || '',
        data.utmCampaign || ''
      ]);
    } else {
      // Original allon4 format
      sheet.appendRow([
        new Date().toISOString(),
        data.name || '',
        data.phone || '',
        data.email || '',
        data.condition || '',
        data.travel || '',
        data.form || '',
        data.apiStatus || '',
        data.utmSource || '',
        data.utmMedium || '',
        data.utmCampaign || '',
        data.estimate || ''
      ]);
    }

    // Email alert for every new lead
    var source = sheetName === 'dentalvietnam' ? 'Dental Tourism Vietnam' : 'AllOn4 Vietnam';
    var apiFlag = data.apiStatus === 'failed' ? ' ⚠ API MISSED' : '';
    var subject = '🦷 New Lead — ' + source + apiFlag + ': ' + (data.name || 'Unknown');
    var lines = [];
    if (data.apiStatus === 'failed') {
      lines.push('⚠ The Greenfield API failed to capture this lead — saved to sheet only.');
    } else {
      lines.push('✅ Lead captured successfully by API and sheet.');
    }
    lines.push('');
    lines.push('Name:  ' + (data.name || 'N/A'));
    lines.push('Phone: ' + (data.phone || 'N/A'));
    lines.push('Email: ' + (data.email || 'N/A'));
    if (sheetName === 'dentalvietnam') {
      lines.push('Treatment: ' + (data.treatment || 'N/A'));
      lines.push('Timeline:  ' + (data.timeline || 'N/A'));
      lines.push('Country:   ' + (data.country || 'N/A'));
    } else {
      lines.push('Condition: ' + (data.condition || 'N/A'));
      lines.push('Travel:    ' + (data.travel || 'N/A'));
      lines.push('Estimate:  ' + (data.estimate || 'N/A'));
    }
    lines.push('Form: ' + (data.form || 'N/A'));
    lines.push('');
    lines.push('UTM: ' + [data.utmSource, data.utmMedium, data.utmCampaign].filter(Boolean).join(' / '));
    lines.push('Time: ' + new Date().toString());
    lines.push('');
    lines.push('-- Greenfield Lead Backup System');
    var body = lines.join('\n');

    GmailApp.sendEmail(ALERT_EMAIL, subject, body, { cc: CC_EMAIL });

    return ContentService
      .createTextOutput(JSON.stringify({ status: 'ok' }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', message: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet() {
  return ContentService
    .createTextOutput(JSON.stringify({ status: 'ok', message: 'Greenfield Lead Backup webhook is running.' }))
    .setMimeType(ContentService.MimeType.JSON);
}
