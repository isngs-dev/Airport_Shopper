import { useRef, type MutableRefObject, type ReactNode } from "react";
import { useFrame } from "@react-three/fiber";
import { PerspectiveCamera, RoundedBox, View } from "@react-three/drei";
import * as THREE from "three";
import SceneCanvas from "./SceneCanvas";
import { useQualitySettings } from "@/hooks/useQuality";

export type Tilt = MutableRefObject<{ x: number; y: number; hover: boolean }>;

/* ---------- shared stage: idle spin, bob, and the card's hover tilt ---------- */

function Stage({ tilt, children, phase = 0, scale = 1 }: { tilt: Tilt; children: ReactNode; phase?: number; scale?: number }) {
  const outer = useRef<THREE.Group>(null);
  const inner = useRef<THREE.Group>(null);
  const { quality } = useQualitySettings();
  const animate = quality !== "static";

  useFrame((state, dt) => {
    const o = outer.current;
    const i = inner.current;
    if (!o || !i || !animate) return;
    const tl = tilt.current;
    i.rotation.y += dt * (tl.hover ? 0.25 : 0.6);
    o.rotation.x = THREE.MathUtils.damp(o.rotation.x, -tl.y * 0.55, 6, dt);
    o.rotation.z = THREE.MathUtils.damp(o.rotation.z, -tl.x * 0.25, 6, dt);
    o.position.y = Math.sin(state.clock.elapsedTime * 1.25 + phase) * 0.06;
  });

  return (
    <group ref={outer} scale={scale}>
      <group ref={inner} rotation={[0, animate ? phase : 0.7, 0]}>
        {children}
      </group>
    </group>
  );
}

function Lights() {
  return (
    <>
      <ambientLight intensity={1.15} color="#d4def7" />
      <directionalLight position={[3, 4, 5]} intensity={3} color="#fff2dc" />
      <pointLight position={[-4, 1, 3]} intensity={12} color="#4CC9F0" />
      <pointLight position={[3, -2, 3]} intensity={22} color="#FFB703" />
    </>
  );
}

const std = (color: string, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) => (
  <meshStandardMaterial color={color} roughness={0.45} metalness={0.15} flatShading {...extra} />
);

/* ---------- 1. cloche + cocktail glass ---------- */

function ClocheAndCocktail() {
  return (
    <group position={[0, 0.3, 0]}>
      <group position={[-0.42, 0, 0]}>
        <mesh position={[0, -0.7, 0]}>
          <cylinderGeometry args={[0.72, 0.72, 0.05, 28]} />
          {std("#d9e2f2", { metalness: 0.7, roughness: 0.3 })}
        </mesh>
        <mesh position={[0, -0.675, 0]} scale={[1, 0.95, 1]}>
          <sphereGeometry args={[0.6, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2]} />
          {std("#e6edf9", { metalness: 0.75, roughness: 0.25 })}
        </mesh>
        <mesh position={[0, -0.04, 0]}>
          <sphereGeometry args={[0.075, 12, 8]} />
          {std("#FFB703", { metalness: 0.6, roughness: 0.3 })}
        </mesh>
      </group>
      <group position={[0.78, 0.05, 0.1]} scale={1.2}>
        <mesh position={[0, -0.7, 0]}>
          <cylinderGeometry args={[0.2, 0.2, 0.04, 20]} />
          {std("#cfe9f5", { metalness: 0.5, roughness: 0.2, transparent: true, opacity: 0.8 })}
        </mesh>
        <mesh position={[0, -0.43, 0]}>
          <cylinderGeometry args={[0.028, 0.028, 0.56, 8]} />
          {std("#cfe9f5", { metalness: 0.5, roughness: 0.2, transparent: true, opacity: 0.8 })}
        </mesh>
        <mesh position={[0, -0.08, 0]}>
          <cylinderGeometry args={[0.4, 0.03, 0.5, 20]} />
          {std("#bdeeff", { transparent: true, opacity: 0.26, roughness: 0.1, metalness: 0.3, side: THREE.DoubleSide, depthWrite: false })}
        </mesh>
        <mesh position={[0, -0.14, 0]}>
          <cylinderGeometry args={[0.33, 0.03, 0.34, 20]} />
          <meshStandardMaterial color="#FFB703" emissive="#ff8a00" emissiveIntensity={0.55} roughness={0.3} transparent opacity={0.9} flatShading />
        </mesh>
        <mesh position={[0.1, 0.08, 0]}>
          <sphereGeometry args={[0.06, 10, 8]} />
          {std("#7bc043")}
        </mesh>
        <mesh position={[0.1, 0.14, 0]} rotation={[0, 0, -0.5]}>
          <cylinderGeometry args={[0.008, 0.008, 0.36, 5]} />
          {std("#ffffff")}
        </mesh>
      </group>
    </group>
  );
}

