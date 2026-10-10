import { useEffect, useRef } from "react";
import { useQualitySettings } from "@/hooks/useQuality";

type P = { x: number; y: number; r: number; vy: number; vx: number; tw: number; ph: number; c: string; depth: number };

/**
 * Page-wide floating particles on a single fixed 2D canvas: drifting dust in the
 * accent colours with a little scroll parallax. Fewer on phones, one still frame
 * for reduced motion, paused while the tab is hidden.
 */
export default function ParticlesCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);
  const { quality, particles } = useQualitySettings();

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || particles === 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = 0;
    let h = 0;
    const resize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const colors = ["255,183,3", "76,201,240", "238,242,250"];
    const list: P[] = Array.from({ length: particles }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      r: 0.6 + Math.random() * 1.7,
      vy: -(0.05 + Math.random() * 0.22),
      vx: (Math.random() - 0.5) * 0.08,
      tw: 0.4 + Math.random() * 1.2,
      ph: Math.random() * Math.PI * 2,
      c: colors[Math.floor(Math.random() * colors.length)],
      depth: 0.2 + Math.random() * 0.8,
    }));

    let raf = 0;
    let last = performance.now();
    let sy = window.scrollY;
    const draw = (t: number, dt: number, animate: boolean) => {
      ctx.clearRect(0, 0, w, h);
      for (const p of list) {
        if (animate) {
          p.y += p.vy * dt * 0.06;
          p.x += p.vx * dt * 0.06;
          if (p.y < -10) {
            p.y = h + 10;
            p.x = Math.random() * w;
          }
          if (p.x < -10) p.x = w + 10;
          if (p.x > w + 10) p.x = -10;
        }
        const par = ((sy * p.depth * 0.12) % (h + 20));
        const y = (((p.y - par) % (h + 20)) + (h + 20)) % (h + 20) - 10;
        const a = 0.25 + 0.45 * (0.5 + 0.5 * Math.sin(t * 0.001 * p.tw + p.ph));
        ctx.beginPath();
        ctx.fillStyle = `rgba(${p.c},${a.toFixed(3)})`;
        ctx.arc(p.x, y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    if (quality === "static") {
      draw(0, 0, false);
      window.addEventListener("resize", () => {
        resize();
        draw(0, 0, false);
      });
      return;
    }

    const loop = (now: number) => {
      const dt = Math.min(48, now - last);
      last = now;
      draw(now, dt, true);
      raf = requestAnimationFrame(loop);
    };
    const onScroll = () => {
      sy = window.scrollY;
    };
    const onVis = () => {
      cancelAnimationFrame(raf);
      if (!document.hidden) {
        last = performance.now();
        raf = requestAnimationFrame(loop);
      }
    };
    raf = requestAnimationFrame(loop);
    window.addEventListener("resize", resize);
    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("visibilitychange", onVis);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [particles, quality]);

  return <canvas ref={ref} aria-hidden className="pointer-events-none fixed inset-0 -z-[1] h-full w-full" />;
}
