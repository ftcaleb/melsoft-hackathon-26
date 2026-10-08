/**
 * Melsoft Academy — Colleague Zero hackathon registrations → Google Sheet + emails.
 *
 * Receives every team registration from /colleague-zero
 * (src/pages/ColleagueZeroPage.jsx → sendHackathonRegistrationToSheet in
 * src/sheets.js). One row per team. After logging the row it (1) emails the
 * team captain a confirmation and (2) notifies the hackathon inbox. Both
 * emails are best-effort — a mail failure never loses the row.
 *
 * ── One-time setup ─────────────────────────────────────────────────────────
 *  1. Create a new Google Sheet called "Melsoft — Colleague Zero registrations".
 *     Copy its ID from the URL:
 *       https://docs.google.com/spreadsheets/d/<THIS_IS_THE_ID>/edit
 *  2. Extensions → Apps Script. Delete the boilerplate, paste this file.
 *  3. Set SHEET_ID below to the ID from step 1. Check CONFIG.NOTIFY_EMAIL.
 *  4. Deploy → New deployment → type "Web app".
 *       - Description: Colleague Zero registrations API
 *       - Execute as: Me
 *       - Who has access: Anyone
 *     Authorise when prompted (it needs Sheets + Gmail send).
 *  5. Copy the Web app URL (ends in /exec) into
 *       src/sheets.js → GSHEET_HACKATHON_ENDPOINT
 *     Until that is set, the live form refuses to submit (it says
 *     registration opens shortly) rather than lose a team's details.
 *
 *  ⚠️ Any change to doPost requires deploying a NEW VERSION of the web app
 *     (Deploy → Manage deployments → Edit → Version: New version → Deploy).
 *  ⚠️ Columns are positional. Add a new one only at the END of HEADERS and
 *     the appendRow array together.
 */

var SHEET_ID   = "13KbK4JBat9LOvLfBY02FP0jdEgdLPSAQGN-gR0qK6ns";
var SHEET_NAME = "Team registrations";

var CONFIG = {
  SENDER_NAME:  "Colleague Zero · Melsoft Academy",
  REPLY_TO:     "hello@melsoftacademy.com",
  NOTIFY_EMAIL: "hello@melsoftacademy.com", // gets a heads-up per team
  // Fill these in once they're confirmed; the email leaves them out until then.
  EVENT_DATE_TEXT: "Starts 11:00, Friday 13 November 2026 (online). Ends Saturday 14 November: doors open 09:00, hacking ends 11:00, presentations 12:00.",
  EVENT_VENUE_TEXT: "Day one online. Day two at the Melsoft offices, 173 Oxford Road, Rosebank.",
};

var HEADERS = [
  "Timestamp", "Team name", "Occupation", "Team size",
  "Captain", "Email", "Phone", "Human in the chair", "Stack",
  "Source", "Confirmation email", "Status", "Teammates", "Joining as", "In person",
];

// ── Entry point ────────────────────────────────────────────────────────────

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    var data = JSON.parse(e.postData.contents);
    if (data.type !== "hackathon_registration") {
      return json_({ result: "error", error: "Unexpected payload type: " + data.type });
    }
    var solo = data.joiningAs === "Individual";
    if (!data.email || (!solo && !data.teamName)) {
      return json_({ result: "error", error: "Missing email or team name" });
    }

    var mail = "skipped";
    try {
      sendConfirmationEmail_(data);
      mail = "sent";
    } catch (mailErr) {
      mail = "error: " + mailErr;
      Logger.log("Hackathon confirmation email error: " + mailErr);
    }

    lock.waitLock(10000);
    appendRegistration_(data, mail);
    lock.releaseLock();

    try { notifyTeam_(data); } catch (nErr) { Logger.log("Hackathon notify error: " + nErr); }

    return json_({ result: "success", email: mail });
  } catch (err) {
    try { lock.releaseLock(); } catch (_) {}
    return json_({ result: "error", error: String(err) });
  }
}

// ── Sheet logging ──────────────────────────────────────────────────────────

function appendRegistration_(d, mailStatus) {
  var sheet = getSheet_(SHEET_NAME, HEADERS);
  sheet.appendRow([
    d.timestamp || new Date().toISOString(),
    d.teamName || "", d.organisation || "", d.teamSize || "",
    // Leading apostrophe keeps Sheets from reading the phone as a number,
    // which drops the 0 in 082… and mangles +27….
    d.captainName || "", d.email || "", d.phone ? "'" + d.phone : "", d.chairName || "", d.stack || "",
    d.source || "direct", mailStatus, "Registered", d.members || "",
    d.joiningAs || "Team", d.inPerson || "",
  ]);
}

// ── Emails ─────────────────────────────────────────────────────────────────

