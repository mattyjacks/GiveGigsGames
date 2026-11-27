import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import { prepareRunClips } from "./run-motion.js";

const CLIP_ALIASES = Object.freeze({
  idle: ["idle", "breathing", "breathingidle", "stand"],
  run: ["run", "running", "jog", "sprint"],
  runInPlace: ["run_in_place", "run-in-place", "runinplace"],
  jump: ["jump", "running_jump", "jump_running"],
  slide: ["slide", "sliding", "slide_loop", "runningslide"],
  slideStart: ["slide_start", "slide-start", "slideanticipation"],
  slideLoop: ["slide_loop", "slide-loop", "sliding", "runningslide"],
  slideRecover: ["slide_recover", "slide-recover", "slideout"],
  dodgeLeft: ["dodge_left", "dodge-left", "sidestep_left"],
  dodgeRight: ["dodge_right", "dodge-right", "sidestep_right"],
  fall: ["fall", "falling", "accidental_fall", "shoulder_hit_and_fall", "shoulderhitandfall"],
  getUp: ["getup", "get_up", "recovery", "stand_up"]
});

function normaliseClipName(name) {
  return String(name || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function fitCharacterToHeight(root, targetHeight) {
  root.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(root);
  const size = new THREE.Vector3();
  bounds.getSize(size);
  if (!Number.isFinite(size.y) || size.y <= 0) {
    throw new Error("Jay GLB has no measurable character height.");
  }
  const scale = targetHeight / size.y;
  root.scale.multiplyScalar(scale);
  root.updateMatrixWorld(true);
  const fitted = new THREE.Box3().setFromObject(root);
  root.position.y -= fitted.min.y;
  return { sourceHeight: size.y, scale, bounds: fitted };
}

function reverseAnimationClip(clip, name) {
  const duration = clip.duration;
  const tracks = clip.tracks.map(track => {
    const valueSize = track.getValueSize();
    const sourceTimes = Array.from(track.times);
    const sourceValues = Array.from(track.values);
    const reversedTimes = sourceTimes.map(time => duration - time).reverse();
    const reversedValues = [];
    for (let key = sourceTimes.length - 1; key >= 0; key -= 1) {
      const start = key * valueSize;
      for (let component = 0; component < valueSize; component += 1) {
        reversedValues.push(sourceValues[start + component]);
      }
    }
    return new track.constructor(
      track.name,
      reversedTimes,
      reversedValues,
      track.getInterpolation()
    );
  });
  return new THREE.AnimationClip(name, duration, tracks);
}

function neutralizeOpenMouthMorphs(root) {
  const neutralized = [];
  root.traverse(node => {
    if (!node.isMesh || !node.morphTargetDictionary || !node.morphTargetInfluences) return;
    for (const [name, index] of Object.entries(node.morphTargetDictionary)) {
      // Mixamo and common DCC exports use these names for speech/open-jaw poses.
      // Keep smiles and other expression shapes intact.
      if (!/(?:mouth.?open|open.?mouth|jaw.?open|viseme|phoneme|talk|speak)/i.test(name)) continue;
      if (index < 0 || index >= node.morphTargetInfluences.length) continue;
      node.morphTargetInfluences[index] = 0;
      neutralized.push(name);
    }
  });
  return [...new Set(neutralized)];
}

function resolveClips(clips) {
  const byName = new Map(clips.map(clip => [normaliseClipName(clip.name), clip]));
  const resolved = {};
  const missing = [];
  for (const [state, aliases] of Object.entries(CLIP_ALIASES)) {
    const match = aliases.map(alias => byName.get(normaliseClipName(alias))).find(Boolean);
    if (match) resolved[state] = match;
    else missing.push(state);
  }
  return { resolved, missing };
}

/**
 * Loads the production Jay GLB. The GLB must contain a skinned mesh, a named
 * armature and authored animation clips. No procedural person is generated
 * when the asset or a required clip is missing.
 */
export async function loadJayCharacter({
  url = "./assets/3d/jay/jay.glb",
  scene,
  targetHeight = 1.78,
  fadeSeconds = 0.18,
  strictClips = true,
  onProgress
} = {}) {
  if (!scene || typeof scene.add !== "function") {
    throw new TypeError("A Three.js scene is required.");
  }

  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);
  const gltf = await new Promise((resolve, reject) => {
    loader.load(url, resolve, onProgress, reject);
  });

  const root = gltf.scene;
  if (!root) throw new Error("Jay GLB does not contain a scene.");
  root.name = "Jay_Character_Root";

  let skinnedMeshes = 0;
  root.traverse(node => {
    if (node.isSkinnedMesh) {
      skinnedMeshes += 1;
      node.frustumCulled = false;
      node.castShadow = true;
      node.receiveShadow = true;
      if (node.material) {
        const materials = Array.isArray(node.material) ? node.material : [node.material];
        for (const material of materials) {
          material.roughness = Math.max(0.38, material.roughness ?? 0.7);
          material.needsUpdate = true;
        }
      }
    } else if (node.isMesh) {
      node.castShadow = true;
      node.receiveShadow = true;
    }
  });
  if (!skinnedMeshes) {
    throw new Error("Jay GLB is not rigged: no skinned mesh was found.");
  }

  const { resolved, missing } = resolveClips(gltf.animations || []);
  // Split the authored run at its furthest forward root pose. The approach
  // plays once and stops there; the endless loop keeps the skeleton running
  // while the world supplies continuous forward travel.
  const runMotion = prepareRunClips(resolved.run, THREE, resolved.runInPlace);
  delete resolved.runInPlace;
  resolved.run = runMotion.approachClip;
  const neutralizedMouthMorphs = neutralizeOpenMouthMorphs(root);
  // A reverse of the authored fall clip provides a grounded get-up transition
  // when no dedicated recovery FBX was supplied.
  if (resolved.fall && !resolved.getUp) {
    resolved.getUp = reverseAnimationClip(resolved.fall, "GetUp");
    const missingIndex = missing.indexOf("getUp");
    if (missingIndex >= 0) missing.splice(missingIndex, 1);
  }
  if (!resolved.idle || !resolved.run) {
    throw new Error("Jay GLB must include authored Idle and Run animation clips.");
  }
  if (strictClips && missing.length) {
    throw new Error("Jay GLB is missing required animation clips: " + missing.join(", "));
  }

  const fit = fitCharacterToHeight(root, targetHeight);
  scene.add(root);

  const mixer = new THREE.AnimationMixer(root);
  const actions = {};
  for (const [state, clip] of Object.entries(resolved)) {
    const action = mixer.clipAction(clip);
    action.enabled = true;
    action.clampWhenFinished = state !== "idle" && state !== "run";
    const repeatsForever = state === "idle" || (state === "run" && runMotion.inPlaceAuthored);
    action.setLoop(repeatsForever ? THREE.LoopRepeat : THREE.LoopOnce, repeatsForever ? Infinity : 1);
    actions[state] = action;
  }

  // The first run uses the untouched authored clip exactly once. When it
  // finishes, the stationary loop holds the clip's final forward position.
  const runLoopAction = mixer.clipAction(runMotion.loopClip);
  runLoopAction.enabled = true;
  runLoopAction.clampWhenFinished = false;
  runLoopAction.setLoop(THREE.LoopRepeat, Infinity);

  let activeState = null;
  let runApproachCompleted = Boolean(runMotion.inPlaceAuthored);
  let disposed = false;

  mixer.addEventListener("finished", event => {
    if (event.action !== actions.run || activeState !== "run" || disposed) return;
    runApproachCompleted = true;
    actions.run.stop();
    runLoopAction.reset();
    runLoopAction.enabled = true;
    runLoopAction.setEffectiveTimeScale(actions.run.getEffectiveTimeScale());
    runLoopAction.setEffectiveWeight(1);
    runLoopAction.play();
  });

  function play(state, options = {}) {
    if (disposed) return { ok: false, reason: "disposed" };
    const action = state === "run" && runApproachCompleted ? runLoopAction : actions[state];
    if (!action) {
      return { ok: false, reason: "missing-clip", state, available: Object.keys(actions) };
    }
    const fade = Math.max(0, options.fadeSeconds ?? fadeSeconds);
    const timeScale = Number.isFinite(options.timeScale) ? options.timeScale : 1;
    if (activeState === state) {
      action.setEffectiveTimeScale(timeScale);
      if (state === "run") {
        actions.run.setEffectiveTimeScale(timeScale);
        runLoopAction.setEffectiveTimeScale(timeScale);
      }
      return { ok: true, state, changed: false };
    }
    const previous = activeState
      ? activeState === "run" && runApproachCompleted
        ? runLoopAction
        : actions[activeState]
      : null;
    if (previous === action) {
      activeState = state;
      action.setEffectiveTimeScale(timeScale);
      return { ok: true, state, changed: true, aliased: true };
    }
    if (state === "run") {
      actions.run.stop();
      runLoopAction.stop();
    }
    action.reset();
    action.enabled = true;
    action.setEffectiveTimeScale(timeScale);
    action.setEffectiveWeight(1);
    if (state === "run" && !runApproachCompleted) {
      action.clampWhenFinished = true;
      action.setLoop(THREE.LoopOnce, 1);
    }
    action.play();
    if (previous && fade > 0) action.crossFadeFrom(previous, fade, true);
    else if (previous) previous.stop();
    activeState = state;
    return { ok: true, state, changed: true };
  }

  function isFinished(state) {
    const action = actions[state];
    if (!action) return false;
    const duration = action.getClip().duration;
    return duration > 0 && action.paused && action.time >= duration - 1e-3;
  }

  function reset() {
    if (disposed) return;
    mixer.stopAllAction();
    for (const action of Object.values(actions)) {
      action.reset(); action.enabled = true; action.paused = false; action.setEffectiveWeight(1);
    }
    runLoopAction.reset(); runLoopAction.enabled = true; runLoopAction.paused = false;
    runApproachCompleted = Boolean(runMotion.inPlaceAuthored);
    activeState = null;
    mixer.update(0);
  }

  function update(deltaSeconds) {
    if (disposed) return;
    // Keep gameplay-owned placement (lane, jump height and hit response)
    // independent from any residual FBX/GLTF root translation channel.
    const gameplayPosition = root.position.clone();
    mixer.update(Math.min(Math.max(deltaSeconds || 0, 0), 0.05));
    root.position.copy(gameplayPosition);
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    mixer.stopAllAction();
    scene.remove(root);
    root.traverse(node => {
      if (!node.isMesh) return;
      node.geometry?.dispose?.();
      const materials = Array.isArray(node.material) ? node.material : [node.material];
      materials.forEach(material => material?.dispose?.());
    });
  }

  return Object.freeze({
    root,
    mixer,
    fit,
    availableClips: Object.freeze(Object.keys(actions)),
    missingClips: Object.freeze(missing),
    neutralizedMouthMorphs: Object.freeze(neutralizedMouthMorphs),
    runMotionTracksRemoved: runMotion.rootMotionTrackNames.length,
    runMotionAxesLocked: runMotion.rootMotionTrackNames.length * 2,
    runMotionTrackNames: Object.freeze(runMotion.rootMotionTrackNames),
    runApproachEndpointSeconds: runMotion.endpointTime,
    runMotionFound: runMotion.rootMotionFound,
    runMotionUsedFallback: Boolean(runMotion.usedFallback),
    play,
    getClipDuration(state) { return actions[state]?.getClip()?.duration ?? 0; },
    isFinished,
    reset,
    update,
    dispose,
    get activeState() { return activeState; },
    get runApproachCompleted() { return runApproachCompleted; }
  });
}
