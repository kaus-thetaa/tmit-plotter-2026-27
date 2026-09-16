"use client";

import { Suspense, useMemo, useRef, useState } from "react";
import { Canvas, useLoader, useFrame } from "@react-three/fiber";
import { OrbitControls, Stars, useProgress } from "@react-three/drei";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { MTLLoader } from "three/examples/jsm/loaders/MTLLoader.js";
import * as THREE from "three";
import type { Quaternion } from "@/lib/imu/useOrientation";
import type { FlightPhase } from "@/lib/simulate/flightProfile";
import { LoadingGrain } from "./LoadingGrain";
import { CanvasErrorBoundary } from "./CanvasErrorBoundary";

type RocketMeshProps = {
  objUrl: string;
  mtlUrl?: string;
  orientation: Quaternion;
  phase: FlightPhase | null;
  rawOrientation?: Quaternion | null;
};

const PARTICLE_COUNT = 60;

// particle plume from the tail, only spawns new particles while boosting,
// existing ones keep flying and fading out after boost ends
const ExhaustPlume = ({ active }: { active: boolean }) => {
  const pointsRef = useRef<THREE.Points>(null);
  const materialRef = useRef<THREE.PointsMaterial>(null);
  const positions = useMemo(() => new Float32Array(PARTICLE_COUNT * 3), []);
  const particles = useRef(
    Array.from({ length: PARTICLE_COUNT }, () => ({
      pos: new THREE.Vector3(0, 0, -1.3),
      vel: new THREE.Vector3(0, 0, 0),
      age: 1,
    }))
  );

  useFrame((_, delta) => {
    const geom = pointsRef.current?.geometry;
    if (!geom) return;
    const posAttr = geom.attributes.position as THREE.BufferAttribute;

    particles.current.forEach((p, i) => {
      p.age += delta * 1.5;
      if (active && p.age > 1) {
        p.age = 0;
        p.pos.set((Math.random() - 0.5) * 0.15, (Math.random() - 0.5) * 0.15, -1.25);
        p.vel.set(
          (Math.random() - 0.5) * 0.3,
          (Math.random() - 0.5) * 0.3,
          -2 - Math.random() * 1.5
        );
      }
      if (p.age <= 1) p.pos.addScaledVector(p.vel, delta);
      posAttr.setXYZ(i, p.pos.x, p.pos.y, p.pos.z);
    });
    posAttr.needsUpdate = true;

    if (materialRef.current) {
      materialRef.current.opacity = active
        ? Math.min(0.8, materialRef.current.opacity + delta * 3)
        : Math.max(0, materialRef.current.opacity - delta * 1.5);
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={PARTICLE_COUNT}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        ref={materialRef}
        color="#FC3D21"
        size={0.12}
        transparent
        opacity={0}
        depthWrite={false}
        sizeAttenuation
      />
    </points>
  );
};

// small pad and gantry silhouette beneath the rocket, visible only
// at standby, fades out the moment boost starts
const LaunchPad = ({ deploy }: { deploy: number }) => {
  if (deploy <= 0.01) return null;
  return (
    <group position={[0, 0, -1.7]} scale={deploy}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.95, 1.1, 0.15, 24]} />
        <meshStandardMaterial color="#242528" />
      </mesh>
      {[0, 1, 2].map((i) => {
        const a = (i / 3) * Math.PI * 2;
        return (
          <mesh
            key={i}
            position={[0.65 * Math.cos(a), 0.65 * Math.sin(a), 0.35]}
            rotation={[Math.PI / 2, 0, 0]}
          >
            <cylinderGeometry args={[0.035, 0.035, 0.7, 8]} />
            <meshStandardMaterial color="#98A6A9" />
          </mesh>
        );
      })}
    </group>
  );
};

// simple canopy plus shroud lines, fades in for apogee and main, rigidly
// attached to the rocket's nose so it moves and tumbles with it
const Parachute = ({ deploy }: { deploy: number }) => {
  if (deploy <= 0.01) return null;
  const canopyY = 1.6 + deploy * 1.1;
  const scale = 0.3 + deploy * 0.7;

  return (
    <group position={[0, 0, canopyY]} scale={scale}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <sphereGeometry args={[0.55, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial
          color="#F4F4F4"
          side={THREE.DoubleSide}
          transparent
          opacity={deploy}
        />
      </mesh>
      {Array.from({ length: 8 }).map((_, i) => {
        const a = (i / 8) * Math.PI * 2;
        const x = 0.5 * Math.cos(a);
        const y = 0.5 * Math.sin(a);
        return (
          <line key={i}>
            <bufferGeometry
              attach="geometry"
              onUpdate={(geo) =>
                geo.setFromPoints([
                  new THREE.Vector3(x, y, 0),
                  new THREE.Vector3(0, 0, -1.6),
                ])
              }
            />
            <lineBasicMaterial attach="material" color="#B6B6B6" transparent opacity={deploy} />
          </line>
        );
      })}
    </group>
  );
};

// translucent wireframe clone driven by accel only tilt, sits alongside
// the real fused rocket so the gap between them shows what the filter
// is correcting for, only meaningful with a live sensor connected
const GhostRocket = ({ source, orientation }: { source: THREE.Object3D; orientation: Quaternion }) => {
  const cloned = useMemo(() => {
    const c = source.clone(true);
    c.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.material = new THREE.MeshBasicMaterial({
          color: "#B6B6B6",
          transparent: true,
          opacity: 0.25,
          wireframe: true,
        });
      }
    });
    return c;
  }, [source]);

  return (
    <primitive
      object={cloned}
      quaternion={[orientation.x, orientation.y, orientation.z, orientation.w]}
      scale={0.55}
    />
  );
};

