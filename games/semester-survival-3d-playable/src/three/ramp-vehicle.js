export const RAMP_VEHICLE = Object.freeze({
  boardingStartProgress: 0.78,
  boardingEndProgress: 0.92,
  roadEdgeLocalZ: 5.8,
  deckEdgeLocalZ: 2.6,
  deckHeight: 1.15,
  climbDurationSeconds: 1.7,
  dismountDurationSeconds: 0.68,
  activeTravelScale: 0.15
});

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export function rampVehicleWorldZ(progress) {
  return -42 + clamp(Number(progress) || 0, 0, 1.12) * 46 + 1.65;
}

export function rampSurfaceHeightAtLocalZ(localZ) {
  const { roadEdgeLocalZ, deckEdgeLocalZ, deckHeight } = RAMP_VEHICLE;
  return clamp((roadEdgeLocalZ - Number(localZ)) / (roadEdgeLocalZ - deckEdgeLocalZ), 0, 1) * deckHeight;
}

export function rampSurfaceHeightAtProgress(progress, playerWorldZ = 2) {
  return rampSurfaceHeightAtLocalZ(playerWorldZ - rampVehicleWorldZ(progress));
}

export function chooseRampLane(playerLane, random = Math.random) {
  const lane = clamp(Math.floor(Number(playerLane) || 0), 0, 2);
  if (lane !== 1) return 1;
  return random() < 0.5 ? 0 : 2;
}

export function canBoardRamp({ progress, playerLane, vehicleLane, active = false }) {
  return !active && playerLane === vehicleLane && progress >= RAMP_VEHICLE.boardingStartProgress && progress <= RAMP_VEHICLE.boardingEndProgress;
}

export function beginRampDismount(state, surfaceHeight = state?.surfaceHeight ?? 0) {
  if (!state || state.phase !== "climbing") return state;
  return { ...state, phase: "jumpingOff", elapsed: 0, startHeight: Math.max(0, Number(surfaceHeight) || 0) };
}

export function advanceRampEvent(state, dt, surfaceHeight = state?.surfaceHeight ?? 0) {
  if (!state) return null;
  const elapsed = (Number(state.elapsed) || 0) + Math.max(0, Number(dt) || 0);
  if (state.phase === "climbing") {
    const next = { ...state, elapsed, surfaceHeight };
    return elapsed >= RAMP_VEHICLE.climbDurationSeconds ? beginRampDismount(next, surfaceHeight) : next;
  }
  if (state.phase === "jumpingOff") {
    return elapsed >= RAMP_VEHICLE.dismountDurationSeconds ? null : { ...state, elapsed };
  }
  return null;
}
