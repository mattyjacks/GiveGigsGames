const KEY = "semester-survival-runner-save";
const VERSION = 1;

export function createDefaultSave() {
  return {
    version: VERSION,
    semester: 1,
    coins: 0,
    gems: 0,
    gpa: 0,
    highScore: 0,
    totalDistance: 0,
    upgrades: {},
    unlocked: ["fresher"],
    selectedCharacter: "fresher",
    stats: { runs: 0, assignments: 0, cats: 0, exams: 0, powerups: 0 }
  };
}

export function createSaveStore(storage = globalThis.localStorage, options = {}) {
  const key = options.key || KEY;
  const version = options.version ?? VERSION;
  const defaults = options.defaults || createDefaultSave();

  const cloneDefaults = () => ({
    ...defaults,
    ...(defaults.up && { up: { ...defaults.up } }),
    ...(defaults.stats && { stats: { ...defaults.stats } }),
    ...(Array.isArray(defaults.shop) && { shop: [...defaults.shop] })
  });

  return {
    load() {
      try {
        const parsed = JSON.parse(storage?.getItem(key) || "null");
        if (!parsed || (parsed.version != null && parsed.version !== version)) return cloneDefaults();
        return {
          ...cloneDefaults(),
          ...parsed,
          version,
          ...(defaults.up && { up: { ...defaults.up, ...(parsed.up || {}) } }),
          ...(defaults.stats && { stats: { ...defaults.stats, ...(parsed.stats || {}) } }),
          ...(Array.isArray(defaults.shop) && { shop: Array.isArray(parsed.shop) ? parsed.shop : [...defaults.shop] })
        };
      } catch {
        return cloneDefaults();
      }
    },
    save(value) {
      const safe = { ...cloneDefaults(), ...value, version };
      try {
        storage?.setItem(key, JSON.stringify(safe));
        return true;
      } catch {
        return false;
      }
    },
    clear() {
      try {
        storage?.removeItem(key);
        return true;
      } catch {
        return false;
      }
    }
  };
}

export { KEY as SAVE_KEY, VERSION as SAVE_VERSION };