const RocketMesh = ({ objUrl, mtlUrl, orientation, phase, rawOrientation }: RocketMeshProps) => {
  const materials = mtlUrl ? useLoader(MTLLoader, mtlUrl) : null;
  const obj = useLoader(OBJLoader, objUrl, (loader) => {
    if (materials) {
      materials.preload();
      loader.setMaterials(materials);
    }
  });

  const chuteDeployRef = useRef(0);
  const padDeployRef = useRef(1);
  const [, forceRender] = useState(0);
  const chuteTarget = phase === "apogee" || phase === "main" ? 1 : 0;
  const padTarget = phase === "standby" ? 1 : 0;

  useFrame((_, delta) => {
    let changed = false;
    const chuteDiff = chuteTarget - chuteDeployRef.current;
    if (Math.abs(chuteDiff) > 0.001) {
      chuteDeployRef.current += chuteDiff * Math.min(1, delta * 2);
      changed = true;
    }
    const padDiff = padTarget - padDeployRef.current;
    if (Math.abs(padDiff) > 0.001) {
      padDeployRef.current += padDiff * Math.min(1, delta * 2);
      changed = true;
    }
    if (changed) forceRender((n) => n + 1);
  });

  return (
    <group quaternion={[orientation.x, orientation.y, orientation.z, orientation.w]}>
      <primitive object={obj} scale={0.55} />
      {rawOrientation && <GhostRocket source={obj} orientation={rawOrientation} />}
      <Parachute deploy={chuteDeployRef.current} />
      <LaunchPad deploy={padDeployRef.current} />
      <ExhaustPlume active={phase === "boost"} />
    </group>
  );
};

const ShakyCamera = ({ shaking }: { shaking: boolean }) => {
  const offsetRef = useRef({ x: 0, y: 0 });
  useFrame(({ camera, clock }) => {
    camera.position.x -= offsetRef.current.x;
    camera.position.y -= offsetRef.current.y;

    if (shaking) {
      const t = clock.getElapsedTime();
      offsetRef.current = { x: Math.sin(t * 40) * 0.12, y: Math.cos(t * 47) * 0.1 };
    } else {
      offsetRef.current = { x: 0, y: 0 };
    }

    camera.position.x += offsetRef.current.x;
    camera.position.y += offsetRef.current.y;
  });
  return null;
};

const PHASE_LIGHT_COLOR: Record<string, string> = {
  standby: "#F4F4F4",
  boost: "#FC3D21",
  coast: "#F4F4F4",
  apogee: "#A2673F",
  main: "#1D7373",
  recovery: "#005288",
};

// key light tints toward the current phase's colour instead of staying
// flat white the whole flight
const ReactiveLighting = ({ phase }: { phase: FlightPhase | null }) => {
  const lightRef = useRef<THREE.DirectionalLight>(null);
  const target = useRef(new THREE.Color("#F4F4F4"));

  useFrame((_, delta) => {
    target.current.set(PHASE_LIGHT_COLOR[phase ?? "standby"]);
    if (lightRef.current) {
      lightRef.current.color.lerp(target.current, Math.min(1, delta * 1.5));
    }
  });

  return <directionalLight ref={lightRef} position={[3, 3, 3]} intensity={1.1} />;
};

// slow orbiting point light so the nose cone catches a moving specular
// highlight instead of a static one
const GlintLight = () => {
  const ref = useRef<THREE.PointLight>(null);
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime() * 0.4;
    if (ref.current) ref.current.position.set(Math.cos(t) * 3, Math.sin(t) * 3, 1.5);
  });
  return <pointLight ref={ref} intensity={0.7} color="#F4F4F4" distance={8} />;
};

const LoadingOverlay = () => {
  const { active } = useProgress();
  if (!active) return null;
  return (
    <div className="absolute inset-0 z-10">
      <LoadingGrain label="loading rocket" />
    </div>
  );
};

type RocketModelProps = {
  objUrl?: string;
  mtlUrl?: string;
  orientation: Quaternion;
  phase?: FlightPhase | null;
  rawOrientation?: Quaternion | null;
};

export default function RocketModel({
  objUrl = "/models/placeholder-rocket.obj",
  mtlUrl = "/models/placeholder-rocket.mtl",
  orientation,
  phase = null,
  rawOrientation = null,
}: RocketModelProps) {
  const resumeTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const [autoRotate, setAutoRotate] = useState(true);

  const handleStart = () => {
    setAutoRotate(false);
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
  };

  const handleEnd = () => {
    resumeTimerRef.current = setTimeout(() => setAutoRotate(true), 4000);
  };

  return (
    <CanvasErrorBoundary>
      <div className="relative w-full h-full">
        <LoadingOverlay />
        <Canvas camera={{ position: [0, 0, 9], fov: 45 }}>
          <ambientLight intensity={0.55} />
          <ReactiveLighting phase={phase} />
          <directionalLight position={[-3, -2, 2]} intensity={0.4} />
          <GlintLight />
          <Stars radius={40} depth={30} count={1800} factor={1.8} fade speed={0.4} />
          <Suspense fallback={null}>
            <RocketMesh
              objUrl={objUrl}
              mtlUrl={mtlUrl}
              orientation={orientation}
              phase={phase}
              rawOrientation={rawOrientation}
            />
          </Suspense>
          <ShakyCamera shaking={phase === "boost"} />
          <OrbitControls
            enablePan={false}
            minDistance={5}
            maxDistance={16}
            autoRotate={autoRotate}
            autoRotateSpeed={0.6}
            onStart={handleStart}
            onEnd={handleEnd}
          />
        </Canvas>
      </div>
    </CanvasErrorBoundary>
  );
}
