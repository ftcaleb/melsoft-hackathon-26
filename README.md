# Colleague Zero

Landing page for **Colleague Zero**, Melsoft Academy's autonomous agent hackathon (brief ref MEL-HACK-2026-003).

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build in dist/
```

## Routes

| Path | Page |
|---|---|
| `/` or `/colleague-zero` | Landing page |
| `/registered` or `/colleague-zero/registered` | Confirmation page the registration form leads to |

`vercel.json` rewrites every path to `index.html`, so both routes work on a deep link.

## Where things live

- `src/pages/ColleagueZeroPage.jsx`, `src/pages/ColleagueZero.css`, `src/components/` are copied unchanged from `melsoft-website`.
- `src/index.css` holds the Melsoft site's global styles that reach this page (fonts, colour tokens, base resets, heading rules).
- `src/sheets.js` has the form helpers. Registrations need a deployed Google Apps Script (see below).

## Turning on registrations

1. Follow the setup steps at the top of `google-apps-script/HackathonRegistrationCode.gs`.
2. Paste the deployed web app URL into `GSHEET_HACKATHON_ENDPOINT` in `src/sheets.js`.

Until then, the live form shows "Registration opens shortly" instead of losing a team's details. In `npm run dev` it skips the sheet so the flow can be clicked through.

## Event details

The date and venue aren't set yet. Fill in `EVENT` at the top of `src/pages/ColleagueZeroPage.jsx` (and `CONFIG` in the Apps Script) and every mention updates.
