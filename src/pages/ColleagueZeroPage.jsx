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

   Everything below the hero follows the participant overview
   ("Colleague Zero: The Autonomous Agent Hackathon", 7 October 2026):
   the challenge, what a strong project does, example ideas, the two-day
   schedule and what teams present. */

// The hero's date. The full schedule is SCHEDULE, further down.
const EVENT = {
  dateShort: "13 November 2026", // hero facts row, where the weekday won't fit
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
          <div><dt>Hours</dt><dd>24</dd></div>
          <div><dt>Days</dt><dd>2</dd></div>
          <div><dt>Max team</dt><dd>5</dd></div>
          <div><dt>Agents</dt><dd>2+</dd></div>
        </dl>
      </div>
    </section>
  );
}

// The overview's own contrast: what this hackathon is not, then what it is.
const CONTRAST = [
  { name: "A chatbot", tease: "Waits for a question and answers it. Not what we're asking for." },
  { name: "An automation", tease: "Follows a fixed script. Not what we're asking for either." },
  { name: "A digital colleague", tease: "Is given a goal, plans the work, uses tools to do it, checks its own output, and fixes what's wrong." },
];

function Challenge() {
  return (
    <section className="cz-section cz-section--tight" id="the-main">
      <div className="cz-wrap cz-split">
        <div className="cz-split-aside">
          <Eyebrow n="02">The challenge</Eyebrow>
          <h2 className="cz-h2">Build a digital colleague.</h2>
          <p className="cz-lede">
            This is not a chatbot hackathon. Build a system of agents that carries out complex work
            from start to finish, without a person stepping in at every stage.
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
  ["Reasons.", "Breaks a goal into steps and decides what to do next, rather than following a fixed script."],
  ["Self-corrects.", "Reviews its own work, catches errors, and tries again."],
  ["Executes.", "Completes a multi-step workflow and produces a finished result, not a suggestion."],
  ["Collaborates.", "Uses more than one agent, each with a clear role, handing work to one another."],
  ["Serves education.", "Addresses a specific, real need in teaching, learning, or running an education programme."],
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
            Think about the work learners, facilitators and education teams do every day, and build
            the colleague who could take it on.
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
  { short: "a marking colleague.", t: "Marking.", v: "Assesses submissions against a rubric, writes feedback, and reviews its own marks for consistency." },
  { short: "a curriculum colleague.", t: "Curriculum.", v: "Drafts lesson plans, builds matching exercises, and checks them against learning outcomes." },
  { short: "a learner support colleague.", t: "Learner support.", v: "Spots learners falling behind, works out why, and prepares a personalised catch-up plan." },
  { short: "an admissions colleague.", t: "Admissions.", v: "Screens applications, requests missing information, and schedules interviews." },
  { short: "a career colleague.", t: "Careers.", v: "Matches graduates to roles, tailors their CVs, and prepares them for interviews." },
  { short: "something only you'd think of.", t: "Your own.", v: "These are examples only. Teams are free to choose their own EdTech problem." },
];

function Ideas() {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (prefersReducedMotion()) return;
    const t = setInterval(() => setI((n) => (n + 1) % IDEAS.length), 2800);
    return () => clearInterval(t);
  }, []);
  return (
    <section className="cz-section cz-twist" id="ideas">
      <div className="cz-wrap">
        <Eyebrow n="04">Ideas to get you started</Eyebrow>
        <h2 className="cz-twist-line">
          Your colleague could be{" "}
          <span className="cz-rotator">
            <span className="cz-sr">{IDEAS.map((d) => d.short).join(" Or ")}</span>
            {IDEAS.map((d, n) => (
              <span
                key={d.t}
                aria-hidden="true"
                className={n === i ? "is-on" : n === (i + IDEAS.length - 1) % IDEAS.length ? "is-out" : ""}
              >
                {d.short}
              </span>
            ))}
          </span>
        </h2>
        <ul className="cz-cams">
          {IDEAS.map((d) => <li key={d.t}><b>{d.t}</b> {d.v}</li>)}
        </ul>
      </div>
    </section>
  );
}

