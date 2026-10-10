import { ui } from "@/content/copy";

/** Still illustration used while the scene loads, for no-WebGL devices and as the backdrop. */
export default function HeroFallback() {
  return (
    <div role="img" aria-label={ui.sceneLabels.hero} className="pointer-events-none absolute inset-0 flex items-center justify-end overflow-hidden">
      <svg viewBox="0 0 400 400" className="mr-[-8%] h-[78%] max-h-[720px] w-auto opacity-70" aria-hidden>
        <defs>
          <radialGradient id="hf-g" cx="50%" cy="45%" r="55%">
            <stop offset="0" stopColor="#14306a" stopOpacity="0.8" />
            <stop offset="1" stopColor="#0a1128" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx="200" cy="200" r="150" fill="url(#hf-g)" />
        <g fill="none" stroke="#4CC9F0" strokeOpacity="0.4" strokeWidth="1">
          <circle cx="200" cy="200" r="150" />
          <ellipse cx="200" cy="200" rx="150" ry="55" />
          <ellipse cx="200" cy="200" rx="150" ry="105" />
          <ellipse cx="200" cy="200" rx="55" ry="150" />
          <ellipse cx="200" cy="200" rx="105" ry="150" />
          <path d="M50 200h300M200 50v300" />
        </g>
        <path d="M70 250 Q200 80 330 190" fill="none" stroke="#FFB703" strokeWidth="2" strokeDasharray="3 6" />
      </svg>
    </div>
  );
}
