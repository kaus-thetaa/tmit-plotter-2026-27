"use client";

import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

// stylised wireframe globe with orbit rings, no texture asset needed
// so it never depends on network access at a booth with no wifi
const Globe = () => {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (groupRef.current) groupRef.current.rotation.y += delta * 0.25;
  });

  return (
    <group ref={groupRef}>
      <mesh>
        <sphereGeometry args={[1.4, 24, 24]} />
        <meshBasicMaterial color="#08548A" wireframe transparent opacity={0.5} />
      </mesh>
      <mesh rotation={[Math.PI / 2.2, 0, 0]}>
        <ringGeometry args={[1.8, 1.85, 64]} />
        <meshBasicMaterial
          color="#24787A"
          transparent
          opacity={0.6}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh rotation={[Math.PI / 2.2, 0, 0]}>
        <ringGeometry args={[2.05, 2.08, 64]} />
        <meshBasicMaterial
          color="#F4F4F4"
          transparent
          opacity={0.25}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
};

export default function RevolvingGlobe() {
  return (
    <Canvas camera={{ position: [0, 0, 5], fov: 40 }}>
      <ambientLight intensity={0.9} />
      <Globe />
    </Canvas>
  );
}
