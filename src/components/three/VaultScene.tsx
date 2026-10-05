'use client';

/**
 * The Archive — artifact carousel + inspector.
 *
 * Six artifacts laid out in a ring. Click one to open the inspector:
 * the model loads, you drag to rotate it, and a full 360° breaks the
 * seal and completes Quest 3 (Artifact Inspector → Audio Log reward).
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber';
import { Bloom, ChromaticAberration, EffectComposer, Vignette } from '@react-three/postprocessing';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { BlendFunction } from 'postprocessing';

import { REGION_PATHS, sampleRegion } from '@/lib/camera/paths';
import { scrollState } from '@/lib/scrollState';
import { palette } from '@/lib/tokens';
import { ARTIFACTS, ARTIFACT_MAP, ARTIFACT_IDS } from '@/lib/content/artifacts';
import { useQuestStore } from '@/lib/store/useQuestStore';
import { useUIStore } from '@/lib/store/useUIStore';
import { registerInspectorRotation, completeQuest, isQuestDone } from '@/lib/questEngine';
import { audio } from '@/lib/audio/engine';
import { useQuality } from '@/hooks/useQuality';

const RING_RADIUS = 14;
const ARTIFACT_SCALE = 2.5;

/* ------------------------------------------------------------------ *
 * Geometry factory — maps artifact geometry type to a Three.js mesh.
 * Uses GLB models where available, falls back to procedural geometry.
 * ------------------------------------------------------------------ */

function ArtifactGeometry({ type, accent, accent2 }: { type: string; accent: string; accent2: string }) {
  const group = useRef<THREE.Group>(null);

  // Helmet → damaged-helmet.glb
  if (type === 'helmet') {
    const gltf = useLoader(GLTFLoader, '/models/damaged-helmet.glb');
    return (
      <group ref={group}>
        <primitive object={gltf.scene} scale={ARTIFACT_SCALE} />
      </group>
    );
  }

  // Crystal → crystal.glb
  if (type === 'crystal') {
    const gltf = useLoader(GLTFLoader, '/models/crystal.glb');
    return (
      <group ref={group}>
        <primitive object={gltf.scene} scale={ARTIFACT_SCALE * 1.5} />
      </group>
    );
  }

  // Monolith → monolith.glb
  if (type === 'monolith') {
    const gltf = useLoader(GLTFLoader, '/models/monolith.glb');
    return (
      <group ref={group}>
        <primitive object={gltf.scene} scale={ARTIFACT_SCALE * 0.8} />
      </group>
    );
  }

  // Core / Lattice / Synth → aether-core.glb
  if (type === 'core' || type === 'lattice') {
    const gltf = useLoader(GLTFLoader, '/models/aether-core.glb');
    return (
      <group ref={group}>
        <primitive object={gltf.scene} scale={ARTIFACT_SCALE} />
      </group>
    );
  }

  // Torus (Spatial Drift) → procedural torus knot
  if (type === 'torus') {
    return (
      <group ref={group}>
        <mesh>
          <torusKnotGeometry args={[1.2, 0.35, 128, 32]} />
          <meshStandardMaterial
            color={accent}
            metalness={0.4}
            roughness={0.3}
            emissive={accent2}
            emissiveIntensity={0.15}
          />
        </mesh>
      </group>
    );
  }

  // Spire → citadel-spire.glb
  if (type === 'spire') {
    const gltf = useLoader(GLTFLoader, '/models/citadel-spire.glb');
    return (
      <group ref={group}>
        <primitive object={gltf.scene} scale={ARTIFACT_SCALE * 4} />
      </group>
    );
  }

  // Fallback: icosahedron
  return (
    <group ref={group}>
      <mesh>
        <icosahedronGeometry args={[1.5, 2]} />
        <meshStandardMaterial color={accent} metalness={0.3} roughness={0.6} emissive={accent2} emissiveIntensity={0.1} />
      </mesh>
    </group>
  );
}

