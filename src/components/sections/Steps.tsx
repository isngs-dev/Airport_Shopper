import { useEffect, useMemo, useRef, useState } from "react";
import { content, ui } from "@/content/copy";
import TickList from "@/components/ui/TickList";
import { Reveal } from "@/components/ui/Reveal";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { useIsDesktop, useReducedMotion } from "@/hooks/useQuality";

/** Deterministic barcode-ish bars so the stub looks like a real ticket. */
function Barcode({ seed }: { seed: number }) {
  const bars = useMemo(() => {
    let s = seed * 9301 + 49297;
    const out: { x: number; w: number }[] = [];
    let x = 0;
    while (x < 92) {
      s = (s * 9301 + 49297) % 233280;
      const w = 1 + Math.floor((s / 233280) * 3.4);
      out.push({ x, w });
      x += w + 1 + Math.floor((s / 233280) * 2.4);
    }
    return out;
  }, [seed]);
  return (
    <svg viewBox="0 0 92 38" className="h-9 w-full" aria-hidden preserveAspectRatio="none">
      {bars.map((b, i) => (
        <rect key={i} x={b.x} y="0" width={b.w} height="38" fill="#0a1128" />
      ))}
    </svg>
  );
}

function PlaneGlyph({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <path d="M32 6l5 20 21 10v5l-21-4-2 11 6 5v4l-9-2-9 2v-4l6-5-2-11-21 4v-5l21-10z" fill="currentColor" />
    </svg>
  );
}

type PassProps = { index: number; title: string; items: readonly string[]; active?: boolean };

function BoardingPass({ index, title, items, active }: PassProps) {
  const total = content.steps.passes.length;
  const phases = ui.pass.phase;
  return (
    <article
      data-pass
      aria-labelledby={`pass-${index}`}
      className="glass pass-shape relative flex w-full overflow-hidden will-change-transform [backface-visibility:hidden]"
    >
      {/* main body */}
      <div className="min-w-0 flex-1 p-5 sm:p-8">
        <div className="mono flex items-center justify-between gap-2 whitespace-nowrap text-[0.6rem] uppercase tracking-[0.14em] text-mute sm:text-[0.66rem] sm:tracking-[0.24em]">
          <span>{ui.pass.label}</span>
          <span>
            {ui.pass.step} {index + 1} {ui.pass.of} {total}
          </span>
        </div>

        {/* route strip: BEFORE - DURING - SUBMIT with this pass highlighted */}
        <div aria-hidden className="mono mt-5 flex items-center gap-2 text-[0.68rem] uppercase tracking-[0.2em]">
          {phases.map((p, i) => (
            <div key={p} className="flex flex-1 items-center gap-2 last:flex-none">
              <span className={i === index ? "text-amber" : "text-mute/60"}>{p}</span>
              {i < phases.length - 1 && (
                <span className="flex flex-1 items-center">
                  <span className="h-px flex-1 border-t border-dashed border-white/20" />
                  <PlaneGlyph className={`mx-1 h-3.5 w-3.5 rotate-90 ${i === index ? "text-amber" : "text-white/25"}`} />
                  <span className="h-px flex-1 border-t border-dashed border-white/20" />
                </span>
              )}
            </div>
          ))}
        </div>

        <h3 id={`pass-${index}`} className="mt-6 text-[clamp(1.6rem,3vw,2.2rem)]">
          {title}
        </h3>
        <TickList items={items} active={active} className="mt-6 space-y-3.5" itemClassName="text-[0.98rem] leading-snug text-paper/90 sm:text-base" />
      </div>

      {/* tear-off stub */}
      <div className="relative flex w-[64px] shrink-0 flex-col items-center justify-center gap-4 border-l-2 border-dashed border-white/20 bg-white/[0.04] p-3 sm:w-[132px] sm:justify-between sm:p-5">
        <div className="text-center">
          <div className="mono text-[0.6rem] uppercase tracking-[0.22em] text-mute">{ui.pass.step}</div>
          <div className="font-display text-4xl font-bold leading-none text-amber sm:text-6xl">{index + 1}</div>
        </div>
        <PlaneGlyph className="hidden h-7 w-7 text-sky sm:block" />
        <div className="hidden w-full rounded-md bg-paper p-1.5 sm:block">
          <Barcode seed={index + 3} />
        </div>
      </div>
    </article>
  );
}

