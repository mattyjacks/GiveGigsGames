import test from "node:test";
import assert from "node:assert/strict";
import { RAMP_VEHICLE, advanceRampEvent, beginRampDismount, canBoardRamp, chooseRampLane, rampSurfaceHeightAtLocalZ, rampSurfaceHeightAtProgress, rampVehicleWorldZ } from "../src/three/ramp-vehicle.js";

test("ramp surface joins the road and raised deck without floating gaps", () => {
  assert.equal(rampSurfaceHeightAtLocalZ(RAMP_VEHICLE.roadEdgeLocalZ), 0);
  assert.equal(rampSurfaceHeightAtLocalZ(RAMP_VEHICLE.deckEdgeLocalZ), RAMP_VEHICLE.deckHeight);
  assert.equal(rampSurfaceHeightAtLocalZ(99), 0);
  assert.equal(rampSurfaceHeightAtLocalZ(-99), RAMP_VEHICLE.deckHeight);
});

test("ramp approach lane is always reachable with one lane change", () => {
  assert.equal(chooseRampLane(0), 1);
  assert.equal(chooseRampLane(2), 1);
  assert.equal(chooseRampLane(1, () => 0), 0);
  assert.equal(chooseRampLane(1, () => 0.99), 2);
});

test("ramp boarding only activates in its approach window and matching lane", () => {
  assert.equal(canBoardRamp({ progress: 0.8, playerLane: 1, vehicleLane: 1 }), true);
  assert.equal(canBoardRamp({ progress: 0.7, playerLane: 1, vehicleLane: 1 }), false);
  assert.equal(canBoardRamp({ progress: 0.95, playerLane: 1, vehicleLane: 1 }), false);
  assert.equal(canBoardRamp({ progress: 0.8, playerLane: 0, vehicleLane: 1 }), false);
  assert.equal(canBoardRamp({ progress: 0.8, playerLane: 1, vehicleLane: 1, active: true }), false);
});

test("ramp vehicle surface height follows its approach position", () => {
  assert.ok(rampVehicleWorldZ(0.9) > rampVehicleWorldZ(0.8));
  assert.ok(rampSurfaceHeightAtProgress(0.84) > rampSurfaceHeightAtProgress(0.8));
  assert.equal(rampSurfaceHeightAtProgress(0.88), RAMP_VEHICLE.deckHeight);
});

test("ramp event transitions from climbing to a timed jump-off and completion", () => {
  const climbing = { phase: "climbing", elapsed: 0, surfaceHeight: 0.8 };
  const started = beginRampDismount(climbing, 0.8);
  assert.equal(started.phase, "jumpingOff");
  assert.equal(started.startHeight, 0.8);
  assert.equal(climbing.phase, "climbing", "transitions must not mutate the previous state");
  const stillClimbing = advanceRampEvent(climbing, 0.5, 0.7);
  assert.equal(stillClimbing.phase, "climbing");
  const automaticExit = advanceRampEvent(climbing, RAMP_VEHICLE.climbDurationSeconds, 0.9);
  assert.equal(automaticExit.phase, "jumpingOff");
  assert.equal(automaticExit.startHeight, 0.9);
  assert.equal(advanceRampEvent(automaticExit, RAMP_VEHICLE.dismountDurationSeconds), null);
});
