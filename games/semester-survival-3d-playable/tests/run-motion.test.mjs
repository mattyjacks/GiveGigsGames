import test from "node:test";
import assert from "node:assert/strict";
import { prepareRunClips } from "../src/three/run-motion.js";

class FakeTrack {
  constructor(name, times, values, interpolation = 2301) {
    this.name = name;
    this.times = Float32Array.from(times);
    this.values = Float32Array.from(values);
    this.interpolation = interpolation;
  }
  getValueSize() { return this.values.length / this.times.length; }
  getInterpolation() { return this.interpolation; }
  createInterpolant() {
    const times = this.times, values = this.values, size = this.getValueSize();
    return { evaluate(time) {
      if (time <= times[0]) return values.slice(0, size);
      const last = times.length - 1;
      if (time >= times[last]) return values.slice(last * size, (last + 1) * size);
      let i = 0;
      while (i < last - 1 && times[i + 1] < time) i++;
      const alpha = (time - times[i]) / (times[i + 1] - times[i]);
      return Array.from({ length: size }, (_, c) => values[i * size + c] * (1 - alpha) + values[(i + 1) * size + c] * alpha);
    }};
  }
}

class FakeClip {
  constructor(name, duration, tracks) { this.name = name; this.duration = duration; this.tracks = tracks; }
  clone() { return new FakeClip(this.name, this.duration, this.tracks.map(t => new FakeTrack(t.name, t.times, t.values, t.interpolation))); }
  resetDuration() { this.duration = Math.max(...this.tracks.map(t => t.times[t.times.length - 1])); }
}
const THREE = { AnimationClip: FakeClip };

test("run approach ends at the forward-most root pose instead of playing the return half", () => {
  const root = new FakeTrack("Armature.position", [0, .5, 1, 1.5, 2], [
    0,0,0, 1,0,0, 2,0,0, 1,0,0, 0,0,0
  ]);
  const limb = new FakeTrack("mixamorigLeftFoot.position", [0, .5, 1, 1.5, 2], [
    0,0,0, .1,.2,0, 0,.4,0, -.1,.2,0, 0,0,0
  ]);
  const authored = new FakeClip("Run", 2, [root, limb]);
  const result = prepareRunClips(authored, THREE);

  assert.equal(result.rootMotionFound, true);
  assert.deepEqual(result.rootMotionTrackNames, ["Armature.position"]);
  assert.equal(result.endpointTime, 1);
  assert.equal(result.approachClip.duration, 1);
  assert.deepEqual(Array.from(result.approachClip.tracks[0].values.slice(-3)), [2,0,0]);
  assert.equal(result.loopClip.duration, 2);
  const loopRoot = result.loopClip.tracks[0];
  for (let i = 0; i < loopRoot.values.length; i += 3) {
    assert.equal(loopRoot.values[i], 2, "root X must remain at the forward endpoint");
    assert.equal(loopRoot.values[i + 2], 0, "root Z must remain at the forward endpoint");
  }
  assert.notDeepEqual(Array.from(result.loopClip.tracks[1].values), Array.from(result.approachClip.tracks[1].values));
});

test("generic position channel fallback is reported instead of silently ignored", () => {
  const track = new FakeTrack("Character.position", [0, 1, 2], [0,0,0, .4,0,0, 0,0,0]);
  const result = prepareRunClips(new FakeClip("Run", 2, [track]), THREE);
  assert.equal(result.rootMotionFound, true);
  assert.equal(result.usedFallback, true);
  assert.equal(result.endpointTime, 1);
  assert.deepEqual(result.rootMotionTrackNames, ["Character.position"]);
});


test("validated authored in-place run clip bypasses the root-motion approach split", () => {
  const rootMotionRun = new FakeClip("Run", 2, [
    new FakeTrack("Armature.position", [0, 1, 2], [0,0,0, 2,0,0, 0,0,0])
  ]);
  const authoredLoop = new FakeClip("Run_InPlace", 0.6667, [
    new FakeTrack("mixamorig:Hips.position", [0, .3333, .6667], [0,0,0, 0,0,0, 0,0,0])
  ]);
  const result = prepareRunClips(rootMotionRun, THREE, authoredLoop);
  assert.equal(result.inPlaceAuthored, true);
  assert.equal(result.approachClip, authoredLoop);
  assert.equal(result.loopClip, authoredLoop);
  assert.equal(result.endpointTime, authoredLoop.duration);
  assert.deepEqual(result.rootMotionTrackNames, []);
});
