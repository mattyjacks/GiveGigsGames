import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js";
import { loadJayCharacter } from "./jay-character.js";

const mount = document.querySelector("#scene");
const distanceEl = document.querySelector("#distance");
const intro = document.querySelector("#intro");
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x9ab7c1);
scene.fog = new THREE.FogExp2(0x9ab7c1, 0.0085);

const camera = new THREE.PerspectiveCamera(57, innerWidth / innerHeight, 0.1, 260);
camera.position.set(0, 5.4, 12.8);
camera.lookAt(0, 1.5, -12);

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.7));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.12;
mount.appendChild(renderer.domElement);

scene.add(new THREE.HemisphereLight(0xdcecff, 0x53624c, 2.0));
const sun = new THREE.DirectionalLight(0xffe0b2, 3.0);
sun.position.set(-18, 28, 12);
sun.castShadow = true;
sun.shadow.mapSize.set(1536, 1536);
sun.shadow.camera.left = -32; sun.shadow.camera.right = 32;
sun.shadow.camera.top = 35; sun.shadow.camera.bottom = -35;
sun.shadow.bias = -0.00025;
scene.add(sun);

const mat = (color, roughness=0.82, metalness=0) => new THREE.MeshStandardMaterial({ color, roughness, metalness });
const asphalt = mat(0x303b40, 0.96), concrete = mat(0xb7b5a7), curb = mat(0xd5d0bd);
const grass = mat(0x526d4d), leafA = mat(0x456d4e), leafB = mat(0x66875a);
const glass = new THREE.MeshStandardMaterial({ color:0x284b5a, roughness:0.28, metalness:0.25 });
const cream = mat(0xd7c8a8), stone = mat(0x9b9a88), dark = mat(0x25353a);
const road = new THREE.Mesh(new THREE.PlaneGeometry(12, 240), asphalt);
road.rotation.x = -Math.PI/2; road.position.set(0,0,-82); road.receiveShadow=true; scene.add(road);
const ground = new THREE.Mesh(new THREE.PlaneGeometry(180,260), grass);
ground.rotation.x=-Math.PI/2; ground.position.set(0,-0.12,-85); ground.receiveShadow=true; scene.add(ground);
// Continuous pedestrian walkways and raised curb edges on both sides of the carriageway.
for (const side of [-1,1]) {
 const sidewalk = new THREE.Mesh(new THREE.PlaneGeometry(2.35,240), concrete);
 sidewalk.rotation.x=-Math.PI/2; sidewalk.position.set(side*7.18,.035,-82); sidewalk.receiveShadow=true; scene.add(sidewalk);
 const edge = new THREE.Mesh(new THREE.BoxGeometry(.18,.22,240), curb);
 edge.position.set(side*6.02,.11,-82); edge.receiveShadow=true; scene.add(edge);
 const outer = new THREE.Mesh(new THREE.BoxGeometry(.12,.16,240), curb);
 outer.position.set(side*8.36,.08,-82); scene.add(outer);
}
// Three-lane markings, broken centre lines and pedestrian crossings.
for (let z=-4; z>-225; z-=9) {
 for (const x of [-2.02,2.02]) {
  const dash = new THREE.Mesh(new THREE.BoxGeometry(.105,.018,4.2), mat(0xe4dfc9,.9));
  dash.position.set(x,.014,z); scene.add(dash);
 }
}
for (const z of [-28,-91,-154]) {
 for(let i=0;i<7;i++){
  const stripe=new THREE.Mesh(new THREE.BoxGeometry(.95,.025,1.8),mat(0xe9e4d3,.9));
  stripe.position.set(-5.05+i*1.68,.025,z);scene.add(stripe);
 }
}

