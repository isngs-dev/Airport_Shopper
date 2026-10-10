import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import SceneCanvas from "./SceneCanvas";
import Airplane from "./Airplane";
import { pointer } from "@/lib/pointer";
import { useQualitySettings } from "@/hooks/useQuality";

/* ---------- helpers ---------- */

function mulberry(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function latLon(lat: number, lon: number, r: number) {
  const phi = ((90 - lat) * Math.PI) / 180;
  const theta = ((lon + 180) * Math.PI) / 180;
  return new THREE.Vector3(-r * Math.sin(phi) * Math.cos(theta), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(theta));
}

// generic hub cities used as flight-arc anchors
const HUBS: [number, number][] = [
  [40.7, -74], [51.5, -0.1], [25.2, 55.3], [1.35, 103.8], [35.7, 139.7], [-33.9, 151.2], [-23.5, -46.6], [-26.2, 28],
  [34, -118], [50, 8.7], [19, 72.8], [6.5, 3.4], [19.4, -99.1], [43.7, -79.4], [22.3, 114.2], [41, 29],
];
const ROUTES: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 4], [4, 8], [8, 0], [1, 7], [2, 10], [5, 3], [6, 0], [9, 15], [13, 1], [14, 5], [11, 1], [12, 8], [10, 14],
];

/* ---------- globe ---------- */

const arcVert = /* glsl */ `
  varying float vU;
  void main() { vU = uv.x; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;
const arcFrag = /* glsl */ `
  uniform float uTime; uniform float uOffset; uniform float uSpeed; uniform vec3 uHead; uniform vec3 uTail;
  varying float vU;
  void main() {
    float head = fract(uTime * uSpeed + uOffset);
    float d = fract(head - vU);
    float pulse = exp(-d * 9.0);
    float base = 0.14 + 0.12 * sin(vU * 3.14159);
    vec3 col = mix(uTail, uHead, pulse);
    gl_FragColor = vec4(col * (1.0 + pulse), base + pulse * 0.85);
  }
