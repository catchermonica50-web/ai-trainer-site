'use client';

import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';

type Props = { src: string; onReady: () => void };

/** Height of the silhouette in world units; width follows the sampled crop's aspect. */
const HEIGHT = 3.4;
/** Crop aspect (w/h) of the sampled still, from reports/stage-3/measure/sample-mech-points.py. */
const ASPECT = 480 / 988;
/** Neck pivot for head rotation, as a fraction of height from the top. */
const NECK = 0.135;
const VISOR = 0.11;

type Points = {
  pos: Float32Array;
  weight: Float32Array;
  region: Float32Array;
  count: number;
};

/** Decode: uint32 count, then per point uint16 x, uint16 y, uint8 weight, uint8 region. */
function decode(buf: ArrayBuffer): Points {
  const v = new DataView(buf);
  const count = v.getUint32(0, true);
  const pos = new Float32Array(count * 3);
  const weight = new Float32Array(count);
  const region = new Float32Array(count);
  const w = HEIGHT * ASPECT;
  for (let i = 0; i < count; i++) {
    const o = 4 + i * 6;
    const x = v.getUint16(o, true) / 65535;
    const y = v.getUint16(o + 2, true) / 65535;
    pos[i * 3] = (x - 0.5) * w;
    pos[i * 3 + 1] = (0.5 - y) * HEIGHT;
    // Small depth jitter so the head turn reads as a rotation, not a slide.
    pos[i * 3 + 2] = ((Math.sin(i * 12.9898) * 43758.5453) % 1) * 0.12;
    weight[i] = v.getUint8(o + 4) / 255;
    region[i] = v.getUint8(o + 5);
  }
  return { pos, weight, region, count };
}

const vertex = /* glsl */ `
  attribute float aWeight;
  attribute float aRegion;
  uniform vec3 uPivot;
  uniform vec2 uLook;
  uniform float uNear;
  uniform float uSize;
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    vec3 p = position;
    if (aRegion > 0.5) {
      // Head + visor: yaw/pitch about the neck pivot, plus a small offset toward the pointer.
      vec3 q = p - uPivot;
      float cy = cos(uLook.x), sy = sin(uLook.x);
      q = vec3(cy * q.x + sy * q.z, q.y, -sy * q.x + cy * q.z);
      float cx = cos(uLook.y), sx = sin(uLook.y);
      q = vec3(q.x, cx * q.y - sx * q.z, sx * q.y + cx * q.z);
      p = q + uPivot + vec3(uLook.x * 0.08, uLook.y * 0.05, 0.0);
    }
    vec3 body = vec3(0.62, 0.68, 0.75);
    vec3 ice = vec3(0.373, 0.831, 1.0);
    bool visor = aRegion > 1.5;
    vColor = visor ? mix(ice * 0.55, ice * 1.6, uNear) : body * (0.45 + aWeight * 0.8);
    vAlpha = visor ? 0.75 + 0.25 * uNear : 0.35 + aWeight * 0.5;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = uSize * (visor ? 1.0 + uNear * 0.6 : 1.0) * (6.0 / -mv.z);
  }
`;

const fragment = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = dot(c, c);
    if (d > 0.25) discard;
    gl_FragColor = vec4(vColor, vAlpha * (1.0 - d * 4.0));
  }
`;

function usePointer() {
  const p = useRef({ x: 0, y: 0, active: false });
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      p.current.x = e.clientX;
      p.current.y = e.clientY;
      p.current.active = true;
    };
    window.addEventListener('pointermove', onMove);
    return () => window.removeEventListener('pointermove', onMove);
  }, []);
  return p;
}

function Mech({ data, onReady }: { data: Points; onReady: () => void }) {
  const pointer = usePointer();
  const { camera, gl } = useThree();
  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(data.pos, 3));
    g.setAttribute('aWeight', new THREE.BufferAttribute(data.weight, 1));
    g.setAttribute('aRegion', new THREE.BufferAttribute(data.region, 1));
    return g;
  }, [data]);
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: vertex,
        fragmentShader: fragment,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: {
          uPivot: { value: new THREE.Vector3(0, HEIGHT * (0.5 - NECK), 0) },
          uLook: { value: new THREE.Vector2() },
          uNear: { value: 0 },
          uSize: { value: 2.2 * Math.min(1.5, window.devicePixelRatio || 1) },
        },
      }),
    [],
  );
  useEffect(() => () => (geometry.dispose(), material.dispose()), [geometry, material]);
  useEffect(() => onReady(), [onReady]);

  const visorWorld = useMemo(() => new THREE.Vector3(0, HEIGHT * (0.5 - VISOR), 0), []);
  const tmp = useMemo(() => new THREE.Vector3(), []);
  const samples = useRef({ t: 0, n: 0 });

  useFrame((state, delta) => {
    const u = material.uniforms;
    const rect = gl.domElement.getBoundingClientRect();
    // Visor position on screen, for the look direction and the nearness glow.
    tmp.copy(visorWorld).project(camera);
    const vx = rect.left + ((tmp.x + 1) / 2) * rect.width;
    const vy = rect.top + ((1 - tmp.y) / 2) * rect.height;
    const p = pointer.current;
    const dx = p.active ? p.x - vx : 0;
    const dy = p.active ? p.y - vy : 0;
    const dist = Math.hypot(dx, dy);
    const near = p.active ? 1 - Math.min(1, dist / 260) : 0;
    const look = u.uLook.value as THREE.Vector2;
    look.x = THREE.MathUtils.damp(
      look.x,
      THREE.MathUtils.clamp(dx / 600, -1, 1) * 0.6,
      6,
      delta,
    );
    look.y = THREE.MathUtils.damp(
      look.y,
      THREE.MathUtils.clamp(dy / 600, -1, 1) * 0.35,
      6,
      delta,
    );
    u.uNear.value = THREE.MathUtils.damp(u.uNear.value as number, near, 8, delta);
    const s = samples.current;
    s.t += delta;
    s.n += 1;
    if (s.t >= 1) {
      const el = state.gl.domElement;
      el.dataset.fps = (s.n / s.t).toFixed(1);
      el.dataset.near = (u.uNear.value as number).toFixed(2);
      el.dataset.look = `${look.x.toFixed(3)},${look.y.toFixed(3)}`;
      el.dataset.points = String(data.count);
      s.t = 0;
      s.n = 0;
    }
  });

  return <points geometry={geometry} material={material} />;
}

/** Particle silhouette of the intro's last-frame mech; background decoration only. */
export default function ParticleMech({ src, onReady }: Props) {
  const [data, setData] = useState<Points | null>(null);
  const [error, setError] = useState<Error | null>(null);
  useEffect(() => {
    let live = true;
    fetch(src)
      .then((r) => {
        if (!r.ok) throw new Error(`particles ${r.status}`);
        return r.arrayBuffer();
      })
      .then((b) => live && setData(decode(b)))
      .catch((e: Error) => live && setError(e));
    return () => {
      live = false;
    };
  }, [src]);
  // Surface load failures to the error boundary, which drops the decoration.
  if (error) throw error;
  return (
    <Canvas
      className="robot-canvas"
      dpr={[1, 1.5]}
      camera={{ position: [0, 0, 7.5], fov: 35 }}
      gl={{ antialias: false, alpha: true, powerPreference: 'high-performance' }}
    >
      {data && <Mech data={data} onReady={onReady} />}
    </Canvas>
  );
}