/* ------------------------------------------------------------------ *
 * Carousel item — sits on the ring, handles click/hover.
 * ------------------------------------------------------------------ */

interface CarouselItemProps {
  index: number;
  artifact: typeof ARTIFACTS[number];
  isSelected: boolean;
  onSelect: (id: string) => void;
}

function CarouselItem({ index, artifact, isSelected, onSelect }: CarouselItemProps) {
  const mesh = useRef<THREE.Group>(null);
  const activePalette = useQuestStore((s) => s.activePalette);
  const p = palette(activePalette);
  const [hovered, setHovered] = useState(false);

  // Position on ring
  const angle = (index / ARTIFACT_IDS.length) * Math.PI * 2 - Math.PI / 2;
  const x = Math.cos(angle) * RING_RADIUS;
  const z = Math.sin(angle) * RING_RADIUS;

  const geometryType = artifact.geometry;

  return (
    <group
      ref={mesh}
      position={[x, 0, z]}
      rotation={[0, -angle + Math.PI / 2, 0]}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        useUIStore.getState().setCursor({ variant: 'inspect', label: artifact.name });
      }}
      onPointerOut={() => {
        setHovered(false);
        useUIStore.getState().setCursor({ variant: 'default', label: '' });
      }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(artifact.id);
      }}
    >
      <ArtifactGeometry type={geometryType} accent={artifact.accent} accent2={artifact.accent2} />

      {/* Selection ring */}
      {isSelected && (
        <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[3.2, 3.8, 64]} />
          <meshBasicMaterial color={p.accent} transparent opacity={0.35} side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* Hover glow */}
      {hovered && !isSelected && (
        <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[3.0, 3.6, 64]} />
          <meshBasicMaterial color={p.accent2} transparent opacity={0.2} side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* Label — always faces camera via CSS2D would be ideal, but we'll use a simple sprite */}
    </group>
  );
}

/* ------------------------------------------------------------------ *
 * Inspector — the detail view for a selected artifact.
 * Drag to rotate, tracks rotation for Q-03.
 * ------------------------------------------------------------------ */

interface InspectorProps {
  artifact: typeof ARTIFACTS[number] | null;
  onClose: () => void;
}

