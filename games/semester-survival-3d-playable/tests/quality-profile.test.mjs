import test from "node:test";
import assert from "node:assert/strict";
import { resolveQualityProfile } from "../src/three/quality-profile.js";

test("High quality keeps crisp mobile rendering and soft shadows", () => {
  assert.deepEqual(resolveQualityProfile("High", 3), {
    pixelRatioCap: 1.5, shadowMapSize: 1024, shadows: true, pixelRatio: 1.5
  });
});
test("Balanced quality reduces render cost without removing shadows", () => {
  assert.deepEqual(resolveQualityProfile("Balanced", 2), {
    pixelRatioCap: 1.15, shadowMapSize: 768, shadows: true, pixelRatio: 1.15
  });
});
test("Performance quality disables expensive shadows and caps resolution", () => {
  assert.deepEqual(resolveQualityProfile("Performance", 2), {
    pixelRatioCap: 0.9, shadowMapSize: 512, shadows: false, pixelRatio: 0.9
  });
});
test("unknown preferences safely fall back to Balanced", () => {
  assert.deepEqual(resolveQualityProfile("ultra-mega", 1), {
    pixelRatioCap: 1.15, shadowMapSize: 768, shadows: true, pixelRatio: 1
  });
});
