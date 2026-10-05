'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Bloom, ChromaticAberration, EffectComposer, Vignette } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';

import { MONOLITH_FRAG, MONOLITH_VERT } from '@/lib/shaders/monolith';
import { PARTICLE_FRAG, PARTICLE_VERT } from '@/lib/shaders/particles';
import { REGION_PATHS, sampleRegion } from '@/lib/camera/paths';
import { scrollState } from '@/lib/scrollState';
import { palette } from '@/lib/tokens';
import { QUEST_MAP } from '@/lib/quests';
import { useQuestStore } from '@/lib/store/useQuestStore';
import { useUIStore } from '@/lib/store/useUIStore';
import { selectQuality, useGraphicsStore } from '@/lib/store/useGraphicsStore';
import { useShallow } from 'zustand/react/shallow';
import { audio } from '@/lib/audio/engine';
import { clamp, seededRandom } from '@/lib/utils';

/* ------------------------------------------------------------------ *
 * Particle field — stars / dust, animated entirely on the GPU.
 * The buffer is uploaded once; the vertex shader does the rest.
 * ------------------------------------------------------------------ */

interface FieldProps {
  count: number;
  size: number;
  drift: number;
  turbulence: number;
  opacity: number;
  softness: number;
  spread: [number, number, number];
  seed: number;
  near: number;
  far: number;
}

function ParticleField({ count, size, drift, turbulence, opacity, softness, spread, seed, near, far }: FieldProps) {
  const points = useRef<THREE.Points>(null);
  const dpr = useThree((s) => s.viewport.dpr);

  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    const scale = new Float32Array(count);
    const aSeed = new Float32Array(count);
    const mix = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      // Cubic-root distribution keeps density even instead of clumping centrally.
      const r = near + (far - near) * Math.cbrt(seededRandom(i + seed));
      const theta = seededRandom(i * 3.1 + seed) * Math.PI * 2;
      const phi = Math.acos(2 * seededRandom(i * 7.7 + seed) - 1);

      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta) * spread[0];
      pos[i * 3 + 1] = r * Math.cos(phi) * spread[1];
      pos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta) * spread[2];

      scale[i] = 0.35 + seededRandom(i * 11.3 + seed) * 1.5;
      aSeed[i] = seededRandom(i * 17.9 + seed) * 100;
      mix[i] = seededRandom(i * 23.1 + seed);
    }

    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aScale', new THREE.BufferAttribute(scale, 1));
    g.setAttribute('aSeed', new THREE.BufferAttribute(aSeed, 1));
    g.setAttribute('aColorMix', new THREE.BufferAttribute(mix, 1));
    return g;
  }, [count, seed, spread, near, far]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uSize: { value: size },
      uPixelRatio: { value: 1 },
      uDrift: { value: drift },
      uTurbulence: { value: turbulence },
      uCollapse: { value: 0 },
      uAttract: { value: new THREE.Vector3(0, 2, 0) },
      uAccent: { value: new THREE.Color('#00F0FF') },
      uAccent2: { value: new THREE.Color('#7000FF') },
      uCore: { value: new THREE.Color('#ffffff') },
      uOpacity: { value: opacity },
      uSoftness: { value: softness },
    }),
    // Uniform *values* are mutated in useFrame; only rebuild on structural change.
    [],
  );

  const activePalette = useQuestStore((s) => s.activePalette);
  const corePulse = useQuestStore((s) => s.corePulse);

  // Celebration burst: draw every particle toward the core, then release.
  const burst = useRef(0);
  const prevPulse = useRef(corePulse);
  useEffect(() => {
    if (corePulse !== prevPulse.current) {
      prevPulse.current = corePulse;
      burst.current = 1;
    }
  }, [corePulse]);

  useFrame((state, delta) => {
    const u = uniforms;
    u.uTime.value = state.clock.elapsedTime;
    u.uPixelRatio.value = dpr || 1;
    u.uSize.value = size;
    u.uDrift.value = drift;
    u.uTurbulence.value = turbulence;
    u.uOpacity.value = opacity;

    if (burst.current > 0) {
      burst.current = Math.max(0, burst.current - delta * 0.85);
      u.uCollapse.value = Math.sin((1 - burst.current) * Math.PI) * 0.55;
    } else {
      u.uCollapse.value = 0;
    }

    const p = palette(activePalette);
    u.uAccent.value.set(p.accent);
    u.uAccent2.value.set(p.accent2);

    if (points.current) points.current.rotation.y = state.clock.elapsedTime * 0.006;
  });

  return (
    <points ref={points} geometry={geometry} frustumCulled={false}>
      <shaderMaterial
        vertexShader={PARTICLE_VERT}
        fragmentShader={PARTICLE_FRAG}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

/* ------------------------------------------------------------------ *
 * Floating archipelago chunks — deterministic, seeded, flat-shaded.
 * ------------------------------------------------------------------ */

function FloatingIslands({ count = 18 }: { count?: number }) {
  const activePalette = useQuestStore((s) => s.activePalette);
  const p = palette(activePalette);

  const chunks = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const r = 16 + seededRandom(i * 2.7) * 46;
        const theta = seededRandom(i * 5.1) * Math.PI * 2;
        return {
          y: -5 - seededRandom(i * 9.3) * 16,
          x: Math.cos(theta) * r,
          z: Math.sin(theta) * r - 6,
          scale: 0.6 + seededRandom(i * 13.7) * 2.6,
          rotY: seededRandom(i * 4.1) * Math.PI * 2,
          detail: seededRandom(i * 8.9) > 0.6 ? 1 : 0,
          spin: 0.012 + (i % 5) * 0.004,
          phase: i,
        };
      }),
    [count],
  );

  const group = useRef<THREE.Group>(null);

  useFrame((state, delta) => {
    const g = group.current;
    if (!g) return;
    // Slow bob so the archipelago reads as suspended rather than frozen.
    for (let i = 0; i < g.children.length; i++) {
      const child = g.children[i];
      const c = chunks[i];
      if (!c) continue;
      child.rotation.y += delta * c.spin;
      child.position.y = c.y + Math.sin(state.clock.elapsedTime * 0.28 + c.phase) * 0.32;
    }
  });

  return (
    <group ref={group}>
      {chunks.map((c, i) => (
        <mesh key={i} position={[c.x, c.y, c.z]} rotation={[c.rotY * 0.3, c.rotY, c.rotY * 0.15]} scale={c.scale}>
          <icosahedronGeometry args={[1, c.detail]} />
          <meshStandardMaterial
            color="#0a0a12"
            roughness={0.86}
            metalness={0.16}
            flatShading
            emissive={p.accent}
            emissiveIntensity={0.045}
          />
        </mesh>
      ))}
    </group>
  );
}