function box(parent, w,h,d, material,x,y,z, cast=true) {
 const mesh = new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);
 mesh.position.set(x,y,z); mesh.castShadow=cast; mesh.receiveShadow=true; parent.add(mesh); return mesh;
}
function cylinder(parent, rt,rb,h,material,x,y,z,segments=10) {
 const mesh=new THREE.Mesh(new THREE.CylinderGeometry(rt,rb,h,segments),material);
 mesh.position.set(x,y,z); mesh.castShadow=true; mesh.receiveShadow=true; parent.add(mesh); return mesh;
}
function createBuilding(side,z,variant=0) {
 const g=new THREE.Group(); g.position.set(side* (10.2+variant*.6),0,z); scene.add(g);
 const width=variant===1?8.8:7.2, height=variant===2?8.5:6.6, depth=variant===1?10:8.5;
 const wall=variant===1?cream:stone, floors=variant===2?3:2;
 box(g,width,height,depth,wall,0,height/2,0);
 box(g,width+0.5,.35,depth+.35,dark,0,height+.12,0);
 box(g,width+.85,.22,depth+.55,cream,0,height+.38,0);
 // Recessed window bays, concrete mullions and floor bands.
 for(let floor=0;floor<floors;floor++){
  const y=1.15+floor*2.35;
  box(g,width+.08,.16,depth+.08,cream,0,y-.45,depth/2+.045,false);
  const count=variant===1?5:4;
  for(let i=0;i<count;i++){
   const x=-width/2+1.0+i*(width-2)/(count-1);
   box(g,1.08,1.35,.10,glass,x,y,depth/2+.08,false);
   box(g,1.16,.09,.16,cream,x,y-.73,depth/2+.12,false);
   box(g,.08,1.43,.16,cream,x-.58,y,depth/2+.12,false);
   box(g,.08,1.43,.16,cream,x+.58,y,depth/2+.12,false);
  }
 }
 // Entrance canopy, pillars and sign panel.
 box(g,width*.48,.22,1.5,dark,0,1.75,depth/2+.8);
 for(const x of [-width*.2,width*.2]) cylinder(g,.12,.14,2.0,cream,x,.95,depth/2+1.25,12);
 box(g,width*.42,.38,.18,mat(0x294c48),0,height-.75,depth/2+.18);
 // Roof parapet and rooftop plant/utility details.
 for(const x of [-width/2,width/2]) box(g,.22,.8,depth,cream,x,height+.48,0);
 box(g,1.2,.65,1.1,dark,width*.27,height+.65,-depth*.2);
 return g;
}
for(let i=0;i<9;i++){
 const z=-12-i*17;
 createBuilding(-1,z,i%3);
 createBuilding(1,z-7,(i+1)%3);
}

function createTree(x,z,scale=1) {
 const g=new THREE.Group(); g.position.set(x,0,z); g.scale.setScalar(scale); scene.add(g);
 cylinder(g,.22,.34,2.8,mat(0x725b43),0,1.4,0,9);
 const crown=cylinder(g,0,1.5,3.1,leafA,0,3.7,0,9); crown.rotation.x=.08;
 const crown2=new THREE.Mesh(new THREE.SphereGeometry(1.15,10,8),leafB);
 crown2.position.set(.25,4.35,.08); crown2.scale.set(1.1,.85,1); crown2.castShadow=true;g.add(crown2);
 return g;
}
for(let i=0;i<16;i++){
 const z=-i*8-4;
 createTree(-8.2-(i%2)*.7,z,.75+(i%3)*.12);
 createTree(8.1+(i%2)*.6,z-3,.8+(i%4)*.08);
}

function createLamp(x,z) {
 const g=new THREE.Group();g.position.set(x,0,z);scene.add(g);
 cylinder(g,.055,.08,4.6,dark,0,2.3,0,8);
 const arm=box(g,.08,.08,1.1,dark,x<0?.45:-.45,4.45,0);
 arm.rotation.z=x<0?-.12:.12;
 const head=box(g,.42,.16,.5,mat(0xf3d99b,.45),x<0?.9:-.9,4.38,0);
 const light=new THREE.PointLight(0xffdca1,.55,9);light.position.copy(head.position);g.add(light);
}
for(let i=0;i<7;i++){createLamp(-6.6,-i*18-5);createLamp(6.6,-i*18-14);}

function createBench(x,z) {
 const g=new THREE.Group();g.position.set(x,0,z);scene.add(g);
 for(let i=0;i<3;i++)box(g,1.7,.12,.18,mat(0x815b3e),0,.65+i*.17,0);
 for(const dx of [-.62,.62]){box(g,.12,.65,.12,dark,dx,.34,0);box(g,.12,.55,.12,dark,dx,.95,-.3);}
}
for(let i=0;i<4;i++){createBench(-5.2,-20-i*27);createBench(5.2,-33-i*27);}

