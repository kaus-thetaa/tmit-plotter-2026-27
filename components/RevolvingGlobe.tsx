"use client";

import { Suspense, useRef } from "react";
import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import { useProgress } from "@react-three/drei";
import * as THREE from "three";
import { LoadingGrain } from "./LoadingGrain";
import { CanvasErrorBoundary } from "./CanvasErrorBoundary";

// real earth texture, three.js's own example asset, stable public url
// needs internet at load time, fine for the home page which is the
// public facing entry point rather than the offline safe booth mode
const EARTH_TEXTURE_URL =
  "https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/earth_atmos_2048.jpg";

const Earth = () => {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const texture = useLoader(THREE.TextureLoader, EARTH_TEXTURE_URL);

  useFrame((_, delta) => {
    if (meshRef.current) meshRef.current.rotation.y += delta * 0.15;
    if (glowRef.current) glowRef.current.rotation.y += delta * 0.15;
  });

  return (
    <>
      <mesh ref={meshRef}>
        <sphereGeometry args={[1.5, 48, 48]} />
        <meshStandardMaterial map={texture} roughness={0.9} metalness={0} />
      </mesh>
      <mesh ref={glowRef} scale={1.04}>
        <sphereGeometry args={[1.5, 48, 48]} />
        <meshBasicMaterial
          color="#005288"
          transparent
          opacity={0.15}
          side={THREE.BackSide}
        />
      </mesh>
    </>
  );
};

const LoadingOverlay = () => {
  const { active } = useProgress();
  if (!active) return null;
  return (
    <div className="absolute inset-0 z-10">
      <LoadingGrain label="loading earth" />
    </div>
  );
};

export default function RevolvingGlobe() {
  return (
    <CanvasErrorBoundary>
      <div className="relative w-full h-full">
        <LoadingOverlay />
        <Canvas camera={{ position: [0, 0, 4.5], fov: 40 }}>
          <ambientLight intensity={0.5} />
          <directionalLight position={[5, 2, 5]} intensity={1.4} />
          <Suspense fallback={null}>
            <Earth />
          </Suspense>
        </Canvas>
      </div>
    </CanvasErrorBoundary>
  );
}
