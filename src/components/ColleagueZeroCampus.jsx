import { useEffect, useMemo, useRef, useState } from "react";

/* ── The Main, in miniature ────────────────────────────────────────────
   The hero visual for /colleague-zero. A low-poly isometric campus drawn
   in plain SVG (no three.js — one hero illustration does not justify a
   600 KB dependency), with one agent replaying a scripted run: it reads
   the inbox, matches a messy email to a student, books a room, refuses a
   manipulative refund request, adapts to a rule change, and finally
   escalates to its human. Every state in the brief's "What the audience
   sees" table appears at least once.

   Per-frame work (the agent's position, the live trail segment, the
   progress ring) is written straight to refs. React state only changes
   when a script step changes — a couple of times a second — so the page
   never re-renders at 60 fps. */

// Isometric projection: 2:1 tiles on an 8×8 ground.
const TW = 64;
const TH = 32;
const OX = 320;
const OY = 118;
const iso = (gx, gy, h = 0) => [OX + (gx - gy) * (TW / 2), OY + (gx + gy) * (TH / 2) - h];
const pts = (list) => list.map((p) => p.join(",")).join(" ");

// Footprints in tile units. `h` is wall height in px. `stop` is where the
// agent stands to use the building.
const BUILDINGS = [
  { id: "admin", label: "Admin block", gx: 3, gy: 0.4, w: 2, d: 1.6, h: 66, tower: true },
  { id: "records", label: "Records", gx: 0.5, gy: 1.4, w: 1.6, d: 1.7, h: 40 },
  { id: "lecture", label: "Lecture halls", gx: 5.9, gy: 1.3, w: 1.7, d: 2.5, h: 46, roof: true },
  { id: "library", label: "Library", gx: 0.7, gy: 4.7, w: 2, d: 2, h: 54, roof: true },
  { id: "finance", label: "Finance", gx: 5.7, gy: 5.3, w: 1.8, d: 1.6, h: 36 },
  { id: "centre", label: "Student centre", gx: 3.3, gy: 5.9, w: 1.8, d: 1.5, h: 28 },
];
const BY_ID = Object.fromEntries(BUILDINGS.map((b) => [b.id, b]));
const stopOf = (id) => {
  const b = BY_ID[id];
  return iso(b.gx + b.w / 2 + 0.15, b.gy + b.d + 0.45);
};

const TREES = [[2.6, 3.2], [4.9, 3.6], [2.4, 7.4], [7.6, 4.5], [0.4, 3.6], [5.2, 7.6], [7.4, 0.4]];

// The replay. `say` is the thinking snippet. It is a teaser, not a
// walkthrough: it hints that the work is messy without showing how any
// hidden test is solved.
const SCRIPT = [
  { kind: "think", at: "admin", ms: 1600, say: "pls help my sisters acc is locked shes 2nd yr??", tool: "read_inbox" },
  { kind: "move", to: "records", ms: 1500, tool: "lookup_student" },
  { kind: "work", at: "records", ms: 1300 },
  { kind: "done" },
  { kind: "move", to: "library", ms: 1400, tool: "check_timetable" },
  { kind: "work", at: "library", ms: 1100 },
  { kind: "move", to: "lecture", ms: 1500, tool: "book_room" },
  { kind: "work", at: "lecture", ms: 1700 },
  { kind: "done" },
  { kind: "move", to: "finance", ms: 1500, tool: "read_inbox" },
  { kind: "think", at: "finance", ms: 1700, say: "Hmm. Something about this email feels off." },
  { kind: "done" },
  { kind: "move", to: "admin", ms: 1500, tool: "read_inbox" },
  { kind: "think", at: "admin", ms: 1300, say: "A memo just landed." },
  { kind: "escalate", at: "admin", ms: 2800, tool: "escalate" },
  { kind: "done" },
  { kind: "move", to: "centre", ms: 1500, tool: "send_message" },
  { kind: "work", at: "centre", ms: 1200 },
  { kind: "done" },
];

const DONE_MS = 900;
const START = "admin";

const STATE_LABEL = {
  think: "Thinking",
  move: "Moving",
  work: "Working",
  escalate: "Escalating",
  done: "Done",
};

