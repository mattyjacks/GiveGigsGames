import test from "node:test";
import assert from "node:assert/strict";
import {createAtlasAnimationPlayer,resolveAtlasFrame,resolveRunnerAnimationState} from "../src/animation/three-character-animation.js";

const frame=n=>({x:n*10,y:0,width:10,height:20,pivotX:5,pivotY:20});
const manifest={clips:{
 jog:{fps:10,playback:"loop",frames:[frame(0),frame(1),frame(2),frame(3)]},
 sprint:{fps:14,playback:"loop",frames:[frame(0),frame(1)]},
 "jump-running":{fps:12,playback:"once",frames:[frame(0),frame(1),frame(2)]},
 "slide-start":{fps:16,playback:"once",frames:[frame(0),frame(1)]},
 "slide-loop":{fps:16,playback:"loop",frames:[frame(0),frame(1),frame(2),frame(3)]},
 "slide-recover":{fps:16,playback:"once",frames:[frame(0),frame(1)]}
}};

test("runner state maps to authored jump, slide phases, jog and sprint clips",()=>{
 assert.equal(resolveRunnerAnimationState({jump:1,speed:400}),"jump-running");
 assert.equal(resolveRunnerAnimationState({hitTimer:.5,jump:1}),"fall-accidental");
 assert.equal(resolveRunnerAnimationState({hitTimer:0,recoveryTimer:.8}),"get-up");
 assert.equal(resolveRunnerAnimationState({hitTimer:.2,recoveryTimer:.8}),"fall-accidental");
 assert.equal(resolveRunnerAnimationState({hitTimer:0,jump:1}),"jump-running");
 assert.equal(resolveRunnerAnimationState({slidePhase:"start",speed:400}),"slide-start");
 assert.equal(resolveRunnerAnimationState({slidePhase:"loop",speed:400}),"slide-loop");
 assert.equal(resolveRunnerAnimationState({slidePhase:"recover",speed:400}),"slide-recover");
 assert.equal(resolveRunnerAnimationState({speed:400}),"jog");
 assert.equal(resolveRunnerAnimationState({speed:520}),"sprint");
 assert.equal(resolveRunnerAnimationState(null),"idle");
});

test("once, loop and pingpong atlas frame timing is deterministic",()=>{
 const once={fps:2,playback:"once",frames:[frame(0),frame(1)]};
 const loop={fps:2,playback:"loop",frames:[frame(0),frame(1)]};
 const ping={fps:2,playback:"pingpong",frames:[frame(0),frame(1),frame(2)]};
 assert.equal(resolveAtlasFrame(once,9).index,1);
 assert.equal(resolveAtlasFrame(once,9).complete,true);
 assert.equal(resolveAtlasFrame(loop,1.1).index,0);
 assert.deepEqual([0,.5,1,1.5,2].map(t=>resolveAtlasFrame(ping,t).index),[0,1,2,1,0]);
});

test("animation player crossfades clips and holds the last frame of one-shot actions",()=>{
 const player=createAtlasAnimationPlayer(manifest,{transitionSeconds:.2,maxDelta:2});
 assert.equal(player.play("jog").ok,true);
 player.update(.1);
 player.play("slide-start");
 const half=player.update(.1);
 assert.equal(half.clip,"slide-start");
 assert.equal(half.from.clip,"jog");
 assert.equal(half.alpha,.5);
 player.update(.1);
 assert.equal(player.snapshot().from,null);
 player.update(1);
 assert.equal(player.snapshot().index,1);
 assert.equal(player.snapshot().complete,true);
});

test("missing clips are explicit and reset returns to unbound state",()=>{
 const player=createAtlasAnimationPlayer(manifest);
 assert.deepEqual(player.play("dodge-left"),{ok:false,missingClip:"dodge-left"});
 player.play("jog");player.reset();
 assert.equal(player.snapshot().status,"unbound");
});
