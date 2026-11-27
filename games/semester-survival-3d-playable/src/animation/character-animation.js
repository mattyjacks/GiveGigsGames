/* Semester Survival — authored sprite animation runtime.
 * Consumes approved atlas metadata and real artwork. Missing clips are reported,
 * never replaced with generated poses or placeholder geometry.
 */
(function (root) {
  'use strict';

  const DEFAULTS = Object.freeze({ transitionSeconds: 0.12, maxDelta: 0.1 });
  const STATE_CLIPS = Object.freeze({
    idle: 'idle', walk: 'walk', jog: 'jog', sprint: 'sprint',
    'jump-takeoff': 'jump-running', 'jump-rise': 'jump-running',
    'jump-apex': 'jump-running', 'jump-fall': 'jump-running',
    'fall': 'fall-accidental', 'land-recover': 'get-up-recovery',
    'slide-start': 'slide-start',
    'slide-loop': 'slide-loop', 'slide-recover': 'slide-recover', 'dodge-left': 'dodge-left',
    'dodge-right': 'dodge-right'
  });

  function validateManifest(manifest, image) {
    const errors = [];
    if (!manifest || typeof manifest !== 'object') return ['Manifest must be an object.'];
    if (!image || !Number.isFinite(image.width) || !Number.isFinite(image.height) ||
        image.width <= 0 || image.height <= 0) errors.push('A decoded atlas image is required.');
    if (!manifest.clips || typeof manifest.clips !== 'object') {
      errors.push('Manifest must define a clips object.');
      return errors;
    }
    Object.keys(manifest.clips).forEach(name => {
      const clip = manifest.clips[name];
      if (!clip || !Array.isArray(clip.frames) || clip.frames.length === 0) {
        errors.push(name + ': frames must be a non-empty array.');
        return;
      }
      if (!Number.isFinite(clip.fps) || clip.fps <= 0) errors.push(name + ': fps must be positive.');
      if (!['loop', 'once', 'pingpong'].includes(clip.playback || 'loop')) {
        errors.push(name + ': unsupported playback mode.');
      }
      clip.frames.forEach((frame, index) => {
        if (!frame || ![frame.x, frame.y, frame.width, frame.height].every(Number.isFinite) ||
            frame.x < 0 || frame.y < 0 || frame.width <= 0 || frame.height <= 0) {
          errors.push(name + ': invalid frame rectangle at index ' + index + '.');
          return;
        }
        if (image && (frame.x + frame.width > image.width || frame.y + frame.height > image.height)) {
          errors.push(name + ': frame ' + index + ' exceeds atlas bounds.');
        }
        if (frame.pivotX !== undefined && !Number.isFinite(frame.pivotX)) errors.push(name + ': invalid pivotX.');
        if (frame.pivotY !== undefined && !Number.isFinite(frame.pivotY)) errors.push(name + ': invalid pivotY.');
        if (frame.events !== undefined && (!Array.isArray(frame.events) ||
            frame.events.some(event => !(typeof event === 'string' && event.trim()) && !(event && typeof event === 'object' && typeof event.name === 'string' && event.name.trim() && (event.offsetX === undefined || Number.isFinite(event.offsetX)) && (event.offsetDepth === undefined || Number.isFinite(event.offsetDepth)))))) {
          errors.push(name + ': frame events must be non-empty strings.');
        }
      });
    });
    return errors;
  }

  function createClipLibrary(manifest, image) {
    const errors = validateManifest(manifest, image);
    if (errors.length) throw new Error('Invalid animation manifest:\n' + errors.join('\n'));
    return Object.freeze({
      image,
      has(name) { return Object.prototype.hasOwnProperty.call(manifest.clips, name); },
      get(name) { return manifest.clips[name] || null; },
      names() { return Object.keys(manifest.clips); }
    });
  }

  function resolveFrame(clip, elapsed) {
    const count = clip.frames.length;
    const mode = clip.playback || 'loop';
    const raw = Math.floor(Math.max(0, elapsed) * clip.fps);
    let index;
    let complete = false;
    if (mode === 'once') {
      index = Math.min(count - 1, raw);
      complete = raw >= count;
    } else if (mode === 'pingpong' && count > 1) {
      const period = count * 2 - 2;
      const step = raw % period;
      index = step < count ? step : period - step;
    } else {
      index = raw % count;
    }
    return { index, frame: clip.frames[index], complete };
  }

  function createAnimator(library, options) {
    options = Object.assign({}, DEFAULTS, options || {});
    let current = null;
    let previous = null;
    let elapsed = 0;
    let previousElapsed = 0;
    let blendElapsed = 0;
    let facing = 1;
    let missing = null;
    let lastEventFrame = -1;
    const pendingEvents = [];

    function play(name, direction) {
      if (!library.has(name)) {
        missing = name;
        return { ok: false, missingClip: name };
      }
      missing = null;
      if (!current || current.name !== name) {
        previous = current;
        previousElapsed = elapsed;
        current = { name };
        elapsed = 0;
        lastEventFrame = -1;
        pendingEvents.length = 0;
        blendElapsed = previous ? 0 : options.transitionSeconds;
      }
      if (direction === -1 || direction === 1) facing = direction;
      return { ok: true, clip: name };
    }

    function update(delta) {
      const dt = Math.max(0, Math.min(Number(delta) || 0, options.maxDelta));
      if (current) {
        elapsed += dt;
        const clip = library.get(current.name);
        const rawFrame = Math.floor(elapsed * clip.fps);
        const eventFrame = (clip.playback || 'loop') === 'once'
          ? Math.min(rawFrame, clip.frames.length - 1) : rawFrame;
        const last = lastEventFrame < 0 ? 0 : lastEventFrame + 1;
        for (let raw = last; raw <= eventFrame; raw += 1) {
          const resolved = resolveFrame(clip, raw / clip.fps);
          const events = resolved.frame.events || [];
          events.forEach(function (event) {
            pendingEvents.push(Object.freeze({ clip: current.name, frameIndex: resolved.index, event: typeof event === 'string' ? event : event.name, offsetX: typeof event === 'object' ? (event.offsetX || 0) : 0, offsetDepth: typeof event === 'object' ? (event.offsetDepth || 0) : 0 }));
          });
        }
        lastEventFrame = eventFrame;
      }
      if (previous && blendElapsed < options.transitionSeconds) {
        previousElapsed += dt;
        blendElapsed = Math.min(options.transitionSeconds, blendElapsed + dt);
      } else {
        previous = null;
      }
      return snapshot();
    }

    function snapshot() {
      if (!current) return { status: 'unbound', clip: null, missingClip: missing };
      const clip = library.get(current.name);
      const resolved = resolveFrame(clip, elapsed);
      const alpha = options.transitionSeconds > 0
        ? Math.min(1, blendElapsed / options.transitionSeconds) : 1;
      let from = null;
      if (previous && alpha < 1) {
        const oldClip = library.get(previous.name);
        from = { clip: previous.name, frame: resolveFrame(oldClip, previousElapsed).frame, alpha: 1 - alpha };
      }
      return {
        status: 'ready', clip: current.name, frame: resolved.frame,
        frameIndex: resolved.index, complete: resolved.complete,
        facing, alpha, from, missingClip: missing
      };
    }

    function render(context, x, y, scale) {
      const state = snapshot();
      if (state.status !== 'ready') return { drawn: false, reason: state.status, missingClip: state.missingClip };
      const s = Number.isFinite(scale) && scale > 0 ? scale : 1;
      const drawFrame = (frame, alpha) => {
        const px = frame.pivotX === undefined ? frame.width / 2 : frame.pivotX;
        const py = frame.pivotY === undefined ? frame.height : frame.pivotY;
        context.save();
        context.globalAlpha *= alpha;
        context.translate(x, y);
        if (state.facing < 0) context.scale(-1, 1);
        context.drawImage(library.image, frame.x, frame.y, frame.width, frame.height,
          -px * s, -py * s, frame.width * s, frame.height * s);
        context.restore();
      };
      if (state.from) drawFrame(state.from.frame, state.from.alpha);
      drawFrame(state.frame, state.alpha);
      return { drawn: true, clip: state.clip, frameIndex: state.frameIndex };
    }

    function drainEvents() {
      const events = pendingEvents.splice(0, pendingEvents.length);
      return Object.freeze(events);
    }

    function reset() {
      current = null; previous = null; elapsed = 0; previousElapsed = 0;
      blendElapsed = 0; facing = 1; missing = null; lastEventFrame = -1;
      pendingEvents.length = 0;
      return snapshot();
    }

    return Object.freeze({ play, update, snapshot, render, reset, drainEvents, hasClip: name => library.has(name) });
  }

  function resolveStateClip(state, movement, library) {
    const speed = movement && Number.isFinite(movement.speed) ? movement.speed : 0;
    const moving = speed > 0.35;
    const running = speed > 4.4;
    const has = name => library && typeof library.has === 'function' && library.has(name);

    // Jay's uploaded jump sheets contain the complete crouch-to-air-to-landing
    // action. Keep that authored sequence intact instead of demanding invented
    // takeoff/rise/apex/fall sheets.
    if (state.indexOf('jump-') === 0) {
      const jumpClip = moving && has('jump-running') ? 'jump-running' : 'jump-standing';
      if (has(jumpClip)) return jumpClip;
    }

    const requested = STATE_CLIPS[state] || state;
    if (has(requested)) return requested;

    // Never disguise a missing action with unrelated artwork. The caller can
    // keep the gameplay action active while surfacing the missing authored clip.
    if (state === 'slide-start' || state === 'slide-loop' || state === 'slide-recover' ||
        state === 'dodge-left' || state === 'dodge-right') return requested;
    return has('idle') ? 'idle' : requested;
  }

  function createControllerBinding(animator, library) {
    return Object.freeze({
      update(delta, movementSnapshot) {
        if (!movementSnapshot || !movementSnapshot.state) {
          return { ok: false, reason: 'movement-snapshot-required' };
        }
        const clipName = resolveStateClip(movementSnapshot.state, movementSnapshot, library || { has: name => animator.hasClip(name) });
        const result = animator.play(clipName, movementSnapshot.facing);
        animator.update(delta);
        return Object.assign({}, result, { animation: animator.snapshot() });
      }
    });
  }

  root.SemesterCharacterAnimation = Object.freeze({
    validateManifest, createClipLibrary, createAnimator,
    createControllerBinding, resolveFrame, resolveStateClip, stateClips: STATE_CLIPS
  });
})(typeof window !== 'undefined' ? window : globalThis);