`;
const atmoVert = /* glsl */ `
  varying vec3 vN;
  void main() { vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;
const atmoFrag = /* glsl */ `
  varying vec3 vN;
  void main() {
    // rim glow only: bright where the surface turns edge-on to the camera, nothing over the globe face
    float i = pow(max(0.0, 1.0 - abs(dot(normalize(vN), vec3(0.0, 0.0, 1.0)))), 3.2);
    gl_FragColor = vec4(0.30, 0.79, 0.94, 1.0) * i * 0.9;
  }
`;

const GLOBE_R = 3;

function Globe({ arcs, animate }: { arcs: number; animate: boolean }) {
  const group = useRef<THREE.Group>(null);
  const uTime = useMemo(() => ({ value: 0 }), []);

  const { wire, dots, nodes, arcMeshes } = useMemo(() => {
    // lat / lon graticule
    const seg: number[] = [];
    const ring = (fn: (a: number) => THREE.Vector3) => {
      const n = 96;
      let prev = fn(0);
      for (let i = 1; i <= n; i++) {
        const p = fn((i / n) * Math.PI * 2);
        seg.push(prev.x, prev.y, prev.z, p.x, p.y, p.z);
        prev = p;
      }
    };
    for (let lat = -75; lat <= 75; lat += 15) {
      const y = Math.sin((lat * Math.PI) / 180) * GLOBE_R;
      const r = Math.cos((lat * Math.PI) / 180) * GLOBE_R;
      ring((a) => new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r));
    }
    for (let lon = 0; lon < 180; lon += 15) {
      const c = Math.cos((lon * Math.PI) / 180);
      const s = Math.sin((lon * Math.PI) / 180);
      ring((a) => new THREE.Vector3(Math.cos(a) * GLOBE_R * c, Math.sin(a) * GLOBE_R, Math.cos(a) * GLOBE_R * s));
    }
    const wireGeo = new THREE.BufferGeometry();
    wireGeo.setAttribute("position", new THREE.Float32BufferAttribute(seg, 3));

    // fibonacci dot lattice
    const n = 1100;
    const dp: number[] = [];
    for (let i = 0; i < n; i++) {
      const y = 1 - (i / (n - 1)) * 2;
      const r = Math.sqrt(1 - y * y);
      const th = i * 2.399963;
      dp.push(Math.cos(th) * r * GLOBE_R * 1.002, y * GLOBE_R * 1.002, Math.sin(th) * r * GLOBE_R * 1.002);
    }
    const dotGeo = new THREE.BufferGeometry();
    dotGeo.setAttribute("position", new THREE.Float32BufferAttribute(dp, 3));

    const nodePos = HUBS.map(([la, lo]) => latLon(la, lo, GLOBE_R * 1.01));

    const arcList = ROUTES.map(([a, b], i) => {
      const va = nodePos[a].clone().normalize();
      const vb = nodePos[b].clone().normalize();
      const angle = va.angleTo(vb);
      const pts: THREE.Vector3[] = [];
      const steps = 48;
      for (let k = 0; k <= steps; k++) {
        const t = k / steps;
        const p = new THREE.Vector3().copy(va).lerp(vb, t).normalize();
        pts.push(p.multiplyScalar(GLOBE_R * 1.012 + Math.sin(Math.PI * t) * (0.18 + angle * 0.5)));
      }
      const tube = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 72, 0.012, 4, false);
      return { tube, offset: (i * 0.137) % 1, speed: 0.16 + ((i * 53) % 10) * 0.012 };
    });

    return { wire: wireGeo, dots: dotGeo, nodes: nodePos, arcMeshes: arcList };
  }, []);

  useFrame((_, dt) => {
    if (!animate) return;
    uTime.value += dt;
    if (group.current) group.current.rotation.y += dt * 0.07;
  });

  return (
    <group ref={group} rotation={[0.38, -0.6, 0.12]}>
      <mesh>
        <sphereGeometry args={[GLOBE_R * 0.995, 48, 32]} />
        <meshBasicMaterial color="#0b1a40" transparent opacity={0.6} depthWrite={false} />
      </mesh>
      <lineSegments geometry={wire}>
        <lineBasicMaterial color="#4CC9F0" transparent opacity={0.3} depthWrite={false} />
      </lineSegments>
      <points geometry={dots}>
        <pointsMaterial color="#9fe3fa" size={0.028} sizeAttenuation transparent opacity={0.55} depthWrite={false} />
      </points>
      {nodes.map((p, i) => (
        <mesh key={i} position={p}>
          <sphereGeometry args={[0.05, 10, 8]} />
          <meshBasicMaterial color="#FFB703" toneMapped={false} />
        </mesh>
      ))}
      {arcMeshes.slice(0, arcs).map((a, i) => (
        <mesh key={i} geometry={a.tube}>
          <shaderMaterial
            vertexShader={arcVert}
            fragmentShader={arcFrag}
            transparent
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            uniforms={{
              uTime,
              uOffset: { value: a.offset },
              uSpeed: { value: a.speed },
              uHead: { value: new THREE.Color("#FFB703") },
              uTail: { value: new THREE.Color("#4CC9F0") },
            }}
          />
        </mesh>
      ))}
    </group>
  );
}

function Atmosphere() {
  return (
    <mesh scale={1.18}>
      <sphereGeometry args={[GLOBE_R, 48, 32]} />
      <shaderMaterial vertexShader={atmoVert} fragmentShader={atmoFrag} transparent depthWrite={false} side={THREE.BackSide} blending={THREE.AdditiveBlending} />
    </mesh>
  );
}

/* ---------- clouds ---------- */

function useCloudTexture() {
  return useMemo(() => {
    const size = 256;
    const c = document.createElement("canvas");
    c.width = c.height = size;
    const ctx = c.getContext("2d")!;
    const rnd = mulberry(7);
    for (let i = 0; i < 16; i++) {
      // keep every puff well inside the texture so no quad edge is ever visible
      const x = size * (0.3 + rnd() * 0.4);
      const y = size * (0.4 + rnd() * 0.2);
      const r = size * (0.1 + rnd() * 0.1);
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, "rgba(255,255,255,0.55)");
      g.addColorStop(0.55, "rgba(255,255,255,0.2)");
      g.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, size, size);
    }
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, []);
}

