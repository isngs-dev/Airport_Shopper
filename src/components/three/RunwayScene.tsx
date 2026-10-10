import { useEffect, useMemo, useRef, type MutableRefObject } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import SceneCanvas from "./SceneCanvas";
import Airplane from "./Airplane";
import { useQualitySettings } from "@/hooks/useQuality";

const LENGTH = 260;

/* ---------- pulsing runway lights (one instanced draw call per row) ---------- */

const lightVert = /* glsl */ `
  attribute float aDepth; attribute vec3 aColor;
  uniform float uTime; uniform float uSize;
  varying vec2 vUv; varying vec3 vCol; varying float vBright;
  void main() {
    vUv = uv; vCol = aColor;
    // pulse travels from the camera toward the horizon, repeating along the strip
    float v = fract(aDepth * 5.0 - uTime * 0.7);
    vBright = 0.22 + 0.78 * pow(1.0 - v, 3.2);
    vec4 mv = modelViewMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
    // billboard, with a little extra size far away so distant lights stay visible
    float s = uSize * (1.0 + aDepth * 1.4) * (0.7 + 0.5 * vBright);
    mv.xy += position.xy * s;
    gl_Position = projectionMatrix * mv;
  }
`;
const lightFrag = /* glsl */ `
  varying vec2 vUv; varying vec3 vCol; varying float vBright;
  void main() {
    float d = length(vUv - 0.5) * 2.0;
    float core = smoothstep(0.35, 0.0, d);
    float halo = pow(max(0.0, 1.0 - d), 2.2);
    float a = (core + halo * 0.55) * vBright;
    gl_FragColor = vec4(vCol * (0.8 + core), a);
  }
`;

function LightRow({ points, size, uTime }: { points: { x: number; z: number; color: THREE.Color }[]; size: number; uTime: { value: number } }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(1, 1);
    const depth = new Float32Array(points.length);
    const col = new Float32Array(points.length * 3);
    points.forEach((p, i) => {
      depth[i] = Math.min(1, Math.max(0, (6 - p.z) / LENGTH));
      col.set([p.color.r, p.color.g, p.color.b], i * 3);
    });
    g.setAttribute("aDepth", new THREE.InstancedBufferAttribute(depth, 1));
    g.setAttribute("aColor", new THREE.InstancedBufferAttribute(col, 3));
    return g;
  }, [points]);

  const uni = useMemo(() => ({ uTime, uSize: { value: size } }), [uTime, size]);

  useEffect(() => {
    const m = mesh.current;
    if (!m) return;
    const d = new THREE.Object3D();
    points.forEach((p, i) => {
      d.position.set(p.x, 0.12, p.z);
      d.updateMatrix();
      m.setMatrixAt(i, d.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
  }, [points]);

  return (
    <instancedMesh ref={mesh} args={[geo, undefined, points.length]} frustumCulled={false}>
      <shaderMaterial vertexShader={lightVert} fragmentShader={lightFrag} uniforms={uni} transparent depthWrite={false} blending={THREE.AdditiveBlending} />
    </instancedMesh>
  );
}

const horizonVert = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;
const horizonFrag = /* glsl */ `
  varying vec2 vUv;
  void main() {
    float y = vUv.y;
    float band = exp(-pow((y - 0.5) * 7.0, 2.0));
    vec3 col = mix(vec3(1.0, 0.62, 0.12), vec3(0.3, 0.79, 0.94), smoothstep(0.35, 0.8, y));
    float x = 1.0 - pow(abs(vUv.x - 0.5) * 2.0, 1.6);
    gl_FragColor = vec4(col, band * 0.55 * max(x, 0.0));
  }
`;

/* ---------- take-off ---------- */

const ease = (t: number) => t * t * (3 - 2 * t);

function TakeOff({ progress, animate }: { progress: MutableRefObject<number>; animate: boolean }) {
  const plane = useRef<THREE.Group>(null);
  const smooth = useRef(animate ? 0 : 0.58);

  useFrame((_, dt) => {
    const g = plane.current;
    if (!g) return;
    smooth.current = animate ? THREE.MathUtils.damp(smooth.current, progress.current, 3.2, dt) : 0.58;
    const p = smooth.current;
    // roll along the runway first, rotate, then climb away
    const roll = ease(Math.min(1, p / 0.55));
    const climb = Math.max(0, (p - 0.3) / 0.7);
    g.position.z = THREE.MathUtils.lerp(-2, -86, roll * roll * 0.55 + climb * 0.45);
    g.position.y = 0.55 + Math.pow(climb, 2.1) * 26;
    g.position.x = Math.sin(p * 3.2) * 0.35 * climb;
    // positive pitch lifts the nose (the model is flipped to face away from the camera)
    g.rotation.set(Math.min(0.42, climb * 0.8), 0, Math.sin(p * 6) * 0.04 * climb);
    g.scale.setScalar(1.7);
  });

  return (
    <group ref={plane}>
      {/* the model's nose is +Z; flip it so it faces away from the camera */}
      <group rotation={[0, Math.PI, 0]}>
        <Airplane exhaust animate={animate} />
      </group>
    </group>
  );
}

function Stars({ count }: { count: number }) {
  const geo = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 340;
      pos[i * 3 + 1] = 8 + Math.random() * 110;
      pos[i * 3 + 2] = -150 - Math.random() * 40;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    return g;
  }, [count]);
  return (
    <points geometry={geo}>
      <pointsMaterial color="#dbe8ff" size={1.3} sizeAttenuation={false} transparent opacity={0.7} depthWrite={false} />
    </points>
  );
}

