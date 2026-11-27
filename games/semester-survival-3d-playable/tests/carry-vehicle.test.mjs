import test from "node:test";
import assert from "node:assert/strict";
import { CARRY_VEHICLE, advanceCarryEvent, createCarryState, getCarryPlayerHeight, getCarrySpeedScale, isCarryEventActive } from "../src/three/carry-vehicle.js";

function reachRiding(lane = 1) {
  let state = createCarryState({ lane });
  state = advanceCarryEvent(state, 4);
  assert.equal(state.phase, "boarding");
  state = advanceCarryEvent(state, CARRY_VEHICLE.boardingDurationSeconds);
  assert.equal(state.phase, "riding");
  return state;
}

test("carry vehicle approaches, boards Jay, and begins its timed ride", () => {
  let state = createCarryState({ lane: 2 });
  assert.equal(state.phase, "approaching");
  assert.equal(state.lane, 2);
  state = advanceCarryEvent(state, 3.3);
  assert.equal(state.phase, "boarding");
  assert.equal(state.vehicleZ, CARRY_VEHICLE.boardingTriggerZ);
  assert.ok(getCarryPlayerHeight(state) >= 0);
  state = advanceCarryEvent(state, CARRY_VEHICLE.boardingDurationSeconds);
  assert.equal(state.phase, "riding");
  assert.equal(state.rideElapsed, 0);
});

test("riding lasts approximately twenty simulation seconds", () => {
  let state = reachRiding();
  state = advanceCarryEvent(state, 19.9);
  assert.equal(state.phase, "riding");
  state = advanceCarryEvent(state, 0.1);
  assert.equal(state.phase, "slowing_down");
  assert.equal(state.rideElapsed, 20);
});

test("carry vehicle decelerates smoothly, stops, and dismounts", () => {
  let state = reachRiding();
  state = advanceCarryEvent(state, CARRY_VEHICLE.rideDurationSeconds);
  const startScale = getCarrySpeedScale(state);
  state = advanceCarryEvent(state, 1);
  const middleScale = getCarrySpeedScale(state);
  assert.ok(middleScale < startScale && middleScale > 0);
  state = advanceCarryEvent(state, 1);
  assert.equal(state.phase, "stopped");
  assert.equal(getCarrySpeedScale(state), 0);
  assert.equal(getCarryPlayerHeight(state), CARRY_VEHICLE.deckHeight);
  state = advanceCarryEvent(state, CARRY_VEHICLE.stoppedDurationSeconds);
  assert.equal(state.phase, "dismounting");
  assert.ok(getCarryPlayerHeight(state) >= CARRY_VEHICLE.deckHeight);
  state = advanceCarryEvent(state, CARRY_VEHICLE.dismountDurationSeconds);
  assert.equal(state.phase, "completed");
  assert.equal(getCarryPlayerHeight(state), 0);
  assert.equal(getCarrySpeedScale(state), 1);
});

test("safe lane decisions update only at controlled intervals", () => {
  let state = createCarryState({ lane: 1 });
  state = advanceCarryEvent(state, 0.01, { safeLane: 2 });
  assert.equal(state.lane, 2);
  state = advanceCarryEvent(state, 0.2, { safeLane: 0 });
  assert.equal(state.lane, 2);
  state = advanceCarryEvent(state, CARRY_VEHICLE.safeLaneCheckSeconds, { safeLane: 0 });
  assert.equal(state.lane, 0);
});

test("safe lane checks continue while the vehicle is slowing to its stop", () => {
  let state = reachRiding();
  state = advanceCarryEvent(state, CARRY_VEHICLE.rideDurationSeconds);
  assert.equal(state.phase, "slowing_down");
  state = advanceCarryEvent(state, 0.01, { safeLane: 0 });
  assert.equal(state.lane, 0);
});

test("completed vehicle leaves the gameplay area and is recycled", () => {
  let state = reachRiding();
  state = advanceCarryEvent(state, 20);
  state = advanceCarryEvent(state, 2);
  state = advanceCarryEvent(state, CARRY_VEHICLE.stoppedDurationSeconds);
  state = advanceCarryEvent(state, CARRY_VEHICLE.dismountDurationSeconds);
  assert.equal(state.phase, "completed");
  assert.equal(isCarryEventActive(state), false);
  state = advanceCarryEvent(state, 3);
  assert.equal(state, null);
});

test("state transitions are immutable and restart can start a fresh event", () => {
  const original = createCarryState({ lane: 0 });
  const next = advanceCarryEvent(original, 0.5);
  assert.notEqual(next, original);
  assert.equal(original.phase, "approaching");
  assert.equal(createCarryState({ lane: 1 }).phase, "approaching");
});
