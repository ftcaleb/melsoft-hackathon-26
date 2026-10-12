import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Icon from "../components/Icon";
import ColleagueZeroCampus from "../components/ColleagueZeroCampus";
import { getLeadSource, hackathonConfigured, sendHackathonRegistrationToSheet } from "../sheets";
import "./ColleagueZero.css";

/* ── Colleague Zero · the autonomous agent hackathon ───────────────────
   Standalone event page, built from the concept brief MEL-HACK-2026-003.
   App.jsx renders it without the site Nav, Footer, open-day flyer or
   WhatsApp widget: it carries its own slim header and footer instead.

   Both of those live INSIDE <main>. main.jsx hands the prerendered <main>
   to Suspense as the loading fallback, so anything outside it would blink
   out while the route chunk loads.

   Two routes, one module:
     /colleague-zero             → ColleagueZeroPage (this file's default)
     /colleague-zero/registered  → ColleagueZeroRegisteredPage, where the
                                   registration form sends a team once the
                                   sheet has accepted it.

   Everything below the hero follows the participant overview
   ("Colleague Zero: The Autonomous Agent Hackathon", 7 October 2026):
   the challenge, what a strong project does, example ideas, the two-day
   schedule and what teams present. */

// "Add to calendar": one event from the online start on Friday to the end
// of presentations on Saturday, in UTC (SAST is UTC+2).
const CALENDAR_ICS = [
  "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Melsoft Academy//Colleague Zero//EN",
  "BEGIN:VEVENT", "UID:colleague-zero-2026@melsoft", "DTSTAMP:20261012T000000Z",
  "DTSTART:20261113T090000Z", "DTEND:20261114T120000Z",
  "SUMMARY:Colleague Zero: the autonomous agent hackathon",
  "LOCATION:Online on Friday. Melsoft offices\\, 173 Oxford Road\\, Rosebank on Saturday",
  "DESCRIPTION:Starts online 11:00 Fri 13 Nov. Sat 14 Nov: doors open 09:00\\, hacking ends 11:00\\, presentations 12:00.",
  "END:VEVENT", "END:VCALENDAR",
].join("\r\n");
const CALENDAR_HREF = "data:text/calendar;charset=utf-8," + encodeURIComponent(CALENDAR_ICS);

const REGISTERED_PATH = "/colleague-zero/registered";
const STORAGE_KEY = "cz-registration";

const scrollToId = (id) => (e) => {
  e?.preventDefault();
  // No hash in the URL: App.jsx treats every hashchange as a route change
  // and would jump back to the top.
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
};

const prefersReducedMotion = () =>
  typeof window !== "undefined" && Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);

/* Writes a 0–1 scroll progress for `ref` into its --p custom property, and
   hands it to onProgress. No React state, so scrolling never re-renders.

   "through": 0 as the element's top enters the lower part of the viewport,
              1 as its bottom clears the upper part.
   "sticky":  0 when a tall section's top hits the top of the viewport, 1
              when its bottom reaches the bottom — for a pinned child.

   (CSS position: sticky can't do the pinning on this site: index.css sets
   overflow-x: hidden on both html and body, which makes body a scroll
   container that never scrolls, so sticky never engages.) */
function useScrollProgress(ref, { mode = "through", reducedValue = 1, onProgress } = {}) {
  const cb = useRef(onProgress);
  useEffect(() => { cb.current = onProgress; });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const set = (p) => {
      el.style.setProperty("--p", p.toFixed(3));
      cb.current?.(p);
    };
    if (prefersReducedMotion()) { set(reducedValue); return; }

    let raf = 0;
    const update = () => {
      raf = 0;
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight;
      const p = mode === "sticky"
        ? -r.top / Math.max(1, r.height - vh)
        : (vh * 0.85 - r.top) / (r.height + vh * 0.45);
      set(Math.min(1, Math.max(0, p)));
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [ref, mode, reducedValue]);
}

/* ── Shared chrome ───────────────────────────────────────────────────── */

/* Concentric rings behind the hero. They never move: a colour pulse travels
   outward through them (each ring's animation is delayed by its index),
   alternating site maroon and navy. */
function HeroRings() {
  return (
    <div className="cz-hero-bg" aria-hidden="true">
      <svg className="cz-rings" viewBox="0 0 1600 1600">
        {Array.from({ length: 13 }, (_, k) => (
          <circle key={k} cx="800" cy="800" r={60 * (k + 1)} style={{ "--k": k }} />
        ))}
      </svg>
    </div>
  );
}

function CzHeader({ navigate, onRegister }) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={"cz-header" + (scrolled ? " is-scrolled" : "")}>
      <div className="cz-header-pill">
        <a
          href="/"
          className="cz-brand"
          onClick={(e) => { e.preventDefault(); navigate("/"); }}
          aria-label="Melsoft Academy home"
        >
          <img src="/assets/logo-light.webp" alt="" width="84" height="36" />
          <span className="cz-brand-sep" aria-hidden="true" />
          <span className="cz-brand-event">Colleague Zero</span>
        </a>
        {onRegister && (
          <nav className="cz-header-nav" aria-label="Page sections">
            <a href="#the-main" onClick={scrollToId("the-main")}>The challenge</a>
            <a href="#ideas" onClick={scrollToId("ideas")}>Ideas</a>
            <a href="#schedule" onClick={scrollToId("schedule")}>Schedule</a>
            <a href="#faq" onClick={scrollToId("faq")}>FAQ</a>
          </nav>
        )}
        {onRegister && (
          <a href="#register" className="cz-btn cz-btn--primary cz-btn--sm" onClick={onRegister}>
            Register your team
          </a>
        )}
      </div>
    </header>
  );
}

function CzFooter({ navigate }) {
  return (
    <footer className="cz-footer">
      <div className="cz-wrap cz-footer-inner">
        <div>
          <img src="/assets/White-melsoft.png" alt="Melsoft Academy" width="112" height="56" />
          <p>
            Melsoft Academy (PTY) LTD
            <br />173 Oxford Road, Rosebank, Sandton, 2196
            <br /><a href="tel:+27101584346">010 158 4346</a>
          </p>
        </div>
        <div className="cz-footer-meta">
          <span className="cz-mono">Colleague Zero · Autonomous agent hackathon · 13–14 Nov 2026</span>
          <a href="/" onClick={(e) => { e.preventDefault(); navigate("/"); }}>melsoftacademy.com</a>
          <a href="/privacy-policy" onClick={(e) => { e.preventDefault(); navigate("/privacy-policy"); }}>Privacy policy</a>
        </div>
      </div>
    </footer>
  );
}

function Eyebrow({ n, children }) {
  return (
    <p className="cz-eyebrow cz-mono">
      <span>{n}</span>
      {children}
    </p>
  );
}

/* ── Ticker ────────────────────────────────────────────────────────────
   One row at one steady speed, forever. The track holds the list twice and
   slides left by exactly half its width, so the loop has no seam. */

const TICKER = ["24-hour hackathon", "13–14 November 2026", "Online, then in the room", "Up to five people", "Build a digital colleague", "Real problems in EdTech"];

