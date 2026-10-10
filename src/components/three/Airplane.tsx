import { forwardRef, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

/** Flat swept panel in the XZ plane (shape y -> world z), centred on y. */
function panel(pts: [number, number][], depth: number) {
  const s = new THREE.Shape();
  s.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) s.lineTo(pts[i][0], pts[i][1]);
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false });
  g.rotateX(Math.PI / 2);
  g.translate(0, depth / 2, 0);
  return g;
}

function buildGeometry() {
  const fuselage = new THREE.CylinderGeometry(0.2, 0.2, 2.4, 8, 1);
  fuselage.rotateX(Math.PI / 2);
  const nose = new THREE.ConeGeometry(0.2, 0.75, 8);
  nose.rotateX(Math.PI / 2);
  nose.translate(0, 0, 1.2 + 0.375);
  const tail = new THREE.CylinderGeometry(0.2, 0.07, 1.1, 8, 1);
  tail.rotateX(Math.PI / 2);
  tail.translate(0, 0.02, -1.2 - 0.55);

  const wing = panel(
    [
      [0.12, 0.5],
      [1.95, -0.6],
      [1.95, -1.0],
      [0.12, -0.3],
    ],
    0.06,
  );
  const stab = panel(
    [
      [0.1, -1.05],
      [0.85, -1.45],
      [0.85, -1.72],
      [0.1, -1.4],
    ],
    0.04,
  );

  const finShape = new THREE.Shape();
  finShape.moveTo(0, 0);
  finShape.lineTo(0.38, 0.66);
  finShape.lineTo(0.82, 0.66);
  finShape.lineTo(0.66, 0);
  finShape.closePath();
  const fin = new THREE.ExtrudeGeometry(finShape, { depth: 0.05, bevelEnabled: false });
  fin.translate(0, 0, -0.025);
  fin.rotateY(Math.PI / 2);

  const engine = new THREE.CylinderGeometry(0.15, 0.12, 0.72, 8, 1);
  engine.rotateX(Math.PI / 2);
  const belt = new THREE.CylinderGeometry(0.208, 0.208, 0.1, 8, 1, true);
  belt.rotateX(Math.PI / 2);
  const glow = new THREE.CircleGeometry(0.11, 10);
  glow.rotateY(Math.PI);

  return { fuselage, nose, tail, wing, stab, fin, engine, belt, glow };
}

let shared: ReturnType<typeof buildGeometry> | null = null;
const geo = () => (shared ??= buildGeometry());

type Props = {
  scale?: number;
  /** Blink the strobe / glow the engines (set false for static frames). */
  animate?: boolean;
  /** Engine exhaust glow, used for the take-off. */
  exhaust?: boolean;
};

/**
 * Stylised low-poly airliner built from extruded primitives. Nose points along +Z,
 * so `lookAt(target)` flies it toward the target.
 */
const Airplane = forwardRef<THREE.Group, Props>(function Airplane({ scale = 1, animate = true, exhaust = false }, ref) {
  const g = useMemo(geo, []);
  const strobe = useRef<THREE.MeshBasicMaterial>(null);

  useFrame(({ clock }) => {
    if (!animate || !strobe.current) return;
    const t = clock.elapsedTime % 1.6;
    strobe.current.opacity = t < 0.12 || (t > 0.3 && t < 0.4) ? 1 : 0.08;
  });

  return (
    <group ref={ref} scale={scale}>
      <mesh geometry={g.fuselage}>
        <meshStandardMaterial color="#e9effa" roughness={0.45} metalness={0.15} flatShading />
      </mesh>
      <mesh geometry={g.nose}>
        <meshStandardMaterial color="#d6e0f5" roughness={0.4} metalness={0.2} flatShading />
      </mesh>
      <mesh geometry={g.tail}>
        <meshStandardMaterial color="#e9effa" roughness={0.45} metalness={0.15} flatShading />
      </mesh>
      {/* amber livery belts */}
      <mesh geometry={g.belt} position={[0, 0, 0.55]}>
        <meshStandardMaterial color="#FFB703" roughness={0.5} flatShading />
      </mesh>
      <mesh geometry={g.belt} position={[0, 0, 0.3]} scale={[1, 1, 0.5]}>
        <meshStandardMaterial color="#4CC9F0" roughness={0.5} flatShading />
      </mesh>
      {/* cockpit glass */}
      <mesh position={[0, 0.13, 1.28]} rotation={[-0.5, 0, 0]}>
        <boxGeometry args={[0.2, 0.08, 0.28]} />
        <meshStandardMaterial color="#13204a" roughness={0.2} metalness={0.6} flatShading />
      </mesh>

      {/* wings (dihedral lives on the inner mesh so the mirrored side stays symmetric) */}
      <mesh geometry={g.wing} position={[0, -0.07, 0]} rotation={[0, 0, 0.06]}>
        <meshStandardMaterial color="#cdd8ee" roughness={0.5} metalness={0.2} flatShading />
      </mesh>
      <group scale={[-1, 1, 1]}>
        <mesh geometry={g.wing} position={[0, -0.07, 0]} rotation={[0, 0, 0.06]}>
          <meshStandardMaterial color="#cdd8ee" roughness={0.5} metalness={0.2} flatShading />
        </mesh>
      </group>

      {/* horizontal stabilisers */}
      <mesh geometry={g.stab} position={[0, 0.04, 0]}>
        <meshStandardMaterial color="#cdd8ee" roughness={0.5} metalness={0.2} flatShading />
      </mesh>
      <group scale={[-1, 1, 1]}>
        <mesh geometry={g.stab} position={[0, 0.04, 0]}>
          <meshStandardMaterial color="#cdd8ee" roughness={0.5} metalness={0.2} flatShading />
        </mesh>
      </group>

      {/* tail fin */}
      <mesh geometry={g.fin} position={[0, 0.12, -1.1]}>
        <meshStandardMaterial color="#FFB703" roughness={0.45} metalness={0.1} flatShading />
      </mesh>

      {/* engines */}
      {[-0.78, 0.78].map((x) => (
        <group key={x} position={[x, -0.2, 0.22]}>
          <mesh geometry={g.engine}>
            <meshStandardMaterial color="#9fb0d4" roughness={0.4} metalness={0.5} flatShading />
          </mesh>
          {exhaust && <mesh geometry={g.glow} position={[0, 0, -0.37]}>
            <meshBasicMaterial color="#ff9d2e" toneMapped={false} side={THREE.DoubleSide} />
          </mesh>}
        </group>
      ))}

      {/* navigation lights */}
      <mesh position={[-1.92, 0.04, -0.98]}>
        <sphereGeometry args={[0.055, 8, 6]} />
        <meshBasicMaterial color="#ff3b4a" toneMapped={false} />
      </mesh>
      <mesh position={[1.92, 0.04, -0.98]}>
        <sphereGeometry args={[0.055, 8, 6]} />
        <meshBasicMaterial color="#35e08a" toneMapped={false} />
      </mesh>
      <mesh position={[0, 0.8, -1.72]}>
        <sphereGeometry args={[0.06, 8, 6]} />
        <meshBasicMaterial ref={strobe} color="#ffffff" transparent opacity={animate ? 0.08 : 1} toneMapped={false} />
      </mesh>
    </group>
  );
});

export default Airplane;
