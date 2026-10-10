import { useRef, type MouseEvent, type ReactNode } from "react";
import MagneticWrap from "@/components/ui/MagneticWrap";
import { APPLY_URL } from "@/config";

/**
 * The page's call to action. Magnetic hover, a shimmer sweep (CSS) and a click
 * ripple. Every instance links to the single APPLY_URL constant.
 */
export default function ApplyButton({ children, className = "" }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLAnchorElement>(null);

  const ripple = (e: MouseEvent<HTMLAnchorElement>) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const size = Math.max(r.width, r.height) * 2.4;
    // keyboard activation reports clientX/Y = 0: start the ripple at the centre instead
    const keyboard = e.detail === 0;
    const cx = keyboard ? r.width / 2 : e.clientX - r.left;
    const cy = keyboard ? r.height / 2 : e.clientY - r.top;
    const span = document.createElement("span");
    span.className = "ripple";
    span.style.cssText = `width:${size}px;height:${size}px;left:${cx - size / 2}px;top:${cy - size / 2}px`;
    span.addEventListener("animationend", () => span.remove());
    el.appendChild(span);
  };

  return (
    <MagneticWrap>
      <a ref={ref} href={APPLY_URL} target="_blank" rel="noopener noreferrer" onClick={ripple} data-cursor="hover" className={`btn-apply ${className}`}>
        <span className="btn-label">{children}</span>
        <svg className="btn-icon" viewBox="0 0 24 24" width="1.15em" height="1.15em" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M5 12h14M13 6l6 6-6 6" />
        </svg>
        <span className="sr-only"> (opens in a new tab)</span>
      </a>
    </MagneticWrap>
  );
}
