export const CARRY_VEHICLE = Object.freeze({
  approachStartZ: -18,
  boardingTriggerZ: -3.2,
  approachSpeed: 4.6,
  boardingDurationSeconds: 0.72,
  rideDurationSeconds: 20,
  slowingDurationSeconds: 2,
  stoppedDurationSeconds: 0.38,
  dismountDurationSeconds: 0.72,
  safeLaneCheckSeconds: 0.35,
  slowingVehicleDrift: 0.45,
  stoppedVehicleZ: -2.3,
  exitSpeed: 6,
  exitRecycleZ: 14,
  deckHeight: 1.05,
  deckCenterZ: 3.7,
  deckLength: 4.4,
  rampUpperZ: 5.9,
  rampLowerZ: 8.2
});

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const smoothstep = value => value * value * (3 - 2 * value);
const VALID_LANES = new Set([0, 1, 2]);

export function createCarryState({ lane = 1 } = {}) {
  return { phase: "approaching", lane: VALID_LANES.has(lane) ? lane : 1, vehicleZ: CARRY_VEHICLE.approachStartZ, elapsed: 0, rideElapsed: 0, nextLaneCheck: 0, speedScale: 1 };
}

export function isCarryEventActive(state) {
  return !!state && state.phase !== "completed";
}

export function getCarrySpeedScale(state) {
  return state ? clamp(Number(state.speedScale) || 0, 0, 1) : 1;
}

export function getCarryPlayerHeight(state) {
  if (!state) return 0;
  if (state.phase === "boarding") {
    const t = clamp(state.elapsed / CARRY_VEHICLE.boardingDurationSeconds, 0, 1);
    return CARRY_VEHICLE.deckHeight * smoothstep(t) + Math.sin(t * Math.PI) * 0.22;
  }
  if (["riding", "slowing_down", "stopped"].includes(state.phase)) return CARRY_VEHICLE.deckHeight;
  if (state.phase === "dismounting") {
    const t = clamp(state.elapsed / CARRY_VEHICLE.dismountDurationSeconds, 0, 1);
    return CARRY_VEHICLE.deckHeight * (1 - t) + Math.sin(t * Math.PI) * 0.58;
  }
  return 0;
}

export function advanceCarryEvent(state, dt, { safeLane } = {}) {
  if (!state) return null;
  const delta = Math.max(0, Number(dt) || 0);
  const next = { ...state };
  if (["approaching", "riding", "slowing_down"].includes(next.phase)) {
    next.nextLaneCheck = Math.max(0, (Number(next.nextLaneCheck) || 0) - delta);
    if (next.nextLaneCheck <= 0 && VALID_LANES.has(safeLane)) {
      next.lane = safeLane;
      next.nextLaneCheck = CARRY_VEHICLE.safeLaneCheckSeconds;
    }
  }
  if (next.phase === "approaching") {
    next.vehicleZ += CARRY_VEHICLE.approachSpeed * delta;
    if (next.vehicleZ >= CARRY_VEHICLE.boardingTriggerZ) {
      next.vehicleZ = CARRY_VEHICLE.boardingTriggerZ;
      next.phase = "boarding";
      next.elapsed = 0;
    }
  } else if (next.phase === "boarding") {
    next.elapsed += delta;
    if (next.elapsed >= CARRY_VEHICLE.boardingDurationSeconds) {
      next.phase = "riding";
      next.elapsed = 0;
      next.rideElapsed = 0;
      next.vehicleZ = CARRY_VEHICLE.boardingTriggerZ;
    }
  } else if (next.phase === "riding") {
    next.rideElapsed += delta;
    if (next.rideElapsed >= CARRY_VEHICLE.rideDurationSeconds) {
      next.phase = "slowing_down";
      next.elapsed = 0;
    }
  } else if (next.phase === "slowing_down") {
    next.elapsed += delta;
    const progress = clamp(next.elapsed / CARRY_VEHICLE.slowingDurationSeconds, 0, 1);
    next.speedScale = 1 - 0.55 * smoothstep(progress);
    next.vehicleZ += CARRY_VEHICLE.slowingVehicleDrift * delta;
    if (progress >= 1) {
      next.phase = "stopped";
      next.elapsed = 0;
      next.speedScale = 0;
      next.vehicleZ = CARRY_VEHICLE.stoppedVehicleZ;
    }
  } else if (next.phase === "stopped") {
    next.elapsed += delta;
    next.speedScale = 0;
    if (next.elapsed >= CARRY_VEHICLE.stoppedDurationSeconds) {
      next.phase = "dismounting";
      next.elapsed = 0;
    }
  } else if (next.phase === "dismounting") {
    next.elapsed += delta;
    next.speedScale = 0;
    if (next.elapsed >= CARRY_VEHICLE.dismountDurationSeconds) {
      next.phase = "completed";
      next.elapsed = 0;
      next.speedScale = 1;
    }
  } else if (next.phase === "completed") {
    next.vehicleZ += CARRY_VEHICLE.exitSpeed * delta;
    if (next.vehicleZ >= CARRY_VEHICLE.exitRecycleZ) return null;
  } else return null;
  return next;
}