/* ---------- 2. coffee cup ---------- */

function CoffeeCup() {
  return (
    <group rotation={[0, 0, 0.12]} position={[0, -0.02, 0]}>
      <mesh>
        <cylinderGeometry args={[0.5, 0.34, 0.95, 26]} />
        {std("#f4f6fb", { roughness: 0.6, metalness: 0.02 })}
      </mesh>
      <mesh position={[0, -0.05, 0]}>
        <cylinderGeometry args={[0.456, 0.396, 0.4, 26]} />
        {std("#FFB703", { roughness: 0.7, metalness: 0 })}
      </mesh>
      <mesh position={[0, 0.515, 0]}>
        <cylinderGeometry args={[0.545, 0.52, 0.08, 26]} />
        {std("#1b2a55", { roughness: 0.4 })}
      </mesh>
      <mesh position={[0, 0.6, 0]}>
        <cylinderGeometry args={[0.4, 0.5, 0.1, 26]} />
        {std("#1b2a55", { roughness: 0.4 })}
      </mesh>
      <mesh position={[0.2, 0.66, 0]}>
        <boxGeometry args={[0.16, 0.03, 0.1]} />
        {std("#0a1128")}
      </mesh>
      <mesh position={[0, -0.05, 0.43]} rotation={[-0.05, 0, 0]}>
        <circleGeometry args={[0.1, 16]} />
        {std("#4CC9F0", { side: THREE.DoubleSide })}
      </mesh>
    </group>
  );
}

/* ---------- 3. shopping bag ---------- */

function ShoppingBag() {
  return (
    <group position={[0, -0.02, 0]}>
      <mesh rotation={[0, Math.PI / 4, 0]} scale={[1, 1, 0.55]}>
        <cylinderGeometry args={[0.78, 0.66, 1.25, 4, 1]} />
        {std("#FFB703", { roughness: 0.55, metalness: 0.05 })}
      </mesh>
      <mesh position={[0, 0.58, 0]} rotation={[0, Math.PI / 4, 0]} scale={[1, 1, 0.55]}>
        <cylinderGeometry args={[0.785, 0.77, 0.12, 4, 1]} />
        {std("#ffd166", { roughness: 0.55, metalness: 0.05 })}
      </mesh>
      {[0.2, -0.2].map((z) => (
        <mesh key={z} position={[0, 0.62, z]} rotation={[0, 0, 0]}>
          <torusGeometry args={[0.27, 0.028, 6, 18, Math.PI]} />
          {std("#0a1128", { roughness: 0.5 })}
        </mesh>
      ))}
      <mesh position={[0, -0.05, 0.287]}>
        <circleGeometry args={[0.2, 20]} />
        {std("#0a1128", { side: THREE.DoubleSide })}
      </mesh>
      <mesh position={[0, -0.05, 0.292]}>
        <ringGeometry args={[0.1, 0.14, 20]} />
        {std("#FFB703", { side: THREE.DoubleSide })}
      </mesh>
      <mesh position={[0.46, 0.24, 0.3]} rotation={[0, 0, -0.35]}>
        <boxGeometry args={[0.22, 0.14, 0.02]} />
        {std("#4CC9F0")}
      </mesh>
    </group>
  );
}

/* ---------- 4. lounge armchair ---------- */

function Armchair() {
  const legs: [number, number][] = [[-0.5, 0.4], [0.5, 0.4], [-0.5, -0.4], [0.5, -0.4]];
  return (
    <group position={[0, 0.12, 0]} scale={1.05}>
      <RoundedBox args={[1.15, 0.3, 1.0]} radius={0.07} smoothness={2} position={[0, -0.28, 0]}>
        {std("#2f6fa8", { roughness: 0.7, metalness: 0 })}
      </RoundedBox>
      <RoundedBox args={[0.98, 0.16, 0.8]} radius={0.07} smoothness={2} position={[0, -0.09, 0.05]}>
        {std("#4a8ec9", { roughness: 0.75, metalness: 0 })}
      </RoundedBox>
      <RoundedBox args={[1.15, 0.95, 0.26]} radius={0.09} smoothness={2} position={[0, 0.2, -0.42]} rotation={[-0.12, 0, 0]}>
        {std("#2f6fa8", { roughness: 0.7, metalness: 0 })}
      </RoundedBox>
      {[-0.7, 0.7].map((x) => (
        <RoundedBox key={x} args={[0.24, 0.52, 1.0]} radius={0.08} smoothness={2} position={[x, -0.1, 0]}>
          {std("#275c8d", { roughness: 0.7, metalness: 0 })}
        </RoundedBox>
      ))}
      {legs.map(([x, z]) => (
        <mesh key={`${x}${z}`} position={[x, -0.55, z]}>
          <cylinderGeometry args={[0.045, 0.03, 0.3, 8]} />
          {std("#FFB703", { metalness: 0.7, roughness: 0.3 })}
        </mesh>
      ))}
    </group>
  );
}

