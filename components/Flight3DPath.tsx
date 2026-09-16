"use client";

import { useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Line, Grid } from "@react-three/drei";
import * as THREE from "three";
import { STATE_META, type DerivedFlightState } from "@/lib/telemetry/flightStateMachine";
import { CanvasErrorBoundary } from "./CanvasErrorBoundary";

export type PathPoint = {
  lat: number;
  lon: number;
  alt: number;
  phase: DerivedFlightState;
};

type Flight3DPathProps = {
  points: PathPoint[];
};

// scene stays a fixed visual height regardless of how high the real
// or simulated flight actually goes, a small ground test and a 30,000
// ft sounding rocket both frame the same way
const TARGET_VISUAL_HEIGHT = 18;
const M_PER_DEG_LAT = 111320;

const toScene = (points: PathPoint[], lat0: number, lon0: number, scale: number) => {
  const mPerDegLon = M_PER_DEG_LAT * Math.cos((lat0 * Math.PI) / 180);
  return points.map((p) => ({
    x: (p.lon - lon0) * mPerDegLon * scale,
    y: p.alt * scale,
    z: -(p.lat - lat0) * M_PER_DEG_LAT * scale,
    phase: p.phase,
  }));
};

// renders the flight as an actual 3d curve in space, coloured by the
// real derived flight phase per segment, not a flat map trail
const PathSegments = ({ points, scale }: { points: PathPoint[]; scale: number }) => {
  const scene = useMemo(
    () => (points.length > 0 ? toScene(points, points[0].lat, points[0].lon, scale) : []),
    [points, scale]
  );

  if (scene.length < 2) return null;

  const segments: { pts: THREE.Vector3[]; color: string }[] = [];
  let current: THREE.Vector3[] = [new THREE.Vector3(scene[0].x, scene[0].y, scene[0].z)];
  let currentPhase = scene[0].phase;

  for (let i = 1; i < scene.length; i++) {
    const p = scene[i];
    current.push(new THREE.Vector3(p.x, p.y, p.z));
    if (p.phase !== currentPhase) {
      segments.push({ pts: current, color: STATE_META[currentPhase].color });
      current = [new THREE.Vector3(p.x, p.y, p.z)];
      currentPhase = p.phase;
    }
  }
  segments.push({ pts: current, color: STATE_META[currentPhase].color });

  return (
    <>
      {segments.map((seg, i) =>
        seg.pts.length > 1 ? (
          <Line key={i} points={seg.pts} color={seg.color} lineWidth={2.5} />
        ) : null
      )}
    </>
  );
};

const LiveMarker = ({ points, scale }: { points: PathPoint[]; scale: number }) => {
  if (points.length === 0) return null;
  const last = points[points.length - 1];
  const scene = toScene([last], points[0].lat, points[0].lon, scale)[0];

  return (
    <mesh position={[scene.x, scene.y, scene.z]}>
      <sphereGeometry args={[0.18, 16, 16]} />
      <meshBasicMaterial color={STATE_META[last.phase].color} />
    </mesh>
  );
};

export const Flight3DPath = ({ points }: Flight3DPathProps) => {
  const maxAlt = useMemo(
    () => Math.max(1, ...points.map((p) => p.alt)),
    [points]
  );
  const scale = TARGET_VISUAL_HEIGHT / maxAlt;

  return (
    <CanvasErrorBoundary>
      <Canvas camera={{ position: [22, 14, 22], fov: 45 }}>
        <ambientLight intensity={0.8} />
        <directionalLight position={[5, 10, 5]} intensity={0.6} />
        <Grid
          args={[60, 60]}
          cellColor="#B6B6B6"
          sectionColor="#B6B6B6"
          fadeDistance={50}
          infiniteGrid
          position={[0, 0, 0]}
        />
        <PathSegments points={points} scale={scale} />
        <LiveMarker points={points} scale={scale} />
        <OrbitControls enablePan minDistance={5} maxDistance={100} />
      </Canvas>
    </CanvasErrorBoundary>
  );
};
