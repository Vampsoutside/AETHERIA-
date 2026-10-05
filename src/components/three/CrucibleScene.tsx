'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Bloom, ChromaticAberration, EffectComposer, Vignette } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';

import { SANDBOX_FRAG, SANDBOX_VERT } from '@/lib/shaders/sandbox';
import { GRID_FRAG, GRID_VERT } from '@/lib/shaders/sandbox';
import { PARTICLE_FRAG, PARTICLE_VERT } from '@/lib/shaders/particles';
import { REGION_PATHS, sampleRegion } from '@/lib/camera/paths';
import { scrollState } from '@/lib/scrollState';
import { palette } from '@/lib/tokens';
import { useQuestStore } from '@/lib/store/useQuestStore';
import { useUIStore } from '@/lib/store/useUIStore';
import { selectQuality, useGraphicsStore } from '@/lib/store/useGraphicsStore';
import { useShallow } from 'zustand/react/shallow';
import { audio, chordFromNode, hz, PENTATONIC } from '@/lib/audio/engine';
import { clamp, seededRandom } from '@/lib/utils';

/* ------------------------------------------------------------------ *
 * The Crucible lattice — a large plane displaced by the sandbox shader.
 * Four live uniforms driven by HUD sliders.
 * ------------------------------------------------------------------ */

interface LatticeProps {
  frequency: number;
  distortion: number;
  emission: number;
  waveSpeed: number;
  resonance: number;
  mode: number;
}

function Lattice({ frequency, distortion, emission, waveSpeed, resonance, mode }: LatticeProps) {
  const mesh = useRef<THREE.Mesh>(null);
  const activePalette = useQuestStore((s) => s.activePalette);
  const p = palette(activePalette);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uFrequency: { value: frequency },
      uDistortion: { value: distortion },
      uWaveSpeed: { value: waveSpeed },
      uResonance: { value: resonance },
      uAccent: { value: new THREE.Color('#00F0FF') },
      uAccent2: { value: new THREE.Color('#7000FF') },
      uEmission: { value: emission },
      uMode: { value: mode },
    }),
    [],
  );

  useFrame((state) => {
    const u = uniforms;
    u.uTime.value = state.clock.elapsedTime;
    u.uFrequency.value = frequency;
    u.uDistortion.value = distortion;
    u.uWaveSpeed.value = waveSpeed;
    u.uResonance.value = resonance;
    u.uEmission.value = emission;
    u.uMode.value = mode;
    u.uAccent.value.set(p.accent);
    u.uAccent2.value.set(p.accent2);
  });

  return (
    <mesh ref={mesh} position={[0, 3, 0]} rotation={[-Math.PI / 2.4, 0, 0]}>
      <planeGeometry args={[28, 28, 180, 180]} />
      <shaderMaterial vertexShader={SANDBOX_VERT} fragmentShader={SANDBOX_FRAG} uniforms={uniforms} side={THREE.DoubleSide} />
    </mesh>
  );
}

/* ------------------------------------------------------------------ *
 * Holographic grid floor.
 * ------------------------------------------------------------------ */

