import { Component, useEffect, useRef, useState, useSyncExternalStore, type ErrorInfo, type ReactNode } from "react";
import { Canvas, useThree, type CanvasProps } from "@react-three/fiber";
import { PerformanceMonitor } from "@react-three/drei";
import { useQualitySettings } from "@/hooks/useQuality";
import { attachPointer } from "@/lib/pointer";

let webglSupport: boolean | undefined;

/**
 * Feature-detect WebGL once. The result is cached because it runs as a
 * useSyncExternalStore snapshot (every render), and each probe would otherwise
 * leak a WebGL context.
 */
function hasWebGL() {
  if (webglSupport !== undefined) return webglSupport;
  try {
    const c = document.createElement("canvas");
    const gl = (c.getContext("webgl2") || c.getContext("webgl")) as WebGLRenderingContext | WebGL2RenderingContext | null;
    webglSupport = !!gl;
    gl?.getExtension("WEBGL_lose_context")?.loseContext();
  } catch {
    webglSupport = false;
  }
  return webglSupport;
}

const noopSubscribe = () => () => {};

class SceneBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[3D scene] failed, showing fallback", error, info.componentStack);
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

/** Tells the parent the canvas is live so it can hide its static fallback. */
function ReadySignal({ onReady }: { onReady?: (ready: boolean) => void }) {
  useEffect(() => {
    onReady?.(true);
    return () => onReady?.(false);
  }, [onReady]);
  return null;
}

/** In reduced-motion ("demand") mode, re-render when asked so scroll-tracked views stay put. */
function DemandRefresh({ onScroll }: { onScroll: boolean }) {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    invalidate();
    const t = window.setTimeout(invalidate, 250);
    if (!onScroll) return () => window.clearTimeout(t);
    const fn = () => invalidate();
    window.addEventListener("scroll", fn, { passive: true });
    window.addEventListener("resize", fn);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("scroll", fn);
      window.removeEventListener("resize", fn);
    };
  }, [invalidate, onScroll]);
  return null;
}

type Props = {
  children: ReactNode;
  className?: string;
  camera?: CanvasProps["camera"];
  /** Mount immediately instead of waiting until the section nears the viewport. */
  eager?: boolean;
  rootMargin?: string;
  /** Rendered while the canvas is not mounted yet or when WebGL is unavailable. */
  fallback?: ReactNode;
  /** Flat = no tone mapping. Turn off for PBR scenes. */
  flat?: boolean;
  /** Cap the pixel ratio below the quality tier's own limit. */
  maxDpr?: number;
  /** Re-render on scroll while in reduced-motion (needed for drei Views). */
  refreshOnScroll?: boolean;
  onReady?: (ready: boolean) => void;
  /** Receives true while the canvas is on screen (scenes may pause extra work). */
  onVisible?: (visible: boolean) => void;
};

/**
 * Shared shell for every 3D canvas on the page:
 *  - lazy mount via IntersectionObserver (keeps first load light)
 *  - render loop paused while off-screen
 *  - DPR capped at 2 and adaptively lowered when the frame rate drops
 *  - demand (single-frame) rendering for reduced motion
 *  - WebGL feature check + error boundary with a static fallback
 */
export default function SceneCanvas({
  children,
  className,
  camera = { position: [0, 0, 11], fov: 38 },
  eager = false,
  rootMargin = "600px",
  fallback = null,
  flat = true,
  maxDpr,
  refreshOnScroll = false,
  onReady,
  onVisible,
}: Props) {
  const host = useRef<HTMLDivElement>(null);
  const { quality, dpr } = useQualitySettings();
  const [mounted, setMounted] = useState(eager);
  const [visible, setVisible] = useState(eager);
  const supported = useSyncExternalStore(noopSubscribe, hasWebGL, () => true);

  useEffect(() => {
    attachPointer();
  }, []);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    // a wide margin mounts the canvas early; a tight one runs the render loop only while on/near screen
    const mountIO = new IntersectionObserver(([e]) => e.isIntersecting && setMounted(true), { rootMargin });
    const runIO = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { rootMargin: "80px" });
    mountIO.observe(el);
    runIO.observe(el);
    return () => {
      mountIO.disconnect();
      runIO.disconnect();
    };
  }, [rootMargin]);

  useEffect(() => onVisible?.(visible), [visible, onVisible]);

  const [factor, setFactor] = useState(1);
  const dprMin = dpr[0];
  const dprMax = Math.min(dpr[1], maxDpr ?? dpr[1], 2);
  const adaptive: [number, number] = [dprMin, Math.max(dprMin, dprMin + (dprMax - dprMin) * factor)];

  const frameloop: CanvasProps["frameloop"] = quality === "static" ? "demand" : visible ? "always" : "never";

  return (
    <div ref={host} className={className}>
      {mounted && supported ? (
        <SceneBoundary fallback={fallback}>
          <Canvas
            frameloop={frameloop}
            dpr={adaptive}
            camera={camera}
            flat={flat}
            gl={{ antialias: quality !== "low", alpha: true, powerPreference: "high-performance" }}
            style={{ pointerEvents: "none" }}
            aria-hidden
          >
            <PerformanceMonitor factor={1} step={0.2} flipflops={6} onChange={({ factor: f }) => setFactor(f)}>
              {quality === "static" && <DemandRefresh onScroll={refreshOnScroll} />}
              <ReadySignal onReady={onReady} />
              {children}
            </PerformanceMonitor>
          </Canvas>
        </SceneBoundary>
      ) : (
        fallback
      )}
    </div>
  );
}