/* ------------------------------------------------------------------ *
 * The Monolith — hero object, and the host of the Quest 1 secret node.
 * ------------------------------------------------------------------ */

function Monolith() {
  const mesh = useRef<THREE.Mesh>(null);
  const [hover, setHover] = useState(false);

  const activePalette = useQuestStore((s) => s.activePalette);
  const complete = useQuestStore((s) => s.complete);
  const questDone = useQuestStore((s) => s.quests.find((q) => q.id === 'hidden-frequency')?.isCompleted ?? false);
  const celebrate = useUIStore((s) => s.celebrate);
  const pushToast = useUIStore((s) => s.pushToast);
  const p = palette(activePalette);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uFrequency: { value: 1.35 },
      uDistortion: { value: 0.16 },
      uSecret: { value: 0 },
      uSecretPulse: { value: 0 },
      uAccent: { value: new THREE.Color('#00F0FF') },
      uAccent2: { value: new THREE.Color('#7000FF') },
      uEmission: { value: 1 },
      uHover: { value: 0 },
    }),
    [],
  );

  const secret = useRef(0);

  useFrame((state, delta) => {
    const u = uniforms;
    u.uTime.value = state.clock.elapsedTime;
    u.uAccent.value.set(p.accent);
    u.uAccent2.value.set(p.accent2);
    u.uHover.value = THREE.MathUtils.damp(u.uHover.value, hover ? 1 : 0, 6, delta);
    u.uSecret.value = THREE.MathUtils.damp(u.uSecret.value, questDone ? 0 : clamp(secret.current), 3, delta);
    u.uSecretPulse.value = 0.3 + 0.7 * Math.pow(Math.max(0, Math.sin(state.clock.elapsedTime * 1.6)), 3) * (hover ? 1.7 : 1);

    if (mesh.current) mesh.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.12) * 0.16;
  });

  const onSecretClick = () => {
    if (questDone) return;
    secret.current = 1;
    complete('hidden-frequency');
    audio.play('core');
    audio.play('quest');
    audio.duck(0.08, 420);
    const q = QUEST_MAP['hidden-frequency'];
    celebrate({ questId: q.id, title: q.title, reward: q.reward, rewardDetail: q.rewardDetail });
    pushToast({ title: 'Secret node found', body: 'The monolith answers on the hidden channel.', tone: 'core' });
  };

  return (
    <group>
      <mesh
        ref={mesh}
        position={[0, 3.4, 0]}
        castShadow
        receiveShadow
        onPointerOver={(e) => {
          e.stopPropagation();
          setHover(true);
          const ui = useUIStore.getState();
          ui.setHoveredNode('monolith');
          ui.setCursor({ variant: 'inspect', label: questDone ? 'Monolith' : 'Hidden node' });
        }}
        onPointerOut={() => {
          setHover(false);
          const ui = useUIStore.getState();
          ui.setHoveredNode(null);
          ui.setCursor({ variant: 'default', label: '' });
        }}
        onClick={(e) => {
          e.stopPropagation();
          onSecretClick();
        }}
      >
        <boxGeometry args={[2.3, 7.2, 2.3, 20, 56, 20]} />
        <shaderMaterial vertexShader={MONOLITH_VERT} fragmentShader={MONOLITH_FRAG} uniforms={uniforms} />
      </mesh>

      {/* Plinth */}
      <mesh position={[0, -0.7, 0]} receiveShadow>
        <cylinderGeometry args={[3.4, 4.2, 1.2, 48]} />
        <meshStandardMaterial color="#0b0b14" roughness={0.7} metalness={0.35} />
      </mesh>

      {/* The Aether Core */}
      <mesh position={[0, 2.1, 0]}>
        <icosahedronGeometry args={[0.42, 3]} />
        <meshBasicMaterial color={p.emissive} toneMapped={false} />
      </mesh>

      <pointLight position={[0, 2.4, 0]} color={p.accent} intensity={14} distance={26} decay={2} />
      <pointLight position={[0, -2, 4]} color={p.accent2} intensity={6} distance={30} decay={2} />
    </group>
  );
}