const SCHEDULE = [
  { day: "Fri 13 Nov", time: "11:00", t: "Hackathon starts", where: "Virtual" },
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
            Day one is fully virtual. Day two is in person at the Melsoft offices, 173 Oxford Road,
            Rosebank, where teams finish their projects and present them.
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
      </div>
    </section>
  );
}

/* The show: what a live demo looks like, using one of the example ideas.
   Each dot is an agent with its own role, moving work between stations.
   The marker and reviewer pass work back and forth: that loop is the
   self-correction teams are asked to show, not a sign of trouble. */
const STATIONS = [
  { x: 330, y: 70, w: 140, h: 70, t: "Submissions" },
  { x: 120, y: 105, w: 120, h: 70, t: "Rubric" },
  { x: 590, y: 110, w: 130, h: 80, t: "Marker" },
  { x: 90, y: 295, w: 140, h: 90, t: "Feedback" },
  { x: 520, y: 262, w: 130, h: 80, t: "Reviewer" },
  { x: 330, y: 340, w: 140, h: 70, t: "Learners" },
];
// Paths run between station doors.
const AGENTS = [
  { cls: "g1", dur: 9, d: "M400 150 L200 185 L400 150 L655 200 L400 150" },
  { cls: "g2", dur: 8, d: "M655 200 L585 262 L655 200 L585 262 L160 280 L655 200" },
  { cls: "g3", dur: 10, d: "M585 262 L655 200 L585 262 L655 200 L585 262" },
  { cls: "g4", dur: 11, d: "M160 280 L400 330 L160 280" },
];

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
            Presentations start at 12:00 on Saturday at the Melsoft offices. Every team runs a live
            demonstration of its digital colleague completing its workflow.
          </p>
        </div>

        <figure className="cz-screen">
          <span className="cz-screen-c tl" /><span className="cz-screen-c tr" />
          <span className="cz-screen-c bl" /><span className="cz-screen-c br" />
          <div className="cz-screen-top cz-mono">
            <span><i className="cz-live-dot" aria-hidden="true" /> Live · demo</span>
            <span>Example · a marking colleague</span>
          </div>
          <svg viewBox="0 0 800 450" role="img" aria-label="An example marking colleague at work: four agents move work between submissions, the rubric, the marker, the reviewer, feedback and learners. The marker and reviewer pass work back and forth until it's right.">
            {STATIONS.map((b) => (
              <g key={b.t}>
                <rect x={b.x} y={b.y} width={b.w} height={b.h} rx="10" className="cz-map-b" />
                <text x={b.x + 12} y={b.y + 22} className="cz-map-t">{b.t}</text>
              </g>
            ))}
            {AGENTS.map((g) => (
              <g key={g.cls} className={`cz-ghost ${g.cls}`} style={{ "--dur": `${g.dur}s` }}>
                <path d={g.d} pathLength="1" className="cz-ghost-trail" />
                <circle r="7" className="cz-ghost-dot">
                  <animateMotion dur={`${g.dur}s`} repeatCount="indefinite" path={g.d} />
                </circle>
              </g>
            ))}
          </svg>
          <ol className="cz-screen-board cz-mono" aria-label="Example agent log">
            <li><b>1</b> Planner <em>3 steps</em></li>
            <li><b>2</b> Marker <em>24 marked</em></li>
            <li><b>3</b> Reviewer <em>2 sent back</em></li>
          </ol>
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
    q: "Can we build a chatbot?",
    a: "No. A chatbot waits for a question and answers it, and a basic automation follows a fixed script. We're asking for a system of agents that is given a goal, plans the work, uses tools, checks its own output and fixes what's wrong.",
  },
  {
    q: "What problem should we solve?",
    a: "Any real problem in EdTech. Marking, curriculum, learner support, admissions and careers are examples to get you started. Teams are free to choose their own.",
  },
  {
    q: "How big is a team?",
    a: "Participants work in groups of up to five people. You can also register on your own.",
  },
  {
    q: "When and where?",
    a: "It starts online at 11:00 on Friday, 13 November 2026. On Saturday, 14 November, doors open at 09:00 at the Melsoft offices, 173 Oxford Road, Rosebank. Hacking ends at 11:00 and presentations start at 12:00.",
  },
  {
    q: "What do we present?",
    a: "The EdTech problem you chose and who it affects, a live demonstration of your digital colleague completing its workflow, how your agents reason, work together and correct their own mistakes, and what you would build next with more time.",
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
    if (!solo && !data.teamName.trim()) errs.teamName = "Your team needs a name";
    if (!data.captainName.trim()) errs.captainName = "Required";
    if (!data.organisation.trim()) errs.organisation = "Required";
    if (data.phone.replace(/\D/g, "").length < 9) errs.phone = "Enter a valid phone number";
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(data.email.trim())) errs.email = "Enter a valid email";
    if (!solo && !data.teamSize) errs.teamSize = "Pick a team size";
    if (!solo) {
      present.forEach((m) => {
        if (!m.name.trim()) errs["m" + m.id] = "Add their name, or remove them";
      });
    }
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
      inPerson: data.inPerson ? "Yes" : "No",
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

  const occupation = field("organisation", "Occupation", { placeholder: "e.g. Student, developer, analyst", autoComplete: "organization-title" });
  const phone = field("phone", solo ? "Your phone" : "Captain's phone", { type: "tel", placeholder: "082 123 4567", autoComplete: "tel" });

  return (
    <form className="cz-form" noValidate onSubmit={handleSubmit}>
      <h3>{solo ? "Put yourself forward" : "Put your team forward"}</h3>
      <p className="cz-form-sub">
        Two minutes. We'll email {solo ? "you" : "your captain"} with everything you need.
      </p>

      <fieldset className="cz-field cz-size cz-joining">
        <legend>Are you joining as an individual?</legend>
        <div className="cz-size-row cz-size-row--2">
          {[[false, "No, with a team"], [true, "Yes, on my own"]].map(([v, label]) => (
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
                  <legend>Team size</legend>
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

        <label className="cz-check">
          <input
            type="checkbox"
            checked={data.inPerson}
            onChange={(e) => update("inPerson", e.target.checked)}
            disabled={submitting}
          />
          <span className="cz-check-box" aria-hidden="true"><Icon name="check" size={14} strokeWidth={3} /></span>
          <span>
            {solo ? "I'll" : "We'll"} join day two in person
            <em>Sat 14 Nov, from 09:00 at the Melsoft offices, 173 Oxford Road, Rosebank. Day one is online for everyone.</em>
          </span>
        </label>
      </div>

      {submitError && <div className="cz-form-error" role="alert">{submitError}</div>}

      <button type="submit" className="cz-btn cz-btn--maroon cz-btn--block" disabled={submitting}>
        {submitting ? "Submitting your application…" : "Submit application"}
        {!submitting && <Icon name="arrow-right" size={18} />}
      </button>
      <p className="cz-form-fine">
        We use these details only to run the hackathon and contact {solo ? "you" : "your team"} about it. See our{" "}
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
          <p className="cz-lede">
            The first hire at our academy who isn't a person. Put your team forward, or join on
            your own, and build it with us over 24 hours.
          </p>
          <dl>
            <div><dt>Role</dt><dd>Digital colleague for education</dd></div>
            <div><dt>Team</dt><dd>Up to five people</dd></div>
            <div><dt>Day one</dt><dd>Online · Fri 13 Nov, 11:00</dd></div>
            <div><dt>Day two</dt><dd>Melsoft offices · Sat 14 Nov, 09:00</dd></div>
            <div><dt>Presentations</dt><dd>Sat 14 Nov, 12:00</dd></div>
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
              <div><dt>Date</dt><dd>{EVENT.dateShort || "Announcing soon"}</dd></div>
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
    { t: "Application received", v: reg?.email ? `We'll write to ${reg.email}.` : "You're on the list.", done: true },
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
              Application received
            </p>
            <h1>
              {reg?.teamName ? <>{reg.teamName}, you're on the <span className="cz-h1-accent">shortlist.</span></> : <>You're on the <span className="cz-h1-accent">shortlist.</span></>}
            </h1>
            <p className="cz-hero-lede">
              Your colleague's first day hasn't started yet. Keep an eye on your inbox: we'll be in
              touch before the hackathon starts at 11:00 on Friday, 13 November.
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
          <h2 className="cz-h2">From shortlist to presentation.</h2>
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
