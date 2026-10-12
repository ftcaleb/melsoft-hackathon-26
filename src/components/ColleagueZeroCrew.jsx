import { useEffect, useState } from "react";

/* ── Colleague Zero hero figure: the crew ───────────────────────────────
   An isometric platform with the brief's workflow laid out on it. A
   document starts in the inbox (given a goal), passes three agents on
   pedestals (plans the work, uses tools, checks its own output), gets a
   problem flagged and fixed at the checker (fixes what is wrong), and
   lands in the output tray (finished result). Only the agent holding the
   document moves, so the scene stays calm. With reduced motion it shows
   the finished state. */

// Isometric projection: plan units (x, y) and height z in px → screen.
const S = 34.6; // half-width of one plan unit on screen
const H = 20;   // half-height of one plan unit on screen
const iso = (x, y, z = 0) => ({ X: 340 + (x - y) * S, Y: 150 + (x + y) * H - z });
const pts = (arr) => arr.map((p) => `${p.X.toFixed(1)},${p.Y.toFixed(1)}`).join(" ");

const STATIONS = [
  { k: "goal", x: 0.5, y: 5.6, label: "Goal", kind: "tray" },
  { k: "plan", x: 1.6, y: 3.0, label: "Plan", kind: "bot" },
  { k: "tools", x: 4.0, y: 3.0, label: "Tools", kind: "bot" },
  { k: "check", x: 6.4, y: 3.0, label: "Check", fixLabel: "Fix", kind: "bot" },
  { k: "done", x: 6.4, y: 0.4, label: "Done", kind: "tray" },
];

// [where the document is, its badge]; one entry per beat.
const BEATS = [
  [0, null], [1, null], [2, null], [3, "flag"], [3, "fixed"], [4, "fixed"], [4, "fixed"],
];
const BEAT_MS = 1500;

// An iso box: top, left and right faces.
function Box({ x, y, z = 0, w, d, h, cls }) {
  const T = z + h;
  const t = [iso(x, y, T), iso(x + w, y, T), iso(x + w, y + d, T), iso(x, y + d, T)];
  const l = [iso(x, y + d, T), iso(x + w, y + d, T), iso(x + w, y + d, z), iso(x, y + d, z)];
  const r = [iso(x + w, y, T), iso(x + w, y + d, T), iso(x + w, y + d, z), iso(x + w, y, z)];
  const P = (p) => `${p.X.toFixed(1)} ${p.Y.toFixed(1)}`;
  return (
    <g className={cls}>
      {/* Faces are stroked in their own colour with round joins, which
          rounds every corner of the box. */}
      <polygon points={pts(l)} className="cz-crew-l" />
      <polygon points={pts(r)} className="cz-crew-r" />
      <polygon points={pts(t)} className="cz-crew-t" />
      {/* Light catching the top front edges and the front corner; a faint
          darker line along the base. */}
      <path d={`M${P(t[3])} L${P(t[2])} L${P(t[1])} M${P(t[2])} L${P(l[2])}`} className="cz-crew-hi" />
      <path d={`M${P(l[3])} L${P(l[2])} L${P(r[3])}`} className="cz-crew-base" />
      <polygon points={pts(t)} className="cz-crew-outline" />
    </g>
  );
}

