import test from "node:test";
import assert from "node:assert/strict";
import { buildCollisionReport } from "../src/three/collision-report.js";

test("vehicle collisions identify the vehicle and give lane-specific coaching", () => {
  const report = buildCollisionReport({
    label: "LATE BUS",
    action: "lane",
    distance: 127.8,
    energyBefore: 32,
    energyAfter: 0
  });
  assert.equal(report.title, "Collision: Late University Bus");
  assert.equal(report.summary, "You collided with the late university bus.");
  assert.equal(report.severity, "severe");
  assert.match(report.detail, /occupied lane/);
  assert.match(report.advice, /clear lane/);
  assert.equal(report.distance, 127);
  assert.equal(report.damage, 32);
});

test("jump and slide failures explain the relevant timing mistake", () => {
  const jump = buildCollisionReport({ label: "CAT PAPER", action: "jump", energyBefore: 100, energyAfter: 68 });
  const slide = buildCollisionReport({ label: "LOW BARRIER", action: "slide", energyBefore: 100, energyAfter: 84 });
  assert.match(jump.detail, /jump cleared/);
  assert.match(jump.advice, /jump earlier/);
  assert.match(slide.detail, /slide started too late/);
  assert.match(slide.advice, /Begin the slide/);
  assert.equal(slide.severity, "minor");
});

test("unknown obstacle labels remain explicit without inventing a vehicle", () => {
  const report = buildCollisionReport({ label: "PRINT QUEUE", action: "lane", distance: 0 });
  assert.equal(report.title, "Collision: Print Queue");
  assert.match(report.summary, /PRINT QUEUE/);
  assert.equal(report.severity, "severe");
});
