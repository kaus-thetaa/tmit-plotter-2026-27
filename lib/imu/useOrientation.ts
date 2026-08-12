"use client";

import { useCallback, useRef, useState } from "react";

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

export type Vector3 = { x: number; y: number; z: number };

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

const RAD2DEG = 180 / Math.PI;

// standard 6dof complementary filter, roll and pitch blend gyro
// integration with the accelerometer's gravity vector so the model
// self corrects instead of drifting, yaw is gyro only since there is
// no magnetometer fusion here by design
export const useComplementaryFilter = (alpha = 0.98) => {
  const [orientation, setOrientation] = useState<Quaternion>(IDENTITY);
  const stateRef = useRef({ roll: 0, pitch: 0, yaw: 0 });

  const update = useCallback(
    (accel: Vector3, gyroDegPerSec: Vector3, dtSeconds: number) => {
      const accelRoll = Math.atan2(accel.y, accel.z) * RAD2DEG;
      const accelPitch =
        Math.atan2(-accel.x, Math.sqrt(accel.y * accel.y + accel.z * accel.z)) *
        RAD2DEG;

      const s = stateRef.current;
      const gyroRoll = s.roll + gyroDegPerSec.x * dtSeconds;
      const gyroPitch = s.pitch + gyroDegPerSec.y * dtSeconds;
      const gyroYaw = s.yaw + gyroDegPerSec.z * dtSeconds;

      s.roll = alpha * gyroRoll + (1 - alpha) * accelRoll;
      s.pitch = alpha * gyroPitch + (1 - alpha) * accelPitch;
      s.yaw = ((gyroYaw % 360) + 360) % 360;

      setOrientation(eulerToQuaternion(s.roll, s.pitch, s.yaw));
    },
    [alpha]
  );

  const reset = useCallback(() => {
    stateRef.current = { roll: 0, pitch: 0, yaw: 0 };
    setOrientation(IDENTITY);
  }, []);

  return { orientation, update, reset };
};

// tilt from accelerometer alone, no gyro integration, yaw undetermined
// this is what the raw vs fused ghost overlay compares the real
// filter output against
export const accelOnlyOrientation = (accel: Vector3): Quaternion => {
  const roll = Math.atan2(accel.y, accel.z) * RAD2DEG;
  const pitch =
    Math.atan2(-accel.x, Math.sqrt(accel.y * accel.y + accel.z * accel.z)) * RAD2DEG;
  return eulerToQuaternion(roll, pitch, 0);
};