function Fit() {
  const { camera, size, invalidate } = useThree();
  useEffect(() => {
    const aspect = size.width / size.height;
    // looking ~5 degrees up puts the horizon just below the middle of the frame
    camera.position.set(0, 1.7, aspect < 1 ? 11 : 8.4);
    camera.lookAt(0, 1.7 + 60 * Math.tan(0.092), -54);
    invalidate();
  }, [camera, size, invalidate]);
  return null;
}

function Composition({ progress }: { progress: MutableRefObject<number> }) {
  const { quality, runwayLights } = useQualitySettings();
  const animate = quality !== "static";
  const uTime = useMemo(() => ({ value: 0 }), []);

  useFrame((_, dt) => {
    if (animate) uTime.value += dt;
  });

  const rows = useMemo(() => {
    const n = runwayLights;
    const amber = new THREE.Color("#FFB703");
    const white = new THREE.Color("#cfefff");
    const left: { x: number; z: number; color: THREE.Color }[] = [];
    const right: typeof left = [];
    const center: typeof left = [];
    const edgeStep = LENGTH / n;
    for (let i = 0; i < n; i++) {
      const z = 5 - i * edgeStep;
      left.push({ x: -6.4, z, color: amber });
      right.push({ x: 6.4, z, color: amber });
    }
    const cStep = LENGTH / Math.ceil(n * 0.7);
    for (let i = 0; i < Math.ceil(n * 0.7); i++) center.push({ x: 0, z: 4 - i * cStep, color: white });
    return { left, right, center };
  }, [runwayLights]);

  return (
    <>
      <Fit />
      <fog attach="fog" args={["#0a1636", 40, 250]} />
      <ambientLight intensity={0.8} color="#9db8ff" />
      <directionalLight position={[3, 8, 5]} intensity={2.2} color="#fff0d2" />
      <pointLight position={[0, 3, 4]} intensity={30} color="#FFB703" />

      <Stars count={160} />

      {/* ground + runway surface */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -LENGTH / 2 + 10]}>
        <planeGeometry args={[220, LENGTH + 40]} />
        <meshBasicMaterial color="#070d20" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, -LENGTH / 2 + 10]}>
        <planeGeometry args={[13.4, LENGTH + 40]} />
        <meshBasicMaterial color="#0f1a3a" />
      </mesh>
      {/* edge lines */}
      {[-6.1, 6.1].map((x) => (
        <mesh key={x} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.02, -LENGTH / 2 + 10]}>
          <planeGeometry args={[0.14, LENGTH + 40]} />
          <meshBasicMaterial color="#3a4a78" />
        </mesh>
      ))}

      <LightRow points={rows.left} size={1.0} uTime={uTime} />
      <LightRow points={rows.right} size={1.0} uTime={uTime} />
      <LightRow points={rows.center} size={0.8} uTime={uTime} />

      {/* haze at the horizon */}
      <mesh position={[0, 4, -LENGTH + 20]} scale={[1, 1, 1]}>
        <planeGeometry args={[420, 70]} />
        <shaderMaterial vertexShader={horizonVert} fragmentShader={horizonFrag} transparent depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>

      <TakeOff progress={progress} animate={animate} />
    </>
  );
}

/** Runway in perspective with lights pulsing toward the horizon; the plane lifts off as `progress` goes 0 to 1. */
export default function RunwayScene({ progress }: { progress: MutableRefObject<number> }) {
  return (
    <SceneCanvas className="absolute inset-0" flat={false} camera={{ position: [0, 1.7, 8.4], fov: 50, near: 0.1, far: 600 }}>
      <Composition progress={progress} />
    </SceneCanvas>
  );
}
