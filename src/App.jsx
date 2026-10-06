import { lazy, Suspense, useCallback, useEffect, useState } from "react";

/* A two-route stand-in for the Melsoft site's App.jsx router. The page files
   in src/pages and src/components are byte-for-byte copies from
   melsoft-website, so they still call navigate() with the paths they use
   there:

     /colleague-zero             → the landing page (also served at /)
     /colleague-zero/registered  → the confirmation page (also /registered)

   Any other path the page links to (the Melsoft home page, the privacy
   policy) belongs to the main site, so navigate() sends the visitor there. */

const MAIN_SITE = "https://www.melsoftacademy.com";

const ColleagueZeroPage = lazy(() => import("./pages/ColleagueZeroPage"));
const ColleagueZeroRegisteredPage = lazy(() =>
  import("./pages/ColleagueZeroPage").then((m) => ({ default: m.ColleagueZeroRegisteredPage })),
);

const LANDING = ["/", "/colleague-zero"];
const REGISTERED = ["/registered", "/colleague-zero/registered"];

const currentPath = () => {
  const p = window.location.pathname || "/";
  return p.length > 1 ? p.replace(/\/+$/, "") || "/" : p;
};

export default function App() {
  const [path, setPath] = useState(currentPath);

  useEffect(() => {
    const onPop = () => {
      setPath(currentPath());
      window.scrollTo({ top: 0, behavior: "instant" });
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const navigate = useCallback((to) => {
    if (!to) return;
    if (!LANDING.includes(to) && !REGISTERED.includes(to)) {
      window.location.href = MAIN_SITE + to;
      return;
    }
    if (to === path) { window.scrollTo({ top: 0, behavior: "smooth" }); return; }
    window.history.pushState({}, "", to);
    setPath(to);
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [path]);

  // The page's own logo link calls navigate("/") to mean "Melsoft home".
  // Here "/" is also the landing page, so that one call goes to the main site.
  const pageNavigate = useCallback((to) => (to === "/" ? (window.location.href = MAIN_SITE + "/") : navigate(to)), [navigate]);

  const Page = REGISTERED.includes(path) ? ColleagueZeroRegisteredPage : ColleagueZeroPage;

  return (
    <Suspense fallback={<main style={{ minHeight: "100vh" }} />}>
      <Page navigate={pageNavigate} />
    </Suspense>
  );
}
