import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_DIFFICULTY_CONFIG, DIFFICULTY_MILESTONES, getDifficultyProfile, getTrafficSpawnLayout } from "../src/difficulty/difficulty-progression.js";

test("difficulty milestones map to the intended distance bands", () => {
  assert.deepEqual(DIFFICULTY_MILESTONES.map(item => item.distance), [0, 500, 1500, 3000, 5000]);
  assert.equal(getDifficultyProfile(0).band, "Beginner");
  assert.equal(getDifficultyProfile(500).band, "Intermediate");
  assert.equal(getDifficultyProfile(1500).band, "Advanced");
  assert.equal(getDifficultyProfile(3000).band, "Expert");
  assert.equal(getDifficultyProfile(5000).band, "Master");
});

test("speed and traffic pressure increase monotonically with distance", () => {
  const samples = [0, 250, 500, 1000, 1500, 2250, 3000, 4000, 5000];
  const profiles = samples.map(distance => getDifficultyProfile(distance));
  for (let index = 1; index < profiles.length; index += 1) {
    assert.ok(profiles[index].playerSpeedMultiplier >= profiles[index - 1].playerSpeedMultiplier);
    assert.ok(profiles[index].trafficSpeedMultiplier >= profiles[index - 1].trafficSpeedMultiplier);
    assert.ok(profiles[index].trafficFrequencyMultiplier >= profiles[index - 1].trafficFrequencyMultiplier);
    assert.ok(profiles[index].obstacleChance >= profiles[index - 1].obstacleChance);
    assert.ok(profiles[index].multiLanePatternChance >= profiles[index - 1].multiLanePatternChance);
    assert.ok(profiles[index].rampVehicleChance >= profiles[index - 1].rampVehicleChance);
    assert.ok(profiles[index].spawnIntervalSeconds <= profiles[index - 1].spawnIntervalSeconds);
  }
});

test("progression is continuous at milestones and capped beyond Master", () => {
  for (const milestone of [500, 1500, 3000, 5000]) {
    const before = getDifficultyProfile(milestone - 0.001);
    const at = getDifficultyProfile(milestone);
    const after = getDifficultyProfile(milestone + 0.001);
    assert.ok(Math.abs(at.playerSpeedMultiplier - before.playerSpeedMultiplier) < 0.00001);
    assert.ok(Math.abs(after.playerSpeedMultiplier - at.playerSpeedMultiplier) < 0.00001);
  }
  const capped = getDifficultyProfile(50000);
  const master = getDifficultyProfile(5000);
  assert.equal(capped.progress, master.progress);
  assert.equal(capped.playerSpeedMultiplier, master.playerSpeedMultiplier);
  assert.equal(capped.trafficSpeedMultiplier, master.trafficSpeedMultiplier);
  assert.equal(capped.spawnIntervalSeconds, master.spawnIntervalSeconds);
  assert.equal(getDifficultyProfile(-100).progress, 0);
});

test("difficulty milestones and tuning values can be configured", () => {
  const profile = getDifficultyProfile(1000, {
    milestones: [
      { distance: 0, progress: 0, band: "Start" },
      { distance: 1000, progress: 1, band: "Peak" }
    ],
    playerSpeedMultiplier: [1, 1.5],
    trafficSpeedMultiplier: [1, 1.3],
    trafficFrequencyMultiplier: [1, 1.2],
    trafficDensityMultiplier: [1, 1.2],
    spawnIntervalSeconds: [3, 2],
    obstacleChance: [0.1, 0.5],
    vehicleChance: [0.1, 0.2],
    multiLanePatternChance: [0, 0.2],
    rampVehicleChance: [0.01, 0.05]
  });
  assert.equal(profile.band, "Peak");
  assert.equal(profile.playerSpeedMultiplier, 1.5);
  assert.equal(profile.spawnIntervalSeconds, 2);
});

test("invalid distances safely resolve to the beginner profile", () => {
  assert.equal(getDifficultyProfile(Number.NaN).progress, 0);
  assert.equal(getDifficultyProfile(undefined).progress, 0);
});


test("traffic frequency and density increase without spawning vehicles on top of Jay", () => {
  const beginner = getTrafficSpawnLayout(getDifficultyProfile(0));
  const intermediate = getTrafficSpawnLayout(getDifficultyProfile(500));
  const advanced = getTrafficSpawnLayout(getDifficultyProfile(1500));
  const expert = getTrafficSpawnLayout(getDifficultyProfile(3000));
  const master = getTrafficSpawnLayout(getDifficultyProfile(5000));
  assert.equal(beginner.activeVehicleCount, 6);
  assert.equal(intermediate.activeVehicleCount, 6);
  assert.equal(advanced.activeVehicleCount, 7);
  assert.equal(expert.activeVehicleCount, 8);
  assert.equal(master.activeVehicleCount, 8);
  assert.ok(master.spacing < expert.spacing && expert.spacing < advanced.spacing && advanced.spacing < beginner.spacing);
  assert.ok(master.spacing > 30, "Traffic spacing must retain a safe minimum at the Master cap.");
  const custom = getDifficultyProfile(1000, { ...DEFAULT_DIFFICULTY_CONFIG, milestones: [{ distance: 0, progress: 0, band: "Start" }, { distance: 1000, progress: 1, band: "Peak" }] });
  assert.equal(getTrafficSpawnLayout(custom).activeVehicleCount, 8, "Traffic density should follow configurable progression milestones.");
});
