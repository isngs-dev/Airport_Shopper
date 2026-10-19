import { Suspense, useLayoutEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Center, Environment, Lightformer, Text3D } from "@react-three/drei";
import * as THREE from "three";
import SceneCanvas from "./SceneCanvas";
import { pointer } from "@/lib/pointer";
import { useQualitySettings } from "@/hooks/useQuality";

const FLOOR = -2.45;
const HALF_W = 3.3;
const Z_MIN = -1.1;
const Z_MAX = 1.3;
const GRAVITY = 9.5;

type Kind = "coin" | "ticket";

type Sim = {
  n: number;
  kind: Kind;
  pos: Float32Array;
  vel: Float32Array;
  rot: Float32Array;
  ang: Float32Array;
  scale: Float32Array;
  rest: Float32Array;
  life: Float32Array;
  jitter: Float32Array;
};

const radius = (kind: Kind) => (kind === "coin" ? 0.3 : 0.2);

function makeSim(n: number, kind: Kind): Sim {
  return {
    n,
    kind,
    pos: new Float32Array(n * 3),
    vel: new Float32Array(n * 3),
    rot: new Float32Array(n * 3),
    ang: new Float32Array(n * 3),
    scale: new Float32Array(n).fill(1),
    rest: new Float32Array(n),
    life: new Float32Array(n),
    jitter: new Float32Array(n),
  };
}

function spawn(s: Sim, i: number, initial: boolean) {
  const r = Math.random;
  s.pos[i * 3] = (r() - 0.5) * 2 * (HALF_W - 0.2);
  s.pos[i * 3 + 1] = initial ? 3.5 + r() * 16 : 7 + r() * 5;
  s.pos[i * 3 + 2] = Z_MIN + r() * (Z_MAX - Z_MIN);
  s.vel[i * 3] = (r() - 0.5) * 0.8;
  s.vel[i * 3 + 1] = -r() * 1.5;
  s.vel[i * 3 + 2] = (r() - 0.5) * 0.4;
  s.rot[i * 3] = r() * 6.28;
  s.rot[i * 3 + 1] = r() * 6.28;
  s.rot[i * 3 + 2] = r() * 6.28;
  s.ang[i * 3] = (r() - 0.5) * 9;
  s.ang[i * 3 + 1] = (r() - 0.5) * 6;
  s.ang[i * 3 + 2] = (r() - 0.5) * 9;
  s.scale[i] = 1;
  s.rest[i] = 0;
  s.life[i] = 3 + r() * 3;
  s.jitter[i] = r() * 0.22;
}

/** Hand-rolled rigid-ish physics: gravity, floor bounce with restitution, walls, and the "$30" slab. */
function step(s: Sim, i: number, dt: number, box: THREE.Box3 | null) {
  const p = s.pos;
  const v = s.vel;
  const a = s.ang;
  const rot = s.rot;
  const r = radius(s.kind);
  const k = i * 3;

  v[k + 1] -= GRAVITY * dt;
  p[k] += v[k] * dt;
  p[k + 1] += v[k + 1] * dt;
  p[k + 2] += v[k + 2] * dt;
  rot[k] += a[k] * dt;
  rot[k + 1] += a[k + 1] * dt;
  rot[k + 2] += a[k + 2] * dt;

  // the slab: push out along the axis of least penetration
  if (box && p[k + 1] < box.max.y + r && p[k + 1] > box.min.y - r) {
    const cx = (box.max.x + box.min.x) / 2;
    const hx = (box.max.x - box.min.x) / 2 + r;
    const hy = (box.max.y - box.min.y) / 2 + r;
    const cy = (box.max.y + box.min.y) / 2;
    const dx = p[k] - cx;
    const dy = p[k + 1] - cy;
    const inZ = p[k + 2] > box.min.z - r && p[k + 2] < box.max.z + r;
    if (inZ && Math.abs(dx) < hx && Math.abs(dy) < hy) {
      const penX = hx - Math.abs(dx);
      const penY = hy - Math.abs(dy);
      if (penY < penX) {
        p[k + 1] = cy + Math.sign(dy || 1) * hy;
        v[k + 1] = Math.abs(v[k + 1]) * 0.42 * Math.sign(dy || 1);
        v[k] += (Math.random() - 0.5) * 1.6;
        a[k] *= 0.6;
        a[k + 2] *= 0.6;
      } else {
        p[k] = cx + Math.sign(dx || 1) * hx;
        v[k] = Math.abs(v[k]) * 0.5 * Math.sign(dx || 1);
      }
    }
  }

  // side walls
  if (Math.abs(p[k]) > HALF_W) {
    p[k] = Math.sign(p[k]) * HALF_W;
    v[k] *= -0.4;
  }
  if (p[k + 2] > Z_MAX || p[k + 2] < Z_MIN) {
    p[k + 2] = THREE.MathUtils.clamp(p[k + 2], Z_MIN, Z_MAX);
    v[k + 2] *= -0.4;
  }

  // floor
  const floorY = FLOOR + r * 0.3 + s.jitter[i];
  if (p[k + 1] < floorY) {
    p[k + 1] = floorY;
    if (v[k + 1] < -1) {
      v[k + 1] = -v[k + 1] * 0.45;
      v[k] *= 0.8;
      v[k + 2] *= 0.8;
      a[k] *= 0.7;
      a[k + 1] *= 0.7;
      a[k + 2] *= 0.7;
    } else {
      v[k + 1] = 0;
      const damp = Math.max(0, 1 - 5 * dt);
      v[k] *= damp;
      v[k + 2] *= damp;
      a[k] *= damp;
      a[k + 1] *= damp;
      a[k + 2] *= damp;
      // settle flat
      const flatX = s.kind === "ticket" ? Math.PI / 2 : 0;
      rot[k] = THREE.MathUtils.damp(rot[k], Math.round((rot[k] - flatX) / Math.PI) * Math.PI + flatX, 8, dt);
      rot[k + 2] = THREE.MathUtils.damp(rot[k + 2], Math.round(rot[k + 2] / Math.PI) * Math.PI, 8, dt);
      s.rest[i] += dt;
    }
  }

  // fade out after resting a while, then rain again from the top
  if (s.rest[i] > s.life[i]) {
    s.scale[i] -= dt * 2.2;
    if (s.scale[i] <= 0) spawn(s, i, false);
  }
}