function Clouds({ count, animate }: { count: number; animate: boolean }) {
  const tex = useCloudTexture();
  const refs = useRef<(THREE.Sprite | null)[]>([]);
  const cool = useMemo(() => new THREE.SpriteMaterial({ map: tex, color: "#8fb0e6", transparent: true, opacity: 0.3, depthWrite: false }), [tex]);
  const warm = useMemo(() => new THREE.SpriteMaterial({ map: tex, color: "#ffd2a0", transparent: true, opacity: 0.2, depthWrite: false }), [tex]);

  const items = useMemo(() => {
    const rnd = mulberry(21);
    return Array.from({ length: count }, (_, i) => ({
      x: (rnd() - 0.5) * 30,
      y: (rnd() - 0.5) * 9,
      z: -12 + rnd() * 16,
      sx: 5 + rnd() * 5,
      sy: 2.8 + rnd() * 2.4,
      v: 0.12 + rnd() * 0.3,
      warm: i % 4 === 0,
    }));
  }, [count]);

  useFrame((_, dt) => {
    if (!animate) return;
    items.forEach((c, i) => {
      c.x += c.v * dt;
      if (c.x > 17) c.x = -17;
      refs.current[i]?.position.set(c.x, c.y, c.z);
    });
  });

  return (
    <group>
      {items.map((c, i) => (
        <sprite
          key={i}
          ref={(s) => {
            refs.current[i] = s;
          }}
          position={[c.x, c.y, c.z]}
          scale={[c.sx, c.sy, 1]}
          material={c.warm ? warm : cool}
        />
      ))}
    </group>
  );
}

/* ---------- light beams + dust ---------- */

const beamVert = /* glsl */ `
  varying vec3 vN; varying vec3 vV; varying float vH;
  void main() {
    vH = position.y / 12.0 + 0.5;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`;
const beamFrag = /* glsl */ `
  uniform vec3 uColor; uniform float uTime;
  varying vec3 vN; varying vec3 vV; varying float vH;
  void main() {
    float f = pow(abs(dot(normalize(vN), normalize(vV))), 1.6);
    float a = f * pow(vH, 1.5) * (0.30 + 0.05 * sin(uTime * 0.8));
    gl_FragColor = vec4(uColor, a);
  }
`;

function Beam({ position, rotation, color, animate, phase }: { position: [number, number, number]; rotation: number; color: string; animate: boolean; phase: number }) {
  const ref = useRef<THREE.Mesh>(null);
  const uni = useMemo(() => ({ uColor: { value: new THREE.Color(color) }, uTime: { value: 0 } }), [color]);
  useFrame(({ clock }) => {
    if (!animate || !ref.current) return;
    uni.uTime.value = clock.elapsedTime;
    ref.current.rotation.z = rotation + Math.sin(clock.elapsedTime * 0.25 + phase) * 0.12;
  });
  return (
    <mesh ref={ref} position={position} rotation={[0, 0, rotation]}>
      {/* apex (narrow end) is the source, the wide open end fades into the sky */}
      <coneGeometry args={[2.1, 12, 40, 1, true]} />
      <shaderMaterial vertexShader={beamVert} fragmentShader={beamFrag} uniforms={uni} transparent depthWrite={false} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} />
    </mesh>
  );
}

const dustVert = /* glsl */ `
  uniform float uTime; uniform float uPx;
  attribute float aSeed; varying float vA; varying float vC;
  void main() {
    vec3 p = position;
    p.y = mod(p.y + uTime * (0.08 + aSeed * 0.18) + 6.0, 12.0) - 6.0;
    p.x += sin(uTime * 0.3 + aSeed * 40.0) * 0.25;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_PointSize = (1.2 + aSeed * 2.4) * uPx * (9.0 / -mv.z);
    vA = 0.25 + 0.55 * (0.5 + 0.5 * sin(uTime * (0.6 + aSeed) + aSeed * 30.0));
    vC = step(0.55, aSeed);
    gl_Position = projectionMatrix * mv;
  }
`;
const dustFrag = /* glsl */ `
  varying float vA; varying float vC;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    if (d > 0.5) discard;
    vec3 col = mix(vec3(1.0, 0.72, 0.15), vec3(0.3, 0.79, 0.94), vC);
    gl_FragColor = vec4(col, vA * smoothstep(0.5, 0.0, d));
  }
`;

