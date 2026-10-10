import { Suspense, useEffect, useRef } from "react";
import { content, ui } from "@/content/copy";
import TickList from "@/components/ui/TickList";
import { ClipReveal, Reveal } from "@/components/ui/Reveal";
import { PaymentScene } from "@/components/three/lazy";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { useReducedMotion } from "@/hooks/useQuality";

/* ---------- animated "$15 Per Shop" counter ---------- */

function PriceCounter() {
  const { amount, suffix } = content.payment.highlight;
  const num = useRef<HTMLSpanElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const el = num.current;
    if (!el) return;
    if (reduced) {
      el.textContent = String(amount);
      return;
    }
    el.textContent = "0";
    const proxy = { v: 0 };
    const tween = gsap.to(proxy, {
      v: amount,
      duration: 1.8,
      ease: "power2.out",
      onUpdate: () => {
        el.textContent = String(Math.round(proxy.v));
      },
      scrollTrigger: { trigger: el, start: "top 88%", once: true },
    });
    return () => {
      tween.scrollTrigger?.kill();
      tween.kill();
      el.textContent = String(amount);
    };
  }, [amount, reduced]);

  return (
    <p className="font-display font-bold leading-none">
      <span className="sr-only">
        ${amount} {suffix}
      </span>
      <span aria-hidden className="text-gradient text-[clamp(3.2rem,8vw,6.2rem)]">
        $<span ref={num} className="inline-block min-w-[1.1ch] tabular-nums">{amount}</span>
        <span className="ml-3 text-[0.46em] tracking-tight text-paper">{suffix}</span>
      </span>
    </p>
  );
}

/* ---------- 48-hour ring ---------- */

const TICKS = 48;

function DeadlineRing({ hours }: { hours: number }) {
  const svg = useRef<SVGSVGElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const el = svg.current;
    if (!el) return;
    const arc = el.querySelector<SVGCircleElement>(".ring-arc")!;
    const head = el.querySelector<SVGGElement>(".ring-head")!;
    const num = el.querySelector<SVGTextElement>(".ring-num")!;
    const ticks = Array.from(el.querySelectorAll<SVGLineElement>(".ring-tick"));

    const apply = (p: number) => {
      arc.style.strokeDashoffset = String(1 - p);
      head.setAttribute("transform", `rotate(${(p * 360).toFixed(1)} 120 120)`);
      head.style.opacity = p > 0.003 && p < 0.999 ? "1" : "0";
      const lit = Math.round(p * hours);
      num.textContent = String(lit);
      ticks.forEach((t, i) => {
        t.style.opacity = i < lit ? "1" : "0.22";
      });
    };

    if (reduced) {
      apply(1);
      return;
    }
    apply(0);
    const st = ScrollTrigger.create({
      trigger: el,
      start: "top 85%",
      end: "bottom 45%",
      scrub: 0.6,
      onUpdate: (self) => apply(self.progress),
    });
    return () => st.kill();
  }, [hours, reduced]);

  return (
    <svg ref={svg} viewBox="0 0 240 240" role="img" aria-label={ui.payment.ringLabel} className="h-auto w-full max-w-[200px] shrink-0 sm:max-w-[220px]">
      <defs>
        <linearGradient id="ring-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#4CC9F0" />
          <stop offset="1" stopColor="#FFB703" />
        </linearGradient>
      </defs>
      {Array.from({ length: TICKS }, (_, i) => (
        <line
          key={i}
          className="ring-tick"
          x1="120"
          y1="6"
          x2="120"
          y2={i % 6 === 0 ? 20 : 14}
          stroke={i % 6 === 0 ? "#FFB703" : "#a9b6d3"}
          strokeWidth={i % 6 === 0 ? 2.4 : 1.6}
          strokeLinecap="round"
          transform={`rotate(${(i * 360) / TICKS} 120 120)`}
          style={{ transition: "opacity .25s" }}
        />
      ))}
      <circle cx="120" cy="120" r="92" fill="rgb(255 255 255 / 0.03)" stroke="rgb(169 182 211 / 0.2)" strokeWidth="6" />
      <circle
        className="ring-arc"
        cx="120"
        cy="120"
        r="92"
        fill="none"
        stroke="url(#ring-grad)"
        strokeWidth="6"
        strokeLinecap="round"
        pathLength={1}
        strokeDasharray="1"
        strokeDashoffset="1"
        transform="rotate(-90 120 120)"
        style={{ filter: "drop-shadow(0 0 6px rgb(255 183 3 / 0.6))" }}
      />
      <g className="ring-head" style={{ opacity: 0 }}>
        <circle cx="120" cy="28" r="7" fill="#FFB703" />
        <circle cx="120" cy="28" r="13" fill="#FFB703" opacity="0.25" />
      </g>
      <text className="ring-num" x="120" y="132" textAnchor="middle" fill="#eef2fa" fontFamily="Space Grotesk, sans-serif" fontWeight="700" fontSize="64">
        {hours}
      </text>
      <text x="120" y="158" textAnchor="middle" fill="#FFB703" fontFamily="JetBrains Mono, monospace" fontSize="12" letterSpacing="4">
        {ui.payment.hoursLabel}
      </text>
    </svg>
  );
}