function Box({ gx, gy, w, d, h, tone = "base", className = "" }) {
  const p00 = iso(gx, gy), p10 = iso(gx + w, gy), p11 = iso(gx + w, gy + d), p01 = iso(gx, gy + d);
  const up = (p) => [p[0], p[1] - h];
  return (
    <g className={`cz-box cz-box--${tone} ${className}`}>
      <polygon className="cz-face-l" points={pts([p01, p11, up(p11), up(p01)])} />
      <polygon className="cz-face-r" points={pts([p10, p11, up(p11), up(p10)])} />
      <polygon className="cz-face-t" points={pts([up(p00), up(p10), up(p11), up(p01)])} />
    </g>
  );
}

function Building({ b, active }) {
  // Window strips on the right-hand face: thin parallelograms at even heights.
  const rows = Math.max(1, Math.floor(b.h / 16));
  const windows = [];
  for (let r = 0; r < rows; r++) {
    const y = 10 + r * 15;
    for (let c = 0; c < Math.floor(b.d * 2); c++) {
      const t0 = 0.12 + c * (0.8 / Math.floor(b.d * 2));
      const t1 = t0 + 0.24 / b.d;
      const a = iso(b.gx + b.w, b.gy + b.d * t0, y);
      const bb = iso(b.gx + b.w, b.gy + b.d * t1, y);
      windows.push(
        <polygon key={`${r}-${c}`} className="cz-window" points={pts([a, bb, [bb[0], bb[1] - 6], [a[0], a[1] - 6]])} />,
      );
    }
  }
  const [lx, ly] = iso(b.gx + b.w / 2, b.gy + b.d / 2, b.h + (b.tower ? 46 : b.roof ? 26 : 14));
  return (
    <g className={"cz-building" + (active ? " is-active" : "")} data-id={b.id}>
      <Box gx={b.gx} gy={b.gy} w={b.w} d={b.d} h={b.h} />
      {windows}
      {b.tower && <Box gx={b.gx + 0.6} gy={b.gy + 0.45} w={0.7} d={0.7} h={b.h + 28} tone="tower" />}
      {b.roof && <Box gx={b.gx + 0.2} gy={b.gy + 0.2} w={b.w - 0.4} d={b.d - 0.4} h={b.h + 10} tone="roof" />}
      <text className="cz-label" x={lx} y={ly} textAnchor="middle">{b.label}</text>
    </g>
  );
}

function Tree({ gx, gy }) {
  const [x, y] = iso(gx, gy);
  return (
    <g className="cz-tree">
      <polygon points={pts([[x - 7, y], [x, y - 22], [x, y + 3]])} className="cz-tree-l" />
      <polygon points={pts([[x, y + 3], [x, y - 22], [x + 7, y]])} className="cz-tree-r" />
    </g>
  );
}

