const test = require('node:test');
const assert = require('node:assert/strict');
require('../src/animation/character-animation.js');
const animation = globalThis.SemesterCharacterAnimation;

function fixture() {
  const image = { width: 128, height: 64 };
  const frame = (x) => ({ x, y: 0, width: 16, height: 32, pivotX: 8, pivotY: 30 });
  const manifest = { clips: {
    idle: { fps: 2, playback: 'loop', frames: [frame(0), frame(16)] },
    jog: { fps: 4, playback: 'loop', frames: [frame(32), frame(48), frame(64)] },
    jump: { fps: 4, playback: 'once', frames: [frame(80), frame(96)] },
    turn: { fps: 2, playback: 'pingpong', frames: [frame(0), frame(16), frame(32)] },
    'jump-running': { fps: 4, playback: 'once', frames: [frame(80), frame(96)] },
    'jump-standing': { fps: 4, playback: 'once', frames: [frame(80), frame(96)] },
    'fall-accidental': { fps: 4, playback: 'once', frames: [frame(80), frame(96)] },
    'get-up-recovery': { fps: 4, playback: 'once', frames: [frame(80), frame(96)] },
    'slide-start': { fps: 16, playback: 'once', frames: [frame(0), frame(16)] },
    'slide-loop': { fps: 16, playback: 'loop', frames: [frame(32), frame(48), frame(64), frame(80)] },
    'slide-recover': { fps: 16, playback: 'once', frames: [frame(96), frame(112)] }
  }};
  return { image, manifest, library: animation.createClipLibrary(manifest, image) };
}

test('manifest validation rejects missing, malformed and out-of-bounds art', () => {
  assert.ok(animation.validateManifest(null, {}).length);
  const { manifest, image } = fixture();
  manifest.clips.bad = { fps: 0, frames: [{ x: 120, y: 0, width: 16, height: 32 }] };
  const errors = animation.validateManifest(manifest, image);
  assert.ok(errors.some(e => e.includes('fps')));
  assert.ok(errors.some(e => e.includes('atlas bounds')));
  assert.throws(() => animation.createClipLibrary(manifest, image), /Invalid animation manifest/);
});

test('looping, once and pingpong clips resolve deterministically', () => {
  const { library } = fixture();
  assert.equal(animation.resolveFrame(library.get('idle'), 0.6).index, 1);
  assert.equal(animation.resolveFrame(library.get('jump'), 0.75).index, 1);
  assert.equal(animation.resolveFrame(library.get('jump'), 1).complete, true);
  assert.deepEqual([0, 1, 2, 3, 4].map(n => animation.resolveFrame(library.get('turn'), n * 0.5).index),
    [0, 1, 2, 1, 0]);
});

test('animator reports missing clips instead of substituting artwork', () => {
  const { library } = fixture();
  const animator = animation.createAnimator(library);
  const result = animator.play('dodge-left', 1);
  assert.equal(result.ok, false);
  assert.equal(result.missingClip, 'dodge-left');
  assert.equal(animator.snapshot().status, 'unbound');
});

test('clip transitions crossfade and facing mirrors the authored frame', () => {
  const { library } = fixture();
  const animator = animation.createAnimator(library, { transitionSeconds: 0.2 });
  animator.play('idle', 1);
  animator.update(0.1);
  assert.equal(animator.snapshot().alpha, 1);
  animator.play('jog', -1);
  animator.update(0.1);
  const state = animator.snapshot();
  assert.equal(state.clip, 'jog');
  assert.equal(state.facing, -1);
  assert.equal(state.from.clip, 'idle');
  assert.equal(state.alpha, 0.5);
  animator.update(0.1);
  assert.equal(animator.snapshot().from, null);
});

test('controller binding maps movement states to authored clip names', () => {
  const { library } = fixture();
  const animator = animation.createAnimator(library);
  const binding = animation.createControllerBinding(animator);
  const result = binding.update(0.016, { state: 'jog', facing: 1 });
  assert.equal(result.ok, true);
  assert.equal(result.clip, 'jog');
  const slide = binding.update(0.016, { state: 'slide-start', facing: 1 });
  assert.equal(slide.ok, true);
  assert.equal(slide.clip, 'slide-start');
});


test('state resolver uses the real landing and recovery clips in the atlas', () => {
  const { library } = fixture();
  assert.equal(animation.resolveStateClip('jump-rise', { speed: 8 }, library), 'jump-running');
  assert.equal(animation.resolveStateClip('jump-rise', { speed: 0 }, library), 'jump-standing');
  assert.equal(animation.resolveStateClip('land-recover', { speed: 8 }, library), 'get-up-recovery');
  assert.equal(animation.resolveStateClip('fall', { speed: 0 }, library), 'fall-accidental');
  assert.equal(animation.resolveStateClip('slide-start', { speed: 8 }, library), 'slide-start');
});