function createSign(x,z,label) {
 const g=new THREE.Group();g.position.set(x,0,z);scene.add(g);
 cylinder(g,.07,.08,2.4,dark,0,1.2,0,8);
 box(g,2.1,.72,.12,mat(0x25463f),0,2.0,0);
 // High contrast sign face, plus a thin brass frame.
 box(g,2.0,.62,.035,mat(0xe1d5b6),0,2.0,.08,false);
 const canvas=document.createElement("canvas");canvas.width=512;canvas.height=160;
 const c=canvas.getContext("2d");c.fillStyle="#e1d5b6";c.fillRect(0,0,512,160);
 c.fillStyle="#24463f";c.font="bold 42px Arial";c.textAlign="center";c.fillText(label,256,96);
 const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;
 const face=new THREE.Mesh(new THREE.PlaneGeometry(1.95,.58),new THREE.MeshBasicMaterial({map:tex}));
 face.position.set(0,2.0,.105);g.add(face);
}
createSign(-6.8,-15,"CHIROMO CAMPUS");
createSign(6.8,-54,"LECTURE BLOCK");

function createVehicle(kind,color) {
 const g=new THREE.Group();
 const bus=kind!=="car";
 const length=bus?5.2:3.5, width=bus?1.9:1.72, height=bus?2.25:1.35;
 const bodyMat=mat(color,.42,.12);
 box(g,width,height,length,bodyMat,0,height/2,0);
 box(g,width*.92,height*.48,length*.72,glass,0,height*.77,-.03,false);
 // Separate window frames and pillars give the traffic real silhouettes.
 const windows=bus?5:3;
 for(let i=0;i<windows;i++){
  const z=-length*.32+i*(length*.64/(windows-1));
  box(g,width+.025,height*.34,.045,dark,0,height*.76,z,false);
 }
 box(g,width*1.02,.16,length*.12,dark,0,.22,length*.38);
 for(const side of [-1,1]) for(const z of [-length*.31,length*.31]){
  const wheel=cylinder(g,.38,.38,.18,dark,side*(width/2+.02),.39,z,12);
  wheel.rotation.z=Math.PI/2;
  cylinder(g,.18,.18,.19,mat(0x9da5a1,.35,.65),side*(width/2+.03),.39,z,12).rotation.z=Math.PI/2;
 }
 for(const x of [-.55,.55])box(g,.2,.16,.05,mat(0xffe6a5,.35),x,.48,length/2+.025,false);
 if(kind==="matatu"){
  box(g,width+.08,.13,length*.48,mat(0xf0c34e),0,height+.08,0);
  box(g,.08,.3,.7,mat(0xf2d9a1),width/2+.05,height*.6,-.2);
 }
 if(kind==="shuttle")box(g,width+.04,.12,length*.55,mat(0xe5e0ca),0,height+.08,0);
 g.userData={kind,speed:kind==="bus"?7:kind==="matatu"?10:8,phase:Math.random()*40};
 return g;
}
const traffic=[];
const trafficSpecs=[
 {kind:"matatu",color:0x167c85,x:-2.1,z:-31,dir:1},
 {kind:"car",color:0xb8b8aa,x:2.05,z:-49,dir:-1},
 {kind:"shuttle",color:0xd8d3bd,x:-2.1,z:-74,dir:1},
 {kind:"car",color:0x8c4f43,x:2.05,z:-101,dir:-1},
 {kind:"matatu",color:0xd6ad43,x:-2.1,z:-132,dir:1}
];
for(const spec of trafficSpecs){const v=createVehicle(spec.kind,spec.color);v.position.set(spec.x,.02,spec.z);v.rotation.y=spec.dir>0?Math.PI:0;scene.add(v);traffic.push({...spec,mesh:v});}