function Inspector({ artifact, onClose }: InspectorProps) {
  if (!artifact) return null;

  const mesh = useRef<THREE.Group>(null);
  const activePalette = useQuestStore((s) => s.activePalette);
  const p = palette(activePalette);
  const questDone = isQuestDone('artifact-inspector');
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [rotation, setRotation] = useState({ x: 0, y: 0 });
  const prevRotationRef = useRef({ x: 0, y: 0 });

  // Map geometry type to model
  const getModelUrl = (type: string) => {
    if (type === 'helmet') return '/models/damaged-helmet.glb';
    if (type === 'crystal') return '/models/crystal.glb';
    if (type === 'monolith') return '/models/monolith.glb';
    if (type === 'core' || type === 'lattice') return '/models/aether-core.glb';
    if (type === 'spire') return '/models/citadel-spire.glb';
    return null;
  };

  const modelUrl = getModelUrl(artifact.geometry);
  const gltf = modelUrl ? useLoader(GLTFLoader, modelUrl) : null;

  // Handle drag rotation
  const onPointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    setDragStart({ x: e.clientX, y: e.clientY });
    prevRotationRef.current = { ...rotation };
    useUIStore.getState().setCursor({ variant: 'drag', label: 'Rotate' });
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragStart) return;
    e.stopPropagation();
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    const deltaY = dx * 0.01;
    const deltaX = -dy * 0.01;

    setRotation({
      x: THREE.MathUtils.clamp(prevRotationRef.current.x + deltaX, -Math.PI / 2, Math.PI / 2),
      y: prevRotationRef.current.y + deltaY,
    });

    // Track accumulated rotation for Q-03
    registerInspectorRotation(Math.abs(deltaY) * (180 / Math.PI));
  };

  const onPointerUp = () => {
    setDragStart(null);
    useUIStore.getState().setCursor({ variant: 'default', label: '' });
  };

  // Auto-rotate when not dragging
  useFrame(({ clock }) => {
    if (!dragStart && mesh.current) {
      mesh.current.rotation.y = clock.elapsedTime * 0.15;
    }
  });

  // Determine scale based on model
  const getScale = () => {
    if (artifact.geometry === 'helmet') return ARTIFACT_SCALE;
    if (artifact.geometry === 'crystal') return ARTIFACT_SCALE * 1.5;
    if (artifact.geometry === 'monolith') return ARTIFACT_SCALE * 0.8;
    if (artifact.geometry === 'core' || artifact.geometry === 'lattice') return ARTIFACT_SCALE;
    if (artifact.geometry === 'spire') return ARTIFACT_SCALE * 4;
    return ARTIFACT_SCALE;
  };

  return (
    <group
      ref={mesh}
      position={[0, 0, 0]}
      rotation={[rotation.x, rotation.y, 0]}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
    >
      {gltf ? (
        <primitive object={gltf.scene} scale={getScale()} />
      ) : (
        <mesh>
          <torusKnotGeometry args={[1.2, 0.35, 128, 32]} />
          <meshStandardMaterial
            color={artifact.accent}
            metalness={0.4}
            roughness={0.3}
            emissive={artifact.accent2}
            emissiveIntensity={0.15}
          />
        </mesh>
      )}

      {/* Ground plane reflection hint */}
      <mesh position={[0, -2.5, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[4, 64]} />
        <meshBasicMaterial
          color={p.accent}
          transparent
          opacity={0.08}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Seal indicator — pulses until broken */}
      {!questDone && (
        <mesh position={[0, 4.5, 0]}>
          <ringGeometry args={[1.8, 2.2, 32]} />
          <meshBasicMaterial
            color={p.accent}
            transparent
            opacity={0.6}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}

      {questDone && (
        <mesh position={[0, 4.5, 0]}>
          <ringGeometry args={[2.0, 2.5, 32]} />
          <meshBasicMaterial
            color={p.accent2}
            transparent
            opacity={0.8}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
    </group>
  );
}

/* ------------------------------------------------------------------ *
 * Camera rig — Vault spline.
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
    sampleRegion('/vault', scrollState.progress, scratchPos, scratchLook);
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
  const selectedArtifact = useUIStore((s) => s.activeArtifactId);
  const setActiveArtifact = useUIStore((s) => s.setActiveArtifact);

  const artifact = selectedArtifact ? ARTIFACT_MAP[selectedArtifact] : null;

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
      <directionalLight
        position={[10, 16, 8]}
        intensity={0.7}
        color="#cfe8ff"
        castShadow={quality.shadows}
      />
      <directionalLight position={[-12, 4, -6]} intensity={0.35} color={p.accent2} />

      {/* Artifact carousel ring */}
      <group position={[0, 0, 0]}>
        {ARTIFACT_IDS.map((id, index) => {
          const art = ARTIFACT_MAP[id];
          return (
            <CarouselItem
              key={id}
              index={index}
              artifact={art}
              isSelected={selectedArtifact === id}
              onSelect={setActiveArtifact}
            />
          );
        })}

        {/* Central plinth */}
        <mesh position={[0, -1.5, 0]} receiveShadow>
          <cylinderGeometry args={[8, 9, 3, 32]} />
          <meshStandardMaterial color="#0a0a12" roughness={0.8} metalness={0.2} />
        </mesh>
      </group>

      {/* Inspector — rendered in world space when artifact selected */}
      {artifact && <Inspector artifact={artifact} onClose={() => setActiveArtifact(null)} />}

      <CameraRig fov={REGION_PATHS['/vault'].fov} parallax={quality.pointerParallax} />

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

export function VaultScene() {
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
      camera={{ fov: REGION_PATHS['/vault'].fov, near: 0.1, far: 400, position: [0, 6, 30] }}
    >
      <SceneContents />
    </Canvas>
  );
}