export default function Steps() {
  const { steps } = content;
  const reduced = useReducedMotion();
  const pinned = useIsDesktop() && !reduced;

  const root = useRef<HTMLElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const railFill = useRef<HTMLSpanElement>(null);
  const railPlane = useRef<HTMLSpanElement>(null);
  const [current, setCurrent] = useState(0);

  // Desktop: pin the section and slide the three passes sideways; each pass turns face-on as it reaches the centre.
  useEffect(() => {
    if (!pinned) return;
    const trackEl = track.current;
    const rootEl = root.current;
    if (!trackEl || !rootEl) return;
    const passes = Array.from(trackEl.querySelectorAll<HTMLElement>("[data-pass]"));

    const distance = () => Math.max(0, trackEl.scrollWidth - window.innerWidth);

    const update = (progress: number) => {
      const x = -progress * distance();
      trackEl.style.transform = `translate3d(${x.toFixed(1)}px,0,0)`;
      const vw = window.innerWidth;
      let best = 0;
      let bestD = Infinity;
      passes.forEach((el, i) => {
        const cx = el.offsetLeft + el.offsetWidth / 2 + x;
        const d = (cx - vw / 2) / (vw * 0.5);
        const c = Math.max(-1.15, Math.min(1.15, d));
        const a = Math.abs(c);
        el.style.transform = `perspective(1500px) rotateY(${(-c * 62).toFixed(1)}deg) translateZ(${(-a * 180).toFixed(0)}px) scale(${(1 - a * 0.08).toFixed(3)})`;
        el.style.opacity = String(1 - Math.min(1, a) * 0.6);
        if (Math.abs(d) < bestD) {
          bestD = Math.abs(d);
          best = i;
        }
      });
      setCurrent((prev) => (prev === best ? prev : best));
      if (railFill.current) railFill.current.style.transform = `scaleX(${progress.toFixed(4)})`;
      if (railPlane.current) railPlane.current.style.left = `${(progress * 100).toFixed(2)}%`;
    };

    const st = ScrollTrigger.create({
      trigger: rootEl,
      start: "top top",
      end: () => `+=${Math.round(distance() * 1.15)}`,
      pin: true,
      anticipatePin: 1,
      invalidateOnRefresh: true,
      onUpdate: (self) => update(self.progress),
      onRefresh: (self) => update(self.progress),
    });
    update(st.progress);

    return () => {
      st.kill();
      trackEl.style.transform = "";
      passes.forEach((el) => {
        el.style.transform = "";
        el.style.opacity = "";
      });
    };
  }, [pinned]);

  // Mobile / tablet: vertical stack, each pass flips up into place as it enters.
  useEffect(() => {
    if (pinned || reduced) return;
    const trackEl = track.current;
    if (!trackEl) return;
    const passes = trackEl.querySelectorAll("[data-pass]");
    const tweens = Array.from(passes).map((el) =>
      gsap.from(el, {
        rotateX: -28,
        y: 50,
        autoAlpha: 0,
        transformPerspective: 1400,
        transformOrigin: "50% 100%",
        duration: 1,
        ease: "power3.out",
        scrollTrigger: { trigger: el, start: "top 88%", once: true },
      }),
    );
    return () => {
      tweens.forEach((t) => {
        t.scrollTrigger?.kill();
        t.kill();
      });
      gsap.set(passes, { clearProps: "all" });
    };
  }, [pinned, reduced]);

  return (
    <>
    <section
      id="steps"
      ref={root}
      tabIndex={-1}
      aria-labelledby="steps-h"
      className={`relative z-[2] outline-none ${pinned ? "flex h-screen flex-col justify-center overflow-hidden pt-20" : "py-24 sm:py-32"}`}
    >
      <div className="mx-auto w-full max-w-6xl px-5 sm:px-8">
        <Reveal>
          <p className="tag">{ui.tags.steps}</p>
          <h2 id="steps-h" className="mt-4 text-[clamp(2rem,4.6vw,3.7rem)]">
            <span className="text-gradient">{steps.heading}</span>
          </h2>
        </Reveal>

        {pinned && (
          <div aria-hidden className="mono mt-9 max-w-md">
            <div className="relative h-px bg-white/15">
              <span ref={railFill} className="absolute inset-0 origin-left scale-x-0 bg-gradient-to-r from-sky to-amber" />
              <span ref={railPlane} className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 text-amber" style={{ left: "0%" }}>
                <PlaneGlyph className="h-4 w-4 rotate-90 drop-shadow-[0_0_8px_#FFB703]" />
              </span>
            </div>
            <div className="mt-2 flex justify-between text-[0.62rem] uppercase tracking-[0.22em] text-mute">
              {ui.pass.phase.map((p) => (
                <span key={p}>{p}</span>
              ))}
            </div>
          </div>
        )}
      </div>

      {pinned ? (
        <div className="relative mt-8 w-full [perspective:1600px]">
          <div
            ref={track}
            className="flex w-max items-stretch gap-[5vw] will-change-transform [--pw:min(700px,64vw)] px-[calc((100vw-var(--pw))/2)]"
          >
            {steps.passes.map((p, i) => (
              <div key={p.title} className="w-[var(--pw)] shrink-0">
                <BoardingPass index={i} title={p.title} items={p.items} active={i <= current} />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div ref={track} className="mx-auto mt-10 grid w-full max-w-2xl grid-cols-1 gap-8 px-5 [perspective:1000px] sm:px-8">
          {steps.passes.map((p, i) => (
            <BoardingPass key={p.title} index={i} title={p.title} items={p.items} />
          ))}
        </div>
      )}

    </section>

    <div className="relative z-[2] px-5 pb-24 pt-10 text-center sm:px-8 md:pt-20">
      <Reveal className="mx-auto max-w-3xl">
        <p className="font-display text-[clamp(1.6rem,3.8vw,2.7rem)] font-bold leading-tight">
          <span className="text-gradient">{steps.closing}</span>
        </p>
      </Reveal>
    </div>
    </>
  );
}