const dummy = new THREE.Object3D();

function writeMatrices(mesh: THREE.InstancedMesh, s: Sim, base: number) {
  for (let i = 0; i < s.n; i++) {
    dummy.position.set(s.pos[i * 3], s.pos[i * 3 + 1], s.pos[i * 3 + 2]);
    dummy.rotation.set(s.rot[i * 3], s.rot[i * 3 + 1], s.rot[i * 3 + 2]);
    dummy.scale.setScalar(Math.max(0.0001, s.scale[i]) * base);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;
}

/* ---------- coins + tickets ---------- */

function Rain({ coins, tickets, box, physics, animate }: { coins: number; tickets: number; box: React.RefObject<THREE.Box3 | null>; physics: boolean; animate: boolean }) {
  const coinMesh = useRef<THREE.InstancedMesh>(null);
  const ticketMesh = useRef<THREE.InstancedMesh>(null);

  const sims = useMemo(() => {
    const c = makeSim(coins, "coin");
    const t = makeSim(tickets, "ticket");
    const rnd = Math.random;
    for (const s of [c, t]) {
      for (let i = 0; i < s.n; i++) {
        spawn(s, i, true);
        if (!physics) {
          // frozen "mid-fountain" arrangement for phones / reduced motion
          s.pos[i * 3] = (rnd() - 0.5) * 2 * (HALF_W - 0.3);
          s.pos[i * 3 + 1] = FLOOR + 0.2 + Math.pow(rnd(), 1.6) * 5.2;
          s.pos[i * 3 + 2] = Z_MIN + rnd() * (Z_MAX - Z_MIN);
          s.ang[i * 3] = (rnd() - 0.5) * 1.2;
          s.ang[i * 3 + 1] = (rnd() - 0.5) * 1.2;
          s.ang[i * 3 + 2] = 0;
        }
      }
    }
    return { c, t };
  }, [coins, tickets, physics]);

  useLayoutEffect(() => {
    const palette = ["#4CC9F0", "#eef2fa", "#FFB703", "#4CC9F0"].map((c) => new THREE.Color(c));
    if (ticketMesh.current) {
      for (let i = 0; i < sims.t.n; i++) ticketMesh.current.setColorAt(i, palette[i % palette.length]);
      if (ticketMesh.current.instanceColor) ticketMesh.current.instanceColor.needsUpdate = true;
    }
    if (coinMesh.current) writeMatrices(coinMesh.current, sims.c, 1);
    if (ticketMesh.current) writeMatrices(ticketMesh.current, sims.t, 1);
  }, [sims]);

  useFrame(({ clock }, dtRaw) => {
    if (!animate) return;
    const dt = Math.min(dtRaw, 1 / 30);
    if (physics) {
      for (let i = 0; i < sims.c.n; i++) step(sims.c, i, dt, box.current);
      for (let i = 0; i < sims.t.n; i++) step(sims.t, i, dt, box.current);
    } else {
      // no physics: just a slow weightless drift
      const t = clock.elapsedTime;
      for (const s of [sims.c, sims.t]) {
        for (let i = 0; i < s.n; i++) {
          s.rot[i * 3] += s.ang[i * 3] * dt * 0.5;
          s.rot[i * 3 + 1] += s.ang[i * 3 + 1] * dt * 0.5;
          s.pos[i * 3 + 1] += Math.sin(t * 0.8 + i) * dt * 0.12;
        }
      }
    }
    if (coinMesh.current) writeMatrices(coinMesh.current, sims.c, 1);
    if (ticketMesh.current) writeMatrices(ticketMesh.current, sims.t, 1);
  });

  return (
    <>
      {coins > 0 && (
        <instancedMesh ref={coinMesh} args={[undefined, undefined, coins]} frustumCulled={false}>
          <cylinderGeometry args={[0.3, 0.3, 0.07, 22]} />
          <meshStandardMaterial color="#ffc21a" metalness={1} roughness={0.3} envMapIntensity={1.3} />
        </instancedMesh>
      )}
      {tickets > 0 && (
        <instancedMesh ref={ticketMesh} args={[undefined, undefined, tickets]} frustumCulled={false}>
          <boxGeometry args={[0.52, 0.3, 0.025]} />
          <meshStandardMaterial color="#ffffff" metalness={0.2} roughness={0.5} />
        </instancedMesh>
      )}
    </>
  );
}

/* ---------- the extruded $30 ---------- */

function Price({ box, animate }: { box: React.RefObject<THREE.Box3 | null>; animate: boolean }) {
  const group = useRef<THREE.Group>(null);
  const measured = useRef(false);

  useFrame(({ clock }, dt) => {
    const g = group.current;
    if (!g) return;
    if (!measured.current) {
      g.updateWorldMatrix(true, true);
      const b = new THREE.Box3().setFromObject(g);
      if (b.max.x - b.min.x > 0.5) {
        // shrink slightly so coins land on the glyph tops rather than hover above the bounding box corners
        b.expandByVector(new THREE.Vector3(-0.15, -0.2, 0));
        box.current = b;
        measured.current = true;
      }
    }
    if (!animate) return;
    const t = clock.elapsedTime;
    g.rotation.y = THREE.MathUtils.damp(g.rotation.y, Math.sin(t * 0.45) * 0.18 + pointer.x * 0.22, 3, dt);
    g.rotation.x = THREE.MathUtils.damp(g.rotation.x, -pointer.y * 0.1, 3, dt);
  });

  return (
    <group ref={group} position={[0, -0.05, 0]}>
      <Center>
        <Text3D
          font="/fonts/space-grotesk-bold.typeface.json"
          size={2}
          height={0.62}
          curveSegments={10}
          bevelEnabled
          bevelThickness={0.07}
          bevelSize={0.05}
          bevelSegments={5}
          letterSpacing={0.05}
        >
          {"$30"}
          <meshStandardMaterial color="#ffb703" metalness={1} roughness={0.22} envMapIntensity={1.6} />
        </Text3D>
      </Center>
    </group>
  );
}

function Fit() {
  const { camera, size, invalidate } = useThree();
  useLayoutEffect(() => {
    const aspect = size.width / size.height;
    camera.position.set(0, 0.7, THREE.MathUtils.clamp(11.6 / aspect, 8.6, 19));
    camera.lookAt(0, 0.2, 0);
    invalidate();
  }, [camera, size, invalidate]);
  return null;
}

function Composition() {
  const { quality, coins, tickets } = useQualitySettings();
  const animate = quality !== "static";
  const physics = coins > 0;
  const box = useRef<THREE.Box3 | null>(null);

  // phones / reduced motion keep a frozen scatter instead of simulating
  const nCoins = physics ? coins : 22;
  const nTickets = physics ? tickets : 12;

  return (
    <>
      <Fit />
      <ambientLight intensity={0.5} color="#9db8ff" />
      <directionalLight position={[4, 6, 6]} intensity={2.2} color="#fff0d2" />
      <pointLight position={[-6, 1, 4]} intensity={30} color="#4CC9F0" />
      <Environment resolution={256} frames={1}>
        {/* big warm softbox behind the camera so front faces reflect light, plus top and side strips */}
        <Lightformer form="rect" intensity={2.6} color="#fff0cf" position={[0, 1, 9]} scale={[16, 9, 1]} target={[0, 0, 0]} />
        <Lightformer form="rect" intensity={4} color="#ffffff" position={[0, 6, 2]} scale={[14, 3, 1]} target={[0, 0, 0]} />
        <Lightformer form="rect" intensity={1.6} color="#7fd8f5" position={[-7, 1, 3]} scale={[6, 6, 1]} target={[0, 0, 0]} />
        <Lightformer form="rect" intensity={2.4} color="#ffb703" position={[7, 0, 3]} scale={[6, 6, 1]} target={[0, 0, 0]} />
      </Environment>

      <Suspense fallback={null}>
        <Price box={box} animate={animate} />
      </Suspense>
      <Rain coins={nCoins} tickets={nTickets} box={box} physics={physics} animate={animate} />

      {/* landing glow */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, FLOOR - 0.02, 0]}>
        <circleGeometry args={[3.5, 48]} />
        <meshBasicMaterial color="#4CC9F0" transparent opacity={0.07} depthWrite={false} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, FLOOR - 0.01, 0]}>
        <ringGeometry args={[2.9, 2.95, 64]} />
        <meshBasicMaterial color="#FFB703" transparent opacity={0.35} depthWrite={false} />
      </mesh>
    </>
  );
}

export default function PaymentScene() {
  return (
    <SceneCanvas
      className="absolute inset-0"
      flat={false}
      camera={{ position: [0, 0.7, 9.5], fov: 38 }}
      fallback={
        <div aria-hidden className="grid h-full place-items-center font-display text-[7rem] font-bold leading-none text-gradient sm:text-[10rem]">
          $30
        </div>
      }
    >
      <Composition />
    </SceneCanvas>
  );
}