/* ------------------------------------------------------------------ *
 * Camera rig — samples the Gate spline from live scroll telemetry.
 * ------------------------------------------------------------------ */

function CameraRig({ fov, parallax }: { fov: number; parallax: boolean }) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const pointer = useThree((s) => s.pointer);

  const scratchPos = useMemo(() => new THREE.Vector3(), []);
  const scratchLook = useMemo(() => new THREE.Vector3(), []);
  const curPos = useRef(new THREE.Vector3());
  const curLook = useRef(new THREE.Vector3());
  const inited = useRef(false);

  useFrame((_, delta) => {
    sampleRegion('/', scrollState.progress, scratchPos, scratchLook);

    if (!inited.current) {
      curPos.current.copy(scratchPos);
      curLook.current.copy(scratchLook);
      inited.current = true;
    }

    const lambda = 3.4;
    curPos.current.x = THREE.MathUtils.damp(curPos.current.x, scratchPos.x, lambda, delta);
    curPos.current.y = THREE.MathUtils.damp(curPos.current.y, scratchPos.y, lambda, delta);
    curPos.current.z = THREE.MathUtils.damp(curPos.current.z, scratchPos.z, lambda, delta);
    curLook.current.x = THREE.MathUtils.damp(curLook.current.x, scratchLook.x, lambda, delta);
    curLook.current.y = THREE.MathUtils.damp(curLook.current.y, scratchLook.y, lambda, delta);
    curLook.current.z = THREE.MathUtils.damp(curLook.current.z, scratchLook.z, lambda, delta);

    camera.position.copy(curPos.current);

    if (parallax) {
      curLook.current.x += pointer.x * 1.15;
      curLook.current.y += pointer.y * 0.7;
    }
    camera.lookAt(curLook.current);

    // FOV kicks with scroll velocity — the "warp" feel.
    const targetFov = fov + Math.min(7, Math.abs(scrollState.velocity) * 0.06);
    camera.fov = THREE.MathUtils.damp(camera.fov, targetFov, 5, delta);
    camera.updateProjectionMatrix();

    audio.setListener([camera.position.x, camera.position.y, camera.position.z], [0, 0, -1]);
  });

  return null;
}

