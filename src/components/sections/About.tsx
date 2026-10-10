import { Suspense, useEffect, useRef, useState } from "react";
import { content, ui } from "@/content/copy";
import ApplyButton from "@/components/ui/ApplyButton";
import LocationIcon from "@/components/ui/LocationIcon";
import { ClipReveal, Reveal } from "@/components/ui/Reveal";
import { AboutCanvas, LocationView } from "@/components/three/lazy";
import { gsap } from "@/lib/gsap";
import { useCanHover, useReducedMotion } from "@/hooks/useQuality";

type Tilt = { x: number; y: number; hover: boolean };

const SPAN = [
  "md:col-span-2 xl:col-span-1",
  "md:col-span-2 xl:col-span-1",
  "md:col-span-2 xl:col-span-1",
  "md:col-span-3 xl:col-span-1",
  "sm:col-span-2 md:col-span-3 xl:col-span-1",
];

function LocationCard({ index, label, ready }: { index: number; label: string; ready: boolean }) {
  const card = useRef<HTMLDivElement>(null);
  const tilt = useRef<Tilt>({ x: 0, y: 0, hover: false });
  const canHover = useCanHover();
  const reduced = useReducedMotion();
  const enabled = canHover && !reduced;

  const onMove = (e: React.PointerEvent) => {
    const el = card.current;
    if (!el || !enabled) return;
    const r = el.getBoundingClientRect();
    const nx = ((e.clientX - r.left) / r.width) * 2 - 1;
    const ny = ((e.clientY - r.top) / r.height) * 2 - 1;
    tilt.current.x = nx;
    tilt.current.y = ny;
    tilt.current.hover = true;
    el.style.setProperty("--rx", `${(-ny * 9).toFixed(2)}deg`);
    el.style.setProperty("--ry", `${(nx * 11).toFixed(2)}deg`);
    el.style.setProperty("--gx", `${((nx + 1) * 50).toFixed(1)}%`);
    el.style.setProperty("--gy", `${((ny + 1) * 50).toFixed(1)}%`);
  };
  const onLeave = () => {
    const el = card.current;
    tilt.current = { x: 0, y: 0, hover: false };
    el?.style.setProperty("--rx", "0deg");
    el?.style.setProperty("--ry", "0deg");
  };

  return (
    <li className={`loc-item [perspective:1000px] ${SPAN[index]}`}>
      <div
        ref={card}
        onPointerMove={onMove}
        onPointerLeave={onLeave}
        data-cursor="hover"
        className="loc-card glass group h-full overflow-hidden"
        style={{ transform: "rotateX(var(--rx,0deg)) rotateY(var(--ry,0deg))", transformStyle: "preserve-3d" }}
      >
        <div className="relative h-48 sm:h-52">
          {!ready && (
            <div className="absolute inset-0 grid place-items-center p-6">
              <LocationIcon index={index} label={ui.locationIcons[index]} />
            </div>
          )}
          <Suspense fallback={null}>
            <LocationView index={index} tilt={tilt} className="absolute inset-0" />
          </Suspense>
        </div>
        <div className="relative z-[1] px-5 pb-6 pt-1">
          <span className="mono text-[0.68rem] tracking-[0.24em] text-amber">{String(index + 1).padStart(2, "0")}</span>
          <h3 className="mt-2 text-xl leading-snug sm:text-[1.3rem]">{label}</h3>
        </div>
        {/* reflection sweep + pointer glare */}
        <span aria-hidden className="loc-sweep" />
        <span aria-hidden className="loc-glare" />
      </div>
    </li>
  );
}

export default function About() {
  const [ready, setReady] = useState(false);
  const list = useRef<HTMLUListElement>(null);
  const reduced = useReducedMotion();

  // cards stagger in as the grid scrolls into view
  useEffect(() => {
    const el = list.current;
    if (!el || reduced) return;
    const items = el.querySelectorAll(".loc-item");
    const tween = gsap.from(items, {
      y: 80,
      autoAlpha: 0,
      rotateX: -18,
      transformPerspective: 1400,
      duration: 1.1,
      ease: "power3.out",
      stagger: 0.12,
      scrollTrigger: { trigger: el, start: "top 84%", once: true },
    });
    return () => {
      tween.scrollTrigger?.kill();
      tween.kill();
      gsap.set(items, { clearProps: "all" });
    };
  }, [reduced]);

  const { about } = content;

  return (
    <section id="about" tabIndex={-1} aria-labelledby="about-h" className="relative z-[2] py-24 outline-none sm:py-32">
      <ClipReveal>
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <Reveal>
            <p className="tag">{ui.tags.about}</p>
            <h2 id="about-h" className="mt-4 max-w-3xl text-[clamp(2rem,4.8vw,3.9rem)]">
              <span className="text-gradient">{about.heading}</span>
            </h2>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-paper/85">{about.intro}</p>
          </Reveal>

          <div className="relative mt-12">
            <Suspense fallback={null}>
              <AboutCanvas onReady={setReady} />
            </Suspense>
            <ul ref={list} className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-6 xl:grid-cols-5">
              {about.locations.map((label, i) => (
                <LocationCard key={label} index={i} label={label} ready={ready} />
              ))}
            </ul>
          </div>

          <Reveal className="mt-14 grid items-center gap-8 md:grid-cols-[1fr_auto]">
            <div className="glass p-6 sm:p-8">
              <p className="text-lg leading-relaxed text-paper/90 sm:text-xl">{about.outro}</p>
            </div>
            <div className="md:pl-4">
              <ApplyButton>{about.cta}</ApplyButton>
            </div>
          </Reveal>
        </div>
      </ClipReveal>
    </section>
  );
}
