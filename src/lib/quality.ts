/**
 * Rendering tiers.
 *  - "static": reduced motion requested -> still frames, no animation
 *  - "low":    phones / data-saver / weak hardware -> fewer particles, DPR 1, no physics
 *  - "medium": tablets, small laptops
 *  - "high":   capable desktops
 */
export type Quality = "high" | "medium" | "low" | "static";

type NavigatorExtras = Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };

export function detectQuality(): Quality {
  if (typeof window === "undefined") return "medium";
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return "static";

  const nav = navigator as NavigatorExtras;
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const narrow = window.innerWidth < 768;
  const cores = nav.hardwareConcurrency ?? 8;
  const memory = nav.deviceMemory ?? 8;

  if (nav.connection?.saveData === true || memory <= 2 || cores <= 2) return "low";
  if (narrow || (coarse && window.innerWidth < 1024)) return "low";
  if (coarse || cores <= 4 || memory <= 4) return "medium";
  return "high";
}

export const QUALITY_SETTINGS = {
  high: { dpr: [1, 2] as [number, number], particles: 70, heroDust: 420, clouds: 26, globeArcs: 14, coins: 90, tickets: 40, runwayLights: 70 },
  medium: { dpr: [1, 1.5] as [number, number], particles: 42, heroDust: 240, clouds: 18, globeArcs: 10, coins: 52, tickets: 24, runwayLights: 52 },
  low: { dpr: [1, 1] as [number, number], particles: 18, heroDust: 90, clouds: 10, globeArcs: 7, coins: 0, tickets: 0, runwayLights: 36 },
  static: { dpr: [1, 1.5] as [number, number], particles: 0, heroDust: 160, clouds: 14, globeArcs: 10, coins: 0, tickets: 0, runwayLights: 52 },
} as const;
