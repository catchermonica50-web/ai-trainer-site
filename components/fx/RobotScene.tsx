'use client';

import { Canvas, useFrame } from '@react-three/fiber';
import { useAnimations, useGLTF } from '@react-three/drei';
import { Suspense, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

type Props = { src: string; onReady: () => void };

const PALETTE = {
  body: new THREE.Color('#2a313b'),
  trim: new THREE.Color('#4a5360'),
  visor: new THREE.Color('#5fd4ff'),
  accent: new THREE.Color('#ff6a2b'),
};

/** Pointer in NDC, shared via window listener (the canvas does not take pointer events). */
function usePointer() {
  const p = useRef({ x: 0, y: 0, active: false });
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      p.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      p.current.y = -(e.clientY / window.innerHeight) * 2 + 1;
      p.current.active = true;
    };
    window.addEventListener('pointermove', onMove);
    return () => window.removeEventListener('pointermove', onMove);
  }, []);
  return p;
}

function Robot({ src, onReady }: Props) {
  const { scene, animations } = useGLTF(src);
  const group = useRef<THREE.Group>(null);
  const pointer = usePointer();
  // Drop head tracks so the head is driven only by the pointer.
  const clips = useMemo(
    () =>
      animations.map((c) => {
        const clip = c.clone();
        clip.tracks = clip.tracks.filter((t) => !t.name.startsWith('Head.'));
        return clip;
      }),
    [animations],
  );
  const { actions } = useAnimations(clips, group);
  const rig = useMemo(() => {
    let visor: THREE.MeshStandardMaterial | undefined;
    scene.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      const next = mats.map((m) => {
        const name = m.name;
        const mat = new THREE.MeshStandardMaterial({ metalness: 0.75, roughness: 0.38 });
        if (name === 'Black') {
          mat.color.set('#05070a');
          mat.emissive.copy(PALETTE.visor);
          mat.emissiveIntensity = 0.6;
          visor = mat;
        } else mat.color.copy(name === 'Grey' ? PALETTE.trim : PALETTE.body);
        return mat;
      });
      mesh.material = Array.isArray(mesh.material) ? next : next[0];
    });
    const head = scene.getObjectByName('Head');
    return { head, base: head?.quaternion.clone(), visor };
  }, [scene]);
  const look = useRef(new THREE.Euler());
  const offset = useRef(new THREE.Quaternion());
  const samples = useRef({ t: 0, n: 0 });

  useEffect(() => {
    actions[Object.keys(actions).find((k) => k.endsWith('Idle')) ?? '']?.play();
    onReady();
  }, [actions, onReady]);

  const fitted = useRef(0);
  useFrame((state, delta) => {
    const { head, base, visor } = rig;
    // Fit once the Idle pose has been applied (bind-pose bones are in source units).
    if (fitted.current < 2) {
      fitted.current++;
      if (fitted.current === 2) fitToFrame(scene);
    }
    const p = pointer.current;
    // Robot sits right of centre; nearness 0..1 from the pointer's distance to it.
    const near = p.active ? 1 - Math.min(1, Math.hypot(p.x - 0.45, p.y - 0.1) / 0.6) : 0;
    const e = look.current;
    e.y = THREE.MathUtils.damp(e.y, p.x * 0.7, 6, delta);
    e.x = THREE.MathUtils.damp(e.x, -p.y * 0.35, 6, delta);
    if (head && base) head.quaternion.copy(base).multiply(offset.current.setFromEuler(e));
    if (visor)
      visor.emissiveIntensity = THREE.MathUtils.damp(
        visor.emissiveIntensity,
        0.6 + near * 2.4,
        8,
        delta,
      );
    if (group.current) {
      group.current.rotation.z = THREE.MathUtils.damp(
        group.current.rotation.z,
        -p.x * near * 0.08,
        5,
        delta,
      );
      group.current.rotation.x = THREE.MathUtils.damp(
        group.current.rotation.x,
        near * 0.06,
        5,
        delta,
      );
    }
    // Rolling fps for automated measurement.
    const s = samples.current;
    s.t += delta;
    s.n += 1;
    if (s.t >= 1) {
      state.gl.domElement.dataset.fps = (s.n / s.t).toFixed(1);
      s.t = 0;
      s.n = 0;
    }
  });

  return (
    <group ref={group}>
      <primitive object={scene} />
    </group>
  );
}

/** Scale/centre from the posed skeleton (precise, skinned): feet at y=-1.6, head 2.7 above. */
function fitToFrame(scene: THREE.Object3D) {
  scene.scale.setScalar(1);
  scene.position.set(0, 0, 0);
  scene.updateMatrixWorld(true);
  // precise=true runs skinning per vertex, so the posed mesh is measured, not the bind pose.
  const box = new THREE.Box3().setFromObject(scene, true);
  if (box.isEmpty()) return;
  const size = box.getSize(new THREE.Vector3());
  const k = 3 / Math.max(1e-6, size.y);
  scene.scale.setScalar(k);
  const c = box.getCenter(new THREE.Vector3());
  scene.position.set(-c.x * k, -1.6 - box.min.y * k, -c.z * k);
}

export default function RobotScene({ src, onReady }: Props) {
  return (
    <Canvas
      className="robot-canvas"
      dpr={[1, 1.5]}
      camera={{ position: [0, 0.2, 7.5], fov: 35 }}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
    >
      <ambientLight intensity={0.35} />
      <directionalLight position={[3, 4, 5]} intensity={1.6} />
      <pointLight position={[-3, 1, 2]} intensity={6} color={PALETTE.accent} />
      <pointLight position={[3, 2, -2]} intensity={5} color={PALETTE.visor} />
      <Suspense fallback={null}>
        <Robot src={src} onReady={onReady} />
      </Suspense>
    </Canvas>
  );
}
