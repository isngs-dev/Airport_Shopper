import { lazy } from "react";

/**
 * Every 3D scene is code-split. three.js / R3F never touch the entry bundle, and a
 * scene's canvas additionally waits for its section to approach the viewport.
 */
export const HeroScene = lazy(() => import("./HeroScene"));
export const AboutCanvas = lazy(() => import("./AboutScene"));
export const LocationView = lazy(() => import("./AboutScene").then((m) => ({ default: m.LocationView })));
export const PaymentScene = lazy(() => import("./PaymentScene"));
export const RunwayScene = lazy(() => import("./RunwayScene"));