function Dust({ count, animate }: { count: number; animate: boolean }) {
  const { geo, uni } = useMemo(() => {
    const rnd = mulberry(99);
    const pos = new Float32Array(count * 3);
    const seed = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (rnd() - 0.5) * 24;
      pos[i * 3 + 1] = (rnd() - 0.5) * 12;
      pos[i * 3 + 2] = (rnd() - 0.5) * 14 - 1;
      seed[i] = rnd();
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("aSeed", new THREE.BufferAttribute(seed, 1));
    return { geo: g, uni: { uTime: { value: 0 }, uPx: { value: 1 } } };
  }, [count]);
  const dprRef = useThree((s) => s.viewport.dpr);
  useFrame(({ clock }) => {
    uni.uPx.value = dprRef;
    if (animate) uni.uTime.value = clock.elapsedTime;
  });
  return (
    <points geometry={geo} frustumCulled={false}>
      <shaderMaterial vertexShader={dustVert} fragmentShader={dustFrag} uniforms={uni} transparent depthWrite={false} blending={THREE.AdditiveBlending} />
    </points>
  );
}

/* ---------- plane on a curved path, with contrail ---------- */

const trailVert = /* glsl */ `
  attribute float aAge; uniform float uPx; varying float vA;
  void main() {
    vA = pow(1.0 - aAge, 1.6);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = (5.0 + aAge * 16.0) * uPx * (9.0 / -mv.z);
    gl_Position = projectionMatrix * mv;
  }
`;
const trailFrag = /* glsl */ `
  varying float vA;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    if (d > 0.5) discard;
    gl_FragColor = vec4(0.82, 0.93, 1.0, vA * 0.38 * smoothstep(0.5, 0.05, d));
  }
`;

const TRAIL = 90;

