import { useEffect, useRef } from "react";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { useReducedMotion } from "@/hooks/useQuality";

export function CheckMark({ size = 26 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="shrink-0 overflow-visible">
      <circle cx="12" cy="12" r="10.4" stroke="rgb(169 182 211 / 0.28)" strokeWidth="1.4" />
      <circle className="chk-ring" cx="12" cy="12" r="10.4" pathLength={1} stroke="#FFB703" strokeWidth="1.8" transform="rotate(-90 12 12)" />
      <path className="chk-tick" d="M7 12.8 L10.5 16.2 L17.2 8.4" pathLength={1} stroke="#4CC9F0" strokeWidth="2.4" />
    </svg>
  );
}

type Props = {
  items: readonly string[];
  /** Controlled mode: play while true, rewind while false. Omit to tick once when scrolled into view. */
  active?: boolean;
  className?: string;
  itemClassName?: string;
  /** Seconds between consecutive ticks. */
  gap?: number;
  size?: number;
};

/** List whose checkmarks draw themselves as SVG strokes, one after another. */
export default function TickList({ items, active, className = "", itemClassName = "", gap = 0.45, size = 26 }: Props) {
  const ref = useRef<HTMLUListElement>(null);
  const tl = useRef<gsap.core.Timeline | null>(null);
  const reduced = useReducedMotion();
  const controlled = active !== undefined;

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const rings = root.querySelectorAll(".chk-ring");
    const ticks = root.querySelectorAll(".chk-tick");
    const labels = root.querySelectorAll(".tick-label");

    if (reduced) {
      gsap.set([...rings, ...ticks], { strokeDashoffset: 0 });
      gsap.set(labels, { opacity: 1, x: 0 });
      return;
    }

    gsap.set([...rings, ...ticks], { strokeDashoffset: 1 });
    gsap.set(labels, { opacity: 0.5, x: -6 });

    const t = gsap.timeline({ paused: true });
    items.forEach((_, i) => {
      const at = i * gap;
      t.to(rings[i], { strokeDashoffset: 0, duration: 0.38, ease: "power2.out" }, at);
      t.to(ticks[i], { strokeDashoffset: 0, duration: 0.3, ease: "power2.out" }, at + 0.26);
      t.to(labels[i], { opacity: 1, x: 0, duration: 0.4, ease: "power2.out" }, at + 0.2);
    });
    tl.current = t;

    let st: ScrollTrigger | undefined;
    if (!controlled) st = ScrollTrigger.create({ trigger: root, start: "top 86%", once: true, onEnter: () => void t.play() });

    return () => {
      st?.kill();
      t.kill();
      tl.current = null;
    };
  }, [items, gap, reduced, controlled]);

  useEffect(() => {
    const t = tl.current;
    if (!t || !controlled) return;
    if (active) t.timeScale(1).play();
    else t.timeScale(2.4).reverse();
  }, [active, controlled]);

  return (
    <ul ref={ref} className={className}>
      {items.map((item) => (
        <li key={item} className={`flex items-start gap-3 ${itemClassName}`}>
          <span className="mt-[0.1em]">
            <CheckMark size={size} />
          </span>
          <span className="tick-label">{item}</span>
        </li>
      ))}
    </ul>
  );
}