// Gradients for the robot; `ids` keeps each SVG's definitions separate.
export function CrewDefs({ ids = "czc" }) {
  return (
    <defs>
      <linearGradient id={`${ids}-head`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#2a3c6e" /><stop offset="1" stopColor="#0a1733" /></linearGradient>
      <linearGradient id={`${ids}-visor`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#24366a" /><stop offset="1" stopColor="#0c1838" /></linearGradient>
      <linearGradient id={`${ids}-body`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#33467c" /><stop offset="1" stopColor="#1c2b55" /></linearGradient>
    </defs>
  );
}

// The robot from the countdown, front-on, standing at (X, Y).
export function Bot({ X, Y, on, ids = "czc" }) {
  return (
    <g className={"cz-crew-bot" + (on ? " is-on" : "")} transform={`translate(${X - 32} ${Y - 70})`}>
      <ellipse cx="32" cy="70" rx="16" ry="3" className="cz-crew-botshadow" />
      <g className="cz-crew-lift">
        <rect x="15.5" y="38" width="4.5" height="15" rx="2.25" className="cz-crew-limb" />
        <rect x="44" y="38" width="4.5" height="15" rx="2.25" className="cz-crew-limb" />
        <circle cx="17.75" cy="54" r="2.6" className="cz-crew-hand" />
        <circle cx="46.25" cy="54" r="2.6" className="cz-crew-hand" />
        <rect x="29" y="32.5" width="6" height="4" rx="1.5" className="cz-crew-hand" />
        <path d="M20 40 Q20 36 24 36 H40 Q44 36 44 40 L42.4 56 Q42 60 38 60 H26 Q22 60 21.6 56 Z" fill={`url(#${ids}-body)`} />
        <circle cx="32" cy="47" r="2.4" className="cz-crew-core" />
        <line x1="32" y1="6.5" x2="32" y2="12.5" className="cz-crew-antenna" />
        <circle cx="32" cy="5" r="2.6" className="cz-crew-bulb" />
        <rect x="16.5" y="18.5" width="3" height="8" rx="1.5" className="cz-crew-limb" />
        <rect x="44.5" y="18.5" width="3" height="8" rx="1.5" className="cz-crew-limb" />
        <rect x="19" y="12" width="26" height="21" rx="9" fill={`url(#${ids}-head)`} />
        <rect x="21.8" y="16" width="20.4" height="12.5" rx="5.6" fill={`url(#${ids}-visor)`} />
        <path d="M24.2 18.4 Q26 17.1 29 17.1" className="cz-crew-gloss" />
        <rect x="26" y="19.6" width="3.2" height="5" rx="1.6" className="cz-crew-eye" />
        <rect x="34.8" y="19.6" width="3.2" height="5" rx="1.6" className="cz-crew-eye" />
      </g>
    </g>
  );
}

export default function ColleagueZeroCrew() {
  const reduced = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const [beat, setBeat] = useState(reduced ? 5 : 0);
  useEffect(() => {
    if (reduced) return;
    const t = setInterval(() => setBeat((b) => (b + 1) % BEATS.length), BEAT_MS);
    return () => clearInterval(t);
  }, [reduced]);

  const [at, badge] = BEATS[beat];
  // The document floats just in front of whoever has it.
  const st = STATIONS[at];
  const top = iso(st.x + 0.75, st.y + 0.75, 18 + (st.kind === "bot" ? 14 : 6));
  const doc = { X: top.X + (st.kind === "bot" ? 32 : 0), Y: top.Y - (st.kind === "bot" ? 40 : 26) };
  // Snap back to the inbox without gliding across the scene.
  const resetting = beat === 0;

  // The track runs between station centres on the platform surface.
  const track = STATIONS.map((s) => iso(s.x + 0.75, s.y + 0.75, 18));

  return (
    <div
      className="cz-crew"
      role="img"
      aria-label="A digital colleague: given a goal, one agent plans the work, another uses tools, a third checks its own output and fixes what is wrong, and the work becomes a finished result."
    >
      <svg viewBox="40 80 600 440" className="cz-crew-svg">
        <CrewDefs />
        <defs>
          <linearGradient id="czc-top" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#ffffff" /><stop offset="1" stopColor="#f1f3f8" /></linearGradient>
        </defs>

        {/* The platform, its shadow, and a faint grid on its top face. */}
        <ellipse cx={iso(4, 4).X} cy={iso(4, 4).Y + 30} rx="250" ry="70" className="cz-crew-floor" />
        <Box x={0} y={0} w={8} d={8} h={18} cls="cz-crew-slab" />
        <g className="cz-crew-grid">
          {Array.from({ length: 7 }, (_, k) => k + 1).map((k) => (
            <g key={k}>
              <line x1={iso(k, 0, 18).X} y1={iso(k, 0, 18).Y} x2={iso(k, 8, 18).X} y2={iso(k, 8, 18).Y} />
              <line x1={iso(0, k, 18).X} y1={iso(0, k, 18).Y} x2={iso(8, k, 18).X} y2={iso(8, k, 18).Y} />
            </g>
          ))}
        </g>
        {/* The path: a soft groove, filled in maroon behind the work as it moves. */}
        {track.slice(1).map((p, i) => (
          <g key={i} className={"cz-crew-seg" + (at > i ? " is-done" : "")}>
            <line x1={track[i].X} y1={track[i].Y} x2={p.X} y2={p.Y} className="cz-crew-groove" />
            <line x1={track[i].X} y1={track[i].Y} x2={p.X} y2={p.Y} className="cz-crew-fill" pathLength="1" />
          </g>
        ))}

        {STATIONS.map((s, i) => {
          const on = at === i;
          const base = iso(s.x + 0.75, s.y + 0.75, 18);
          const label = s.fixLabel && badge === "fixed" && at === i ? s.fixLabel : s.label;
          return (
            <g key={s.k} className={"cz-crew-station" + (on ? " is-on" : "")}>
              <ellipse cx={base.X} cy={base.Y + 4} rx="40" ry="16" className="cz-crew-shade" />
              {s.kind === "bot" ? (
                <>
                  <Box x={s.x} y={s.y} z={18} w={1.5} d={1.5} h={14} cls="cz-crew-ped" />
                  <Bot {...iso(s.x + 0.75, s.y + 0.75, 32)} on={on} />
                </>
              ) : (
                <>
                  <Box x={s.x} y={s.y} z={18} w={1.5} d={1.5} h={6} cls="cz-crew-tray" />
                  {/* The goal waits as a small stack of paper. */}
                  {s.k === "goal" && [0, 1].map((k) => (
                    <polygon
                      key={k}
                      className="cz-crew-sheet"
                      points={pts([iso(s.x + 0.35, s.y + 0.35, 27 + k * 3), iso(s.x + 1.15, s.y + 0.35, 27 + k * 3), iso(s.x + 1.15, s.y + 1.15, 27 + k * 3), iso(s.x + 0.35, s.y + 1.15, 27 + k * 3)])}
                    />
                  ))}
                </>
              )}
              <text x={base.X} y={base.Y + 50} className="cz-crew-label">{label}</text>
            </g>
          );
        })}

        {/* The document being worked on. */}
        <g
          className={"cz-crew-doc" + (resetting ? " is-reset" : "")}
          style={{ transform: `translate(${doc.X}px, ${doc.Y}px)` }}
        >
          <path d="M-11 -12a2 2 0 0 1 2-2H5l6 6v20a2 2 0 0 1-2 2H-9a2 2 0 0 1-2-2z" className="cz-crew-paper" />
          <path d="M5 -14v4a2 2 0 0 0 2 2h4" className="cz-crew-fold" />
          <path d="M-6 -4h12M-6 1h12M-6 6h8" className="cz-crew-lines" />
          <g className={"cz-crew-badge" + (badge ? " is-" + badge : "")}>
            <circle cx="11" cy="-14" r="7" />
            <text x="11" y="-10.5">{badge === "flag" ? "!" : "✓"}</text>
          </g>
        </g>
      </svg>
    </div>
  );
}