// Load only a real skinned Jay GLB. No primitive stand-in is shown when
// the approved production character asset has not yet been generated.
let jayRig = null;
const characterStatus = document.querySelector(".metric:nth-child(3) b");
characterStatus.textContent = "JAY ASSET PENDING";
loadJayCharacter({
 url: "./assets/3d/jay/jay.glb",
 scene,
 targetHeight: 1.78,
 strictClips: false
}).then(rig => {
 jayRig = rig;
 jayRig.root.position.set(0, 0, 5.1);
 jayRig.root.rotation.y = Math.PI;
 jayRig.play("idle");
 characterStatus.textContent = "JAY RIGGED";
 if (rig.missingClips.length) console.warn("Jay model missing optional clips:", rig.missingClips);
}).catch(error => {
 characterStatus.textContent = "MODEL REQUIRED";
 console.info("Production Jay GLB has not been added yet:", error.message);
});
const state={lane:1,targetLane:1,jump:0,slide:0,distance:0,running:true};
function moveLane(direction){state.targetLane=Math.max(0,Math.min(2,state.targetLane+direction));}
function jump(){if(state.jump<=0&&state.slide<=0)state.jump=.9;}
function slide(){if(state.slide<=0&&state.jump<=0)state.slide=.65;}
document.querySelector("#left").addEventListener("click",()=>moveLane(-1));
document.querySelector("#right").addEventListener("click",()=>moveLane(1));
document.querySelector("#jump").addEventListener("click",jump);
document.querySelector("#slide").addEventListener("click",slide);
document.querySelector("#start").addEventListener("click",()=>{intro.classList.add("hidden");state.running=true;});
addEventListener("keydown",e=>{
 if(["ArrowLeft","ArrowRight","ArrowUp","ArrowDown"," ","a","d","w","s"].includes(e.key))e.preventDefault();
 if(e.key==="ArrowLeft"||e.key==="a")moveLane(-1);
 if(e.key==="ArrowRight"||e.key==="d")moveLane(1);
 if(e.key==="ArrowUp"||e.key==="w"||e.key===" ")jump();
 if(e.key==="ArrowDown"||e.key==="s")slide();
},{passive:false});
let touch=null;
addEventListener("touchstart",e=>{const t=e.changedTouches[0];touch={x:t.clientX,y:t.clientY};},{passive:true});
addEventListener("touchend",e=>{if(!touch)return;const t=e.changedTouches[0],dx=t.clientX-touch.x,dy=t.clientY-touch.y;if(Math.max(Math.abs(dx),Math.abs(dy))>24){if(Math.abs(dx)>Math.abs(dy))moveLane(dx>0?1:-1);else if(dy<0)jump();else slide();}touch=null;},{passive:true});

const clock=new THREE.Clock();
function animate(){
 requestAnimationFrame(animate);
 const dt=Math.min(clock.getDelta(),.04),time=clock.elapsedTime;
 if(state.running){
  state.distance+=dt*12;
  distanceEl.textContent=String(Math.floor(state.distance)).padStart(3,"0")+" m";
  state.lane=THREE.MathUtils.damp(state.lane,state.targetLane,12,dt);
  state.jump=Math.max(0,state.jump-dt);
  state.slide=Math.max(0,state.slide-dt);
  const laneX=(state.lane-1)*2.05;
  const jumpY=state.jump>0?Math.sin((1-state.jump/.9)*Math.PI)*1.35:0;
  if (jayRig) {
   jayRig.root.position.x=THREE.MathUtils.damp(jayRig.root.position.x,laneX,15,dt);
   jayRig.root.position.y=jumpY;
   jayRig.root.rotation.z=THREE.MathUtils.damp(jayRig.root.rotation.z,(state.targetLane-state.lane)*-.08,8,dt);
   const wanted=state.slide>0?"slide":state.jump>0?"jump":"run";
   jayRig.play(jayRig.availableClips.includes(wanted)?wanted:"run",{timeScale:wanted==="run"?1.08:1});
   jayRig.update(dt);
  }
  traffic.forEach(v=>{
   v.mesh.position.z+=dt*v.dir*v.mesh.userData.speed;
   if(v.mesh.position.z>13)v.mesh.position.z=-170-Math.random()*40;
   if(v.mesh.position.z<-175)v.mesh.position.z=10+Math.random()*35;
  });
  // Repeating road studs and distant world drift give a convincing forward-run cue.
  camera.position.x=THREE.MathUtils.damp(camera.position.x,(jayRig?.root.position.x||laneX)*.14,2.5,dt);
  camera.lookAt((jayRig?.root.position.x||laneX)*.1,1.6,-13);
 }
 renderer.render(scene,camera);
}
animate();

function resize(){
 camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();
 renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.7));
 renderer.setSize(innerWidth,innerHeight);
}
addEventListener("resize",resize);
