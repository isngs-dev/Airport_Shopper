import { useEffect, useRef, type ReactNode } from "react";
import { gsap } from "@/lib/gsap";
import { useReducedMotion } from "@/hooks/useQuality";

type RevealProps = {
  children: ReactNode;
  as?: "div" | "section" | "p" | "li" | "header";
  className?: string;
  delay?: number;
  y?: number;
  id?: string;
};

/** Fade + rise on scroll-in (plays once). Renders as-is for reduced motion. */
export function Reveal({ children, as = "div", className, delay = 0, y = 36, id }: RevealProps) {
  const Tag = as as "div";
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el || reduced) return;
    const tween = gsap.fromTo(
      el,
      { autoAlpha: 0, y },
      {
        autoAlpha: 1,
        y: 0,
        duration: 1,
        delay,
        ease: "power3.out",
        scrollTrigger: { trigger: el, start: "top 88%", once: true },
      },
    );
    return () => {
      tween.scrollTrigger?.kill();
      tween.kill();
      gsap.set(el, { clearProps: "all" });
    };
  }, [reduced, delay, y]);

  return (
    <Tag ref={ref} id={id} className={className}>
      {children}
    </Tag>
  );
}

type ClipProps = { children: ReactNode; className?: string };

/**
 * Section transition: the section opens like a window (clip-path inset to full)
 * as it scrolls into view. Scrubbed, so it is reversible and frame-accurate.
 */
export function ClipReveal({ children, className }: ClipProps) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el || reduced) return;
    const tween = gsap.fromTo(
      el,
      { clipPath: "inset(9% 5% 0% 5% round 48px)" },
      {
        clipPath: "inset(0% 0% 0% 0% round 0px)",
        ease: "none",
        scrollTrigger: { trigger: el, start: "top 98%", end: "top 38%", scrub: true },
        // leave no clip-path behind once open, so glows and shadows can overflow
        // (scrolling back up makes GSAP write the clip-path again)
        onComplete: () => {
          el.style.clipPath = "none";
        },
      },
    );
    return () => {
      tween.scrollTrigger?.kill();
      tween.kill();
      el.style.clipPath = "";
    };
  }, [reduced]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