function FlyingPlane({ wide, animate }: { wide: boolean; animate: boolean }) {
  const plane = useRef<THREE.Group>(null);
  const t = useRef(0.1);
  const dpr = useThree((s) => s.viewport.dpr);

  const curve = useMemo(() => {
    const k = wide ? 1 : 0.62;
    const ox = wide ? 1.9 : 0;
    const oy = wide ? 0 : -0.6;
    const pts: [number, number, number][] = [
      [-5.6, -0.7, 1.4], [-3.1, 1.6, -0.6], [0.4, 0.5, 1.6], [3.6, 2.0, -0.4], [6.0, 0.1, 1.0],
      [4.0, -1.9, 2.2], [0.6, -2.1, 1.0], [-3.2, -2.1, 2.0],
    ];
    return new THREE.CatmullRomCurve3(
      pts.map(([x, y, z]) => new THREE.Vector3(x * k + ox, y * k + oy, z)),
      true,
      "catmullrom",
      0.5,
    );
  }, [wide]);

  const trail = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(TRAIL * 3).fill(999), 3));
    geo.setAttribute("aAge", new THREE.BufferAttribute(new Float32Array(TRAIL).fill(1), 1));
    return { geo, uni: { uPx: { value: 1 } }, head: { i: 0, last: new THREE.Vector3(999, 0, 0) } };
  }, []);

  const tmp = useMemo(() => ({ p: new THREE.Vector3(), tg: new THREE.Vector3(), tg2: new THREE.Vector3(), look: new THREE.Vector3(), q: new THREE.Quaternion() }), []);

  const place = (u: number) => {
    const g = plane.current;
    if (!g) return;
    curve.getPointAt(u, tmp.p);
    curve.getTangentAt(u, tmp.tg);
    curve.getTangentAt((u + 0.012) % 1, tmp.tg2);
    g.position.copy(tmp.p);
    tmp.look.copy(tmp.p).add(tmp.tg);
    g.lookAt(tmp.look);
    const turn = tmp.tg.x * tmp.tg2.z - tmp.tg.z * tmp.tg2.x;
    const bank = THREE.MathUtils.clamp(-turn * 55, -0.55, 0.55);
    g.rotateZ(bank);
  };

  // initial pose (also the only pose in reduced-motion / static mode)
  useEffect(() => {
    place(t.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [curve]);

  useFrame((_, dt) => {
    trail.uni.uPx.value = dpr;
    if (!animate) return;
    t.current = (t.current + dt * 0.032) % 1;
    place(t.current);
    const g = plane.current;
    if (!g) return;
    // emit a trail puff every ~0.07 world units
    tmp.p.copy(g.position).addScaledVector(tmp.tg, -0.55);
    if (tmp.p.distanceTo(trail.head.last) > 0.07) {
      const pos = trail.geo.attributes.position as THREE.BufferAttribute;
      trail.head.i = (trail.head.i + 1) % TRAIL;
      pos.setXYZ(trail.head.i, tmp.p.x, tmp.p.y, tmp.p.z);
      pos.needsUpdate = true;
      trail.head.last.copy(tmp.p);
      const age = trail.geo.attributes.aAge as THREE.BufferAttribute;
      for (let i = 0; i < TRAIL; i++) age.setX(i, ((trail.head.i - i + TRAIL) % TRAIL) / TRAIL);
      age.needsUpdate = true;
    }
  });

  return (
    <>
      <Airplane ref={plane} scale={0.5} animate={animate} />
      <points geometry={trail.geo} frustumCulled={false}>
        <shaderMaterial vertexShader={trailVert} fragmentShader={trailFrag} uniforms={trail.uni} transparent depthWrite={false} />
      </points>
    </>
  );
}

/* ---------- camera rig ---------- */

function Rig({ animate }: { animate: boolean }) {
  useFrame((state, dt) => {
    if (!animate) return;
    const c = state.camera;
    c.position.x = THREE.MathUtils.damp(c.position.x, pointer.x * 0.9, 3, dt);
    c.position.y = THREE.MathUtils.damp(c.position.y, pointer.y * 0.55, 3, dt);
    c.lookAt(0, 0, 0);
  });
  return null;
}

function Composition() {
  const { quality, heroDust, clouds, globeArcs } = useQualitySettings();
  const aspect = useThree((s) => s.size.width / s.size.height);
  const wide = aspect > 1.0;
  const animate = quality !== "static";

  const globePos: [number, number, number] = wide ? [4.1, 0, -4] : [0, 1.7, -4];
  const globeScale = wide ? 1.0 : 0.72;

  return (
    <>
      <ambientLight intensity={0.9} color="#9db8ff" />
      <directionalLight position={[5, 6, 6]} intensity={2.4} color="#fff1d6" />
      <pointLight position={[-7, -2, 5]} intensity={40} color="#4CC9F0" />
      <pointLight position={[6, -4, 4]} intensity={30} color="#FFB703" />

      <Rig animate={animate} />
      <group position={globePos} scale={globeScale}>
        <Globe arcs={globeArcs} animate={animate} />
        <Atmosphere />
      </group>
      <Beam position={[-9, -6.5, -7]} rotation={-0.55} color="#FFB703" animate={animate} phase={0} />
      <Beam position={[10, -6.5, -9]} rotation={0.6} color="#4CC9F0" animate={animate} phase={2} />
      <Clouds count={clouds} animate={animate} />
      <Dust count={heroDust} animate={animate} />
      <FlyingPlane wide={wide} animate={animate} />
    </>
  );
}

export default function HeroScene({ onReady }: { onReady?: (ready: boolean) => void }) {
  return (
    <SceneCanvas className="absolute inset-0" eager camera={{ position: [0, 0, 12], fov: 40 }} flat={false} onReady={onReady}>
      <Composition />
    </SceneCanvas>
  );
}