test('canvas renderer draws atlas frames at the supplied world anchor', () => {
  const { library, image } = fixture();
  const animator = animation.createAnimator(library);
  animator.play('idle', 1);
  const calls = [];
  const ctx = {
    globalAlpha: 1,
    save() { calls.push('save'); }, restore() { calls.push('restore'); },
    translate(...args) { calls.push(['translate', ...args]); },
    scale(...args) { calls.push(['scale', ...args]); },
    drawImage(...args) { calls.push(['drawImage', ...args]); }
  };
  const result = animator.render(ctx, 40, 80, 2);
  assert.equal(result.drawn, true);
  assert.ok(calls.some(call => Array.isArray(call) && call[0] === 'drawImage' && call[1] === image));
});


test('emits authored frame markers once on entry and drains them deterministically',()=>{
  const image={width:64,height:32};
  const manifest={clips:{walk:{fps:4,playback:'loop',frames:[
    {x:0,y:0,width:16,height:32,events:['left-foot-contact']},
    {x:16,y:0,width:16,height:32},
    {x:32,y:0,width:16,height:32,events:['right-foot-contact']},
    {x:48,y:0,width:16,height:32}
  ]}}};
  const library=animation.createClipLibrary(manifest,image);
  const animator=animation.createAnimator(library);
  animator.play('walk',1);
  animator.update(0);
  assert.deepEqual(animator.drainEvents().map(event=>event.event),['left-foot-contact']);
  for(let i=0;i<5;i++) animator.update(0.1);
  assert.deepEqual(animator.drainEvents().map(event=>event.event),['right-foot-contact']);
  for(let i=0;i<6;i++) animator.update(0.1);
  assert.deepEqual(animator.drainEvents().map(event=>event.event),['left-foot-contact']);
  assert.deepEqual(animator.drainEvents(),[]);
});

test('validates frame event marker metadata and does not repeat once-clip markers after completion',()=>{
  const image={width:32,height:32};
  const malformed={clips:{bad:{fps:2,frames:[{x:0,y:0,width:16,height:32,events:['ok',3]}]}}};
  const malformedOffset={clips:{bad:{fps:2,frames:[{x:0,y:0,width:16,height:32,events:[{name:'left-foot-contact',offsetX:'near'}]}]}}};
  assert.ok(animation.validateManifest(malformedOffset,image).some(error=>error.includes('frame events')));
  assert.ok(animation.validateManifest(malformed,image).some(error=>error.includes('frame events')));
  const library=animation.createClipLibrary({clips:{finish:{fps:2,playback:'once',frames:[
    {x:0,y:0,width:16,height:32,events:['start']},
    {x:16,y:0,width:16,height:32,events:['finish']}
  ]}}},image);
  const animator=animation.createAnimator(library);
  animator.play('finish',1);
  for(let i=0;i<6;i++) animator.update(0.1);
  assert.deepEqual(animator.drainEvents().map(event=>event.event),['start','finish']);
  for(let i=0;i<6;i++) animator.update(0.1);
  assert.deepEqual(animator.drainEvents(),[]);
});


test('supports authored foot contact offsets while preserving legacy string markers',()=>{
 const image={width:32,height:32};
 const library=animation.createClipLibrary({clips:{walk:{fps:2,frames:[{x:0,y:0,width:16,height:32,events:[{name:'left-foot-contact',offsetX:-9,offsetDepth:4},'cloth-swish']}]}}},image);
 const animator=animation.createAnimator(library);animator.play('walk',-1);animator.update(0);
 assert.deepEqual(animator.drainEvents().map(item=>({event:item.event,offsetX:item.offsetX,offsetDepth:item.offsetDepth})),[
  {event:'left-foot-contact',offsetX:-9,offsetDepth:4},{event:'cloth-swish',offsetX:0,offsetDepth:0}
 ]);
});


test('Jay slide sequence has distinct anticipation, loop and recovery clips', () => {
  const { library } = fixture();
  const animator = animation.createAnimator(library, { transitionSeconds: 0 });
  const binding = animation.createControllerBinding(animator);
  for (const state of ['slide-start', 'slide-loop', 'slide-recover']) {
    const result = binding.update(0.016, { state, speed: 8, facing: 1 });
    assert.equal(result.ok, true, state + ' must resolve to authored slide frames');
    assert.equal(result.clip, state);
    assert.equal(result.animation.status, 'ready');
  }
  assert.equal(library.get('slide-start').frames.length, 2);
  assert.equal(library.get('slide-loop').frames.length, 4);
  assert.equal(library.get('slide-recover').frames.length, 2);
});
