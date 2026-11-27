import test from "node:test";
import assert from "node:assert/strict";
import { createAudioManager } from "../src/audio/audio-manager.js";

test("audio manager exposes only gameplay and ambience channels",()=>{
 const manager=createAudioManager();
 const state=manager.getSettings();
 assert.deepEqual(state.volumes,{master:.8,sfx:.75,ambience:.2,ui:.45});
 assert.deepEqual(state.muted,{master:false,sfx:false});
 assert.equal("music" in state.volumes,false);
 assert.equal("music" in state.muted,false);
 manager.destroy();
});

test("audio settings update one channel and persist separately",()=>{
 const values=new Map();
 globalThis.localStorage={getItem:key=>values.get(key)||null,setItem:(key,value)=>values.set(key,value)};
 const manager=createAudioManager();
 manager.setVolume("sfx",.5);manager.setMuted("sfx",true);
 const saved=JSON.parse(values.get("semester-survival-audio-v1"));
 assert.equal(saved.volumes.sfx,.5);assert.equal(saved.volumes.ambience,.2);
 assert.equal(saved.muted.sfx,true);assert.equal(saved.muted.master,false);
 manager.destroy();delete globalThis.localStorage;
});

test("legacy saved preferences are normalized without retaining removed channels",()=>{
 const values=new Map([["semester-survival-audio-v1",JSON.stringify({
  volumes:{master:.6,music:.1,sfx:.7,ambience:.3,ui:.4},
  muted:{master:false,music:true,sfx:false}
 })]]);
 globalThis.localStorage={getItem:key=>values.get(key)||null,setItem:(key,value)=>values.set(key,value)};
 const manager=createAudioManager();
 const state=manager.getSettings();
 assert.deepEqual(state.volumes,{master:.6,sfx:.7,ambience:.3,ui:.4});
 assert.deepEqual(state.muted,{master:false,sfx:false});
 manager.setVolume("music",1);
 assert.equal("music" in manager.getSettings().volumes,false);
 manager.destroy();delete globalThis.localStorage;
});

test("audio settings safely recover from malformed stored preferences",()=>{
 globalThis.localStorage={getItem:()=>"not-json",setItem:()=>{}};
 const manager=createAudioManager();
 assert.equal(manager.getSettings().volumes.master,.8);
 manager.destroy();delete globalThis.localStorage;
});