/* ---------- 5. suitcase with headset ---------- */

function SuitcaseHeadset() {
  return (
    <group scale={0.8} position={[0, -0.12, 0]}>
      <RoundedBox args={[1.0, 1.35, 0.52]} radius={0.09} smoothness={2} position={[0, -0.15, 0]}>
        {std("#2c4a9a", { roughness: 0.4, metalness: 0.35 })}
      </RoundedBox>
      {[-0.27, 0, 0.27].map((x) => (
        <mesh key={x} position={[x, -0.15, 0]}>
          <boxGeometry args={[0.045, 1.2, 0.545]} />
          {std("#213a7c", { roughness: 0.4, metalness: 0.4 })}
        </mesh>
      ))}
      {[
        [-0.5, 0.5],
        [0.5, 0.5],
        [-0.5, -0.8],
        [0.5, -0.8],
      ].map(([x, y]) => (
        <mesh key={`${x}${y}`} position={[x, y, 0]}>
          <boxGeometry args={[0.1, 0.1, 0.56]} />
          {std("#FFB703", { metalness: 0.6, roughness: 0.3 })}
        </mesh>
      ))}
      {[-0.22, 0.22].map((x) => (
        <mesh key={x} position={[x, 0.66, 0]}>
          <cylinderGeometry args={[0.022, 0.022, 0.2, 8]} />
          {std("#cfd8e8", { metalness: 0.8, roughness: 0.3 })}
        </mesh>
      ))}
      <mesh position={[0, 0.77, 0]}>
        <boxGeometry args={[0.5, 0.05, 0.07]} />
        {std("#cfd8e8", { metalness: 0.8, roughness: 0.3 })}
      </mesh>
      {[-0.32, 0.32].map((x) => (
        <mesh key={x} position={[x, -0.86, 0.14]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.075, 0.075, 0.07, 12]} />
          {std("#0a1128", { roughness: 0.6 })}
        </mesh>
      ))}

      {/* headset hovering above the case */}
      <group position={[0, 1.32, 0.05]}>
        <mesh>
          <torusGeometry args={[0.4, 0.045, 8, 24, Math.PI]} />
          {std("#0a1128", { roughness: 0.4, metalness: 0.4 })}
        </mesh>
        {[-0.4, 0.4].map((x) => (
          <group key={x} position={[x, 0, 0]}>
            <mesh rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.17, 0.17, 0.16, 16]} />
              {std("#4CC9F0", { roughness: 0.35, metalness: 0.3 })}
            </mesh>
            <mesh position={[x > 0 ? -0.09 : 0.09, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.14, 0.14, 0.05, 16]} />
              {std("#0a1128", { roughness: 0.8 })}
            </mesh>
          </group>
        ))}
        <mesh position={[0.36, -0.2, 0.12]} rotation={[0.6, 0, 0.3]}>
          <cylinderGeometry args={[0.014, 0.014, 0.4, 6]} />
          {std("#0a1128")}
        </mesh>
        <mesh position={[0.27, -0.34, 0.26]}>
          <sphereGeometry args={[0.04, 8, 6]} />
          {std("#FFB703", { emissive: "#FFB703", emissiveIntensity: 0.4 })}
        </mesh>
      </group>
    </group>
  );
}

const OBJECTS = [ClocheAndCocktail, CoffeeCup, ShoppingBag, Armchair, SuitcaseHeadset];
const CAMERA_Y = [0.05, 0, 0, 0.05, 0.12];

/** One card's 3D viewport. Tracks its own DOM box inside the shared canvas. */
export function LocationView({ index, tilt, className }: { index: number; tilt: Tilt; className?: string }) {
  const Obj = OBJECTS[index];
  return (
    <View className={className}>
      <PerspectiveCamera makeDefault position={[0, CAMERA_Y[index], 4.2]} fov={32} />
      <Lights />
      <Stage tilt={tilt} phase={index * 1.3}>
        <Obj />
      </Stage>
    </View>
  );
}

/** The single canvas that all five card views render into. */
export default function AboutCanvas({ onReady }: { onReady: (ready: boolean) => void }) {
  return (
    <SceneCanvas className="pointer-events-none absolute inset-0 z-10" flat={false} refreshOnScroll rootMargin="500px" onReady={onReady} camera={{ position: [0, 0, 5], fov: 32 }}>
      <View.Port />
    </SceneCanvas>
  );
}
