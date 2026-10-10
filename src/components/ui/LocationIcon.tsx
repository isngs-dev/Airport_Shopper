/** Flat line-art stand-ins for the 3D objects (shown while the canvas loads, or when WebGL is unavailable). */
export default function LocationIcon({ index, label }: { index: number; label: string }) {
  const common = { fill: "none", strokeWidth: 2.2, strokeLinecap: "round", strokeLinejoin: "round" } as const;
  const amber = "#FFB703";
  const cyan = "#4CC9F0";
  return (
    <svg viewBox="0 0 120 120" role="img" aria-label={label} className="h-full max-h-40 w-full">
      {index === 0 && (
        <g {...common}>
          <path d="M14 82h46" stroke={cyan} />
          <path d="M20 82a22 22 0 0 1 34 0" stroke={cyan} />
          <path d="M37 56v-6" stroke={cyan} />
          <path d="M70 40h34l-17 24zM87 64v22M76 86h22" stroke={amber} />
        </g>
      )}
      {index === 1 && (
        <g {...common}>
          <path d="M34 36h52l-6 56H40z" stroke={cyan} />
          <path d="M30 28h60v8H30z" stroke={amber} />
          <path d="M38 58h44" stroke={amber} />
        </g>
      )}
      {index === 2 && (
        <g {...common}>
          <path d="M30 44h60l6 50H24z" stroke={amber} />
          <path d="M46 44v-8a14 14 0 0 1 28 0v8" stroke={cyan} />
        </g>
      )}
      {index === 3 && (
        <g {...common}>
          <path d="M30 56a8 8 0 0 1 8-8h44a8 8 0 0 1 8 8v22H30z" stroke={cyan} />
          <path d="M22 62h14v28H22zM84 62h14v28H84z" stroke={cyan} />
          <path d="M34 90v8M86 90v8" stroke={amber} />
        </g>
      )}
      {index === 4 && (
        <g {...common}>
          <rect x="32" y="48" width="56" height="48" rx="8" stroke={amber} />
          <path d="M48 48v-8h24v8M42 100v4M78 100v4" stroke={amber} />
          <path d="M42 36a18 18 0 0 1 36 0" stroke={cyan} />
        </g>
      )}
    </svg>
  );
}
