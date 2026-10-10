/**
 * Window-level pointer, normalised to -1..1 around the viewport centre.
 * Canvases sit behind DOM content (pointer-events: none), so scenes read this
 * instead of R3F's canvas-bound events.
 */
export const pointer = { x: 0, y: 0 };

let attached = false;

export function attachPointer() {
  if (attached || typeof window === "undefined") return;
  attached = true;
  window.addEventListener(
    "pointermove",
    (e) => {
      pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.y = -((e.clientY / window.innerHeight) * 2 - 1);
    },
    { passive: true },
  );
}