function sendConfirmationEmail_(d) {
  var name = String(d.captainName || "there").trim().split(/\s+/)[0];
  var when = CONFIG.EVENT_DATE_TEXT
    ? "<div style=\"margin-top:6px\"><strong>When:</strong> " + esc_(CONFIG.EVENT_DATE_TEXT) + "</div>"
    : "<div style=\"margin-top:6px\"><strong>When:</strong> announced to registered teams first</div>";
  var where = CONFIG.EVENT_VENUE_TEXT
    ? "<div style=\"margin-top:6px\"><strong>Where:</strong> " + esc_(CONFIG.EVENT_VENUE_TEXT) + "</div>"
    : "";

  var solo = d.joiningAs === "Individual";
  var who = solo ? "You're" : "<strong>" + esc_(d.teamName) + "</strong> is";
  var team = solo
    ? "Joining as an individual"
    : esc_(d.teamName) + " · " + esc_(d.teamSize || "?") + " people";
  var inPerson = d.inPerson === "Yes"
    ? (solo ? "You'll" : "Your team will") + " join day two in person."
    : "Day two is in person at the Melsoft offices, if you can make it.";

  var htmlBody = "" +
    "<div style=\"font-family:Inter,Arial,sans-serif;font-size:15px;line-height:1.6;color:#0a1733;max-width:560px\">" +
    "<p>Hi " + esc_(name) + ",</p>" +
    "<p>" + who + " on the shortlist for Colleague Zero, the autonomous agent hackathon.</p>" +
    "<div style=\"border:1px solid #e5e8f0;border-left:4px solid #5e0743;border-radius:12px;padding:16px 18px;margin:16px 0\">" +
    "<div style=\"font-size:18px;font-weight:700\">Colleague Zero</div>" +
    when + where +
    "<div style=\"margin-top:6px\"><strong>Team:</strong> " + team + "</div>" +
    "</div>" +
    "<p>Build a digital colleague: a system of agents that is given a goal, plans the work, uses tools to do it, " +
    "checks its own output and fixes what's wrong. Every project must solve a real problem in EdTech. " + inPerson + "</p>" +
    "<p>Questions? Reply to this email or call us on 010 158 4346.</p>" +
    "<p>See you there,<br>" + esc_(CONFIG.SENDER_NAME) + "</p>" +
    "</div>";

  MailApp.sendEmail({
    to: d.email,
    replyTo: CONFIG.REPLY_TO,
    name: CONFIG.SENDER_NAME,
    subject: "You're on the shortlist: Colleague Zero" + (d.teamName ? " · " + d.teamName : ""),
    htmlBody: htmlBody,
  });
}

function notifyTeam_(d) {
  if (!CONFIG.NOTIFY_EMAIL) return;
  var rows = [
    ["Joining as", d.joiningAs], ["Team", d.teamName], ["Occupation", d.organisation], ["Team size", d.teamSize],
    ["Captain", d.captainName], ["Email", d.email], ["Phone", d.phone],
    ["Teammates", d.members], ["In person (day two)", d.inPerson], ["Source", d.source],
  ];
  var table = rows.map(function (r) {
    return "<tr><td style=\"padding:4px 12px 4px 0;color:#5b6478\">" + esc_(r[0]) + "</td><td style=\"padding:4px 0\">" + esc_(r[1] || "—") + "</td></tr>";
  }).join("");
  MailApp.sendEmail({
    to: CONFIG.NOTIFY_EMAIL,
    name: "Melsoft website",
    subject: d.joiningAs === "Individual"
      ? "New Colleague Zero individual: " + (d.captainName || "") + " (" + (d.organisation || "") + ")"
      : "New Colleague Zero team: " + (d.teamName || "") + " (" + (d.organisation || "") + ")",
    htmlBody: "<div style=\"font-family:Inter,Arial,sans-serif;font-size:14px;color:#0a1733\"><table>" + table + "</table></div>",
  });
}

// ── Helpers ────────────────────────────────────────────────────────────────

function getSheet_(sheetName, headers) {
  var ss    = SpreadsheetApp.openById(SHEET_ID);
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) sheet = ss.insertSheet(sheetName);

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
    var headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setFontWeight("bold");
    headerRange.setBackground("#5e0743");
    headerRange.setFontColor("#ffffff");
    sheet.setFrozenRows(1);
  } else if (sheet.getLastColumn() < headers.length) {
    var from = sheet.getLastColumn() + 1;
    var added = sheet.getRange(1, from, 1, headers.length - from + 1);
    added.setValues([headers.slice(from - 1)]);
    added.setFontWeight("bold").setBackground("#5e0743").setFontColor("#ffffff");
  }
  return sheet;
}

function esc_(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