/* ------------------------------------------------------------------ *
 * Scene root
 * ------------------------------------------------------------------ */

function SceneContents() {
  const gl = useThree((s) => s.gl);
  const activePalette = useQuestStore((s) => s.activePalette);
  const setBooted = useUIStore((s) => s.setBooted);
  const quality = useQuality();
  const p = palette(activePalette);

  useEffect(() => {
    gl.toneMapping = THREE.ACESFilmicToneMapping;
    gl.toneMappingExposure = 1.05;
  }, [gl]);

  // Signal first paint so the HUD can lift its boot veil.
  useEffect(() => {
    const id = window.setTimeout(() => setBooted(true), 240);
    return () => window.clearTimeout(id);
  }, [setBooted]);

  const ca = quality.chromaticAberration;

  return (
    <>
      <color attach="background" args={[p.background]} />
      <fog attach="fog" args={[p.fog, 22, 135]} />

      <ambientLight intensity={0.22} color={p.accent2} />
      <directionalLight position={[12, 18, 10]} intensity={0.85} color="#cfe8ff" castShadow={quality.shadows} />
      <directionalLight position={[-14, 6, -8]} intensity={0.4} color={p.accent2} />

      <FloatingIslands />
      <Monolith />

      <ParticleField
        count={quality.stars}
        size={1.5}
        drift={0.5}
        turbulence={0}
        opacity={0.95}
        softness={0.2}
        spread={[1, 0.72, 1]}
        seed={1}
        near={30}
        far={120}
      />
      <ParticleField
        count={quality.dust}
        size={2.6}
        drift={1.5}
        turbulence={0.42}
        opacity={0.5}
        softness={0.65}
        spread={[1, 0.6, 1]}
        seed={77}
        near={4}
        far={44}
      />

      <CameraRig fov={REGION_PATHS['/'].fov} parallax={quality.pointerParallax} />

      {quality.bloom && (
        <EffectComposer multisampling={0} enableNormalPass={false}>
          <Bloom intensity={0.85} luminanceThreshold={0.16} luminanceSmoothing={0.4} mipmapBlur radius={0.72} />
          {ca > 0 && (
            <ChromaticAberration
              blendFunction={BlendFunction.NORMAL}
              offset={new THREE.Vector2(ca, ca)}
              radialModulation={false}
              modulationOffset={0}
            />
          )}
          <Vignette eskil={false} offset={0.24} darkness={0.86} />
        </EffectComposer>
      )}
    </>
  );
}

/**
 * `selectQuality` builds a fresh object on every call. Zustand v5 has no
 * default shallow-equality, so subscribing to it directly hands
 * useSyncExternalStore a new snapshot each render and loops forever
 * ("getSnapshot should be cached" / "Maximum update depth exceeded").
 * `useShallow` compares the fields one level deep and keeps identity stable.
 */
function useQuality() {
  return useGraphicsStore(useShallow(selectQuality));
}

/** The fixed WebGL backdrop for the Gate of Origin. */
export function GateScene() {
  const quality = useQuality();

  return (
    <Canvas
      dpr={quality.dpr}
      // `shadows={true}` asks R3F for PCFSoftShadowMap, which three r186
      // deprecated (it silently falls back and warns). "percentage" is the
      // same PCF filter under its current name.
      shadows={quality.shadows ? 'percentage' : false}
      gl={{
        antialias: quality.tier < 3,
        powerPreference: 'high-performance',
        alpha: false,
        stencil: false,
        depth: true,
      }}
      camera={{ fov: REGION_PATHS['/'].fov, near: 0.1, far: 400, position: [0, 3.2, 34] }}
    >
      <SceneContents />
    </Canvas>
  );
}