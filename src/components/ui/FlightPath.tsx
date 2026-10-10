import { useEffect, useMemo, useRef, useState } from "react";
import { ScrollTrigger } from "@/lib/gsap";
import { useReducedMotion } from "@/hooks/useQuality";

type Pt = { x: number; y: number };

/** Winding path from the bottom of the hero to the final section: S-curves between the two page edges. */
function buildPath(w: number, h: number, vh: number) {
  if (!w || !h) return { d: "", pts: [] as Pt[] };
  const narrow = w < 768;
  const left = w * (narrow ? 0.07 : 0.06);
  const right = w * (narrow ? 0.93 : 0.94);
  const y0 = vh * 0.86;
  const yEnd = h - Math.min(vh * 0.28, 260);
  const legs = Math.max(4, Math.round((yEnd - y0) / (narrow ? 640 : 820)));
  const step = (yEnd - y0) / legs;

  const waypoints: Pt[] = [{ x: w * 0.5, y: y0 }];
  for (let i = 1; i <= legs; i++) waypoints.push({ x: i % 2 === 1 ? right : left, y: y0 + step * i });
  waypoints[waypoints.length - 1].x = w * 0.5;

  let d = `M ${waypoints[0].x.toFixed(1)} ${waypoints[0].y.toFixed(1)}`;
  for (let i = 1; i < waypoints.length; i++) {
    const a = waypoints[i - 1];
    const b = waypoints[i];
    const k = (b.y - a.y) * 0.5;
    d += ` C ${a.x.toFixed(1)} ${(a.y + k).toFixed(1)}, ${b.x.toFixed(1)} ${(b.y - k).toFixed(1)}, ${b.x.toFixed(1)} ${b.y.toFixed(1)}`;
  }
  return { d, yStart: y0, yEnd };
}

/**
 * Glowing dotted flight path that runs the full length of the page with a plane
 * that rides it as you scroll. The lit part of the line follows the plane.
 */
export default function FlightPath() {
  const reduced = useReducedMotion();
  const wrap = useRef<HTMLDivElement>(null);
  const pathEl = useRef<SVGPathElement>(null);
  const plane = useRef<SVGGElement>(null);
  const clip = useRef<SVGRectElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0, vh: 0 });
  const table = useRef<{ x: number; y: number; a: number }[]>([]);

  // measure the page (main) and follow its height as pinning / images change it
  useEffect(() => {
    const host = wrap.current?.parentElement;
    if (!host) return;
    let frame = 0;
    const measure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const w = host.clientWidth;
        const h = host.scrollHeight;
        const vh = window.innerHeight;
        setSize((s) => (Math.abs(s.w - w) < 2 && Math.abs(s.h - h) < 2 && Math.abs(s.vh - vh) < 60 ? s : { w, h, vh }));
      });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(host);
    ScrollTrigger.addEventListener("refresh", measure);
    window.addEventListener("load", measure);
    return () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
      ScrollTrigger.removeEventListener("refresh", measure);
      window.removeEventListener("load", measure);
    };
  }, []);

  const built = useMemo(() => buildPath(size.w, size.h, size.vh), [size]);

  // sample the path once per layout so scrolling is just a lookup
  useEffect(() => {
    const p = pathEl.current;
    if (!p || !built.d) return;
    const total = p.getTotalLength();
    const n = 420;
    const pts: { x: number; y: number; a: number }[] = [];
    for (let i = 0; i <= n; i++) {
      const pt = p.getPointAtLength((total * i) / n);
      const nx = p.getPointAtLength(Math.min(total, (total * (i + 1)) / n));
      const pv = p.getPointAtLength(Math.max(0, (total * (i - 1)) / n));
      const a = (Math.atan2(nx.y - pv.y, nx.x - pv.x) * 180) / Math.PI + 90;
      pts.push({ x: pt.x, y: pt.y, a });
    }
    table.current = pts;
  }, [built]);

  useEffect(() => {
    if (!built.d) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const pts = table.current;
      if (!pts.length) return;
      const target = window.scrollY + window.innerHeight * 0.62;
      let lo = 0;
      let hi = pts.length - 1;
      while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (pts[mid].y < target) lo = mid + 1;
        else hi = mid;
      }
      const p = pts[lo];
      const lit = reduced ? built.yEnd ?? 0 : p.y;
      clip.current?.setAttribute("height", String(Math.max(0, lit)));
      if (plane.current && !reduced) plane.current.setAttribute("transform", `translate(${p.x.toFixed(1)} ${p.y.toFixed(1)}) rotate(${p.a.toFixed(1)})`);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    // the lookup table is rebuilt in an effect that runs just before this one, but guard the first frame
    const kick = window.setTimeout(update, 120);
    return () => {
      window.clearTimeout(kick);
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [built, reduced]);

  return (
    <div ref={wrap} aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {built.d && (
        <svg width={size.w} height={size.h} viewBox={`0 0 ${size.w} ${size.h}`} className="absolute left-0 top-0 z-[1]">
          <defs>
            <clipPath id="fp-lit">
              <rect ref={clip} x="0" y="0" width={size.w} height="0" />
            </clipPath>
            <linearGradient id="fp-grad" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2={size.h}>
              <stop offset="0" stopColor="#4CC9F0" />
              <stop offset="0.55" stopColor="#FFB703" />
              <stop offset="1" stopColor="#FFB703" />
            </linearGradient>
          </defs>
          {/* unlit dotted route */}
          <path ref={pathEl} d={built.d} fill="none" stroke="#a9b6d3" strokeOpacity="0.2" strokeWidth="3" strokeLinecap="round" strokeDasharray="0.1 15" />
          {/* lit route: soft halo + bright dots, revealed up to the plane */}
          <g clipPath="url(#fp-lit)">
            <path d={built.d} fill="none" stroke="url(#fp-grad)" strokeOpacity="0.28" strokeWidth="11" strokeLinecap="round" strokeDasharray="0.1 15" />
            <path d={built.d} fill="none" stroke="url(#fp-grad)" strokeWidth="4" strokeLinecap="round" strokeDasharray="0.1 15" />
          </g>
        </svg>
      )}
      {built.d && (
        // the plane sits behind the content (like the dotted line) so it never covers text
        <svg width={size.w} height={size.h} viewBox={`0 0 ${size.w} ${size.h}`} className="absolute left-0 top-0 z-[1]">
          <g ref={plane} opacity={reduced ? 0 : 1}>
            <path
              d="M0 -15 L3.2 -4.5 L15 2 V5 L3.4 3.2 L2.2 10.5 L6.5 13.6 V15.6 L0 13.8 L-6.5 15.6 V13.6 L-2.2 10.5 L-3.4 3.2 L-15 5 V2 L-3.2 -4.5 Z"
              fill="#FFB703"
              stroke="#0A1128"
              strokeWidth="1.2"
              strokeLinejoin="round"
            />
          </g>
        </svg>
      )}
    </div>
  );
}
