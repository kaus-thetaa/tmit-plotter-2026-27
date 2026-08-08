"use client";

import { useEffect, useRef, useState } from "react";

export enum MotorState {
  Safe = "safe",
  Armed = "armed",
  Burn = "burn",
  Complete = "complete",
}

type Listener = (prev: MotorState, next: MotorState) => void;

export class MotorStateMachine {
  private state: MotorState = MotorState.Safe;
  private burnStart: number | null = null;
  private listeners: Listener[] = [];

  constructor(private expectedBurnSeconds = 20) {}

  getState() {
    return this.state;
  }

  getBurnElapsed() {
    return this.burnStart ? (performance.now() - this.burnStart) / 1000 : 0;
  }

  getBurnProgress() {
    if (!this.burnStart) return 0;
    return Math.min(1, this.getBurnElapsed() / this.expectedBurnSeconds);
  }

  onChange(cb: Listener) {
    this.listeners.push(cb);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== cb);
    };
  }

  arm() {
    if (this.state !== MotorState.Safe) return false;
    this.transition(MotorState.Armed);
    return true;
  }

  launch() {
    if (this.state !== MotorState.Armed) return false;
    this.burnStart = performance.now();
    this.transition(MotorState.Burn);
    return true;
  }

  safe() {
    if (this.state === MotorState.Safe) return false;
    this.burnStart = null;
    this.transition(MotorState.Safe);
    return true;
  }

  complete() {
    if (this.state !== MotorState.Burn) return false;
    this.transition(MotorState.Complete);
    return true;
  }

  reset() {
    if (this.state !== MotorState.Complete) return false;
    this.burnStart = null;
    this.transition(MotorState.Safe);
    return true;
  }

  private transition(next: MotorState) {
    const prev = this.state;
    this.state = next;
    this.listeners.forEach((cb) => cb(prev, next));
  }
}

export const useMotorStateMachine = (expectedBurnSeconds = 20) => {
  const machineRef = useRef<MotorStateMachine>();
  if (!machineRef.current) {
    machineRef.current = new MotorStateMachine(expectedBurnSeconds);
  }
  const machine = machineRef.current;
  const [state, setState] = useState<MotorState>(machine.getState());

  useEffect(() => machine.onChange((_prev, next) => setState(next)), [machine]);

  return {
    state,
    burnElapsed: machine.getBurnElapsed(),
    burnProgress: machine.getBurnProgress(),
    arm: machine.arm.bind(machine),
    launch: machine.launch.bind(machine),
    safe: machine.safe.bind(machine),
    complete: machine.complete.bind(machine),
    reset: machine.reset.bind(machine),
  };
};