/* ---------- section ---------- */

export default function Payment() {
  const { payment } = content;

  return (
    <section id="payment" tabIndex={-1} aria-labelledby="payment-h" className="relative z-[2] py-24 outline-none sm:py-32">
      <ClipReveal>
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <div className="grid items-center gap-10 lg:grid-cols-[1.02fr_1fr]">
            <Reveal>
              <p className="tag">{ui.tags.payment}</p>
              <h2 id="payment-h" className="mt-4 text-[clamp(2rem,4.6vw,3.7rem)]">
                {payment.heading}
              </h2>
              <div className="glass ticket-shape mt-9 inline-block px-7 py-6 sm:px-9 sm:py-7">
                <p className="mono mb-3 text-[0.66rem] uppercase tracking-[0.26em] text-mute">{ui.payment.counterLabel}</p>
                <PriceCounter />
              </div>
              <p className="mt-7 max-w-md text-lg leading-relaxed text-paper/90">{payment.text}</p>
            </Reveal>

            <div className="relative h-[330px] sm:h-[440px] lg:h-[540px]" role="img" aria-label={ui.sceneLabels.payment}>
              <Suspense fallback={null}>
                <PaymentScene />
              </Suspense>
            </div>
          </div>

          <div className="mt-14 grid gap-6 lg:grid-cols-2">
            <Reveal className="glass flex flex-col items-center gap-6 p-7 sm:flex-row sm:p-8">
              <DeadlineRing hours={payment.deadlineHours} />
              <div>
                <h3 className="text-2xl sm:text-[1.7rem]">{payment.deadlineHeading}</h3>
                <p className="mt-3 text-base leading-relaxed text-paper/85 sm:text-lg">{payment.deadlineText}</p>
              </div>
            </Reveal>

            <Reveal className="glass p-7 sm:p-9" delay={0.1}>
              <p className="font-display text-xl font-bold sm:text-2xl">{payment.checklistIntro}</p>
              <TickList items={payment.checklist} className="mt-6 space-y-4" itemClassName="text-base text-paper/90 sm:text-lg" gap={0.5} size={28} />
            </Reveal>
          </div>

          <Reveal className="mt-8">
            <p className="flex items-start gap-3 rounded-2xl border border-amber/35 bg-amber/[0.07] px-5 py-4 text-base text-paper sm:text-lg">
              <svg aria-hidden viewBox="0 0 24 24" className="mt-1 h-5 w-5 shrink-0 text-amber" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3 2.5 20h19z" />
                <path d="M12 10v5M12 18v.01" />
              </svg>
              {payment.note}
            </p>
          </Reveal>
        </div>
      </ClipReveal>
    </section>
  );
}
