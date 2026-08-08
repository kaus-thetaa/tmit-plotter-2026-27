"use client";

import { useCallback, useState } from "react";

export type Quaternion = { w: number; x: number; y: number; z: number };

export const eulerToQuaternion = (
  rollDeg: number,
  pitchDeg: number,
  yawDeg: number
): Quaternion => {
  const roll = (rollDeg * Math.PI) / 180;
  const pitch = (pitchDeg * Math.PI) / 180;
  const yaw = (yawDeg * Math.PI) / 180;

  const cr = Math.cos(roll * 0.5);
  const sr = Math.sin(roll * 0.5);
  const cp = Math.cos(pitch * 0.5);
  const sp = Math.sin(pitch * 0.5);
  const cy = Math.cos(yaw * 0.5);
  const sy = Math.sin(yaw * 0.5);

  return {
    w: cr * cp * cy + sr * sp * sy,
    x: sr * cp * cy - cr * sp * sy,
    y: cr * sp * cy + sr * cp * sy,
    z: cr * cp * sy - sr * sp * cy,
  };
};

const IDENTITY: Quaternion = { w: 1, x: 0, y: 0, z: 0 };

export const useOrientation = () => {
  const [orientation, setOrientation] = useState<Quaternion>(IDENTITY);

  const setFromEuler = useCallback(
    (rollDeg: number, pitchDeg: number, yawDeg: number) => {
      setOrientation(eulerToQuaternion(rollDeg, pitchDeg, yawDeg));
    },
    []
  );

  const reset = useCallback(() => setOrientation(IDENTITY), []);

  return { orientation, setOrientation, setFromEuler, reset };
};
