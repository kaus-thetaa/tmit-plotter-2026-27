// derived flight state from real barometric altitude and pressure,
// ported from the inspiration repo's fsm (arjuna fc state model),
// this replaces a guess with an algorithm actually used before

export type DerivedFlightState =
  | "standby"
  | "boost"
  | "coast"
  | "drogue"
  | "main"
  | "recovery";

export class FlightStateMachine {
  private state: DerivedFlightState = "standby";
  private altHistory: number[] = [];
  private pressureHistory: number[] = [];
  private boostStartT: number | null = null;
  private minPressure: number | null = null;
  private baselineAlt: number | null = null;

  // altitude in meters, pressure in hpa, t in seconds
  update(t: number, altitude: number, pressure: number): DerivedFlightState {
    if (this.baselineAlt === null && pressure > 0) this.baselineAlt = altitude;
    const agl = altitude - (this.baselineAlt ?? 0);

    this.altHistory.push(agl);
    if (this.altHistory.length > 2) this.altHistory.shift();
    this.pressureHistory.push(pressure);
    if (this.pressureHistory.length > 2) this.pressureHistory.shift();

    switch (this.state) {
      case "standby":
        if (this.altHistory.length === 2 && this.altHistory[0] > 15 && this.altHistory[1] > 15) {
          this.state = "boost";
          this.boostStartT = t;
        }
        break;
      case "boost":
        if (this.boostStartT !== null && t - this.boostStartT >= 3) {
          this.state = "coast";
        }
        break;
      case "coast":
        if (this.minPressure === null || pressure < this.minPressure) this.minPressure = pressure;
        if (this.minPressure !== null && pressure - this.minPressure > 0.5) {
          this.state = "drogue";
        }
        break;
      case "drogue":
        if (this.altHistory.length === 2 && this.altHistory[0] < 450 && this.altHistory[1] < 450) {
          this.state = "main";
        }
        break;
      case "main":
        if (
          this.pressureHistory.length === 2 &&
          Math.abs(this.pressureHistory[1] - this.pressureHistory[0]) < 0.04
        ) {
          this.state = "recovery";
        }
        break;
      case "recovery":
        break;
    }

    return this.state;
  }

  getState() {
    return this.state;
  }

  reset() {
    this.state = "standby";
    this.altHistory = [];
    this.pressureHistory = [];
    this.boostStartT = null;
    this.minPressure = null;
    this.baselineAlt = null;
  }
}

export const STATE_META: Record<DerivedFlightState, { label: string; color: string }> = {
  standby: { label: "standby", color: "#B6B6B6" },
  boost: { label: "boost", color: "#FC3D21" },
  coast: { label: "coast", color: "#D1480F" },
  drogue: { label: "drogue", color: "#A2673F" },
  main: { label: "main chute", color: "#1D7373" },
  recovery: { label: "recovery", color: "#005288" },
};

// standard barometric formula, meters of agl altitude to hpa, used by
// the simulated feed so sim data drives the same real fsm above
export const altitudeToPressureHpa = (altitudeAgl: number) =>
  1013.25 * Math.pow(1 - altitudeAgl / 44330, 1 / 0.1903);
