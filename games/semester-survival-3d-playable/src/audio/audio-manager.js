const STORAGE_KEY="semester-survival-audio-v1";
const DEFAULTS={volumes:{master:.8,sfx:.75,ambience:.2,ui:.45},muted:{master:false,sfx:false}};
const CHANNELS=Object.keys(DEFAULTS.volumes);
const clamp=value=>Math.max(0,Math.min(1,Number(value)||0));

export function createAudioManager({legacySfxEnabled=()=>true}={}){
 let settings=loadSettings(),context=null,ambienceGain=null,ambienceSource=null,noiseBuffer=null;
 let runActive=false,runPaused=false,tabSuspended=false,unlocked=false,voices=0,currentBus="sfx";
 const effectBuses={};
 const activeEffects=new Set();

 function loadSettings(){
  try{
   const raw=JSON.parse(globalThis.localStorage?.getItem(STORAGE_KEY)||"null");
   return {
    volumes:Object.fromEntries(CHANNELS.map(channel=>[channel,clamp(raw?.volumes?.[channel]??DEFAULTS.volumes[channel])])),
    muted:{master:!!raw?.muted?.master,sfx:!!raw?.muted?.sfx}
   };
  }catch{
   return {volumes:{...DEFAULTS.volumes},muted:{...DEFAULTS.muted}};
  }
 }
 function persist(){try{globalThis.localStorage?.setItem(STORAGE_KEY,JSON.stringify(settings))}catch{}}
 function masterLevel(){return settings.muted.master?0:settings.volumes.master}
 function effective(channel){
  if(!masterLevel())return 0;
  if(channel==="sfx"&&!legacySfxEnabled())return 0;
  if(settings.muted[channel])return 0;
  return clamp(masterLevel()*settings.volumes[channel]);
 }
 function ensureContext(){
  if(context)return context;
  const Ctor=globalThis.AudioContext||globalThis.webkitAudioContext;
  if(!Ctor)return null;
  try{context=new Ctor();return context}catch{return null}
 }
 function setParam(param,value,time=.16){
  if(!param||!context)return;
  const now=context.currentTime;
  try{param.cancelScheduledValues(now);param.setTargetAtTime(value,now,Math.max(.015,time/3))}catch{}
 }
 function ensureBus(channel){
  const ctx=ensureContext();if(!ctx)return null;
  if(!effectBuses[channel]){
   const gain=ctx.createGain();gain.gain.value=effective(channel);gain.connect(ctx.destination);effectBuses[channel]=gain;
  }
  return effectBuses[channel];
 }
 function makeNoise(){
  if(noiseBuffer||!context)return noiseBuffer;
  noiseBuffer=context.createBuffer(1,Math.floor(context.sampleRate*.5),context.sampleRate);
  const data=noiseBuffer.getChannelData(0);
  for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;
  return noiseBuffer;
 }
 function applyVolumes(){
  Object.entries(effectBuses).forEach(([channel,gain])=>setParam(gain.gain,effective(channel)));
  if(ambienceGain)setParam(ambienceGain.gain,runActive&&!runPaused&&!tabSuspended?effective("ambience")*.22:0);
 }
 function unlock(){
  const ctx=ensureContext();
  if(ctx&&ctx.state==="suspended")ctx.resume().catch(()=>{});
  unlocked=true;ensureBus("sfx");ensureBus("ui");
 }
 function startAmbience(){
  const ctx=ensureContext();if(!ctx||ambienceSource)return;
  try{
   const source=ctx.createBufferSource();source.buffer=makeNoise();source.loop=true;
   const filter=ctx.createBiquadFilter();filter.type="lowpass";filter.frequency.value=520;
   const gain=ctx.createGain();gain.gain.value=0;
   source.connect(filter);filter.connect(gain);gain.connect(ctx.destination);source.start();
   ambienceSource=source;ambienceGain=gain;applyVolumes();
  }catch{}
 }
 function stopAmbience(){
  if(ambienceSource){try{ambienceSource.stop();ambienceSource.disconnect()}catch{}ambienceSource=null}
  if(ambienceGain){try{ambienceGain.disconnect()}catch{}ambienceGain=null}
 }
 function startRun(){runActive=true;runPaused=false;tabSuspended=false;unlock();startAmbience();applyVolumes()}
 function pauseRun(){if(!runActive)return;runPaused=true;applyVolumes()}
 function resumeRun(){if(!runActive)return;runPaused=false;unlock();applyVolumes()}
 function endRun(){runActive=false;runPaused=false;stopAmbience()}
 function suspendForTab(){tabSuspended=true;applyVolumes()}
 function resumeAfterTab(){if(!runActive||runPaused)return;tabSuspended=false;unlock();applyVolumes()}

 function tone(frequency,start,duration,type="sine",peak=.12,slide=0){
  if(!context)return;
  const osc=context.createOscillator(),gain=context.createGain(),now=context.currentTime;
  osc.type=type;osc.frequency.setValueAtTime(Math.max(30,frequency),now+start);
  if(slide)osc.frequency.exponentialRampToValueAtTime(Math.max(30,frequency+slide),now+start+duration);
  gain.gain.setValueAtTime(.0001,now+start);gain.gain.exponentialRampToValueAtTime(Math.max(.0002,peak),now+start+.012);gain.gain.exponentialRampToValueAtTime(.0001,now+start+duration);
  osc.connect(gain);gain.connect(ensureBus(currentBus)||context.destination);osc.start(now+start);osc.stop(now+start+duration+.025);
  activeEffects.add(osc);osc.addEventListener("ended",()=>activeEffects.delete(osc));
 }
 function noiseBurst(start,duration,peak=.08,filterType="highpass",cutoff=900){
  if(!context)return;
  const source=context.createBufferSource(),filter=context.createBiquadFilter(),gain=context.createGain(),now=context.currentTime;
  source.buffer=makeNoise();source.loop=true;filter.type=filterType;filter.frequency.value=cutoff;
  gain.gain.setValueAtTime(.0001,now+start);gain.gain.exponentialRampToValueAtTime(Math.max(.0002,peak),now+start+.012);gain.gain.exponentialRampToValueAtTime(.0001,now+start+duration);
  source.connect(filter);filter.connect(gain);gain.connect(ensureBus(currentBus)||context.destination);source.start(now+start);source.stop(now+start+duration+.025);
  activeEffects.add(source);source.addEventListener("ended",()=>activeEffects.delete(source));
 }
 const recipes={
  jump:()=>{tone(190,0,.16,"sine",.09,240);noiseBurst(0,.11,.035,"highpass",1300)},
  slide:()=>{noiseBurst(0,.28,.075,"bandpass",1100);tone(145,.02,.24,"sine",.035,-55)},
  landing:()=>{tone(105,0,.13,"triangle",.09,-35);noiseBurst(0,.08,.045,"lowpass",500)},
  collision:()=>{noiseBurst(0,.34,.16,"lowpass",760);tone(78,0,.28,"sine",.19,-38);tone(48,.035,.2,"triangle",.08,-15)},
  coin:()=>{tone(880,0,.09,"sine",.07,220);tone(1320,.075,.14,"sine",.055,160)},
  powerup:()=>{tone(420,0,.24,"sine",.075,620);tone(630,.09,.25,"triangle",.055,560)},
  passby:()=>{noiseBurst(0,.3,.02,"bandpass",850);tone(280,0,.28,"sine",.012,-180)},
  gameover:()=>{tone(310,0,.25,"triangle",.08,-120);tone(190,.18,.42,"sine",.055,-75)},
  ui:()=>{tone(720,0,.045,"sine",.035,-90)}
 };
 const cooldowns=new Map();
 function play(name,{priority=3}={}){
  if(!runActive&&name!=="ui")return false;
  if(name==="ui"&&!unlocked)return false;
  const group=name==="ui"?"ui":"sfx";
  if(effective(group)<=0||!context)return false;
  const now=Date.now(),last=cooldowns.get(name)||0,minimum=name==="coin"?75:100;
  if(now-last<minimum)return false;
  if(voices>=8&&priority<8)return false;
  cooldowns.set(name,now);voices++;currentBus=group;
  try{recipes[name]?.()}catch{}
  setTimeout(()=>{voices=Math.max(0,voices-1)},name==="collision"?420:320);
  return true;
 }
 function setVolume(channel,value){if(!CHANNELS.includes(channel))return;settings.volumes[channel]=clamp(value);persist();applyVolumes()}
 function setMuted(channel,value){if(!(channel in settings.muted))return;settings.muted[channel]=!!value;persist();applyVolumes()}
 function setLegacySfxEnabled(){applyVolumes()}
 function getSettings(){return {volumes:{...settings.volumes},muted:{...settings.muted}}}
 function destroy(){
  endRun();activeEffects.forEach(effect=>{try{effect.stop()}catch{}});activeEffects.clear();
  Object.values(effectBuses).forEach(bus=>{try{bus.disconnect()}catch{}});
  Object.keys(effectBuses).forEach(key=>delete effectBuses[key]);
  if(context)context.close().catch(()=>{});context=null;
 }
 return {startRun,pauseRun,resumeRun,endRun,suspendForTab,resumeAfterTab,play,setVolume,setMuted,setLegacySfxEnabled,getSettings,destroy};
}
