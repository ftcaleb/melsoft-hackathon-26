import { useEffect, useRef } from "react";
import { Bot, CrewDefs } from "./ColleagueZeroCrew";

/* ── Colleague Zero hero figure: the hire badge ─────────────────────────
   The page sells one open position, so the figure is that hire's staff
   badge, hanging on a lanyard. It sways from the clip like a pendulum and
   bobs; under the pointer it tilts towards it in 3D with a glare sliding
   across the face (pointer values eased in one rAF loop, written to CSS
   custom properties, so nothing re-renders). A second badge sits behind it
   for depth. Words are kept to three: name, role, dates. */

export default function ColleagueZeroBadge() {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const zone = el.closest(".cz-hero") || el;
    let raf = 0, tx = 0, ty = 0, x = 0, y = 0, gx = 50, gy = 30, tgx = 50, tgy = 30, live = false;
    const tick = () => {
      // Ease towards the target so the tilt feels weighted, not twitchy.
      x += (tx - x) * 0.09; y += (ty - y) * 0.09;
      gx += (tgx - gx) * 0.12; gy += (tgy - gy) * 0.12;
      el.style.setProperty("--rx", `${(-y * 9).toFixed(2)}deg`);
      el.style.setProperty("--ry", `${(x * 12).toFixed(2)}deg`);
      el.style.setProperty("--gx", `${gx.toFixed(1)}%`);
      el.style.setProperty("--gy", `${gy.toFixed(1)}%`);
      const still = Math.abs(tx - x) + Math.abs(ty - y) + Math.abs(tgx - gx) / 100 < 0.002;
      raf = still && !live ? 0 : requestAnimationFrame(tick);
    };
    const kick = () => { if (!raf) raf = requestAnimationFrame(tick); };
    const onMove = (e) => {
      const r = el.getBoundingClientRect();
      const nx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
      const ny = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
      tx = Math.max(-1, Math.min(1, nx)); ty = Math.max(-1, Math.min(1, ny));
      tgx = 50 + tx * 40; tgy = 30 + ty * 40;
      live = true; kick();
    };
    const onLeave = () => { tx = 0; ty = 0; tgx = 50; tgy = 30; live = false; kick(); };
    zone.addEventListener("pointermove", onMove, { passive: true });
    zone.addEventListener("pointerleave", onLeave);
    return () => {
      cancelAnimationFrame(raf);
      zone.removeEventListener("pointermove", onMove);
      zone.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return (
    <div className="cz-hire" ref={ref} role="img" aria-label="Colleague Zero's staff badge: a digital colleague, 13 to 14 November 2026.">
      {/* The lanyard: two straps meeting at the clip. */}
      <svg className="cz-hire-strap" viewBox="0 0 320 120" aria-hidden="true">
        <defs>
          <linearGradient id="czh-strap" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#4a0535" /><stop offset="0.5" stopColor="#7a1259" /><stop offset="1" stopColor="#4a0535" />
          </linearGradient>
        </defs>
        <path d="M96 -10 L152 112" />
        <path d="M224 -10 L168 112" />
      </svg>

      <div className="cz-hire-swing" aria-hidden="true">
        <span className="cz-hire-clip"><i /></span>
        {/* A second badge behind, for depth. */}
        <div className="cz-hire-card is-back" />
        <div className="cz-hire-card">
          <span className="cz-hire-slot" />
          <div className="cz-hire-top">
            <img src="/assets/logo-light.webp" alt="" width="70" height="30" />
            <span className="cz-hire-live"><i className="cz-live-dot" /></span>
          </div>
          <div className="cz-hire-portrait">
            <svg viewBox="2 10 60 60">
              <CrewDefs ids="czh" />
              <Bot X={32} Y={75} on ids="czh" />
            </svg>
          </div>
          <p className="cz-hire-name">Colleague Zero</p>
          <p className="cz-hire-role">Digital colleague</p>
          <div className="cz-hire-foot">
            <span>13–14 Nov 2026</span>
            <span className="cz-hire-code" />
          </div>
          <span className="cz-hire-glare" />
        </div>
      </div>
      <span className="cz-hire-shadow" aria-hidden="true" />
    </div>
  );
}
