import { Suspense, useEffect, useRef } from "react";
import { content, ui } from "@/content/copy";
import ApplyButton from "@/components/ui/ApplyButton";
import { Reveal } from "@/components/ui/Reveal";
import { RunwayScene } from "@/components/three/lazy";
import { ScrollTrigger } from "@/lib/gsap";

export default function FinalCta() {
  const { finalCta } = content;
  const section = useRef<HTMLElement>(null);
  /** 0 -> 1 as the section scrolls into view; the runway scene turns it into the take-off. */
  const progress = useRef(0);

  useEffect(() => {
    const el = section.current;
    if (!el) return;
    const st = ScrollTrigger.create({
      trigger: el,
      start: "top 92%",
      end: "top 12%",
      onUpdate: (self) => {
        progress.current = self.progress;
      },
    });
    return () => st.kill();
  }, []);

  return (
    <section id="apply" ref={section} tabIndex={-1} aria-labelledby="cta-h" className="relative z-[2] isolate min-h-[112svh] overflow-hidden outline-none">
      {/* sky + horizon glow behind the canvas */}
      <div
        aria-hidden
        className="absolute inset-0 -z-[2] bg-[radial-gradient(60%_26%_at_50%_58%,rgb(255_183_3/0.3),transparent_70%),linear-gradient(180deg,transparent_0%,rgb(76_201_240/0.08)_45%,rgb(14_28_64/0.9)_58%,#070d20_100%)]"
      />
      <div className="absolute inset-0 -z-[1]" role="img" aria-label={ui.sceneLabels.runway}>
        <Suspense fallback={null}>
          <RunwayScene progress={progress} />
        </Suspense>
      </div>
      {/* scrim so copy stays readable over lights */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[70%] bg-[radial-gradient(55%_50%_at_50%_42%,rgb(10_17_40/0.72),transparent_80%)]" />

      <div className="relative mx-auto flex min-h-[112svh] max-w-4xl flex-col items-center px-5 pb-[30svh] pt-[18svh] text-center sm:px-8">
        <Reveal>
          <p className="tag">{ui.tags.finalCta}</p>
          <h2 id="cta-h" className="mt-5 text-[clamp(2.1rem,5.4vw,4.4rem)]">
            {finalCta.heading}
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-paper/90 sm:text-xl">{finalCta.text}</p>
        </Reveal>
        <Reveal className="mt-10" delay={0.15}>
          <ApplyButton>{finalCta.cta}</ApplyButton>
        </Reveal>
      </div>
    </section>
  );
}
