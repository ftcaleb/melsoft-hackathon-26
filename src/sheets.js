// Form helpers for the Colleague Zero page, copied verbatim from
// melsoft-website/src/sheets.js.

// ── Corporate landing-page traffic source ───────────────────────────────────
// The corporate opt-in pages (/for-corporate-2, /for-corporate-3) are run as
// paid ads on LinkedIn and Facebook. Each ad link carries a ?src= tag, e.g.
//   https://www.melsoftacademy.com/for-corporate-2?src=linkedin
//   https://www.melsoftacademy.com/for-corporate-2?src=facebook
// We read it on submit and send it as the lead's `source`, so the intake sheet
// can show whether a lead came from LinkedIn or Facebook. `?utm_source=` is
// accepted as a fallback. Returns "direct" when neither is present.
export function getLeadSource() {
  try {
    const fromQuery = (search) => {
      const q = new URLSearchParams(search);
      return q.get("src") || q.get("utm_source");
    };
    let src = fromQuery(window.location.search);
    // Fall back to a hash-based query (e.g. /#/for-corporate-2?src=linkedin).
    if (!src && window.location.hash.includes("?")) {
      src = fromQuery(window.location.hash.slice(window.location.hash.indexOf("?")));
    }
    return (src || "direct").trim().slice(0, 60).toLowerCase();
  } catch (_) {
    return "direct";
  }
}

// ── Colleague Zero hackathon ────────────────────────────────────────────────
// Team registrations from /colleague-zero land in their own sheet (tab "Team
// registrations"), and the Apps Script emails the captain a confirmation —
// see google-apps-script/HackathonRegistrationCode.gs for the script and the
// one-time deployment steps. Paste the deployed Web app URL (ends in /exec)
// here. Until then the form refuses to submit on the live site, rather than
// show a team a confirmation for a registration nobody received.
export const GSHEET_HACKATHON_ENDPOINT =
  "https://script.google.com/macros/s/AKfycbz-nI6XeO0VTLoUY0BcKY6QM-BNVXW_AvVWNkT-O7JcDbqMSJrIqemM8WLKx5Q29WLJUg/exec";

export const hackathonConfigured = () =>
  Boolean(GSHEET_HACKATHON_ENDPOINT) && !GSHEET_HACKATHON_ENDPOINT.startsWith("PASTE_");

export async function sendHackathonRegistrationToSheet(payload) {
  if (!hackathonConfigured()) {
    throw new Error("GSHEET_HACKATHON_ENDPOINT is not configured in src/sheets.js");
  }

  const res = await fetch(GSHEET_HACKATHON_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ ...payload, type: "hackathon_registration" }),
  });

  if (!res.ok) throw new Error("Hackathon registration endpoint returned " + res.status);
  return res.json().catch(() => ({}));
}