function GridFloor() {
  const activePalette = useQuestStore((s) => s.activePalette);
  const p = palette(activePalette);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uAccent: { value: new THREE.Color('#00F0FF') },
      uAccent2: { value: new THREE.Color('#7000FF') },
      uCellSize: { value: 2.2 },
      uThickness: { value: 1.2 },
      uOpacity: { value: 0.55 },
      uPulse: { value: 0.6 },
    }),
    [],
  );

  useFrame((state) => {
    uniforms.uTime.value = state.clock.elapsedTime;
    uniforms.uAccent.value.set(p.accent);
    uniforms.uAccent2.value.set(p.accent2);
  });

  return (
    <mesh position={[0, -2.5, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[80, 80]} />
      <shaderMaterial
        vertexShader={GRID_VERT}
        fragmentShader={GRID_FRAG}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

/* ------------------------------------------------------------------ *
 * Synth wheel — clickable nodes that play spatial chords.
 * ------------------------------------------------------------------ */

const WHEEL_NODES = 12;

function SynthWheel() {
  const group = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState<number | null>(null);
  const activePalette = useQuestStore((s) => s.activePalette);
  const p = palette(activePalette);

  const nodes = useMemo(
    () =>
      Array.from({ length: WHEEL_NODES }, (_, i) => {
        const angle = (i / WHEEL_NODES) * Math.PI * 2;
        const r = 5.5;
        return {
          pos: new THREE.Vector3(Math.cos(angle) * r, 0.5, Math.sin(angle) * r),
          freq: PENTATONIC[i % PENTATONIC.length],
          index: i,
        };
      }),
    [],
  );

  useFrame((state) => {
    if (!group.current) return;
    group.current.rotation.y = state.clock.elapsedTime * 0.08;
  });

  const onNodeClick = (index: number) => {
    const node = nodes[index];
    if (!node) return;
    const freqs = chordFromNode(index, WHEEL_NODES);
    audio.playSpatialChord(freqs, [node.pos.x, node.pos.y, node.pos.z], {
      attack: 0.04,
      release: 1.8,
      type: 'triangle',
      gain: 0.12,
    });
  };

  return (
    <group ref={group} position={[0, 0.5, 0]}>
      {nodes.map((n, i) => (
        <mesh
          key={i}
          position={n.pos}
          onPointerOver={(e) => {
            e.stopPropagation();
            setHovered(i);
            useUIStore.getState().setCursor({ variant: 'enter', label: `Node ${i + 1}` });
          }}
          onPointerOut={() => {
            setHovered(null);
            useUIStore.getState().setCursor({ variant: 'default', label: '' });
          }}
          onClick={(e) => {
            e.stopPropagation();
            onNodeClick(i);
          }}
        >
          <sphereGeometry args={[hovered === i ? 0.32 : 0.22, 16, 16]} />
          <meshBasicMaterial
            color={hovered === i ? p.emissive : p.accent}
            toneMapped={false}
            transparent
            opacity={hovered === i ? 1 : 0.7}
          />
        </mesh>
      ))}
      {/* Connecting ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[5.3, 5.4, 64]} />
        <meshBasicMaterial color={p.accent} transparent opacity={0.15} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

/* ------------------------------------------------------------------ *
 * Ambient particles — same system as the Gate, smaller budget.
 * ------------------------------------------------------------------ */

function AmbientParticles({ count }: { count: number }) {
  const points = useRef<THREE.Points>(null);
  const dpr = useThree((s) => s.viewport.dpr);

  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    const scale = new Float32Array(count);
    const aSeed = new Float32Array(count);
    const mix = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const r = 8 + seededRandom(i * 3.7) * 30;
      const theta = seededRandom(i * 5.1) * Math.PI * 2;
      const phi = Math.acos(2 * seededRandom(i * 7.7) - 1);
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.cos(phi) * 0.6;
      pos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
      scale[i] = 0.3 + seededRandom(i * 11.3) * 1.2;
      aSeed[i] = seededRandom(i * 17.9) * 100;
      mix[i] = seededRandom(i * 23.1);
    }
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aScale', new THREE.BufferAttribute(scale, 1));
    g.setAttribute('aSeed', new THREE.BufferAttribute(aSeed, 1));
    g.setAttribute('aColorMix', new THREE.BufferAttribute(mix, 1));
    return g;
  }, [count]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uSize: { value: 1.8 },
      uPixelRatio: { value: 1 },
      uDrift: { value: 0.8 },
      uTurbulence: { value: 0.3 },
      uCollapse: { value: 0 },
      uAttract: { value: new THREE.Vector3(0, 0, 0) },
      uAccent: { value: new THREE.Color('#00F0FF') },
      uAccent2: { value: new THREE.Color('#7000FF') },
      uCore: { value: new THREE.Color('#ffffff') },
      uOpacity: { value: 0.7 },
      uSoftness: { value: 0.4 },
    }),
    [],
  );

  const activePalette = useQuestStore((s) => s.activePalette);

  useFrame((state) => {
    uniforms.uTime.value = state.clock.elapsedTime;
    uniforms.uPixelRatio.value = dpr || 1;
    const p = palette(activePalette);
    uniforms.uAccent.value.set(p.accent);
    uniforms.uAccent2.value.set(p.accent2);
    if (points.current) points.current.rotation.y = state.clock.elapsedTime * 0.004;
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
 * Camera rig — Crucible spline.
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
    sampleRegion('/playground', scrollState.progress, scratchPos, scratchLook);
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
      curLook.current.x += pointer.x * 1.0;
      curLook.current.y += pointer.y * 0.6;
    }
    camera.lookAt(curLook.current);
    const targetFov = fov + Math.min(6, Math.abs(scrollState.velocity) * 0.05);
    camera.fov = THREE.MathUtils.damp(camera.fov, targetFov, 5, delta);
    camera.updateProjectionMatrix();
    audio.setListener([camera.position.x, camera.position.y, camera.position.z], [0, 0, -1]);
  });

  return null;
}

