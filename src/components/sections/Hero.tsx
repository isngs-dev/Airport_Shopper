import { Suspense, useState } from "react";
import { content, ui } from "@/content/copy";
import ApplyButton from "@/components/ui/ApplyButton";
import SplitFlapHeadline from "@/components/ui/SplitFlapHeadline";
import HeroFallback from "@/components/ui/HeroFallback";
import { HeroScene } from "@/components/three/lazy";

export default function Hero() {
  const [ready, setReady] = useState(false);

  return (
    <section id="top" className="relative isolate z-[2] min-h-[100svh] overflow-hidden">
      {!ready && <HeroFallback />}
      <div className="absolute inset-0 -z-[1]">
        <Suspense fallback={null}>
          <HeroScene onReady={setReady} />
        </Suspense>
      </div>
      {/* legibility scrim behind the copy */}
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgb(10_17_40/0.78)_0%,rgb(10_17_40/0.35)_48%,transparent_75%)] max-md:bg-[linear-gradient(180deg,transparent_0%,rgb(10_17_40/0.12)_35%,rgb(10_17_40/0.62)_75%)]" />

      <div className="relative mx-auto flex min-h-[100svh] max-w-6xl flex-col justify-center px-5 pb-28 pt-32 sm:px-8">
        <p className="tag flex items-center gap-3">
          <span aria-hidden className="h-px w-10 bg-amber" />
          {ui.tags.hero}
        </p>

        <SplitFlapHeadline text={content.hero.headline} className="mt-6 max-w-[16ch] font-display text-[clamp(2.1rem,5.6vw,5rem)] font-bold leading-[1.12] sm:max-w-3xl" />

        <p className="mt-8 max-w-xl text-base leading-relaxed text-paper/85 sm:text-lg">{content.hero.subtext}</p>

        <div className="mt-10">
          <ApplyButton>{content.hero.cta}</ApplyButton>
        </div>

        <div aria-hidden className="mono mt-16 flex items-center gap-4 text-[0.68rem] uppercase tracking-[0.28em] text-mute">
          <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-amber shadow-[0_0_12px_#FFB703]" />
          <span>{ui.board.departures}</span>
          <span className="h-px w-10 bg-white/20" />
          <span className="text-amber">{ui.board.status}</span>
        </div>
      </div>

      <div aria-hidden className="mono absolute inset-x-0 bottom-6 z-[1] flex flex-col items-center gap-2 text-[0.62rem] uppercase tracking-[0.3em] text-mute">
        {ui.scrollHint}
        <span className="relative block h-9 w-px overflow-hidden bg-white/15">
          <span className="absolute inset-x-0 top-0 h-1/2 animate-[scrolldot_1.8s_ease-in-out_infinite] bg-amber" />
        </span>
      </div>
    </section>
  );
}
