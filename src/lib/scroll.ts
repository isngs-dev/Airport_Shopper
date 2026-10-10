import type Lenis from "lenis";

/** Module-level handle on the Lenis instance so any component can trigger a smooth scroll. */
let instance: Lenis | null = null;

export function setLenis(lenis: Lenis | null) {
  instance = lenis;
}

export function getLenis() {
  return instance;
}

const NAV_OFFSET = -84;

export function scrollToId(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  if (instance) {
    instance.scrollTo(el, { offset: NAV_OFFSET, duration: 1.8, easing: (t: number) => 1 - Math.pow(1 - t, 4) });
  } else {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
  }
  el.focus({ preventScroll: true });
}
