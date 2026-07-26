/**
 * CoserveU — Admin login-audit receiver (Google Apps Script)
 * ----------------------------------------------------------
 * Deploy this bound to a Google Sheet owned by advlakhilohia@gmail.com
 * (share the sheet with lakhilohia23@gmail.com for the second admin).
 *
 * SETUP
 * 1. Create a new Google Sheet. Extensions ▸ Apps Script.
 * 2. Paste this file's contents. Save.
 * 3. Deploy ▸ New deployment ▸ type "Web app".
 *      - Execute as: Me
 *      - Who has access: Anyone
 * 4. Copy the /exec URL and paste it into the CoserveU app
 *    (About & Safety ▸ "Google Apps Script Web App URL" ▸ Save endpoint).
 *
 * The app posts JSON: { name, email, address, loginTime, adminTargets }.
 * Requests are sent with mode:"no-cors" (fire-and-forget), which is why the
 * client cannot read the response — that is expected and fine.
 */
function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Logins')
             || SpreadsheetApp.getActiveSpreadsheet().insertSheet('Logins');

    if (sheet.getLastRow() === 0) {
      sheet.appendRow(['Received At', 'Name', 'Email', 'Address', 'Login Time (device)']);
    }
    sheet.appendRow([
      new Date(),
      data.name || '',
      data.email || '',
      data.address || '',
      data.loginTime || ''
    ]);
    return ContentService
      .createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet() {
  return ContentService.createTextOutput('CoserveU audit endpoint is live.');
}
