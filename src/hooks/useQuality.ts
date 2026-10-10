import { useSyncExternalStore } from "react";
import { detectQuality, QUALITY_SETTINGS, type Quality } from "@/lib/quality";

function subscribe(onChange: () => void) {
  const queries = [
    window.matchMedia("(prefers-reduced-motion: reduce)"),
    window.matchMedia("(pointer: coarse)"),
    window.matchMedia("(max-width: 767px)"),
  ];
  queries.forEach((q) => q.addEventListener("change", onChange));
  return () => queries.forEach((q) => q.removeEventListener("change", onChange));
}

export function useQuality(): Quality {
  return useSyncExternalStore(subscribe, detectQuality, () => "medium" as Quality);
}

export function useQualitySettings() {
  const quality = useQuality();
  return { quality, ...QUALITY_SETTINGS[quality] };
}

function mediaStore(query: string, server: boolean) {
  return {
    subscribe: (onChange: () => void) => {
      const q = window.matchMedia(query);
      q.addEventListener("change", onChange);
      return () => q.removeEventListener("change", onChange);
    },
    get: () => window.matchMedia(query).matches,
    server: () => server,
  };
}

const reducedStore = mediaStore("(prefers-reduced-motion: reduce)", false);
const hoverStore = mediaStore("(hover: hover) and (pointer: fine)", false);
const desktopStore = mediaStore("(min-width: 768px)", true);

export const useReducedMotion = () => useSyncExternalStore(reducedStore.subscribe, reducedStore.get, reducedStore.server);
/** true when the primary input can hover (mouse / trackpad). */
export const useCanHover = () => useSyncExternalStore(hoverStore.subscribe, hoverStore.get, hoverStore.server);
/** true at md and up: pinned horizontal scroll and the heavy layouts are enabled. */
export const useIsDesktop = () => useSyncExternalStore(desktopStore.subscribe, desktopStore.get, desktopStore.server);
