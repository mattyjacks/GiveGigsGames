const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));

export function resolveRunnerAnimationState(game){
  if(!game)return "idle";
  if((Number(game.hitTimer)||0)>0)return "fall-accidental";
  if((Number(game.recoveryTimer)||0)>0)return "get-up";
  if(game.slidePhase==="start")return "slide-start";
  if(game.slidePhase==="loop")return "slide-loop";
  if(game.slidePhase==="recover")return "slide-recover";
  if((Number(game.jump)||0)>0)return "jump-running";
  if(game.energy!==undefined&&game.energy!==null&&Number(game.energy)<=0)return "fall-accidental";
  return (Number(game.speed)||0)>=500?"sprint":"jog";
}

export function resolveAtlasFrame(clip,elapsed){
  if(!clip||!Array.isArray(clip.frames)||clip.frames.length===0)throw new TypeError("A non-empty animation clip is required.");
  const fps=Number(clip.fps);
  if(!Number.isFinite(fps)||fps<=0)throw new TypeError("Animation clip fps must be positive.");
  const count=clip.frames.length,mode=clip.playback||"loop",raw=Math.floor(Math.max(0,elapsed)*fps);
  let index=0,complete=false;
  if(mode==="once"){index=Math.min(count-1,raw);complete=raw>=count;}
  else if(mode==="pingpong"&&count>1){const period=count*2-2,step=raw%period;index=step<count?step:period-step;}
  else index=raw%count;
  return {index,frame:clip.frames[index],complete};
}

export function createAtlasAnimationPlayer(manifest,{transitionSeconds=.12,maxDelta=.05}={}){
  if(!manifest?.clips||typeof manifest.clips!=="object")throw new TypeError("An animation manifest with clips is required.");
  const clips=manifest.clips;
  for(const [name,clip] of Object.entries(clips)){
    if(!Array.isArray(clip.frames)||!clip.frames.length||!Number.isFinite(clip.fps)||clip.fps<=0)throw new Error("Invalid animation clip: "+name);
  }
  const duration=Math.max(0,Number(transitionSeconds)||0);
  let current=null,previous=null,elapsed=0,previousElapsed=0,blend=duration;
  function frameAt(name,time){const clip=clips[name];const resolved=resolveAtlasFrame(clip,time);return {...resolved,clip:name};}
  function play(name){
    if(!clips[name])return {ok:false,missingClip:name};
    if(current===name)return {ok:true,changed:false,clip:name};
    previous=current;previousElapsed=elapsed;current=name;elapsed=0;blend=previous?0:duration;
    return {ok:true,changed:true,clip:name};
  }
  function update(delta){
    const dt=clamp(Number(delta)||0,0,Math.max(0,maxDelta));
    if(current)elapsed+=dt;
    if(previous&&blend<duration){previousElapsed+=dt;blend=Math.min(duration,blend+dt);}
    else previous=null;
    return snapshot();
  }
  function snapshot(){
    if(!current)return {status:"unbound",clip:null,frame:null,from:null,alpha:1};
    const alpha=duration===0?1:clamp(blend/duration,0,1);
    return {status:"ready",clip:current,...frameAt(current,elapsed),alpha,from:previous&&alpha<1?{...frameAt(previous,previousElapsed),alpha:1-alpha}:null};
  }
  function reset(){current=null;previous=null;elapsed=0;previousElapsed=0;blend=duration;return snapshot();}
  return Object.freeze({play,update,snapshot,reset,has:name=>Boolean(clips[name]),names:()=>Object.keys(clips)});
}
