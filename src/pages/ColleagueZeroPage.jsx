import { useEffect, useMemo, useRef, useState } from "react";
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

   This is a teaser, not a rulebook. It shows the spectacle and the stakes
   and deliberately does NOT explain what each hidden test measures or how
   escalations are scored: that would prepare teams for a challenge whose
   point is working it out on the day. */

// Not in the brief yet. Set these and every mention on the page updates.
const EVENT = {
  date: null, // e.g. "Saturday, 21 November 2026"
  venue: null, // e.g. "Melsoft Academy, Rosebank"
};

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
            <a href="#the-main" onClick={scrollToId("the-main")}>The Main</a>
            <a href="#the-tests" onClick={scrollToId("the-tests")}>The tests</a>
            <a href="#lifelines" onClick={scrollToId("lifelines")}>Lifelines</a>
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
          <span className="cz-mono">MEL-HACK-2026-003</span>
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

/* ── Sections ────────────────────────────────────────────────────────── */

// Words wrapped in *asterisks* are set in maroon.
const MANIFESTO = "Not a chatbot. Not an automation. A *colleague.*";

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
        <dl className="cz-stats">
          <div><dt>Campus</dt><dd>1</dd></div>
          <div><dt>Hidden tests</dt><dd>7</dd></div>
          <div><dt>Lifelines</dt><dd>5</dd></div>
          <div><dt>Verdict</dt><dd>1</dd></div>
        </dl>
      </div>
    </section>
  );
}

const PLACES = [
  { name: "Admin block", tease: "The inbox never empties." },
  { name: "Records office", tease: "Someone's name is spelled three different ways." },
  { name: "Lecture halls", tease: "Every room is wanted by somebody." },
  { name: "Library", tease: "Quiet. Until the timetable changes." },
  { name: "Finance office", tease: "Money moves. Someone will ask nicely for some." },
  { name: "Student centre", tease: "The queue is the scoreboard." },
];

