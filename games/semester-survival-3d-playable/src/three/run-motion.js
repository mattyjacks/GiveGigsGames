const ROOT_MOTION_NODE = /(hips|pelvis|waist|root|armature|master|motion|trajectory|global|center|centre)/i;

function isPositionTrack(track) {
  return /\.position$/i.test(String(track?.name || ""));
}

function nodeName(track) {
  return String(track.name).replace(/\.position$/i, "").replace(/[^a-z0-9]/gi, "").toLowerCase();
}

function horizontalTravel(track) {
  const size = track.getValueSize();
  if (size < 3 || track.values.length < size * 2) return null;
  const values = track.values;
  const firstX = values[0];
  const firstZ = values[2];
  let bestIndex = 0;
  let bestDistanceSquared = 0;
  for (let key = 1; key < Math.floor(values.length / size); key += 1) {
    const offset = key * size;
    const dx = values[offset] - firstX;
    const dz = values[offset + 2] - firstZ;
    const distanceSquared = dx * dx + dz * dz;
    if (distanceSquared > bestDistanceSquared) {
      bestDistanceSquared = distanceSquared;
      bestIndex = key;
    }
  }
  return { index: bestIndex, distanceSquared: bestDistanceSquared, time: track.times[bestIndex] };
}

function sampleTrack(track, time) {
  const interpolant = track.createInterpolant();
  return Array.from(interpolant.evaluate(time));
}

function copyTrackUntil(track, endTime) {
  const size = track.getValueSize();
  const times = [];
  const values = [];
  for (let key = 0; key < track.times.length; key += 1) {
    const time = track.times[key];
    if (time >= endTime - 1e-7) break;
    times.push(time);
    const offset = key * size;
    for (let component = 0; component < size; component += 1) {
      values.push(track.values[offset + component]);
    }
  }
  const endpoint = sampleTrack(track, endTime);
  times.push(endTime);
  for (let component = 0; component < size; component += 1) {
    values.push(endpoint[component]);
  }
  return new track.constructor(track.name, times, values, track.getInterpolation());
}

/**
 * Split the authored run into (1) a one-time forward approach ending at the
 * furthest root-motion key and (2) an endless run loop with horizontal root
 * translation locked at that exact pose. Skeletal limb motion remains intact.
 */
export function prepareRunClips(clip, THREE, authoredInPlaceClip = null) {
  if (authoredInPlaceClip) {
    return {
      approachClip: authoredInPlaceClip,
      loopClip: authoredInPlaceClip,
      rootMotionTrackNames: [],
      endpointTime: authoredInPlaceClip.duration,
      rootMotionFound: true,
      usedFallback: false,
      inPlaceAuthored: true
    };
  }

  if (!clip) {
    return { approachClip: clip, loopClip: clip, rootMotionTrackNames: [], endpointTime: 0, rootMotionFound: false };
  }

  const positionTracks = clip.tracks.filter(isPositionTrack);
  let rootTracks = positionTracks.filter(track => ROOT_MOTION_NODE.test(nodeName(track)));
  let usedFallback = false;

  // Some DCC exports put locomotion translation on a generically named node.
  // If no conventional root/hips channel exists, use the strongest moving
  // position channel rather than silently pretending root motion was removed.
  if (!rootTracks.length) {
    const moving = positionTracks
      .map(track => ({ track, travel: horizontalTravel(track) }))
      .filter(item => item.travel && item.travel.distanceSquared > 0.0064)
      .sort((a, b) => b.travel.distanceSquared - a.travel.distanceSquared);
    if (moving.length) {
      rootTracks = [moving[0].track];
      usedFallback = true;
    }
  }

  const motion = rootTracks
    .map(track => ({ track, travel: horizontalTravel(track) }))
    .filter(item => item.travel && item.travel.distanceSquared > 1e-8)
    .sort((a, b) => b.travel.distanceSquared - a.travel.distanceSquared);

  if (!motion.length) {
    const approachClip = clip.clone();
    approachClip.name = "Run_Approach";
    const loopClip = clip.clone();
    loopClip.name = "Run_In_Place";
    return {
      approachClip,
      loopClip,
      rootMotionTrackNames: [],
      endpointTime: clip.duration,
      rootMotionFound: false,
      usedFallback
    };
  }

  const primary = motion[0];
  const endpointTime = Math.max(0.001, Math.min(clip.duration, primary.travel.time));
  const approachTracks = clip.tracks.map(track => copyTrackUntil(track, endpointTime));
  const approachClip = new THREE.AnimationClip("Run_Approach", endpointTime, approachTracks);

  const loopClip = clip.clone();
  loopClip.name = "Run_In_Place";
  loopClip.tracks = loopClip.tracks.map(track => {
    if (!rootTracks.includes(track) && !rootTracks.some(candidate => candidate.name === track.name)) return track;
    const size = track.getValueSize();
    if (size < 3) return track;
    const endpoint = sampleTrack(track, endpointTime);
    const values = Array.from(track.values);
    const keyCount = Math.floor(values.length / size);
    const hips = /(hips|pelvis|waist)/i.test(nodeName(track));
    for (let key = 0; key < keyCount; key += 1) {
      const offset = key * size;
      values[offset] = endpoint[0];
      values[offset + 2] = endpoint[2];
      if (!hips) values[offset + 1] = endpoint[1];
    }
    return new track.constructor(track.name, track.times, values, track.getInterpolation());
  });
  loopClip.resetDuration();

  return {
    approachClip,
    loopClip,
    rootMotionTrackNames: motion.map(item => item.track.name),
    endpointTime,
    rootMotionFound: true,
    usedFallback
  };
}
