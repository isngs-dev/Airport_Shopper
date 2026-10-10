import { motion, useScroll, useSpring } from "framer-motion";
import { ui } from "@/content/copy";
import { scrollToId } from "@/lib/scroll";

/** Sticky glass navigation with a scroll progress bar along its bottom edge. */
export default function Navbar() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 140, damping: 30, restDelta: 0.001 });

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <a
        href="#main"
        onClick={(e) => {
          e.preventDefault();
          scrollToId("main");
        }}
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:rounded-full focus:bg-amber focus:px-4 focus:py-2 focus:font-semibold focus:text-midnight"
      >
        {ui.nav.skip}
      </a>
      <div className="mx-auto mt-3 flex h-14 max-w-6xl items-center justify-between gap-3 rounded-full border border-white/10 bg-midnight/55 px-4 shadow-[0_10px_40px_-12px_rgba(0,0,0,0.7)] backdrop-blur-xl sm:px-6 [width:calc(100%-1.5rem)]">
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
          className="flex items-center gap-2.5 font-display text-sm font-bold tracking-wide"
          aria-label={`${ui.siteName}, back to top`}
        >
          {/* the logo is navy on transparent, so it sits on a light pill to stay readable on the dark bar */}
          <span className="flex items-center rounded-full bg-white px-3 py-1.5 shadow-[0_0_20px_-4px_rgba(255,255,255,0.35)]">
            <img src="/isn-logo.png" alt="" width="74" height="30" className="h-[26px] w-auto" />
          </span>
        </a>
        <nav aria-label={ui.nav.label}>
          <ul className="flex items-center gap-1 sm:gap-2">
            {ui.nav.links.map((l) => (
              <li key={l.id}>
                <a
                  href={`#${l.id}`}
                  onClick={(e) => {
                    e.preventDefault();
                    scrollToId(l.id);
                  }}
                  className="mono block whitespace-nowrap rounded-full px-1.5 py-2 text-[0.6rem] uppercase tracking-[0.08em] text-mute transition-colors hover:text-amber min-[430px]:px-2.5 min-[430px]:text-[0.66rem] min-[430px]:tracking-[0.16em] sm:px-3.5 sm:text-xs"
                >
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="pointer-events-none absolute inset-x-6 bottom-0 h-[2px] overflow-hidden rounded-full" aria-hidden>
          <motion.div className="h-full origin-left bg-gradient-to-r from-sky to-amber" style={{ scaleX }} />
        </div>
      </div>
    </header>
  );
}