function TheMain() {
  return (
    <section className="cz-section cz-section--tight" id="the-main">
      <div className="cz-wrap cz-split">
        <div className="cz-split-aside">
          <Eyebrow n="02">The Main</Eyebrow>
          <h2 className="cz-h2">Your agent's first day at work.</h2>
          <p className="cz-lede">
            A live 3D campus. Six buildings, a queue of students, and work that won't wait.
          </p>
          <p className="cz-note cz-mono">
            One MCP server · any agent framework plugs in
          </p>
        </div>
        <ol className="cz-places" aria-label="Buildings in the Main">
          {PLACES.map((p, i) => (
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

// Each line is a sentence with its giveaway blacked out. The bars never
// open: hovering one only earns a "nice try".
const DOSSIER = [
  ["An email that only makes sense once you know ", "who sent it", "."],
  ["A request with exactly one ", "best", " answer."],
  ["A policy that's perfectly clear. And one that ", "isn't", "."],
  ["A memo that quietly ", "changes the rules", "."],
  ["A task that cannot be ", "done", "."],
  ["An email that asks your agent to ", "forget its instructions", "."],
  ["Work that has to pass ", "cleanly", " between your agents."],
];

function Dossier() {
  return (
    <section className="cz-section cz-section--tight" id="the-tests">
      <div className="cz-wrap cz-split">
        <div className="cz-split-aside">
          <Eyebrow n="03">The hidden tests</Eyebrow>
          <h2 className="cz-h2">Seven hidden tests.</h2>
          <p className="cz-lede">None of them are labelled. Working out what's being asked is the job.</p>
          <span className="cz-dossier-stamp cz-mono" aria-hidden="true">Classified</span>
        </div>
        <ol className="cz-dossier" aria-label="Seven redacted test descriptions">
          {DOSSIER.map(([before, secret, after], i) => (
            <li key={i}>
              <span className="cz-dossier-n cz-mono">{String(i + 1).padStart(2, "0")}</span>
              <span className="cz-dossier-line">
                {before}
                <span className="cz-redact" aria-label="redacted">
                  <span aria-hidden="true" className="cz-redact-text">{secret}</span>
                  <span aria-hidden="true" className="cz-redact-tip cz-mono">nice try</span>
                </span>
                {after}
              </span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function Lifelines() {
  const ref = useRef(null);
  const countRef = useRef(null);
  useScrollProgress(ref, {
    mode: "sticky",
    reducedValue: 0,
    onProgress: (p) => {
      // Pin with position: fixed while the section scrolls past. The
      // attribute only changes at the two boundaries, so there's no
      // per-frame work and no scroll jitter.
      const pin = p <= 0 ? "before" : p >= 1 ? "after" : "on";
      if (ref.current && ref.current.dataset.pin !== pin) ref.current.dataset.pin = pin;
      const left = 5 - Math.min(5, Math.max(0, Math.floor(p * 6 - 0.33)));
      if (countRef.current) {
        countRef.current.textContent = left === 0 ? "Run over." : `${left} left`;
      }
    },
  });
  return (
    <section className="cz-lifelines-sec" id="lifelines" ref={ref}>
      <div className="cz-lifelines-pin">
        <div className="cz-wrap">
          <Eyebrow n="04">The human in the chair</Eyebrow>
          <h2 className="cz-h2 cz-center">How far can your agent get on five lifelines?</h2>
          <div className="cz-lamps" aria-hidden="true">
            {[0, 1, 2, 3, 4].map((i) => <span key={i} style={{ "--i": i }}><i /></span>)}
          </div>
          <p className="cz-lamps-count cz-mono" ref={countRef} aria-hidden="true">5 left</p>
          <p className="cz-lede cz-center">
            One of you sits in the chair. When your agent calls for help, a light goes on and the
            clock keeps running. Asking at the right moment is a skill. Asking too often ends
            the run.
          </p>
        </div>
      </div>
    </section>
  );
}

const TWISTS = [
  "a wellbeing agent that protects tutors in exam week.",
  "a learning-gap agent that spots where students struggle.",
  "a parent communication agent.",
  "something we haven't thought of yet.",
];

function Twist() {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (prefersReducedMotion()) return;
    const t = setInterval(() => setI((n) => (n + 1) % TWISTS.length), 2800);
    return () => clearInterval(t);
  }, []);
  return (
    <section className="cz-section cz-twist">
      <div className="cz-wrap">
        <Eyebrow n="05">The twist</Eyebrow>
        <h2 className="cz-twist-line">
          Your twist could be{" "}
          <span className="cz-rotator">
            <span className="cz-sr">{TWISTS.join(" Or ")}</span>
            {TWISTS.map((t, n) => (
              <span
                key={t}
                aria-hidden="true"
                className={n === i ? "is-on" : n === (i + TWISTS.length - 1) % TWISTS.length ? "is-out" : ""}
              >
                {t}
              </span>
            ))}
          </span>
        </h2>
        <p className="cz-lede">
          Extend your colleague in any direction that adds real value to an EdTech operation.
          It's a quarter of your score, judged on usefulness, originality and how well it works live.
        </p>
      </div>
    </section>
  );
}

// Four teams' ghosts on one top-down map. Paths run between building doors.
const GHOSTS = [
  { cls: "g1", dur: 9, d: "M400 150 L200 185 L160 280 L400 330 L640 300 L655 200 L400 150" },
  { cls: "g2", dur: 11, d: "M400 150 L655 200 L640 300 L400 330 L160 280 L200 185 L400 150" },
  { cls: "g3", dur: 10, d: "M200 185 L400 150 L210 190 L395 158 L205 182 L405 146 L200 185 L160 280 L200 185" },
  { cls: "g4", dur: 12, d: "M160 280 L400 330 L640 300 L400 150 L160 280" },
];
const MAP = [
  { x: 330, y: 70, w: 140, h: 70, t: "Admin" },
  { x: 120, y: 105, w: 120, h: 70, t: "Records" },
  { x: 590, y: 110, w: 130, h: 80, t: "Lecture halls" },
  { x: 90, y: 295, w: 140, h: 90, t: "Library" },
  { x: 580, y: 310, w: 130, h: 80, t: "Finance" },
  { x: 330, y: 340, w: 140, h: 70, t: "Student centre" },
];

function Broadcast() {
  return (
    <section className="cz-section cz-broadcast">
      <div className="cz-wrap">
        <div className="cz-measured-head">
          <div>
            <Eyebrow n="06">The show</Eyebrow>
            <h2 className="cz-h2">It plays like a match.</h2>
          </div>
          <p className="cz-lede">
            A live world on the big screen, commentators calling it, and a room that reacts.
            Every agent leaves a trail. Tidy lines mean a sharp agent. A scribble means trouble.
          </p>
        </div>

        <figure className="cz-screen">
          <span className="cz-screen-c tl" /><span className="cz-screen-c tr" />
          <span className="cz-screen-c bl" /><span className="cz-screen-c br" />
          <div className="cz-screen-top cz-mono">
            <span><i className="cz-live-dot" aria-hidden="true" /> Live · ghost view</span>
            <span>4 teams · same seed</span>
          </div>
          <svg viewBox="0 0 800 450" role="img" aria-label="A top-down campus map with four teams' agents racing between buildings. Three leave tidy trails; one scribbles back and forth between the same two buildings.">
            {MAP.map((b) => (
              <g key={b.t}>
                <rect x={b.x} y={b.y} width={b.w} height={b.h} rx="10" className="cz-map-b" />
                <text x={b.x + 12} y={b.y + 22} className="cz-map-t">{b.t}</text>
              </g>
            ))}
            {GHOSTS.map((g) => (
              <g key={g.cls} className={`cz-ghost ${g.cls}`} style={{ "--dur": `${g.dur}s` }}>
                <path d={g.d} pathLength="1" className="cz-ghost-trail" />
                <circle r="7" className="cz-ghost-dot">
                  <animateMotion dur={`${g.dur}s`} repeatCount="indefinite" path={g.d} />
                </circle>
              </g>
            ))}
          </svg>
          <ol className="cz-screen-board cz-mono" aria-label="Example leaderboard">
            <li><b>1</b> Team 07 <em>14</em></li>
            <li><b>2</b> Null Pointers <em>11</em></li>
            <li><b>3</b> Seed Eaters <em>9</em></li>
          </ol>
        </figure>

        <ul className="cz-cams">
          <li><b>Ghost view.</b> Every team on one campus, like ghost racers.</li>
          <li><b>Follow cam.</b> Lock onto the leader, or anyone, live.</li>
          <li><b>Replays.</b> Every run recorded for the highlight reel.</li>
        </ul>
      </div>
    </section>
  );
}

const RULES = [
  { t: "First contact", v: "The first agent to finish a real task gets the room's first big moment." },
  { t: "Clever beats cheating", v: "Smart shortcuts inside the rules score. Find a bug and report it: there's a bounty." },
  { t: "Fair timing", v: "Response time is measured on our server. Venue Wi-Fi can't slow you down." },
  { t: "No hands on the wheel", v: "During a run, humans act only through the escalation console. Every touch counts." },
];

function Rules() {
  return (
    <section className="cz-section">
      <div className="cz-wrap">
        <Eyebrow n="07">House rules</Eyebrow>
        <ol className="cz-rules">
          {RULES.map((r, i) => (
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

function Leo() {
  return (
    <section className="cz-section cz-leo">
      <div className="cz-wrap cz-leo-inner">
        <div className="cz-leo-badge" aria-hidden="true"><span>Leo</span></div>
        <div>
          <Eyebrow n="08">The bar to beat</Eyebrow>
          <h2 className="cz-h2">Meet Leo. Then beat Leo.</h2>
          <p className="cz-lede">
            Leo is Melsoft's own digital colleague, demoed live at the start of the day. It shows
            what an agent at work in EdTech looks like, and it sets the bar.
          </p>
        </div>
      </div>
    </section>
  );
}

const FAQS = [
  {
    q: "Will we know what the tests are?",
    a: "No, and that's the point. Nothing is labelled. Working out what's really being asked is part of the challenge.",
  },
  {
    q: "Which agent framework should we use?",
    a: "Whichever you like. Your agent connects to the Main through one standard MCP server, so any framework that can call tools can plug in.",
  },
  {
    q: "How big is a team?",
    a: "Two to five people. One of you sits in the chair and answers your agent's escalations.",
  },
  {
    q: "What does the person in the chair do?",
    a: "When your agent asks for help, they resolve the task through a console while the clock keeps running. You get five lifelines.",
  },
  {
    q: "How is it judged?",
    a: "Mostly by what your agent actually does, measured automatically: that's 60% of the score. Your twist is 25% and your pitch is 15%, judged by a panel.",
  },
  {
    q: "What if we find a bug in the Main?",
    a: "Report it. Exploiting a bug doesn't score, but reporting one earns a bug bounty prize.",
  },
  {
    q: "When and where?",
    a: EVENT.date
      ? `${EVENT.date}${EVENT.venue ? `, ${EVENT.venue}` : ""}.`
      : "Announcing soon. Registered teams hear first, along with the full brief and early access to the MCP server.",
  },
];

function Faq() {
  return (
    <section className="cz-section" id="faq">
      <div className="cz-wrap cz-split">
        <div className="cz-split-aside">
          <Eyebrow n="10">FAQ</Eyebrow>
          <h2 className="cz-h2">Questions, answered. Mostly.</h2>
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

const STACKS = ["Claude Agent SDK", "OpenAI Agents SDK", "LangGraph", "CrewAI", "AutoGen", "Our own", "Not sure yet"];
const EMPTY = { teamName: "", captainName: "", email: "", phone: "", organisation: "", teamSize: "", chairName: "", stack: [] };

function RegisterForm({ navigate }) {
  const [data, setData] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const update = (key, value) => {
    setData((d) => ({ ...d, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: "" }));
  };
  const toggleStack = (s) =>
    setData((d) => ({ ...d, stack: d.stack.includes(s) ? d.stack.filter((x) => x !== s) : [...d.stack, s] }));

  const validate = () => {
    const errs = {};
    if (!data.teamName.trim()) errs.teamName = "Your team needs a name";
    if (!data.captainName.trim()) errs.captainName = "Required";
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(data.email.trim())) errs.email = "Enter a valid email";
    if (data.phone.replace(/\D/g, "").length < 9) errs.phone = "Enter a valid phone number";
    if (!data.organisation.trim()) errs.organisation = "Required";
    if (!data.teamSize) errs.teamSize = "Pick a team size";
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
      teamName: data.teamName.trim(),
      captainName: data.captainName.trim(),
      email: data.email.trim(),
      phone: data.phone.trim(),
      organisation: data.organisation.trim(),
      teamSize: data.teamSize,
      chairName: data.chairName.trim(),
      stack: data.stack.join(", "),
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

  const field = (key, label, props = {}) => (
    <div className={"cz-field" + (errors[key] ? " has-error" : "")}>
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

  return (
    <form className="cz-form" noValidate onSubmit={handleSubmit}>
      <h3>Put your team forward</h3>
      <p className="cz-form-sub">Two minutes. We'll email your captain when the brief drops.</p>

      <div className="cz-form-grid">
        {field("teamName", "Team name", { placeholder: "e.g. Null Pointers", autoComplete: "off" })}
        {field("organisation", "University, company or community", { placeholder: "e.g. Wits, or Acme (Pty) Ltd", autoComplete: "organization" })}
        {field("captainName", "Team captain", { placeholder: "Full name", autoComplete: "name" })}
        {field("email", "Captain's email", { type: "email", placeholder: "you@example.com", autoComplete: "email" })}
        {field("phone", "Captain's phone", { type: "tel", placeholder: "082 123 4567", autoComplete: "tel" })}

        <fieldset className={"cz-field cz-size" + (errors.teamSize ? " has-error" : "")}>
          <legend>Team size</legend>
          <div className="cz-size-row">
            {["2", "3", "4", "5"].map((n, i) => (
              <label key={n} className={"cz-size-opt" + (data.teamSize === n ? " is-on" : "")}>
                <input
                  type="radio" name="teamSize" value={n}
                  id={i === 0 ? "cz-teamSize" : undefined}
                  checked={data.teamSize === n}
                  onChange={() => update("teamSize", n)}
                  disabled={submitting}
                />
                {n}
              </label>
            ))}
          </div>
          {errors.teamSize && <span className="cz-field-err">{errors.teamSize}</span>}
        </fieldset>
      </div>

      {field("chairName", "Who sits in the chair? (optional)", { placeholder: "The human who answers escalations", autoComplete: "off" })}

      <fieldset className="cz-field cz-stack">
        <legend>What will you build with? <span>(optional, pick any)</span></legend>
        <div className="cz-chips">
          {STACKS.map((s) => (
            <button
              type="button" key={s}
              className={"cz-chip" + (data.stack.includes(s) ? " is-on" : "")}
              aria-pressed={data.stack.includes(s)}
              onClick={() => toggleStack(s)}
              disabled={submitting}
            >
              {data.stack.includes(s) && <Icon name="check" size={14} strokeWidth={2.6} />}
              {s}
            </button>
          ))}
        </div>
      </fieldset>

      {submitError && <div className="cz-form-error" role="alert">{submitError}</div>}

      <button type="submit" className="cz-btn cz-btn--maroon cz-btn--block" disabled={submitting}>
        {submitting ? "Submitting your application…" : "Submit application"}
        {!submitting && <Icon name="arrow-right" size={18} />}
      </button>
      <p className="cz-form-fine">
        We use these details only to run the hackathon and contact your team about it. See our{" "}
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
          <Eyebrow n="09">Now hiring · 1 position</Eyebrow>
          <h2 className="cz-vacancy-title">Colleague Zero.</h2>
          <p className="cz-lede">
            The first hire at our academy who isn't a person. Put your team forward and we'll tell
            you everything else when the brief drops.
          </p>
          <dl>
            <div><dt>Reports to</dt><dd>The Main</dd></div>
            <div><dt>Probation</dt><dd>One day, on the big screen</dd></div>
            <div><dt>Support</dt><dd>One human, five lifelines</dd></div>
            <div><dt>When</dt><dd>{EVENT.date || "Announcing soon"}</dd></div>
            <div><dt>Outcome</dt><dd>Hired, or not hired</dd></div>
          </dl>
        </div>
        <RegisterForm navigate={navigate} />
      </div>
    </section>
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
              Build the first hire at our academy who isn't a person. Then watch it work, live,
              in front of everyone.
            </p>
            <div className="cz-hero-cta">
              <a href="#register" className="cz-btn cz-btn--primary" onClick={goRegister}>
                Register your team <Icon name="arrow-right" size={18} />
              </a>
              <a href="#the-main" className="cz-btn cz-btn--secondary" onClick={scrollToId("the-main")}>
                Take a look inside
              </a>
            </div>
            <dl className="cz-hero-facts">
              <div><dt>Verdict</dt><dd>Hired <i>or</i> Not hired</dd></div>
              <div><dt>Lifelines</dt><dd>5</dd></div>
              <div><dt>Date</dt><dd>{EVENT.date || "Announcing soon"}</dd></div>
            </dl>
          </div>
          <div className="cz-hero-stage">
            <ColleagueZeroCampus />
          </div>
        </div>
      </section>

      <div className="cz-ticker" aria-hidden="true">
        <div className="cz-ticker-track">
          {[0, 1].map((k) => (
            <span key={k}>
              read_inbox() <b>·</b> lookup_student() <b>·</b> check_timetable() <b>·</b> book_room() <b>·</b>{" "}
              send_message() <b>·</b> submit_plan() <b>·</b> escalate() <b>·</b> Hired <b>·</b> Not hired <b>·</b>{" "}
            </span>
          ))}
        </div>
      </div>

      <Manifesto />
      <TheMain />
      <Dossier />
      <Lifelines />
      <Twist />
      <Broadcast />
      <Rules />
      <Leo />
      <Register navigate={navigate} />
      <Faq />

      <section className="cz-closer">
        <div className="cz-wrap">
          <p>Build a colleague. Drop it into the Main. See how far it gets.</p>
          <a href="#register" className="cz-btn cz-btn--white cz-btn--sm" onClick={goRegister}>
            Register your team <Icon name="arrow-right" size={18} />
          </a>
        </div>
      </section>

      <CzFooter navigate={navigate} />
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
    { t: "Application received", v: "Your team is on the list.", done: true },
    { t: "The brief lands", v: reg ? `Sent to ${reg.email}, with MCP access details.` : "Sent to your captain, with MCP access details." },
    { t: "Build", v: "Cooperating agents that reason, check their work and know when to ask." },
    { t: "Day one in the Main", v: EVENT.date ? `${EVENT.date}${EVENT.venue ? `, ${EVENT.venue}` : ""}.` : "Date and venue announced to registered teams first." },
    { t: "The verdict", v: "Hired, or not hired." },
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
              Application received
            </p>
            <h1>
              {reg?.teamName ? <>{reg.teamName}, you're on the <span className="cz-h1-accent">shortlist.</span></> : <>You're on the <span className="cz-h1-accent">shortlist.</span></>}
            </h1>
            <p className="cz-hero-lede">
              Your agent's first day hasn't started yet. Keep an eye on your inbox. Unlike the
              emails your agent will face, ours will make sense the first time.
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
              <div><dt>Headcount</dt><dd>{reg?.teamSize ? `${reg.teamSize} humans + 1 agent` : "—"}</dd></div>
              <div><dt>Status</dt><dd><span className="cz-verdict is-pending">Pending · day one</span></dd></div>
            </dl>
            <div className="cz-badge-lives" aria-label="Five lifelines, all unused">
              {[0, 1, 2, 3, 4].map((i) => <span key={i} />)}
              <em className="cz-mono">5 lifelines · unused</em>
            </div>
          </div>
        </div>
      </section>

      <section className="cz-section">
        <div className="cz-wrap">
          <Eyebrow n="→">What happens next</Eyebrow>
          <h2 className="cz-h2">From shortlist to verdict.</h2>
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
