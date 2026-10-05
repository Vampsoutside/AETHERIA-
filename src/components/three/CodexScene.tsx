'use client';

/**
 * The Citadel — long-form articles with inline GLYPH field, light shafts,
 * and a mini terminal for Q-04 "Terminal Override".
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Bloom, ChromaticAberration, EffectComposer, Vignette } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';

import { GLYPH_FRAG, GLYPH_VERT, SHAFT_FRAG, SHAFT_VERT } from '@/lib/shaders/codex';
import { REGION_PATHS, sampleRegion } from '@/lib/camera/paths';
import { scrollState } from '@/lib/scrollState';
import { palette } from '@/lib/tokens';
import { ARTICLES, ARTICLE_MAP, TERMINAL_PASSWORD, TERMINAL_BOOT_LINES } from '@/lib/content/articles';
import { useQuestStore } from '@/lib/store/useQuestStore';
import { useUIStore } from '@/lib/store/useUIStore';
import { completeQuest, isQuestDone } from '@/lib/questEngine';
import { audio } from '@/lib/audio/engine';
import { useQuality } from '@/hooks/useQuality';

const GLYPH_COUNT = 400;
const SHAFT_COUNT = 6;

/* ------------------------------------------------------------------ *
 * Glyph field — instanced mesh, each instance gets a random seed.
 * The fragment shader generates a 3×5 rune matrix from the seed.
 * ------------------------------------------------------------------ */

function GlyphField() {
  const activePalette = useQuestStore((s) => s.activePalette);
  const p = palette(activePalette);

  const dummy = useMemo(() => new THREE.Object3D(), []);
  const mesh = useRef<THREE.InstancedMesh>(null);
  const seedsRef = useRef<Float32Array>(new Float32Array(GLYPH_COUNT));

  // Generate seeds once
  useMemo(() => {
    for (let i = 0; i < GLYPH_COUNT; i++) {
      seedsRef.current[i] = Math.random() * 1000;
    }
  }, []);

  const geometry = useMemo(() => new THREE.PlaneGeometry(1, 1), []);

  const material = useMemo(() => {
    const mat = new THREE.ShaderMaterial({
      vertexShader: GLYPH_VERT,
      fragmentShader: GLYPH_FRAG,
      uniforms: {
        uTime: { value: 0 },
        uAccent: { value: new THREE.Color(p.accent) },
        uAccent2: { value: new THREE.Color(p.accent2) },
        uOpacity: { value: 0.6 },
      },
      transparent: true,
      depthWrite: false,
    });
    return mat;
  }, [p.accent, p.accent2]);

  useFrame(({ clock }) => {
    if (!mesh.current) return;
    material.uniforms.uTime.value = clock.elapsedTime;
    material.uniforms.uAccent.value.set(p.accent);
    material.uniforms.uAccent2.value.set(p.accent2);
  });

  return (
    <instancedMesh
      ref={mesh}
      args={[geometry, material, GLYPH_COUNT]}
      frustumCulled={false}
      onBeforeRender={(_, renderer) => {
        // Update instance matrices with random positions
        const meshRef = mesh.current;
        if (!meshRef) return;
        for (let i = 0; i < GLYPH_COUNT; i++) {
          const seed = seedsRef.current[i];
          const angle = (i / GLYPH_COUNT) * Math.PI * 2;
          const radius = 20 + Math.sin(seed * 7.3) * 12;
          const height = Math.cos(seed * 5.1) * 18;
          dummy.position.set(
            Math.cos(angle) * radius,
            height + 20,
            Math.sin(angle) * radius,
          );
          dummy.rotation.y = angle + Math.PI / 2;
          dummy.scale.setScalar(0.7 + Math.sin(seed * 3.1) * 0.5);
          dummy.updateMatrix();
          meshRef.setMatrixAt(i, dummy.matrix);
        }
        meshRef.instanceMatrix.needsUpdate = true;
      }}
    />
  );
}

/* ------------------------------------------------------------------ *
 * Light shafts — additive quads for god rays.
 * ------------------------------------------------------------------ */

function LightShafts() {
  const activePalette = useQuestStore((s) => s.activePalette);
  const p = palette(activePalette);

  const material = useMemo(() => {
    const mat = new THREE.ShaderMaterial({
      vertexShader: SHAFT_VERT,
      fragmentShader: SHAFT_FRAG,
      uniforms: {
        uTime: { value: 0 },
        uAccent: { value: new THREE.Color(p.accent) },
        uOpacity: { value: 0.12 },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    return mat;
  }, [p.accent]);

  useFrame(({ clock }) => {
    material.uniforms.uTime.value = clock.elapsedTime;
    material.uniforms.uAccent.value.set(p.accent);
  });

  return (
    <group position={[0, 15, 0]}>
      {Array.from({ length: SHAFT_COUNT }, (_, i) => (
        <mesh key={i} position={[(i - 2.5) * 8, 0, -10]} rotation={[-Math.PI / 2, 0, 0]} scale={[30, 50, 1]}>
          <planeGeometry args={[1, 1]} />
          <shaderMaterial
            vertexShader={SHAFT_VERT}
            fragmentShader={SHAFT_FRAG}
            uniforms={material.uniforms}
            transparent
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      ))}
    </group>
  );
}

/* ------------------------------------------------------------------ *
 * Camera rig — Citadel spline.
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
    sampleRegion('/codex', scrollState.progress, scratchPos, scratchLook);
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

  useEffect(() => {
    const id = window.setTimeout(() => setBooted(true), 240);
    return () => window.clearTimeout(id);
  }, [setBooted]);

  const ca = quality.chromaticAberration;

  return (
    <>
      <color attach="background" args={[p.background]} />
      <fog attach="fog" args={[p.fog, 25, 150]} />

      <ambientLight intensity={0.18} color={p.accent2} />
      <directionalLight
        position={[10, 16, 8]}
        intensity={0.6}
        color="#cfe8ff"
        castShadow={quality.shadows}
      />
      <directionalLight position={[-12, 4, -6]} intensity={0.3} color={p.accent2} />

      <GlyphField />
      <LightShafts />

      <CameraRig fov={REGION_PATHS['/codex'].fov} parallax={quality.pointerParallax} />

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

export function CodexScene() {
  const quality = useQuality();
  return (
    <Canvas
      dpr={quality.dpr}
      shadows={quality.shadows ? 'percentage' : false}
      gl={{
        antialias: quality.tier < 3,
        powerPreference: 'high-performance',
        alpha: false,
        stencil: false,
        depth: true,
      }}
      camera={{ fov: REGION_PATHS['/codex'].fov, near: 0.1, far: 500, position: [0, 4, 30] }}
    >
      <SceneContents />
    </Canvas>
  );
}