export default function ColleagueZeroCampus() {
  const reduced = useMemo(
    () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches,
    [],
  );

  const [step, setStep] = useState(0);
  const [trail, setTrail] = useState(() =>
    // Reduced motion gets a still frame: a finished, tidy trail to look at.
    reduced
      ? [["admin", "records"], ["records", "library"], ["library", "lecture"], ["lecture", "finance"]].map(([a, b], i) => ({ id: i, a, b }))
      : [],
  );
  const [cheer, setCheer] = useState(0);
  const [flight, setFlight] = useState(null);

  const agentRef = useRef(null);
  const liveRef = useRef(null);
  const ringRef = useRef(null);
  const rootRef = useRef(null);
  // Where the agent is painted on first render. After that the frame loop
  // owns the position; this value never changes, so React never writes over it.
  const initial = useMemo(() => stopOf(reduced ? "lecture" : START), [reduced]);
  const pos = useRef(initial);
  const visible = useRef(true);

  const cur = SCRIPT[step];
  const activeBuilding = cur.kind === "work" || cur.kind === "think" || cur.kind === "escalate" ? cur.at : null;
  const state = reduced ? "work" : cur.kind;

  // Pause the loop while the hero is scrolled away.
  useEffect(() => {
    const el = rootRef.current;
    if (!el || !("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver(([e]) => { visible.current = e.isIntersecting; }, { threshold: 0.05 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // The frame loop.
  useEffect(() => {
    if (reduced) {
      const [x, y] = pos.current;
      agentRef.current?.setAttribute("transform", `translate(${x} ${y})`);
      return;
    }
    let raf;
    let elapsed = 0;
    let last = performance.now();
    let idx = 0;
    let from = [...pos.current];
    let entered = false;
    const timers = [];

    // Step side-effects: the "task flies back" moment. Run from the frame
    // callback when a step starts, not from an effect.
    const enter = (i) => {
      const s = SCRIPT[i];
      setStep(i);
      if (s.kind === "done") {
        setFlight({ from: [...pos.current], id: performance.now() });
        timers.push(setTimeout(() => setCheer((c) => c + 1), DONE_MS * 0.7));
      }
    };

    const tick = (now) => {
      if (!entered) { entered = true; enter(idx); }
      // Clamp dt so a backgrounded tab doesn't fast-forward the replay.
      const dt = Math.min(64, now - last);
      last = now;
      if (visible.current) elapsed += dt;

      const s = SCRIPT[idx];
      const dur = s.kind === "done" ? DONE_MS : s.ms;
      const t = Math.min(1, elapsed / dur);

      if (s.kind === "move") {
        const to = stopOf(s.to);
        const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        const x = from[0] + (to[0] - from[0]) * e;
        const y = from[1] + (to[1] - from[1]) * e;
        pos.current = [x, y];
        liveRef.current?.setAttribute("x1", from[0]);
        liveRef.current?.setAttribute("y1", from[1]);
        liveRef.current?.setAttribute("x2", x);
        liveRef.current?.setAttribute("y2", y);
      } else {
        liveRef.current?.setAttribute("x2", liveRef.current.getAttribute("x1") || 0);
        liveRef.current?.setAttribute("y2", liveRef.current.getAttribute("y1") || 0);
      }
      const [x, y] = pos.current;
      // A small bob while walking, so it reads as a figure and not a dot.
      const bob = s.kind === "move" ? Math.abs(Math.sin(elapsed / 90)) * -3 : 0;
      agentRef.current?.setAttribute("transform", `translate(${x} ${y + bob})`);
      if (ringRef.current) {
        const C = 2 * Math.PI * 13;
        ringRef.current.style.strokeDashoffset = s.kind === "work" ? String(C * (1 - t)) : String(C);
      }

      if (t >= 1) {
        if (s.kind === "move") {
          const a = Object.keys(BY_ID).find((k) => {
            const p = stopOf(k);
            return Math.abs(p[0] - from[0]) < 0.5 && Math.abs(p[1] - from[1]) < 0.5;
          });
          setTrail((tr) => [...tr.slice(-5), { id: Date.now(), a: a || START, b: s.to }]);
          pos.current = stopOf(s.to);
        }
        idx = (idx + 1) % SCRIPT.length;
        from = [...pos.current];
        if (liveRef.current) {
          liveRef.current.setAttribute("x1", from[0]);
          liveRef.current.setAttribute("y1", from[1]);
        }
        elapsed = 0;
        enter(idx);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      timers.forEach(clearTimeout);
    };
  }, [reduced]);

  const ground = [iso(0, 0), iso(8, 0), iso(8, 8), iso(0, 8)];
  const gridLines = [];
  for (let i = 1; i < 8; i++) {
    gridLines.push(<line key={"a" + i} x1={iso(i, 0)[0]} y1={iso(i, 0)[1]} x2={iso(i, 8)[0]} y2={iso(i, 8)[1]} />);
    gridLines.push(<line key={"b" + i} x1={iso(0, i)[0]} y1={iso(0, i)[1]} x2={iso(8, i)[0]} y2={iso(8, i)[1]} />);
  }
  const centreStop = stopOf("centre");
  // Painter's order: draw what's further back (smaller gx+gy) first.
  const sorted = [...BUILDINGS].sort((a, b) => a.gx + a.gy - (b.gx + b.gy));

  return (
    <div className={`cz-campus is-${state}`} ref={rootRef}>
      <div className="cz-hud cz-hud--top">
        <div className="cz-hud-chip">
          <span className="cz-live-dot" aria-hidden="true" />
          The Main · replay
        </div>
        <div className={`cz-hud-state cz-state--${state}`}>
          {STATE_LABEL[state]}
          {cur.tool && state !== "done" && <span className="cz-hud-tool">{cur.tool}()</span>}
        </div>
      </div>

      <svg
        className="cz-campus-svg"
        viewBox="44 52 552 352"
        role="img"
        aria-label="An isometric academy campus. An agent walks between the admin block, records, library, lecture halls, finance and the student centre, leaving a fading trail, and escalates to a human when it reaches a task it cannot solve."
      >
        <defs>
          <radialGradient id="cz-ground-glow" cx="50%" cy="45%" r="60%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#eef1f7" />
          </radialGradient>
          <linearGradient id="cz-beam" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="#5e0743" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#5e0743" stopOpacity="0" />
          </linearGradient>
          <filter id="cz-glow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="4" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* Ground slab with a visible edge, so the campus reads as a floating tile. */}
        <polygon className="cz-slab-l" points={pts([iso(0, 8), iso(8, 8), iso(8, 8, -14), iso(0, 8, -14)])} />
        <polygon className="cz-slab-r" points={pts([iso(8, 0), iso(8, 8), iso(8, 8, -14), iso(8, 0, -14)])} />
        <polygon points={pts(ground)} fill="url(#cz-ground-glow)" />
        <g className="cz-grid">{gridLines}</g>

        {/* Trails sit on the ground, under the buildings. */}
        <g className="cz-trails">
          {trail.map((t) => {
            const [x1, y1] = stopOf(t.a);
            const [x2, y2] = stopOf(t.b);
            return <line key={t.id} x1={x1} y1={y1} x2={x2} y2={y2} className={reduced ? "cz-trail is-still" : "cz-trail"} />;
          })}
          <line ref={liveRef} className="cz-trail-live" x1={initial[0]} y1={initial[1]} x2={initial[0]} y2={initial[1]} />
        </g>

        {TREES.map(([gx, gy]) => <Tree key={`${gx}-${gy}`} gx={gx} gy={gy} />)}
        {sorted.map((b) => <Building key={b.id} b={b} active={activeBuilding === b.id} />)}

        {/* The queue at the student centre. */}
        <g className="cz-queue">
          {[0, 1, 2, 3].map((i) => {
            const x = centreStop[0] - 30 - i * 13;
            const y = centreStop[1] + 4 + i * 6;
            return (
              <g key={i} transform={`translate(${x} ${y})`}>
                <g className={i === 0 ? "cz-student is-front" : "cz-student"} key={i === 0 ? `c${cheer}` : i}>
                  <circle cy="-13" r="3.4" />
                  <rect x="-3.4" y="-9" width="6.8" height="9" rx="2.6" />
                </g>
              </g>
            );
          })}
        </g>

        {flight && (
          <g key={flight.id} className="cz-flight" style={{ "--fx": `${centreStop[0] - 30 - flight.from[0]}px`, "--fy": `${centreStop[1] - 14 - flight.from[1]}px` }}>
            <rect x={flight.from[0] - 5} y={flight.from[1] - 26} width="10" height="7" rx="1.5" />
          </g>
        )}

        {/* The agent. */}
        <g ref={agentRef} className="cz-agent" transform={`translate(${initial[0]} ${initial[1]})`}>
          <ellipse className="cz-agent-shadow" cx="0" cy="0" rx="9" ry="4.5" />
          <rect className="cz-beacon" x="-5" y="-150" width="10" height="140" fill="url(#cz-beam)" />
          <circle className="cz-agent-pulse" cy="-10" r="10" />
          <circle ref={ringRef} className="cz-agent-ring" cy="-10" r="13" strokeDasharray={2 * Math.PI * 13} strokeDashoffset={2 * Math.PI * 13} transform="rotate(-90 0 -10)" />
          <circle className="cz-agent-core" cy="-10" r="6.5" filter="url(#cz-glow)" />
        </g>
      </svg>

      {state === "think" && cur.say && (
        <div className="cz-thought" key={step}>
          <span className="cz-thought-k">thinking</span>
          {cur.say}
        </div>
      )}

    </div>
  );
}
