import { useEffect, useMemo, useRef } from "react";
import { useReducedMotion } from "@/hooks/useQuality";

const CHARSET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const FLIP_MS = 64;

type Props = { text: string; className?: string };

/**
 * Headline rendered as split-flap departure-board tiles. Each tile rolls through
 * random characters before settling on its letter, staggered left to right.
 * Tiles are mutated directly (no React state), the real text lives in an sr-only span.
 */
export default function SplitFlapHeadline({ text, className = "" }: Props) {
  const reduced = useReducedMotion();
  const root = useRef<HTMLSpanElement>(null);

  // "See the Experience. Share the Details. Get Paid" -> three sentences, last one highlighted
  const sentences = useMemo(() => text.split(/(?<=\.)\s+/).map((s) => s.split(/\s+/)), [text]);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const tiles = Array.from(el.querySelectorAll<HTMLElement>(".flap-tile"));

    if (reduced) {
      tiles.forEach((t) => {
        t.textContent = t.dataset.ch ?? "";
        t.dataset.done = "true";
      });
      return;
    }

    const t0 = performance.now() + 500;
    const plan = tiles.map((tile, i) => ({
      tile,
      final: tile.dataset.ch ?? "",
      start: t0 + i * 44 + Math.random() * 50,
      flips: 5 + (i % 4),
      shown: "",
    }));

    let raf = 0;
    const frame = (now: number) => {
      let pending = false;
      for (let i = 0; i < plan.length; i++) {
        const p = plan[i];
        const dt = now - p.start;
        if (dt < 0) {
          pending = true;
          continue;
        }
        if (dt >= p.flips * FLIP_MS) {
          if (p.tile.dataset.done !== "true") {
            p.tile.textContent = p.final;
            p.tile.style.transform = "";
            p.tile.dataset.done = "true";
          }
          continue;
        }
        pending = true;
        const k = Math.floor(dt / FLIP_MS);
        const frac = (dt - k * FLIP_MS) / FLIP_MS;
        const idx = frac < 0.5 ? k : k + 1;
        const ch = idx >= p.flips || p.final === "." ? p.final : CHARSET[(i * 13 + idx * 7) % CHARSET.length];
        if (ch !== p.shown) {
          p.tile.textContent = ch;
          p.shown = ch;
        }
        p.tile.style.transform = `scaleY(${Math.abs(Math.cos(frac * Math.PI)).toFixed(3)})`;
      }
      if (pending) raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [reduced, text]);

  return (
    <h1 className={className}>
      <span className="sr-only">{text}</span>
      <span ref={root} aria-hidden className="block">
        {sentences.map((words, si) => (
          <span key={si} className="block">
            {words.map((word, wi) => (
              <span key={wi} className="mr-[0.32em] inline-block whitespace-nowrap">
                {Array.from(word.toUpperCase()).map((ch, ci) => (
                  <span
                    key={ci}
                    className="flap-tile"
                    data-ch={ch}
                    data-hi={si === sentences.length - 1}
                    style={{ width: ch === "." ? "0.4em" : "0.8em" }}
                  />
                ))}
              </span>
            ))}
          </span>
        ))}
      </span>
    </h1>
  );
}
