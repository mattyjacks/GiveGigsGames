import test from "node:test";
import assert from "node:assert/strict";
import { OBSTACLES, chooseObstacle } from "../src/obstacles/obstacle-catalog.js";
import { POWERUPS, rollPowerup } from "../src/powerups/powerup-catalog.js";
import { createDefaultSave, createSaveStore, SAVE_KEY } from "../src/save/save-store.js";

test("obstacle catalogue has stable unique ids and weighted selection", () => {
  assert.ok(OBSTACLES.length >= 6);
  assert.equal(new Set(OBSTACLES.map(x => x.id)).size, OBSTACLES.length);
  assert.equal(chooseObstacle(OBSTACLES, () => 0), OBSTACLES[0]);
});
test("power-up catalogue includes food, academic and legendary pickups", () => {
  assert.ok(POWERUPS.some(x => x.rarity === "common"));
  assert.ok(POWERUPS.some(x => x.rarity === "uncommon"));
  assert.ok(POWERUPS.some(x => x.rarity === "legendary"));
  assert.ok(POWERUPS.includes(rollPowerup(() => 0)));
});
test("save store round-trips and recovers from malformed data", () => {
  const data = new Map();
  const storage = { getItem: k => data.get(k) ?? null, setItem: (k,v) => data.set(k,v), removeItem: k => data.delete(k) };
  const store = createSaveStore(storage);
  const save = { ...createDefaultSave(), coins: 42 };
  assert.equal(store.save(save), true);
  assert.equal(store.load().coins, 42);
  data.set(SAVE_KEY, "{broken");
  assert.equal(store.load().semester, 1);
});

test("save store supports a custom runner key and migrates unversioned saves", () => {
  const data = new Map([["runner-v1", JSON.stringify({ coins: 19, up: { magnet: 2 } })]]);
  const storage = { getItem: k => data.get(k) ?? null, setItem: (k,v) => data.set(k,v), removeItem: k => data.delete(k) };
  const defaults = { semester: 1, coins: 0, up: { magnet: 0, shield: 0 }, shop: [] };
  const store = createSaveStore(storage, { key: "runner-v1", version: 1, defaults });
  const loaded = store.load();
  assert.equal(loaded.coins, 19);
  assert.deepEqual(loaded.up, { magnet: 2, shield: 0 });
  assert.equal(store.save(loaded), true);
  assert.equal(JSON.parse(data.get("runner-v1")).version, 1);
});
