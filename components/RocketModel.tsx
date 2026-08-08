"use client";

import { Suspense } from "react";
import { Canvas, useLoader } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import type { Quaternion } from "@/lib/imu/useOrientation";

type RocketMeshProps = {
  objUrl: string;
  orientation: Quaternion;
};

const RocketMesh = ({ objUrl, orientation }: RocketMeshProps) => {
  const obj = useLoader(OBJLoader, objUrl);

  return (
    <primitive
      object={obj}
      quaternion={[orientation.x, orientation.y, orientation.z, orientation.w]}
      scale={0.9}
    />
  );
};

type RocketModelProps = {
  objUrl?: string;
  orientation: Quaternion;
};

export default function RocketModel({
  objUrl = "/models/placeholder-rocket.obj",
  orientation,
}: RocketModelProps) {
  return (
    <Canvas camera={{ position: [0, 0, 5], fov: 45 }}>
      <ambientLight intensity={0.6} />
      <directionalLight position={[3, 3, 3]} intensity={1} />
      <Suspense fallback={null}>
        <RocketMesh objUrl={objUrl} orientation={orientation} />
      </Suspense>
      <OrbitControls enablePan={false} />
    </Canvas>
  );
}
