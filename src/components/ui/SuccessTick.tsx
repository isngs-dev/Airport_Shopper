/**
 * Animated success mark: a ring that draws itself, a tick that draws after it,
 * and a soft burst. Pure CSS (see .ok-* in index.css); static for reduced motion.
 */
export default function SuccessTick({ size = 88 }: { size?: number }) {
  return (
    <svg viewBox="0 0 88 88" width={size} height={size} fill="none" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="ok-pop overflow-visible">
      <circle className="ok-burst" cx="44" cy="44" r="38" stroke="#FFB703" strokeWidth="2" />
      <circle cx="44" cy="44" r="38" fill="rgb(255 183 3 / 0.08)" />
      <circle className="ok-ring" cx="44" cy="44" r="38" pathLength={1} stroke="#FFB703" strokeWidth="4" transform="rotate(-90 44 44)" />
      <path className="ok-tick" d="M27 45.5 L39.5 58 L62 32" pathLength={1} stroke="#4CC9F0" strokeWidth="6" />
    </svg>
  );
}