/* ------------------------------------------------------------------ *
 * Scene root
 * ------------------------------------------------------------------ */

export interface CrucibleSceneProps {
  frequency: number;
  distortion: number;
  emission: number;
  waveSpeed: number;
  resonance: number;
  mode: number;
}

function SceneContents({ frequency, distortion, emission, waveSpeed, resonance, mode }: CrucibleSceneProps) {
  const gl = useThree((s) => s.gl);
  const activePalette = useQuestStore((s) => s.activePalette);
  const setBooted = useUIStore((s) => s.setBooted);
  const quality = useGraphicsStore(useShallow(selectQuality));
  const p = palette(activePalette);

  useEffect(() => {
    gl.toneMapping = THREE.ACESFilmicToneMapping;
    gl.toneMappingExposure = 1.05;
  }, [gl]);

  useEffect(() => {
    const id = window.setTimeout(() => setBooted(true), 240);
    return () => window.clearTimeout(id);
  }, [setBooted]);

  const ca = quality.chromaticAberration;

  return (
    <>
      <color attach="background" args={[p.background]} />
      <fog attach="fog" args={[p.fog, 18, 110]} />
      <ambientLight intensity={0.25} color={p.accent2} />
      <directionalLight position={[10, 16, 8]} intensity={0.7} color="#cfe8ff" castShadow={quality.shadows} />
      <directionalLight position={[-12, 4, -6]} intensity={0.35} color={p.accent2} />

      <Lattice frequency={frequency} distortion={distortion} emission={emission} waveSpeed={waveSpeed} resonance={resonance} mode={mode} />
      <GridFloor />
      <SynthWheel />
      <AmbientParticles count={quality.dust} />

      <CameraRig fov={REGION_PATHS['/playground'].fov} parallax={quality.pointerParallax} />

      {quality.bloom && (
        <EffectComposer multisampling={0} enableNormalPass={false}>
          <Bloom intensity={0.75} luminanceThreshold={0.18} luminanceSmoothing={0.35} mipmapBlur radius={0.65} />
          {ca > 0 && (
            <ChromaticAberration
              blendFunction={BlendFunction.NORMAL}
              offset={new THREE.Vector2(ca, ca)}
              radialModulation={false}
              modulationOffset={0}
            />
          )}
          <Vignette eskil={false} offset={0.26} darkness={0.82} />
        </EffectComposer>
      )}
    </>
  );
}

export function CrucibleScene(props: CrucibleSceneProps) {
  const quality = useGraphicsStore(useShallow(selectQuality));

  return (
    <Canvas
      dpr={quality.dpr}
      shadows={quality.shadows ? 'percentage' : false}
      gl={{ antialias: quality.tier < 3, powerPreference: 'high-performance', alpha: false, stencil: false, depth: true }}
      camera={{ fov: REGION_PATHS['/playground'].fov, near: 0.1, far: 400, position: [0, 9, 24] }}
    >
      <SceneContents {...props} />
    </Canvas>
  );
}