import { useEffect, useRef } from "react";
import { useCanHover, useReducedMotion } from "@/hooks/useQuality";

const INTERACTIVE = "a, button, [role='button'], input, textarea, select, summary, [data-cursor]";

/** Custom cursor: a dot that tracks the pointer and a ring that trails it and grows over interactive elements. */
export default function Cursor() {
  const canHover = useCanHover();
  const reduced = useReducedMotion();
  const enabled = canHover && !reduced;
  const dot = useRef<HTMLDivElement>(null);
  const ring = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!enabled) return;
    const html = document.documentElement;
    html.classList.add("has-cursor");

    let mx = -100, my = -100, rx = -100, ry = -100;
    let raf = 0;
    let shown = false;

    const onMove = (e: PointerEvent) => {
      mx = e.clientX;
      my = e.clientY;
      if (!shown) {
        shown = true;
        rx = mx;
        ry = my;
        dot.current?.style.setProperty("opacity", "1");
        ring.current?.style.setProperty("opacity", "1");
      }
      const hot = (e.target as Element | null)?.closest?.(INTERACTIVE);
      ring.current?.classList.toggle("is-hover", !!hot);
    };
    const onLeave = () => {
      shown = false;
      dot.current?.style.setProperty("opacity", "0");
      ring.current?.style.setProperty("opacity", "0");
    };

    const loop = () => {
      rx += (mx - rx) * 0.2;
      ry += (my - ry) * 0.2;
      if (dot.current) dot.current.style.transform = `translate3d(${mx}px, ${my}px, 0)`;
      if (ring.current) ring.current.style.transform = `translate3d(${rx}px, ${ry}px, 0)`;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    window.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    return () => {
      html.classList.remove("has-cursor");
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
    };
  }, [enabled]);

  if (!enabled) return null;
  return (
    <>
      <div ref={ring} className="cursor-ring" style={{ opacity: 0 }} aria-hidden />
      <div ref={dot} className="cursor-dot" style={{ opacity: 0 }} aria-hidden />
    </>
  );
}