function Ticker() {
  // Each half repeats the list twice so it is wider than any screen.
  const half = [...TICKER, ...TICKER];
  return (
    <div className="cz-ticker">
      <p className="cz-sr">{TICKER.join(". ")}.</p>
      <div className="cz-ticker-row" aria-hidden="true">
        <div className="cz-ticker-track">
          {[0, 1].map((k) => (
            <div key={k} className="cz-ticker-half">
              {half.map((t, i) => (
                <span key={i} className="cz-ticker-item">{t}</span>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Sections ────────────────────────────────────────────────────────── */

// Words wrapped in *asterisks* are set in maroon.
const MANIFESTO = "Not a chatbot. Not an automation. A *colleague.*";

const STATS = [
  { n: "24", k: "Hours", cap: "Starts 11:00 Friday, ends 11:00 Saturday" },
  { n: "2", k: "Days", cap: "Day one is fully virtual. Day two is in person" },
  { n: "5", k: "Max team", cap: "A maximum of five people" },
  { n: "2+", k: "Agents", cap: "More than one agent, each with a clear role" },
];

function Manifesto() {
  const ref = useRef(null);
  useScrollProgress(ref);
  const words = useMemo(() => MANIFESTO.split(" "), []);
  const plain = MANIFESTO.replace(/\*/g, "");
  return (
    <section className="cz-manifesto">
      <div className="cz-wrap">
        <Eyebrow n="01">The brief</Eyebrow>
        <p className="cz-manifesto-text" ref={ref} style={{ "--n": words.length }}>
          <span className="cz-sr">{plain}</span>
          <span aria-hidden="true">
            {words.map((w, i) => {
              const accent = w.startsWith("*");
              return (
                <span key={i} className={accent ? "is-accent" : undefined} style={{ "--i": i }}>
                  {w.replace(/\*/g, "")}{" "}
                </span>
              );
            })}
          </span>
        </p>
        <p className="cz-lede cz-manifesto-lede">
          Colleague Zero is a 24-hour hackathon on multi-agent workflows. Your team builds an
          autonomous digital employee for education: agents that reason, correct their own
          mistakes, and carry a complex job from start to finish.
        </p>
        <dl className="cz-stats">
          {STATS.map((x) => (
            <div key={x.k}><dt>{x.k}</dt><dd>{x.n}</dd><p className="cz-stats-cap">{x.cap}</p></div>
          ))}
        </dl>
      </div>
    </section>
  );
}

// The overview's own contrast: what this hackathon is not, then what it is.
const CONTRAST = [
  { name: "A chatbot", tease: "Waits for a question and answers it. Not what we're asking for." },
  { name: "An automation", tease: "Follows a fixed script, every time. Not what we're asking for either." },
  { name: "A digital colleague", tease: "Takes a goal, plans the steps, uses tools, checks its work and fixes its own mistakes." },
];

function Challenge() {
  return (
    <section className="cz-section cz-section--tight" id="the-main">
      <div className="cz-wrap cz-split">
        <div className="cz-split-aside">
          <Eyebrow n="02">The challenge</Eyebrow>
          <h2 className="cz-h2">Build a digital colleague.</h2>
          <p className="cz-lede">
            Give it a goal and step back. Your colleague plans the work, uses tools to do it, checks
            its own output, and fixes what's wrong, without a person stepping in at every stage. One
            rule: it has to solve a real problem in EdTech.
          </p>
          <p className="cz-note cz-mono">Every project solves a real problem in EdTech</p>
        </div>
        <ol className="cz-places" aria-label="A chatbot, an automation and a digital colleague">
          {CONTRAST.map((p, i) => (
            <li key={p.name}>
              <span className="cz-places-n cz-mono">{String(i + 1).padStart(2, "0")}</span>
              <span className="cz-places-name">{p.name}</span>
              <span className="cz-places-tease">{p.tease}</span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* Each line's name starts under a redaction bar. When the list scrolls
   into view the bars wipe away one after another and the stamp flips to
   "Declassified". With reduced motion it simply starts declassified. */
const DOSSIER = [
  ["Reasons.", "Breaks a goal into steps and decides what to do next, instead of following a fixed script."],
  ["Self-corrects.", "Reviews its own work, catches errors, and tries again."],
  ["Executes.", "Finishes a multi-step workflow and hands over a result, not a suggestion."],
  ["Collaborates.", "Uses more than one agent, each with a clear role, passing work between them."],
  ["Serves education.", "Meets a specific, real need in teaching, learning, or running an education programme."],
];

function Dossier() {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (prefersReducedMotion() || !("IntersectionObserver" in window)) { el.classList.add("is-open"); return; }
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      el.classList.add("is-open");
      io.disconnect();
    }, { threshold: 0.35 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <section className="cz-section cz-section--tight" id="the-tests">
      <div className="cz-wrap cz-split cz-dossier-wrap" ref={ref}>
        <div className="cz-split-aside">
          <Eyebrow n="03">What a strong project does</Eyebrow>
          <h2 className="cz-h2">Five things a real colleague does.</h2>
          <p className="cz-lede">
            Use this as your checklist. A project that does all five is exactly what we're asking
            for. Think about the work learners, facilitators and education teams do every day, and
            build the colleague who could take it on.
          </p>
          <span className="cz-dossier-stamp cz-mono" aria-hidden="true">
            <span className="cz-stamp-a">Classified</span>
            <span className="cz-stamp-b">Declassified</span>
          </span>
        </div>
        <ol className="cz-dossier" aria-label="What a strong project does">
          {DOSSIER.map(([name, text], i) => (
            <li key={name} style={{ "--i": i }}>
              <span className="cz-dossier-n cz-mono">{String(i + 1).padStart(2, "0")}</span>
              <span className="cz-dossier-line">
                <span className="cz-reveal">{name}</span> {text}
              </span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

const IDEAS = [
  { short: "a marking colleague.", t: "Marking.", v: "Assesses submissions against a rubric, writes feedback, and checks its own marks for consistency." },
  { short: "a curriculum colleague.", t: "Curriculum.", v: "Drafts lesson plans, builds matching exercises, and checks them against learning outcomes." },
  { short: "a learner support colleague.", t: "Learner support.", v: "Spots learners falling behind, works out why, and prepares a personalised catch-up plan." },
  { short: "an admissions colleague.", t: "Admissions.", v: "Screens applications, requests missing information, and schedules interviews." },
  { short: "a career colleague.", t: "Careers.", v: "Matches graduates to roles, tailors their CVs, and prepares them for interviews." },
  { t: "Your own.", v: "Know a job in education that eats hours every week? Build the colleague who takes it on." },
];
// The headline cycles through the five named ideas; "Your own" is a card only.
const ROTATING = IDEAS.filter((d) => d.short);

/* The ideas as an index tied to the headline: whichever idea the headline
   is showing is lit in the list, with a hairline that fills while it's on
   (a countdown to the next one). Pointing at or tabbing to an idea pins
   the headline to it; leaving resumes the rotation. "Your own" isn't in
   the rotation and is drawn as an open slot. */
const IDEA_MS = 2800;

function Ideas() {
  const [i, setI] = useState(0);
  const [held, setHeld] = useState(false);
  useEffect(() => {
    if (held || prefersReducedMotion()) return;
    const t = setInterval(() => setI((n) => (n + 1) % ROTATING.length), IDEA_MS);
    return () => clearInterval(t);
  }, [held]);
  const hold = (n) => { if (n < ROTATING.length) { setI(n); setHeld(true); } };
  const release = () => setHeld(false);
  return (
    <section className="cz-section cz-twist" id="ideas">
      <div className="cz-wrap">
        <Eyebrow n="04">Ideas to get you started</Eyebrow>
        <h2 className="cz-twist-line">
          Your colleague could be{" "}
          <span className="cz-rotator">
            <span className="cz-sr">{ROTATING.map((d) => d.short).join(" Or ")}</span>
            {ROTATING.map((d, n) => (
              <span
                key={d.t}
                aria-hidden="true"
                className={n === i ? "is-on" : n === (i + ROTATING.length - 1) % ROTATING.length ? "is-out" : ""}
              >
                {d.short}
              </span>
            ))}
          </span>
        </h2>
        <p className="cz-lede">
          Stuck for a problem? Start with one of these, or bring your own. Any real EdTech problem counts.
        </p>
        <ol className={"cz-ideas" + (held ? " is-held" : "")} onMouseLeave={release}>
          {IDEAS.map((d, n) => {
            const own = !d.short;
            return (
              <li
                key={d.t}
                className={(own ? "is-own" : "") + (n === i && !own ? " is-on" : "")}
                tabIndex={own ? undefined : 0}
                onMouseEnter={() => hold(n)}
                onFocus={() => hold(n)}
                onBlur={release}
              >
                {/* Keyed on i so the fill restarts each time an idea comes round. */}
                <span className="cz-idea-bar" key={n === i ? `on-${i}` : "off"} aria-hidden="true" />
                <span className="cz-idea-n" aria-hidden="true">{own ? "+" : String(n + 1).padStart(2, "0")}</span>
                <h3>{d.t.replace(/\.$/, "")}</h3>
                <p>{d.v}</p>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}

const SCHEDULE = [
  { day: "Fri 13 Nov", time: "11:00", t: "Hackathon starts", where: "Online" },
  { day: "Sat 14 Nov", time: "09:00", t: "Doors open", where: "Melsoft offices" },
  { day: "Sat 14 Nov", time: "11:00", t: "Hacking ends", where: "Melsoft offices" },
  { day: "Sat 14 Nov", time: "12:00", t: "Presentations", where: "Melsoft offices" },
];

function Schedule() {
  return (
    <section className="cz-section" id="schedule">
      <div className="cz-wrap">
        <div className="cz-measured-head">
          <div>
            <Eyebrow n="05">Format and schedule</Eyebrow>
            <h2 className="cz-h2">24 hours. Online, then in the room.</h2>
          </div>
          <p className="cz-lede">
            Day one is fully virtual, so build from wherever you are. Day two is in person at the
            Melsoft offices, 173 Oxford Road, Rosebank, where teams finish their projects and present them.
          </p>
        </div>
        <ol className="cz-timeline cz-timeline--4">
          {SCHEDULE.map((s, i) => (
            <li key={s.t}>
              <span className="cz-timeline-dot" aria-hidden="true">{String(i + 1).padStart(2, "0")}</span>
              <h3>{s.t}</h3>
              <p>{s.day}, {s.time} · {s.where}</p>
            </li>
          ))}
        </ol>
        <a className="cz-cal-link" href={CALENDAR_HREF} download="colleague-zero.ics">
          <Icon name="calendar" size={18} /> Add the dates to your calendar
        </a>
      </div>
    </section>
  );
}

/* The show: what a live demo looks like, using one of the example ideas.
   A marking colleague drawn as a connected workflow. Work travels the
   links as a pulse, each station lights as it arrives, and the log writes
   up every step. The reviewer sends work back once: that loop is the
   self-correction teams are asked to show. On narrow screens the same
   graph is laid out top to bottom so the labels stay readable. */

const FLOW_W = 112, FLOW_H = 56;
const FLOW_NODES = {
  // [x, y] wide (800 × 420), [x, y] tall (380 × 668)
  submissions: { t: "Submissions", kind: "Input", wide: [24, 182], tall: [160, 16] },
  planner: { t: "Planner", kind: "Agent", wide: [184, 182], tall: [160, 120] },
  marker: { t: "Marker", kind: "Agent", wide: [356, 92], tall: [160, 240] },
  rubric: { t: "Rubric", kind: "Tool", wide: [356, 272], tall: [8, 240] },
  reviewer: { t: "Reviewer", kind: "Agent", wide: [524, 182], tall: [160, 360] },
  feedback: { t: "Feedback", kind: "Agent", wide: [664, 92], tall: [160, 480] },
  learners: { t: "Learners", kind: "Output", wide: [664, 272], tall: [160, 596] },
};
const FLOW_EDGES = [
  { id: "e1", from: "submissions", to: "planner" },
  { id: "e2", from: "planner", to: "marker" },
  { id: "e3", from: "rubric", to: "marker", tool: true },
  { id: "e4", from: "marker", to: "reviewer" },
  { id: "e5", from: "reviewer", to: "marker", back: true },
  { id: "e6", from: "reviewer", to: "feedback" },
  { id: "e7", from: "feedback", to: "learners" },
];
// One run of the demo, in seconds. Hops move a pulse along an edge; status
// events change what a station says; the inspector follows one essay.
const FLOW_LOOP = 15;
const FLOW_HOPS = [
  { edge: "e1", at: 0.2, dur: 0.8 },
  { edge: "e2", at: 1.8, dur: 0.8 },
  { edge: "e3", at: 1.8, dur: 0.8 },
  { edge: "e4", at: 4.6, dur: 0.8 },
  { edge: "e5", at: 6.4, dur: 1.0 },
  { edge: "e4", at: 8.2, dur: 0.8 },
  { edge: "e6", at: 9.6, dur: 0.8 },
  { edge: "e7", at: 11.8, dur: 0.8 },
];
// [node, at, state, text]. A station shows its latest event; before its
// first one it's "Waiting". The marker's count is filled in live.
const FLOW_STATUS = [
  ["submissions", 0, "done", "24 essays"],
  ["planner", 1.0, "work", "Planning"],
  ["planner", 1.8, "done", "3 steps"],
  ["rubric", 1.8, "work", "Sharing"],
  ["rubric", 2.6, "done", "Shared"],
  ["marker", 2.6, "work", "Marking"],
  ["marker", 4.6, "done", "24 marked"],
  ["reviewer", 5.4, "work", "Checking"],
  ["reviewer", 6.4, "flag", "2 sent back"],
  ["marker", 7.4, "work", "Fixing 2"],
  ["marker", 8.2, "done", "2 fixed"],
  ["reviewer", 9.0, "work", "Re-checking"],
  ["reviewer", 9.6, "done", "Approved"],
  ["feedback", 10.4, "work", "Writing"],
  ["feedback", 11.8, "done", "24 written"],
  ["learners", 12.6, "done", "24 notified"],
];
const MARKING = [2.6, 4.6];
const FLOW_STEPS = [
  { t: "Plan", at: 0 },
  { t: "Mark", at: 1.8 },
  { t: "Review", at: 4.6 },
  { t: "Fix", at: 6.4 },
  { t: "Approve", at: 8.2 },
  { t: "Feedback", at: 9.6 },
  { t: "Deliver", at: 11.8 },
];
// The essay the inspector follows. Evidence is marked too high, sent back
// by the reviewer and corrected by the marker.
const ESSAY_ROWS = [
  { t: "Argument", score: 7, fill: [2.8, 3.4] },
  { t: "Evidence", score: 6, fixed: 4, fill: [3.4, 4.0] },
  { t: "Structure", score: 8, fill: [4.0, 4.6] },
];
const FEEDBACK = "Strong argument and a clear structure. Back each claim with a source from the reading to lift your evidence mark.";
const FEEDBACK_TYPE = [10.4, 11.8];
const stepAt = (t) => FLOW_STEPS.reduce((k, s, i) => (t >= s.at ? i : k), 0);

function flowLayout(tall) {
  const box = (k) => {
    const [x, y] = FLOW_NODES[k][tall ? "tall" : "wide"];
    return { x, y, cx: x + FLOW_W / 2, cy: y + FLOW_H / 2 };
  };
  const edges = FLOW_EDGES.map((e) => {
    const a = box(e.from), b = box(e.to);
    let d;
    if (e.back) {
      // The send-back arcs outside the main line so it reads as a return.
      d = tall
        ? `M${a.x + FLOW_W} ${a.cy} C${a.x + FLOW_W + 70} ${a.cy} ${b.x + FLOW_W + 70} ${b.cy} ${b.x + FLOW_W} ${b.cy}`
        : `M${a.cx} ${a.y} C${a.cx} ${a.y - 80} ${b.cx + 40} ${b.y - 80} ${b.cx + 20} ${b.y}`;
    } else if (Math.abs(b.cx - a.cx) >= Math.abs(b.cy - a.cy)) {
      const s = b.cx > a.cx ? 1 : -1;
      const x1 = s > 0 ? a.x + FLOW_W : a.x, x2 = s > 0 ? b.x : b.x + FLOW_W;
      const k = (x2 - x1) / 2;
      d = `M${x1} ${a.cy} C${x1 + k} ${a.cy} ${x2 - k} ${b.cy} ${x2} ${b.cy}`;
    } else {
      const s = b.cy > a.cy ? 1 : -1;
      const y1 = s > 0 ? a.y + FLOW_H : a.y, y2 = s > 0 ? b.y : b.y + FLOW_H;
      const k = (y2 - y1) / 2;
      d = `M${a.cx} ${y1} C${a.cx} ${y1 + k} ${b.cx} ${y2 - k} ${b.cx} ${y2}`;
    }
    return { ...e, d };
  });
  return { boxes: Object.fromEntries(Object.keys(FLOW_NODES).map((k) => [k, box(k)])), edges };
}

const easeInOut = (p) => (p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2);

const clamp01 = (v) => Math.min(1, Math.max(0, v));

function FlowDemo() {
  const ref = useRef(null);
  const [tall, setTall] = useState(() => typeof window !== "undefined" && window.matchMedia?.("(max-width: 600px)").matches);
  useEffect(() => {
    const mq = window.matchMedia?.("(max-width: 600px)");
    if (!mq) return;
    const on = () => setTall(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  const { boxes, edges } = useMemo(() => flowLayout(tall), [tall]);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const q = (sel) => root.querySelector(sel);
    const paths = Object.fromEntries(edges.map((e) => [e.id, q(`[data-live="${e.id}"]`)]));
    const lens = Object.fromEntries(edges.map((e) => [e.id, paths[e.id].getTotalLength()]));
    const pulses = FLOW_HOPS.map((_, i) => q(`[data-pulse="${i}"]`));
    const nodes = Object.fromEntries(Object.keys(FLOW_NODES).map((k) => [k, { el: q(`[data-node="${k}"]`), txt: q(`[data-status="${k}"]`) }]));
    const steps = [...root.querySelectorAll(".cz-steps li")];
    const k = (name) => q(`[data-k="${name}"]`);
    const el = {
      stage: k("stage"), total: k("total"), note: k("note"), fb: k("fb"), sent: k("sent"),
      clock: k("clock"), bar: k("bar"), inspect: q(".cz-inspect"),
      rows: ESSAY_ROWS.map((_, i) => ({ li: q(`[data-row="${i}"]`), bar: q(`[data-row="${i}"] b`), score: k("score" + i) })),
    };
    // Only touch the DOM when a value actually changes.
    const cache = new Map();
    const set = (node, key, v, how = "text") => {
      const seen = cache.get(node) || {};
      if (seen[key] === v) return;
      seen[key] = v;
      cache.set(node, seen);
      if (how === "text") node.textContent = v;
      else if (how === "html") node.innerHTML = v;
      // setAttribute rather than className, which is read-only on SVG.
      else if (how === "class") node.setAttribute("class", v);
      else node.style.setProperty(how, v);
    };

    const paint = (t, still = false) => {
      // Links and pulses.
      const drawn = {};
      FLOW_HOPS.forEach((h, i) => {
        const p = (t - h.at) / h.dur;
        const dot = pulses[i];
        if (!still && p >= 0 && p <= 1) {
          const pt = paths[h.edge].getPointAtLength(easeInOut(p) * lens[h.edge]);
          dot.setAttribute("cx", pt.x.toFixed(1));
          dot.setAttribute("cy", pt.y.toFixed(1));
          dot.style.opacity = "1";
          drawn[h.edge] = Math.max(drawn[h.edge] ?? 0, easeInOut(p));
        } else {
          dot.style.opacity = "0";
          if (p > 1 && t - (h.at + h.dur) < 0.9) drawn[h.edge] = Math.max(drawn[h.edge] ?? 0, 1);
        }
      });
      edges.forEach((e) => {
        const v = still ? 1 : drawn[e.id];
        paths[e.id].style.strokeDashoffset = v == null ? "1" : String(1 - v);
        paths[e.id].style.opacity = v == null ? "0" : still ? "0.35" : "1";
      });

      // Station status.
      const latest = {};
      FLOW_STATUS.forEach(([n, at, state, text]) => { if (t >= at) latest[n] = { state, text }; });
      Object.entries(nodes).forEach(([n, { el: g, txt }]) => {
        let s = latest[n] || { state: "idle", text: "Waiting" };
        if (n === "marker" && s.text === "Marking") {
          s = { ...s, text: `Marking ${Math.floor(clamp01((t - MARKING[0]) / (MARKING[1] - MARKING[0])) * 24)}/24` };
        }
        set(txt, "t", s.text);
        set(g, "c", "cz-node is-" + FLOW_NODES[n].kind.toLowerCase() + " is-" + s.state, "class");
      });

      // Step track and clock.
      const cur = stepAt(t);
      steps.forEach((li, i) => li.className = i < cur ? "is-done" : i === cur ? "is-on" : "");
      set(el.bar, "w", String(clamp01(t / 12.6)), "--p");
      set(el.clock, "t", `0:${String(Math.min(59, Math.floor(t))).padStart(2, "0")}`);
      set(el.stage, "t", FLOW_STEPS[cur].t);

      // The essay.
      const fixed = t >= 8.2;
      let total = 0, allIn = true;
      ESSAY_ROWS.forEach((r, i) => {
        const p = clamp01((t - r.fill[0]) / (r.fill[1] - r.fill[0]));
        const score = fixed && r.fixed != null ? r.fixed : r.score;
        set(el.rows[i].bar, "w", String((p * score) / 10), "--p");
        set(el.rows[i].score, "h", p <= 0 ? "–" : fixed && r.fixed != null ? `<s>${r.score}</s> ${score}/10` : `${Math.round(p * score)}/10`, "html");
        set(el.rows[i].li, "c", r.fixed != null && t >= 6.4 && !fixed ? "is-flag" : r.fixed != null && fixed ? "is-fixed" : "", "class");
        if (p < 1) allIn = false;
        total += score;
      });
      set(el.total, "t", allIn ? `${total}/30` : "–");
      set(el.note, "h", t < 6.4 ? "" : !fixed
        ? "<b>Reviewer</b> Evidence is marked too high for the rubric. Sent back to the marker."
        : "<b>Marker</b> Evidence corrected from 6 to 4. Total updated.", "html");
      set(el.note, "c", t < 6.4 ? "cz-inspect-note" : fixed ? "cz-inspect-note is-on" : "cz-inspect-note is-on is-flag", "class");
      const typed = Math.floor(clamp01((t - FEEDBACK_TYPE[0]) / (FEEDBACK_TYPE[1] - FEEDBACK_TYPE[0])) * FEEDBACK.length);
      set(el.fb, "t", t < FEEDBACK_TYPE[0] ? "Written once the marks are approved." : FEEDBACK.slice(0, typed));
      set(el.fb, "c", t < FEEDBACK_TYPE[0] ? "is-wait" : typed < FEEDBACK.length ? "is-typing" : "", "class");
      set(el.inspect, "c", "cz-inspect" + (t >= 9.6 ? " is-approved" : "") + (t >= 12.6 ? " is-sent" : ""), "class");
      set(el.sent, "t", t >= 12.6 ? "Sent to the learner" : "Not sent yet");
    };
    if (prefersReducedMotion()) { paint(13.5, true); return; }

    let raf = 0, t0 = 0, prev = 0, visible = true;
    const frame = (now) => {
      raf = 0;
      if (!visible) return;
      if (!t0) t0 = now - prev * 1000;
      const t = ((now - t0) / 1000) % FLOW_LOOP;
      prev = t;
      paint(t);
      raf = requestAnimationFrame(frame);
    };
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible && !raf) { t0 = 0; raf = requestAnimationFrame(frame); }
    });
    io.observe(root);
    raf = requestAnimationFrame(frame);
    return () => { cancelAnimationFrame(raf); io.disconnect(); };
  }, [edges]);

  const vb = tall ? "0 0 380 668" : "0 0 800 420";
  return (
    <div className="cz-show-grid" ref={ref}>
      <div className="cz-show-main">
        <svg viewBox={vb} className={"cz-flow" + (tall ? " is-tall" : "")} role="img" aria-label="An example marking colleague at work. Submissions go to a planner agent, then to a marker agent that uses the rubric, then to a reviewer agent. The reviewer sends work back to the marker to correct, approves it, and passes it to a feedback agent that writes reports for the learners.">
          {edges.map((e) => (
            <g key={e.id} className={"cz-link" + (e.tool ? " is-tool" : "") + (e.back ? " is-back" : "")}>
              <path d={e.d} className="cz-link-base" />
              <path d={e.d} className="cz-link-live" data-live={e.id} pathLength="1" />
            </g>
          ))}
          {FLOW_HOPS.map((h, i) => {
            const e = FLOW_EDGES.find((x) => x.id === h.edge);
            return (
              <g key={i} className={"cz-pulse" + (e.back ? " is-back" : "")}>
                <circle data-pulse={i} r="6" cx="-20" cy="-20" />
              </g>
            );
          })}
          {Object.entries(FLOW_NODES).map(([key, n]) => {
            const b = boxes[key];
            return (
              <g key={key} data-node={key} className={"cz-node is-" + n.kind.toLowerCase() + " is-idle"} transform={`translate(${b.x} ${b.y})`}>
                <rect className="cz-node-halo" x="-5" y="-5" width={FLOW_W + 10} height={FLOW_H + 10} rx="15" />
                <rect className="cz-node-box" width={FLOW_W} height={FLOW_H} rx="12" />
                {n.kind === "Agent" && <circle className="cz-node-dot" cx="16" cy="20" r="4" />}
                <text className="cz-node-t" x={n.kind === "Agent" ? 26 : 14} y="24">{n.t}</text>
                <text className="cz-node-k" x="14" y="42" data-status={key}>Waiting</text>
              </g>
            );
          })}
        </svg>
        <div className="cz-steps-wrap" aria-hidden="true">
          <ol className="cz-steps">
            {FLOW_STEPS.map((s) => <li key={s.t}><i />{s.t}</li>)}
          </ol>
          <span className="cz-steps-bar"><b data-k="bar" /></span>
          <span className="cz-steps-clock cz-mono">Run time <b data-k="clock">0:00</b></span>
        </div>
      </div>

      <aside className="cz-inspect" aria-hidden="true">
        <div className="cz-inspect-head">
          <span className="cz-mono">Essay 14 of 24</span>
          <span className="cz-inspect-stage cz-mono" data-k="stage">Plan</span>
        </div>
        <ul className="cz-inspect-rows">
          {ESSAY_ROWS.map((r, i) => (
            <li key={r.t} data-row={i}>
              <span>{r.t}</span>
              <i><b /></i>
              <em data-k={"score" + i}>–</em>
            </li>
          ))}
        </ul>
        <div className="cz-inspect-total">
          <span className="cz-mono">Total</span>
          <strong data-k="total">–</strong>
        </div>
        <p className="cz-inspect-note" data-k="note" />
        <div className="cz-inspect-fb">
          <span className="cz-mono">Feedback</span>
          <p data-k="fb" className="is-wait">Written once the marks are approved.</p>
        </div>
        <div className="cz-inspect-foot">
          <span className="cz-inspect-sent"><Icon name="check" size={14} strokeWidth={3} /><span data-k="sent">Not sent yet</span></span>
          <span className="cz-inspect-stamp cz-mono">Approved</span>
        </div>
      </aside>
    </div>
  );
}

function TheShow() {
  return (
    <section className="cz-section cz-broadcast">
      <div className="cz-wrap">
        <div className="cz-measured-head">
          <div>
            <Eyebrow n="06">The show</Eyebrow>
            <h2 className="cz-h2">Then show it working, live.</h2>
          </div>
          <p className="cz-lede">
            At 12:00 on Saturday, every team presents at the Melsoft offices with a live
            demonstration of its digital colleague completing its workflow. The room watches it run.
          </p>
        </div>

        <figure className="cz-screen">
          <span className="cz-screen-c tl" /><span className="cz-screen-c tr" />
          <span className="cz-screen-c bl" /><span className="cz-screen-c br" />
          <div className="cz-screen-top cz-mono">
            <span><i className="cz-live-dot" aria-hidden="true" /> Live · demo</span>
            <span>Example · a marking colleague</span>
          </div>
          <FlowDemo />
        </figure>

        <ul className="cz-cams">
          <li><b>Every agent has a role.</b> Each one hands its work to the next.</li>
          <li><b>Mistakes get caught.</b> Work that comes back has been checked and is being fixed.</li>
          <li><b>It finishes the job.</b> A result delivered, not a suggestion.</li>
        </ul>
      </div>
    </section>
  );
}

const PRESENT = [
  { t: "The problem", v: "The EdTech problem you chose and who it affects." },
  { t: "The live demo", v: "Your digital colleague completing its workflow, live." },
  { t: "How it thinks", v: "How your agents reason, work together, and correct their own mistakes." },
  { t: "What's next", v: "What you would build next with more time." },
];

function WhatToPresent() {
  return (
    <section className="cz-section">
      <div className="cz-wrap">
        <Eyebrow n="07">What to present</Eyebrow>
        <h2 className="cz-h2 cz-rules-head">Four things to show the room.</h2>
        <ol className="cz-rules">
          {PRESENT.map((r, i) => (
            <li key={r.t}>
              <span className="cz-rule-n" aria-hidden="true">{i + 1}</span>
              <h3>{r.t}</h3>
              <p>{r.v}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

const FAQS = [
  {
    q: "What is Colleague Zero?",
    a: "A 24-hour hackathon on multi-agent workflows. Teams build autonomous digital employees for education: agents that reason, correct their own mistakes, and carry out complex work from start to finish.",
  },
  {
    q: "Does it cost anything to enter?",
    a: "No. Colleague Zero is free to enter.",
  },
  {
    q: "Who can enter?",
    a: "Anyone. There's no age limit.",
  },
  {
    q: "Can we build a chatbot?",
    a: "No. A chatbot waits for a question and answers it, and a basic automation follows a fixed script. We're asking for a system of agents that takes a goal, plans the work, uses tools, checks its own output and fixes what's wrong.",
  },
  {
    q: "What problem should we solve?",
    a: "Any real problem in EdTech. Look at the work learners, facilitators and education teams do every day. The ideas on this page are examples only; you're free to choose your own.",
  },
  {
    q: "How big is a team?",
    a: "Up to five people.",
  },
  {
    q: "Can we start building before Friday?",
    a: "No. There's no prep: everything is done on the day.",
  },
  {
    q: "When and where?",
    a: "We start online at 11:00 on Friday 13 November. On Saturday 14 November we meet at the Melsoft offices, 173 Oxford Road, Rosebank: doors open at 09:00, hacking ends at 11:00, and presentations start at 12:00.",
  },
  {
    q: "What should we bring on Saturday?",
    a: "Your laptops. Be comfortable, and bring your game faces.",
  },
  {
    q: "What do we present?",
    a: "The problem you chose and who it affects, a live demo of your colleague completing its workflow, how your agents reason, work together and correct their mistakes, and what you'd build next with more time.",
  },
  {
    q: "Is it judged?",
    a: "Yes. There will be judges.",
  },
  {
    q: "Who do we ask if we have questions?",
    a: "Call the Melsoft Academy team on 010 158 4346.",
  },
];

function Faq() {
  return (
    <section className="cz-section" id="faq">
      <div className="cz-wrap cz-split">
        <div className="cz-split-aside">
          <Eyebrow n="09">FAQ</Eyebrow>
          <h2 className="cz-h2">Questions, answered.</h2>
        </div>
        <div className="cz-faq">
          {FAQS.map((f, i) => (
            <details key={f.q} open={i === 0}>
              <summary>
                {f.q}
                <span className="cz-faq-icon" aria-hidden="true" />
              </summary>
              <p>{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Registration form ───────────────────────────────────────────────── */

const EMPTY = { solo: false, teamName: "", captainName: "", email: "", phone: "", organisation: "", teamSize: "", inPerson: false };
const TEAM_MAX = 5;
// Matches the member row's exit animation in ColleagueZero.css.
const MEMBER_EXIT_MS = 220;

let memberSeq = 0;
const newMember = () => ({ id: ++memberSeq, name: "", leaving: false });

function RegisterForm({ navigate }) {
  const [data, setData] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  // Everyone besides the captain. Picking a team size opens one row per
  // teammate; the size the sheet gets is always these plus the captain.
  const [members, setMembers] = useState([]);
  const focusRef = useRef(null);

  const update = (key, value) => {
    setData((d) => ({ ...d, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: "" }));
  };

  const solo = data.solo;
  const present = members.filter((m) => !m.leaving);
  const teamOpen = present.length > 0;

  // Move focus once React has rendered the row (or the picker) it points at.
  useEffect(() => {
    if (!focusRef.current) return;
    document.getElementById(focusRef.current)?.focus({ preventScroll: true });
    focusRef.current = null;
  });

  const pickSize = (n) => {
    const rows = Array.from({ length: Number(n) - 1 }, newMember);
    setMembers(rows);
    update("teamSize", n);
    focusRef.current = "cz-m" + rows[0].id;
  };

  const addMember = () => {
    const row = newMember();
    setMembers((ms) => [...ms, row]);
    update("teamSize", String(present.length + 2));
    focusRef.current = "cz-m" + row.id;
  };

  const removeMember = (id) => {
    const i = present.findIndex((m) => m.id === id);
    const left = present.length - 1;
    // Played out in CSS first, then dropped, so the row slides away
    // rather than vanishing.
    setMembers((ms) => ms.map((m) => (m.id === id ? { ...m, leaving: true } : m)));
    setTimeout(() => setMembers((ms) => ms.filter((m) => m.id !== id)), MEMBER_EXIT_MS);
    setErrors((e) => ({ ...e, ["m" + id]: "" }));
    update("teamSize", left ? String(left + 1) : "");
    const next = present[i + 1] || present[i - 1];
    focusRef.current = left ? "cz-m" + next.id : "cz-teamSize";
  };

  const updateMember = (id, name) => {
    setMembers((ms) => ms.map((m) => (m.id === id ? { ...m, name } : m)));
    if (errors["m" + id]) setErrors((e) => ({ ...e, ["m" + id]: "" }));
  };

  const validate = () => {
    const errs = {};
    const who = solo ? "your" : "your captain's";
    if (!solo && !data.teamName.trim()) errs.teamName = "Add your team's name so we can register you.";
    if (!data.captainName.trim()) errs.captainName = solo ? "Add your name so we can register you." : "Add your captain's name so we can register you.";
    if (!data.organisation.trim()) errs.organisation = "Add your occupation so we can register you.";
    if (data.phone.replace(/\D/g, "").length < 9) errs.phone = `Add ${who} phone number so we can register you.`;
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(data.email.trim())) errs.email = `Add ${who} email address so we can register you.`;
    if (!solo && !data.teamSize) errs.teamSize = "Add your team's size so we can register you.";
    if (!solo) {
      present.forEach((m) => {
        if (!m.name.trim()) errs["m" + m.id] = "Add their name, or remove them";
      });
    }
    if (!data.inPerson) errs.inPerson = solo ? "Confirm you can be there on Saturday." : "Confirm your team can be there on Saturday.";
    setErrors(errs);
    const first = Object.keys(errs)[0];
    if (first) document.getElementById("cz-" + first)?.focus();
    return !first;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    setSubmitError("");

    const payload = {
      timestamp: new Date().toISOString(),
      joiningAs: solo ? "Individual" : "Team",
      teamName: solo ? "" : data.teamName.trim(),
      captainName: data.captainName.trim(),
      email: data.email.trim(),
      phone: data.phone.trim(),
      organisation: data.organisation.trim(),
      teamSize: solo ? "1" : data.teamSize,
      members: solo ? "" : present.map((m) => m.name.trim()).join(", "),
      inPerson: data.inPerson ? "Confirmed" : "No",
      source: getLeadSource(),
    };

    try {
      if (hackathonConfigured()) {
        const result = await sendHackathonRegistrationToSheet(payload);
        if (!result || result.result !== "success") {
          throw new Error((result && result.error) || "Unrecognised response from the registration endpoint");
        }
      } else if (import.meta.env.DEV) {
        // Lets the flow be clicked through locally before the sheet exists.
        console.warn("GSHEET_HACKATHON_ENDPOINT not set — skipping the sheet in dev.", payload);
      } else {
        throw new Error("not configured");
      }

      const candidate = "CZ-" + Date.now().toString(36).slice(-5).toUpperCase();
      try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
          teamName: payload.teamName, captainName: payload.captainName, email: payload.email,
          teamSize: payload.teamSize, candidate,
        }));
      } catch {
        // Storage blocked: the next page falls back to its generic copy.
      }
      navigate(REGISTERED_PATH);
    } catch (err) {
      console.error("Hackathon registration failed:", err);
      setSubmitError(
        String(err.message).includes("not configured")
          ? "Registration opens shortly. Please check back, or call us on 010 158 4346."
          : "Sorry, we couldn't send your registration. Check your connection and try again.",
      );
      setSubmitting(false);
    }
  };

  const field = (key, label, { wide, ...props } = {}) => (
    <div className={"cz-field" + (wide ? " cz-field--wide" : "") + (errors[key] ? " has-error" : "")}>
      <label htmlFor={"cz-" + key}>{label}</label>
      <input
        id={"cz-" + key}
        value={data[key]}
        onChange={(e) => update(key, e.target.value)}
        disabled={submitting}
        aria-invalid={Boolean(errors[key])}
        aria-describedby={errors[key] ? `cz-${key}-err` : undefined}
        {...props}
      />
      {errors[key] && <span className="cz-field-err" id={`cz-${key}-err`}>{errors[key]}</span>}
    </div>
  );

  const occupation = field("organisation", "Your occupation", { placeholder: "Student, developer, analyst…", autoComplete: "organization-title" });
  const phone = field("phone", solo ? "Your phone" : "Captain's phone", { type: "tel", placeholder: "082 123 4567", autoComplete: "tel" });

  return (
    <form className="cz-form" noValidate onSubmit={handleSubmit}>
      <h3>{solo ? "Put yourself forward" : "Put your team forward"}</h3>
      <p className="cz-form-sub">Takes two minutes.</p>

      <fieldset className="cz-field cz-size cz-joining">
        <legend>Are you entering as a team or on your own?</legend>
        <div className="cz-size-row cz-size-row--2">
          {[[false, "With a team"], [true, "On my own"]].map(([v, label]) => (
            <label key={label} className={"cz-size-opt" + (solo === v ? " is-on" : "")}>
              <input
                type="radio" name="joining"
                checked={solo === v}
                onChange={() => update("solo", v)}
                disabled={submitting}
              />
              {label}
            </label>
          ))}
        </div>
      </fieldset>

      {/* Two field orders, so both modes fill the grid without a gap: a
          team has a name and a captain; an individual is just themselves. */}
      <div className="cz-form-grid">
        {solo ? (
          <>
            {field("captainName", "Your name", { placeholder: "Full name", autoComplete: "name" })}
            {occupation}
            {phone}
            {field("email", "Your email", { type: "email", placeholder: "you@example.com", autoComplete: "email" })}
          </>
        ) : (
          <>
            {field("teamName", "Team name", { placeholder: "e.g. Null Pointers", autoComplete: "off" })}
            {occupation}
            {field("captainName", "Team captain", { placeholder: "Full name", autoComplete: "name" })}
            {phone}
            {field("email", "Captain's email", { type: "email", placeholder: "you@example.com", autoComplete: "email", wide: true })}
          </>
        )}

        {/* Team size and the teammates' names share one slot: picking a size
            folds the picker away and slides the names open in its place.
            Joining solo folds the whole slot away. */}
        <div className={"cz-fold cz-team" + (solo ? "" : " is-open")} inert={solo}>
          <div className="cz-fold-inner">
            <div className="cz-team-slots">
              <div className={"cz-fold" + (teamOpen ? "" : " is-open")} inert={teamOpen}>
                <div className="cz-fold-inner">
                <fieldset className={"cz-field cz-size" + (errors.teamSize ? " has-error" : "")}>
                  <legend>How many in your team?</legend>
                  <div className="cz-size-row">
                    {["2", "3", "4", "5"].map((n, i) => (
                      <label key={n} className={"cz-size-opt" + (data.teamSize === n ? " is-on" : "")}>
                        <input
                          type="radio" name="teamSize" value={n}
                          id={i === 0 ? "cz-teamSize" : undefined}
                          checked={data.teamSize === n}
                          onChange={() => pickSize(n)}
                          disabled={submitting}
                        />
                        {n}
                      </label>
                    ))}
                  </div>
                  {errors.teamSize && <span className="cz-field-err">{errors.teamSize}</span>}
                </fieldset>
                </div>
              </div>

              <div className={"cz-fold" + (teamOpen ? " is-open" : "")} inert={!teamOpen}>
                <div className="cz-fold-inner">
                <fieldset className="cz-field cz-members">
                  <legend>
                    Your team <span>· {present.length + 1} of you, including {data.captainName.trim() || "your captain"}</span>
                  </legend>
                  <div className="cz-members-grid">
                    {members.map((m) => {
                      const n = present.indexOf(m) + 2; // teammate number, captain is 1
                      return (
                      <div
                        key={m.id}
                        className={"cz-member" + (m.leaving ? " is-leaving" : "") + (errors["m" + m.id] ? " has-error" : "")}
                      >
                        <div className="cz-member-box">
                          <input
                            id={"cz-m" + m.id}
                            value={m.name}
                            onChange={(e) => updateMember(m.id, e.target.value)}
                            placeholder={m.leaving ? "" : `Teammate ${n}, full name`}
                            aria-label={`Teammate ${n} name`}
                            aria-invalid={Boolean(errors["m" + m.id])}
                            aria-describedby={errors["m" + m.id] ? `cz-m${m.id}-err` : undefined}
                            autoComplete="off"
                            disabled={submitting || m.leaving}
                          />
                          <button
                            type="button"
                            className="cz-member-x"
                            onClick={() => removeMember(m.id)}
                            aria-label={`Remove teammate ${n}`}
                            disabled={submitting || m.leaving}
                          >
                            <Icon name="close" size={16} strokeWidth={2.4} />
                          </button>
                        </div>
                        {errors["m" + m.id] && <span className="cz-field-err" id={`cz-m${m.id}-err`}>{errors["m" + m.id]}</span>}
                      </div>
                      );
                    })}
                    {present.length + 1 < TEAM_MAX && (
                      <button type="button" className="cz-member-add" onClick={addMember} disabled={submitting}>
                        + Add a teammate
                      </button>
                    )}
                  </div>
                </fieldset>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Required: day two is in person for everyone. */}
        <div className={"cz-check-wrap" + (errors.inPerson ? " has-error" : "")}>
          <label className="cz-check">
            <input
              id="cz-inPerson"
              type="checkbox"
              checked={data.inPerson}
              onChange={(e) => update("inPerson", e.target.checked)}
              disabled={submitting}
              aria-invalid={Boolean(errors.inPerson)}
              aria-describedby={errors.inPerson ? "cz-inPerson-err" : undefined}
            />
            <span className="cz-check-box" aria-hidden="true"><Icon name="check" size={14} strokeWidth={3} /></span>
            <span>
              {solo ? "I'll" : "We'll"} be at the Melsoft offices, 173 Oxford Road, Rosebank, from 09:00 on Saturday 14 November.
              <em>Day one is online for everyone.</em>
            </span>
          </label>
          {errors.inPerson && <span className="cz-field-err" id="cz-inPerson-err">{errors.inPerson}</span>}
        </div>
      </div>

      {submitError && <div className="cz-form-error" role="alert">{submitError}</div>}

      <button type="submit" className="cz-btn cz-btn--maroon cz-btn--block" disabled={submitting}>
        {submitting ? "Submitting…" : solo ? "Submit my entry" : "Submit our team"}
        {!submitting && <Icon name="arrow-right" size={18} />}
      </button>
      <p className="cz-form-fine">
        <strong>Free to enter.</strong> We use these details only to run the hackathon and contact {solo ? "you" : "your team"} about it. See our{" "}
        <a href="/privacy-policy" onClick={(e) => { e.preventDefault(); navigate("/privacy-policy"); }}>privacy policy</a>.
      </p>
    </form>
  );
}

function Register({ navigate }) {
  return (
    <section className="cz-section" id="register">
      <div className="cz-wrap cz-register">
        <div className="cz-vacancy">
          <Eyebrow n="08">Now hiring · 1 position</Eyebrow>
          <h2 className="cz-vacancy-title">Colleague Zero.</h2>
          <p className="cz-lede cz-vacancy-lede">
            <b>The role:</b> a digital colleague for education. <b>The interview:</b> 24 hours. Put
            your team forward and build the colleague nobody has hired yet.
          </p>
          {/* Read as a job posting: the spec, then the itinerary, then the
              entry stamped like the page's other stamps. */}
          <dl className="cz-spec">
            <div><dt>Role</dt><dd>Digital colleague for education</dd></div>
            <div><dt>Team</dt><dd>Up to five people</dd></div>
          </dl>
          <dl className="cz-itin">
            <div><dt>Day one</dt><dd>Online · Fri 13 Nov, 11:00</dd></div>
            <div><dt>Day two</dt><dd>Melsoft offices · Sat 14 Nov, 09:00</dd></div>
            <div><dt>Presentations</dt><dd>Sat 14 Nov, 12:00</dd></div>
          </dl>
          <dl className="cz-entry">
            <dt>Entry</dt><dd>Free</dd>
          </dl>
        </div>
        <RegisterForm navigate={navigate} />
      </div>
    </section>
  );
}

/* ── Countdown: the agent thinking out loud ─────────────────────────────
   The hero's campus shows its agent thinking in dark bubbles. This is one
   more of those bubbles, pinned to the corner of the screen: a little
   agent (the pulsing dot) working out how long is left until the start in
   the brief, 11:00 on Friday 13 November 2026, SAST (09:00 UTC), and
   saying it in words. Each number that changes decodes in place, as if
   it's being worked out live. It steps aside while the form or the footer
   is on screen, and is gone once the hackathon has started. */

const START_AT = Date.UTC(2026, 10, 13, 9, 0, 0);
const SCRAMBLE_MS = 320;

const remaining = () => {
  const ms = Math.max(0, START_AT - Date.now());
  const t = Math.floor(ms / 1000);
  return { ms, d: Math.floor(t / 86400), h: Math.floor(t / 3600) % 24, m: Math.floor(t / 60) % 60, s: t % 60 };
};

// A number that flickers through random values before settling on its
// own. The flicker stays inside the unit's range (no "74 seconds").
function Decode({ value, max }) {
  const ref = useRef(null);
  const first = useRef(true);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const final = String(value);
    el.style.minWidth = final.length + "ch";
    if (first.current || prefersReducedMotion()) { first.current = false; el.textContent = final; return; }
    let raf = 0;
    const t0 = performance.now();
    const step = (now) => {
      const p = (now - t0) / SCRAMBLE_MS;
      if (p >= 1) { el.textContent = final; el.classList.remove("is-busy"); return; }
      // Same number of digits as the final value, so nothing shifts.
      const lo = final.length > 1 ? 10 ** (final.length - 1) : 0;
      const hi = Math.min(max, 10 ** final.length);
      el.textContent = String(lo + Math.floor(Math.random() * (hi - lo)));
      raf = requestAnimationFrame(step);
    };
    el.classList.add("is-busy");
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, max]);
  // No children: the text is written by the layout effect above, so React
  // never holds a reference to a text node the scramble has replaced.
  return <b ref={ref} className="cz-think-n" />;
}

/* The little colleague the countdown bubble belongs to: half agent (a
   head with a visor for a face and an antenna), half human (cheeks, a
   hoodie, a name badge). Its eyes follow the pointer around the page and
   blink now and then; it waves when it arrives, every so often while idle,
   and whenever the bubble is hovered, smiling as it does. Everything is
   classes and CSS custom properties set from here; no React state, so
   the pointer never re-renders anything. */
function AgentBuddy() {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion()) return;
    const timers = [];
    const later = (fn, ms) => timers.push(setTimeout(fn, ms));
    const wave = () => {
      el.classList.remove("is-waving");
      void el.getBoundingClientRect(); // restart the animation
      el.classList.add("is-waving");
      later(() => el.classList.remove("is-waving"), 1500);
    };
    const blink = () => {
      el.classList.add("is-blink");
      later(() => el.classList.remove("is-blink"), 140);
      later(blink, 2600 + Math.random() * 3600);
    };
    const idleWave = () => { wave(); later(idleWave, 11000 + Math.random() * 6000); };
    later(wave, 900);
    later(blink, 2200);
    later(idleWave, 9000);

    let raf = 0, px = 0, py = 0;
    const look = () => {
      raf = 0;
      const r = el.getBoundingClientRect();
      const dx = px - (r.left + r.width / 2), dy = py - (r.top + r.height * 0.4);
      const d = Math.max(1, Math.hypot(dx, dy));
      const k = Math.min(1, d / 300);
      el.style.setProperty("--ex", ((dx / d) * 2.4 * k).toFixed(2) + "px");
      el.style.setProperty("--ey", ((dy / d) * 1.8 * k).toFixed(2) + "px");
      el.style.setProperty("--tilt", ((dx / d) * 5 * k).toFixed(2) + "deg");
    };
    const onMove = (e) => { px = e.clientX; py = e.clientY; if (!raf) raf = requestAnimationFrame(look); };
    window.addEventListener("pointermove", onMove, { passive: true });
    const host = el.closest(".cz-think");
    host?.addEventListener("pointerenter", wave);
    return () => {
      timers.forEach(clearTimeout);
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      host?.removeEventListener("pointerenter", wave);
    };
  }, []);
  return (
    <span className="cz-buddy" ref={ref} aria-hidden="true">
      <svg viewBox="0 0 64 74">
        <ellipse className="cz-buddy-shadow" cx="32" cy="71" rx="15" ry="2.4" />
        <g className="cz-buddy-bob">
          {/* Left arm, resting. */}
          <g className="cz-buddy-arm-l">
            <rect x="11" y="48" width="7" height="15" rx="3.5" />
            <circle cx="14.5" cy="63.5" r="3.6" className="cz-buddy-hand" />
          </g>
          {/* Body: a hoodie with a name badge. */}
          <rect className="cz-buddy-body" x="17" y="46" width="30" height="21" rx="10" />
          <path className="cz-buddy-collar" d="M27 46.5 L32 52 L37 46.5" />
          <rect className="cz-buddy-badge" x="36" y="54" width="7" height="8.5" rx="1.6" />
          <rect className="cz-buddy-badge-line" x="37.6" y="58.4" width="3.8" height="1.2" rx="0.6" />
          {/* Right arm: hangs down at rest, swings up from the shoulder to wave. */}
          <g className="cz-buddy-arm-r">
            <rect x="46" y="33" width="7" height="16" rx="3.5" />
            <circle cx="49.5" cy="32.5" r="3.9" className="cz-buddy-hand" />
          </g>
          <g className="cz-buddy-head">
            <line className="cz-buddy-antenna" x1="32" y1="7" x2="32" y2="14" />
            <circle className="cz-buddy-bulb" cx="32" cy="5.5" r="3.4" />
            <rect className="cz-buddy-skull" x="12" y="13" width="40" height="32" rx="12" />
            <rect className="cz-buddy-visor" x="16" y="18.5" width="32" height="20" rx="8.5" />
            <g className="cz-buddy-eyes">
              <rect className="cz-buddy-eye" x="23" y="23.5" width="5" height="8" rx="2.5" />
              <rect className="cz-buddy-eye" x="36" y="23.5" width="5" height="8" rx="2.5" />
              <path className="cz-buddy-happy" d="M22.8 29 Q25.5 24.6 28.2 29 M35.8 29 Q38.5 24.6 41.2 29" />
            </g>
            <path className="cz-buddy-smile" d="M28.5 33.6 Q32 36.4 35.5 33.6" />
            <circle className="cz-buddy-cheek" cx="20.2" cy="34" r="1.9" />
            <circle className="cz-buddy-cheek" cx="43.8" cy="34" r="1.9" />
          </g>
        </g>
      </svg>
    </span>
  );
}

function CountdownThought({ onRegister }) {
  const [left, setLeft] = useState(remaining);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    let t = 0;
    // Tick on the second boundary so every number changes together.
    const tick = () => {
      setLeft(remaining());
      t = setTimeout(tick, 1000 - (Date.now() % 1000) + 5);
    };
    tick();
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const blockers = new Set();
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => (e.isIntersecting ? blockers.add(e.target) : blockers.delete(e.target)));
      setHidden(blockers.size > 0);
    }, { rootMargin: "0px 0px -15% 0px" });
    document.querySelectorAll("#register, .cz-closer, .cz-footer").forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  if (left.ms <= 0) return null;
  const pad = (n) => String(n).padStart(2, "0");
  return (
    <a
      href="#register"
      className={"cz-think" + (hidden ? "" : " is-shown")}
      onClick={onRegister}
      tabIndex={hidden ? -1 : 0}
      aria-hidden={hidden}
      aria-label={`Hackathon starts in ${left.d} days, ${left.h} hours and ${left.m} minutes. Register your team.`}
    >
      <span className="cz-think-float">
        {/* Two quiet lines: the days in words, then the rest ticking small. */}
        <span className="cz-think-bubble" aria-hidden="true">
          <span className="cz-think-line">
            Hackathon starts in <b className="cz-think-days"><Decode value={left.d} max={Math.max(10, left.d + 1)} /> {left.d === 1 ? "day" : "days"}</b>
          </span>
          <span className="cz-think-tick">
            <Decode value={pad(left.h)} max={24} />h <Decode value={pad(left.m)} max={60} />m <Decode value={pad(left.s)} max={60} />s
          </span>
          <span className="cz-think-go">Register your team <Icon name="arrow-right" size={15} /></span>
        </span>
        <AgentBuddy />
      </span>
    </a>
  );
}

/* ── Page ────────────────────────────────────────────────────────────── */

const ColleagueZeroPage = ({ navigate }) => {
  const goRegister = scrollToId("register");

  return (
    <main className="cz" data-screen-label="Colleague Zero · Hackathon">
      <CzHeader navigate={navigate} onRegister={goRegister} />

      <section className="cz-hero">
        <HeroRings />
        <div className="cz-wrap cz-hero-grid">
          <div className="cz-hero-copy">
            <p className="cz-kicker cz-mono">
              <span className="cz-live-dot" aria-hidden="true" />
              The Autonomous Agent Hackathon
            </p>
            <h1>
              Can an agent pass as a <span className="cz-h1-accent">colleague?</span>
            </h1>
            <p className="cz-hero-lede">
              Spend 24 hours building a team of AI agents that takes on real work in education.
            </p>
            <div className="cz-hero-cta">
              <a href="#register" className="cz-btn cz-btn--primary" onClick={goRegister}>
                Register your team <Icon name="arrow-right" size={18} />
              </a>
              <a href="#the-main" className="cz-btn cz-btn--secondary" onClick={scrollToId("the-main")}>
                See the challenge
              </a>
            </div>
            <dl className="cz-hero-facts">
              <div><dt>Verdict</dt><dd>Hired <i>or</i> not hired</dd></div>
              <div><dt>Max team</dt><dd>5</dd></div>
              <div><dt>Starts</dt><dd>Fri 13 Nov, 11:00</dd></div>
            </dl>
          </div>
          <div className="cz-hero-stage">
            <ColleagueZeroCampus />
          </div>
        </div>
      </section>

      <Ticker />

      <Manifesto />
      <Challenge />
      <Dossier />
      <Ideas />
      <Schedule />
      <TheShow />
      <WhatToPresent />
      <Register navigate={navigate} />
      <Faq />

      <section className="cz-closer">
        <div className="cz-wrap">
          <p>Build a colleague. Show it working. 13–14 November.</p>
          <a href="#register" className="cz-btn cz-btn--white cz-btn--sm" onClick={goRegister}>
            Register your team <Icon name="arrow-right" size={18} />
          </a>
        </div>
      </section>

      <CzFooter navigate={navigate} />
      <CountdownThought onRegister={goRegister} />
    </main>
  );
};

export default ColleagueZeroPage;

/* ── /colleague-zero/registered ──────────────────────────────────────── */

export const ColleagueZeroRegisteredPage = ({ navigate }) => {
  const [reg] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "null"); } catch { return null; }
  });

  // A confirmation screen has nothing to rank.
  useEffect(() => {
    const tag = document.createElement("meta");
    tag.name = "robots";
    tag.content = "noindex";
    document.head.appendChild(tag);
    return () => { document.head.removeChild(tag); };
  }, []);

  const steps = [
    { t: "Registered", v: reg?.teamSize === "1" ? "You're registered for Colleague Zero." : "Your team is registered for Colleague Zero.", done: true },
    ...SCHEDULE.map((s) => ({ t: s.t, v: `${s.day}, ${s.time} · ${s.where}` })),
  ];

  return (
    <main className="cz cz-done-page" data-screen-label="Colleague Zero · Registered">
      <CzHeader navigate={navigate} />
      <section className="cz-done">
        <HeroRings />
        <div className="cz-wrap cz-done-grid">
          <div className="cz-done-copy">
            <p className="cz-kicker cz-mono">
              <span className="cz-live-dot" aria-hidden="true" />
              Registered
            </p>
            <h1>
              {reg?.teamName ? <>{reg.teamName}, you're <span className="cz-h1-accent">in.</span></> : <>You're <span className="cz-h1-accent">in.</span></>}
            </h1>
            <p className="cz-hero-lede">
              {reg?.teamSize === "1" ? "You're" : "Your team is"} registered for Colleague Zero. We'll see
              you online at 11:00 on Friday 13 November.
            </p>
            <div className="cz-hero-cta">
              <a
                href="/colleague-zero"
                className="cz-btn cz-btn--primary"
                onClick={(e) => { e.preventDefault(); navigate("/colleague-zero"); }}
              >
                Back to the brief
              </a>
            </div>
          </div>

          <div className="cz-badge-card">
            <div className="cz-badge-top">
              <img src="/assets/logo-light.webp" alt="" width="79" height="34" />
              <span className="cz-mono">Candidate file</span>
            </div>
            <p className="cz-badge-id cz-mono">{reg?.candidate || "CZ-·····"}</p>
            <dl>
              <div><dt>Team</dt><dd>{reg?.teamName || "Your team"}</dd></div>
              <div><dt>Captain</dt><dd>{reg?.captainName || "—"}</dd></div>
              <div><dt>Headcount</dt><dd>{reg?.teamSize ? `${reg.teamSize} ${reg.teamSize === "1" ? "human" : "humans"} + 1 agent` : "—"}</dd></div>
              <div><dt>Status</dt><dd><span className="cz-verdict is-pending">Pending · day one</span></dd></div>
            </dl>
          </div>
        </div>
      </section>

      <section className="cz-section">
        <div className="cz-wrap">
          <Eyebrow n="→">What happens next</Eyebrow>
          <h2 className="cz-h2">From registration to presentation.</h2>
          <ol className="cz-timeline">
            {steps.map((s, i) => (
              <li key={s.t} className={s.done ? "is-done" : ""}>
                <span className="cz-timeline-dot" aria-hidden="true">
                  {s.done ? <Icon name="check" size={16} strokeWidth={3} /> : String(i + 1).padStart(2, "0")}
                </span>
                <h3>{s.t}</h3>
                <p>{s.v}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <CzFooter navigate={navigate} />
    </main>
  );
};
