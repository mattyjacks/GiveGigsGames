import * as THREE from "three";
import { loadJayCharacter } from "./jay-character.js";
import { resolveRunnerAnimationState } from "../animation/three-character-animation.js";
import { resolveQualityProfile } from "./quality-profile.js";
import { rampVehicleWorldZ, rampSurfaceHeightAtProgress, RAMP_VEHICLE } from "./ramp-vehicle.js";
import { CARRY_VEHICLE, getCarryPlayerHeight, isCarryEventActive } from "./carry-vehicle.js";
import { getTrafficSpawnLayout } from "../difficulty/difficulty-progression.js";
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)), laneX=[-4.68,0,4.68];
const mat=(c,r=.82,m=0)=>new THREE.MeshStandardMaterial({color:c,roughness:r,metalness:m});
function box(p,w,h,d,m,x,y,z){const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;p.add(o);return o;}
function asphaltTexture(renderer){
 const canvas=document.createElement("canvas");canvas.width=512;canvas.height=512;const ctx=canvas.getContext("2d");
 ctx.fillStyle="#454d4d";ctx.fillRect(0,0,512,512);
 let seed=37;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
 for(let i=0;i<5200;i++){const x=random()*512,y=random()*512,r=.25+random()*1.15,a=.025+random()*.09;ctx.fillStyle=`rgba(${random()>.5?210:18},${random()>.5?210:24},${random()>.5?205:26},${a})`;ctx.fillRect(x,y,r,r);}
 for(let i=0;i<34;i++){const y=random()*512;ctx.fillStyle="rgba(20,27,28,.055)";ctx.fillRect(0,y,512,1+random()*3);}
 const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.wrapS=THREE.RepeatWrapping;texture.wrapT=THREE.RepeatWrapping;texture.repeat.set(1,22);texture.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());return texture;
}
function signTexture(label){
 const c=document.createElement("canvas");c.width=512;c.height=128;const x=c.getContext("2d");
 x.fillStyle="#183b39";x.fillRect(0,0,512,128);x.strokeStyle="#e3d5b7";x.lineWidth=6;x.strokeRect(4,4,504,120);
 x.fillStyle="#f6edda";x.font="800 34px system-ui";x.textAlign="center";x.textBaseline="middle";x.fillText(label,256,64,460);
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return new THREE.MeshStandardMaterial({map:t,roughness:.75});
}
function building(scene,side,z,i,m){
 const g=new THREE.Group();g.position.set(side*(13.2+i%2*.7),0,z);scene.add(g);
 const w=8+i%3*1.1,h=7.5+i%3*1.8,d=9+i%2*2,wall=[m.warm,m.stone,m.sand][i%3];
 box(g,w,h,d,wall,0,h/2,0);box(g,w+.45,.28,d+.45,m.trim,0,h+.12,0);box(g,w+.7,.18,d+.6,m.dark,0,h+.35,0);
 // A visible plinth and floor plates give the block a believable campus-building silhouette.
 box(g,w+.22,.42,d+.22,m.dark,0,.21,0);
 const floors=Math.round(h/2.7);
 for(let f=0;f<floors;f++){
  const y=1.4+f*2.3;
  // Deep window reveals, divided glazing, projecting sills and continuous floor bands.
  box(g,w+.12,.13,d+.12,m.trim,0,y-.79,0);
  for(let n=0;n<4;n++){
   const x=-w/2+1.1+n*(w-2.2)/3;
   if(f===0&&Math.abs(x)<1.4)continue;
   box(g,1.28,1.5,.12,m.dark,x,y,d/2+.035);
   box(g,1.08,1.27,.055,m.glass,x,y,d/2+.11);
   box(g,.055,1.34,.07,m.trim,x-.55,y,d/2+.15);
   box(g,.055,1.34,.07,m.trim,x+.55,y,d/2+.15);
   box(g,1.12,.055,.07,m.trim,x,y-.65,d/2+.15);
   box(g,1.12,.055,.07,m.trim,x,y+.65,d/2+.15);
   box(g,.045,1.27,.06,m.trim,x,y,d/2+.19);
   box(g,1.12,.045,.06,m.trim,x,y,d/2+.19);
   box(g,1.32,.11,.24,m.trim,x,y-.78,d/2+.13);
  }
 }
 // A proper entrance: recessed double doors, glazed side lights, canopy, columns and broad steps.
 const entranceZ=d/2+.12;
 box(g,2.65,2.65,.16,m.dark,0,1.35,entranceZ);
 box(g,.86,2.12,.08,m.glass,-.48,1.12,entranceZ+.12);
 box(g,.86,2.12,.08,m.glass,.48,1.12,entranceZ+.12);
 box(g,.045,2.12,.1,m.trim,0,1.12,entranceZ+.18);
 box(g,.07,.07,.1,m.gold,-.72,1.1,entranceZ+.2);
 box(g,2.95,.18,1.85,m.dark,0,2.83,entranceZ+.75);
 box(g,3.15,.12,1.98,m.trim,0,2.94,entranceZ+.75);
 for(const x of [-1.42,1.42])box(g,.18,2.75,.2,m.trim,x,1.38,entranceZ+.78);
 box(g,3.4,.16,1.25,m.concrete,0,.08,entranceZ+1.05);
 box(g,3.05,.14,.95,m.concrete,0,.23,entranceZ+.88);
 box(g,2.72,.12,.65,m.concrete,0,.38,entranceZ+.7);
 box(g,w*.5,.22,1.5,m.dark,0,1.8,d/2+.72);
 const plaque=new THREE.Mesh(new THREE.PlaneGeometry(w*.52,.42),signTexture(["SCHOOL OF SCIENCE","STUDENT CENTRE","LECTURE THEATRE","UNIVERSITY LIBRARY"][i%4]));
 plaque.position.set(0,h-.85,d/2+.12);g.add(plaque);
 // Roof parapet, service core and water storage are common details on campus blocks.
 box(g,w+.32,.5,.22,m.trim,0,h+.42,d/2);
 box(g,.22,.5,d+.25,m.trim,-w/2-.04,h+.42,0);
 box(g,.22,.5,d+.25,m.trim,w/2+.04,h+.42,0);
 const stairCore=box(g,1.6,1.1,2.1,m.stone,-w*.3,h+.55,-d*.2);
 const tank=new THREE.Mesh(new THREE.CylinderGeometry(.6,.6,1,12),m.tank);tank.position.set(w*.27,h+.7,-d*.15);tank.castShadow=true;g.add(tank);
 // A small rooftop solar array catches the warm directional light.
 const solar=new THREE.Group();solar.position.set(-w*.25,h+.85,-d*.18);solar.rotation.x=-.22;g.add(solar);
 box(solar,2.1,.07,1.25,m.dark,0,0,0);
 for(let p=0;p<3;p++)box(solar,.62,.025,1.1,m.glass,-.68+p*.68,.045,0);
}
function tree(scene,x,z,m){
 const g=new THREE.Group();g.position.set(x,0,z);scene.add(g);
 const trunk=new THREE.Mesh(new THREE.CylinderGeometry(.16,.24,2.1,8),m.bark);trunk.position.y=1.05;trunk.castShadow=true;trunk.receiveShadow=true;g.add(trunk);
 for(const [y,r] of [[2.15,1],[2.9,.82],[3.55,.58]]){const crown=new THREE.Mesh(new THREE.IcosahedronGeometry(r,1),m.leaves);crown.position.y=y;crown.scale.y=.9;crown.castShadow=true;g.add(crown);}
 const pot=new THREE.Mesh(new THREE.CylinderGeometry(.7,.78,.28,12),m.concrete);pot.position.y=.14;g.add(pot);
}
function lamp(scene,x,z,m){const g=new THREE.Group();g.position.set(x,0,z);scene.add(g);const pole=new THREE.Mesh(new THREE.CylinderGeometry(.05,.08,5.4,8),m.dark);pole.position.y=2.7;g.add(pole);box(g,.85,.08,.08,m.dark,x<0?.35:-.35,5.35,0);box(g,.42,.12,.3,m.lamp,x<0?.7:-.7,5.3,0);}
function car(scene,x,z,color,m,kind="car"){
 const g=new THREE.Group();g.position.set(x,0,z);scene.add(g);
 const isMatatu=kind==="matatu",isShuttle=kind==="shuttle";
 const width=isShuttle?2.35:isMatatu?2.08:1.9,length=isShuttle?6.35:isMatatu?4.9:3.8;
 const bodyH=isShuttle?1.22:isMatatu?1.08:.62,baseY=isShuttle?.78:.65;
 const paint=mat(color,.34,.22),trim=m.dark,glass=m.glass;
 box(g,width,bodyH,length,paint,0,baseY,0);
 box(g,width*.91,.13,length*.94,trim,0,baseY-bodyH*.42,0);
 // Raised cabin and wraparound front/rear glazing.
 const cabinH=isShuttle?1.05:isMatatu?.86:.65,cabinY=baseY+bodyH*.48+cabinH*.46;
 box(g,width*.88,cabinH,length*(isShuttle?.79:isMatatu?.68:.48),paint,0,cabinY,-length*.045);
 box(g,width*.79,cabinH*.72,.075,glass,0,cabinY+.02,length*(isShuttle?.36:isMatatu?.31:.25));
 box(g,width*.79,cabinH*.7,.075,glass,0,cabinY+.02,-length*(isShuttle?.42:isMatatu?.36:.23));
 const windowCount=isShuttle?5:isMatatu?4:2;
 for(const side of [-1,1]){
  for(let n=0;n<windowCount;n++){
   const wz=(n-(windowCount-1)/2)*(length*(isShuttle?.135:isMatatu?.145:.18));
   box(g,.065,cabinH*.62,length*(isShuttle?.105:isMatatu?.115:.15),glass,side*(width*.445),cabinY+.035,wz);
   box(g,.075,.055,length*(isShuttle?.11:isMatatu?.12:.16),m.trim,side*(width*.448),cabinY+cabinH*.36,wz);
  }
  // Side mirrors, sliding door seams and a continuous lower livery stripe.
  box(g,.24,.12,.16,trim,side*(width*.54),cabinY-.12,length*.34);
  box(g,.055,.65,.045,m.trim,side*(width*.502),baseY+.1,-length*.05);
  box(g,.035,.13,length*.72,isShuttle?m.white:isMatatu?m.gold:m.trim,side*(width*.505),baseY-.13,0);
 }
 // Bumpers, front grille, headlamps and tail lamps.
 box(g,width*.9,.16,.2,m.dark,0,.36,length*.51);
 box(g,width*.9,.16,.2,m.dark,0,.36,-length*.51);
 box(g,width*.34,.3,.07,m.dark,0,.68,length*.515);
 for(const side of [-1,1]){
  box(g,.34,.18,.08,m.lamp,side*width*.34,baseY+.02,length*.515);
  box(g,.3,.16,.08,m.red,side*width*.34,baseY+.02,-length*.515);
  box(g,.14,.11,.24,m.dark,side*width*.51,cabinY-.05,length*.31);
 }
 // Wheels are grouped so their rotation can be driven by distance travelled.
 g.userData.collisionWidth=width;g.userData.collisionLength=length*1.03;g.userData.collisionHalfWidth=width*.54+.12;
 const wheels=[];
 for(const side of [-1,1])for(const wz of [-length*.31,length*.31]){
  const wheel=new THREE.Group();wheel.position.set(side*(width*.51),.42,wz);g.add(wheel);
  const tire=new THREE.Mesh(new THREE.CylinderGeometry(isShuttle?.43:.35,isShuttle?.43:.35,.2,16),m.tire);tire.rotation.z=Math.PI/2;tire.castShadow=true;wheel.add(tire);
  const hub=new THREE.Mesh(new THREE.CylinderGeometry(.19,.19,.215,12),m.gold);hub.rotation.z=Math.PI/2;wheel.add(hub);
  wheels.push(wheel);
 }
 g.userData.wheels=wheels;
 if(isMatatu){
  // Roof rack, destination board and the bright route stripe typical of a city matatu.
  box(g,width*.72,.09,length*.62,m.dark,0,baseY+bodyH*.5+cabinH+.12,0);
  for(const side of [-1,1])box(g,.07,.28,length*.64,m.gold,side*width*.34,baseY+bodyH*.5+cabinH+.23,0);
  const route=new THREE.Mesh(new THREE.PlaneGeometry(1.45,.32),signTexture("MATATU 46"));route.position.set(0,cabinY+.12,length*.405);g.add(route);
  for(const side of [-1,1]){
   const strip=new THREE.Mesh(new THREE.PlaneGeometry(length*.56,.22),signTexture("CITY ROUTE"));strip.rotation.y=side*Math.PI/2;strip.position.set(side*(width*.507),baseY+.18,0);g.add(strip);
  }
 }else if(isShuttle){
  // University shuttle roof pod and a clear campus-service destination board.
  box(g,width*.56,.18,length*.28,m.dark,0,baseY+bodyH*.5+cabinH+.1,-length*.04);
  const route=new THREE.Mesh(new THREE.PlaneGeometry(1.8,.34),signTexture("UON SHUTTLE"));route.position.set(0,cabinY+.12,length*.405);g.add(route);
  for(const side of [-1,1]){
   const strip=new THREE.Mesh(new THREE.PlaneGeometry(length*.7,.16),signTexture("UNIVERSITY SERVICE"));strip.rotation.y=side*Math.PI/2;strip.position.set(side*(width*.507),baseY+.18,0);g.add(strip);
  }
 }
 return g;
}
function createRampVehicle(scene,m){
 const group=new THREE.Group();scene.add(group);
 const paint=mat(0x355c70,.38,.24),deck=mat(0x737f82,.58,.24),rampMaterial=mat(0x9ba7a5,.62,.18);
 box(group,2.72,.82,7.8,paint,0,.72,-.05);
 box(group,2.82,.16,5.55,deck,0,1.07,-.15);
 box(group,2.48,.12,5.3,m.dark,0,.98,-.15);
 // The rear-facing loading ramp joins the road to the elevated flatbed at the exact shared surface coordinates.
 const angle=Math.atan(RAMP_VEHICLE.deckHeight/(RAMP_VEHICLE.roadEdgeLocalZ-RAMP_VEHICLE.deckEdgeLocalZ));
 const ramp=new THREE.Mesh(new THREE.PlaneGeometry(2.62,RAMP_VEHICLE.roadEdgeLocalZ-RAMP_VEHICLE.deckEdgeLocalZ),rampMaterial);
 ramp.rotation.x=-Math.PI/2+angle;ramp.position.set(0,RAMP_VEHICLE.deckHeight/2,(RAMP_VEHICLE.roadEdgeLocalZ+RAMP_VEHICLE.deckEdgeLocalZ)/2);ramp.receiveShadow=true;group.add(ramp);
 for(const side of [-1,1]){
  const rail=box(group,.09,.18,RAMP_VEHICLE.roadEdgeLocalZ-RAMP_VEHICLE.deckEdgeLocalZ,m.gold,side*1.34,RAMP_VEHICLE.deckHeight/2,(RAMP_VEHICLE.roadEdgeLocalZ+RAMP_VEHICLE.deckEdgeLocalZ)/2);rail.rotation.x=angle;
  box(group,.12,.22,5.35,m.dark,side*1.37,1.34,-.15);
 }
 // The cab faces away from the loading ramp: this special transporter reverses into the encounter.
 box(group,2.25,1.55,1.85,paint,0,1.18,-2.78);
 box(group,2.05,.88,.08,m.glass,0,1.48,-3.72);
 box(group,2.3,.16,1.92,m.dark,0,2.02,-2.78);
 box(group,.2,.18,.08,m.lamp,-.78,1.0,-3.73);
 box(group,.2,.18,.08,m.lamp,.78,1.0,-3.73);
 for(const side of [-1,1]){
  box(group,.1,.66,1.1,m.glass,side*1.14,1.43,-2.78);
  box(group,.22,.14,.08,m.red,side*.92,.64,3.88);
  box(group,.16,.14,.08,m.lamp,side*.66,.64,3.9);
 }
 const wheels=[];
 for(const side of [-1,1])for(const z of [-2.65,2.55]){
  const wheel=new THREE.Group();wheel.position.set(side*1.39,.43,z);group.add(wheel);
  const tire=new THREE.Mesh(new THREE.CylinderGeometry(.42,.42,.22,16),m.tire);tire.rotation.z=Math.PI/2;tire.castShadow=true;wheel.add(tire);
  const hub=new THREE.Mesh(new THREE.CylinderGeometry(.2,.2,.235,12),m.gold);hub.rotation.z=Math.PI/2;wheel.add(hub);wheels.push(wheel);
 }
 group.userData.wheels=wheels;group.userData.obstacle=null;group.visible=false;
 return group;
}
function createCarryVehicle(scene,m){
 const group=new THREE.Group();scene.add(group);
 const paint=mat(0x2f5e6c,.38,.24),deck=mat(0x68787b,.62,.22),rampMaterial=mat(0x9aa6a4,.62,.2);
 box(group,2.82,.72,8.4,paint,0,.64,-.1);
 box(group,2.84,.16,CARRY_VEHICLE.deckLength,deck,0,.97,CARRY_VEHICLE.deckCenterZ);
 box(group,2.52,.08,CARRY_VEHICLE.deckLength-.18,m.dark,0,.86,CARRY_VEHICLE.deckCenterZ);
 const rampLength=CARRY_VEHICLE.rampLowerZ-CARRY_VEHICLE.rampUpperZ;
 const rampAngle=Math.atan(CARRY_VEHICLE.deckHeight/rampLength);
 const rearRamp=new THREE.Mesh(new THREE.PlaneGeometry(2.56,rampLength),rampMaterial);
 rearRamp.rotation.x=-Math.PI/2+rampAngle;rearRamp.position.set(0,CARRY_VEHICLE.deckHeight/2,(CARRY_VEHICLE.rampLowerZ+CARRY_VEHICLE.rampUpperZ)/2);rearRamp.receiveShadow=true;group.add(rearRamp);
 for(const side of [-1,1]){
  box(group,.11,.22,CARRY_VEHICLE.deckLength,m.dark,side*1.38,1.24,CARRY_VEHICLE.deckCenterZ);
  const rail=box(group,.09,.16,rampLength,m.gold,side*1.31,CARRY_VEHICLE.deckHeight/2,(CARRY_VEHICLE.rampLowerZ+CARRY_VEHICLE.rampUpperZ)/2);rail.rotation.x=rampAngle;
  box(group,.13,.2,1.7,m.gold,side*1.34,1.22,3.55);
 }
 // Forward-facing cab and rear loading platform make this a distinct campus logistics flatbed.
 box(group,2.35,1.62,2.05,paint,0,1.12,-2.72);
 box(group,2.15,.9,.08,m.glass,0,1.42,-3.78);
 box(group,2.42,.16,2.12,m.dark,0,1.99,-2.72);
 for(const side of [-1,1]){
  box(group,.1,.7,1.15,m.glass,side*1.19,1.42,-2.72);
  box(group,.23,.18,.08,m.lamp,side*.82,1.0,-3.78);
  box(group,.24,.16,.08,m.red,side*.94,.72,4.14);
  box(group,.16,.12,.08,m.lamp,side*.65,.72,4.16);
 }
 const sign=new THREE.Mesh(new THREE.PlaneGeometry(1.45,.28),signTexture("CAMPUS EXPRESS"));sign.rotation.y=Math.PI/2;sign.position.set(1.425,1.52,3.55);group.add(sign);
 const wheels=[];
 for(const side of [-1,1])for(const z of [-2.8,2.8]){
  const wheel=new THREE.Group();wheel.position.set(side*1.42,.42,z);group.add(wheel);
  const tire=new THREE.Mesh(new THREE.CylinderGeometry(.42,.42,.22,16),m.tire);tire.rotation.z=Math.PI/2;tire.castShadow=true;wheel.add(tire);
  const hub=new THREE.Mesh(new THREE.CylinderGeometry(.2,.2,.235,12),m.gold);hub.rotation.z=Math.PI/2;wheel.add(hub);wheels.push(wheel);
 }
 group.userData.wheels=wheels;group.visible=false;
 return group;
}
export async function createRunnerRenderer({mount,quality="High"}={}){
 if(!mount)throw new TypeError("Three.js mount missing");
 const scene=new THREE.Scene();scene.background=new THREE.Color(0x9db8c0);scene.fog=new THREE.FogExp2(0x9db8c0,.0085);
 const camera=new THREE.PerspectiveCamera(57,1,.1,320);camera.position.set(0,4.9,11.8);camera.lookAt(0,1.8,-9.5);
 const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:"high-performance"});renderer.setSize(mount.clientWidth||innerWidth,mount.clientHeight||innerHeight);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;mount.appendChild(renderer.domElement);
 scene.add(new THREE.HemisphereLight(0xe5f1ff,0x56634c,2));const sun=new THREE.DirectionalLight(0xffe2be,2.7);sun.position.set(-18,28,12);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);sun.shadow.camera.left=-25;sun.shadow.camera.right=25;sun.shadow.camera.top=32;sun.shadow.camera.bottom=-32;sun.shadow.camera.near=.1;sun.shadow.camera.far=100;sun.shadow.bias=-.00025;sun.shadow.normalBias=.02;scene.add(sun);
 function applyQuality(value=quality){
  quality=value;
  const profile=resolveQualityProfile(value,typeof devicePixelRatio==="number"?devicePixelRatio:1);
  renderer.setPixelRatio(profile.pixelRatio);
  renderer.setSize(mount.clientWidth||innerWidth,mount.clientHeight||innerHeight);
  renderer.shadowMap.enabled=profile.shadows;
  sun.castShadow=profile.shadows;
  sun.shadow.mapSize.set(profile.shadowMapSize,profile.shadowMapSize);
  sun.shadow.needsUpdate=true;
  mount.dataset.graphicsQuality=value;
  return profile;
 }
 applyQuality(quality);
 const m={asphalt:new THREE.MeshStandardMaterial({color:0xb8b8b0,map:asphaltTexture(renderer),roughness:.96}),grass:mat(0x536e4d),concrete:mat(0xbab8aa),curb:mat(0xe2dac8),warm:mat(0xcbb99a),stone:mat(0x9b9c91),sand:mat(0xd6c9ad),trim:mat(0xe4dac5),dark:mat(0x26373c),glass:mat(0x294b5a,.25,.2),tank:mat(0x6d8581),bark:mat(0x69503a),leaves:mat(0x557c54),lamp:mat(0xffe3a8,.3),tire:mat(0x171b1e),red:mat(0x9d3c34),white:mat(0xf3ecd9),gold:mat(0xf4c95d,.2,.65),obstacle:mat(0x805a45),warning:mat(0xe5b957),bonus:new THREE.MeshStandardMaterial({color:0x8ce6c5,emissive:0x164c40,metalness:.3,roughness:.25})};
 const world=new THREE.Group();scene.add(world);
 const ground=new THREE.Mesh(new THREE.PlaneGeometry(190,300),m.grass);ground.rotation.x=-Math.PI/2;ground.position.set(0,-.16,-112);ground.receiveShadow=true;world.add(ground);
 const road=new THREE.Mesh(new THREE.PlaneGeometry(14,300),m.asphalt);road.rotation.x=-Math.PI/2;road.position.set(0,0,-112);road.receiveShadow=true;world.add(road);
 for(const s of [-1,1]){const walk=new THREE.Mesh(new THREE.PlaneGeometry(3,300),m.concrete);walk.rotation.x=-Math.PI/2;walk.position.set(s*8.5,.025,-112);walk.receiveShadow=true;world.add(walk);box(world,.2,.22,300,m.curb,s*7.05,.11,-112);box(world,.14,.18,300,m.curb,s*10.05,.09,-112);}
 for(let z=-4;z>-292;z-=9)for(const x of [-2.34,2.34])box(world,.11,.018,4.1,m.white,x,.02,z);
 for(const z of [-24,-86,-148,-210,-272])for(let i=0;i<8;i++)box(world,1,.025,1.65,m.white,-5.4+i*1.54,.026,z);
 for(let i=0;i<6;i++){building(world,-1,-14-i*38,i,m);building(world,1,-30-i*38,(i+1)%4,m);}
 for(let i=0;i<10;i++){lamp(world,-7.8,-8-i*27,m);lamp(world,7.8,-20-i*27,m);}
 for(let i=0;i<16;i++){tree(world,-10.8,-12-i*17,m);tree(world,10.8,-20-i*17,m);}
 // Balanced traffic pool: all three lanes are used, with lane changes only when a vehicle recycles far up the road.
 const trafficSpecs=[
  [0,0x315b7a,"car"],[1,0x9a4c39,"matatu"],[2,0x777d78,"shuttle"],
  [0,0xc1a65e,"car"],[2,0x496f5e,"matatu"],[1,0x9a9d98,"car"],
  [1,0x8b7b9a,"shuttle"],[0,0x4f7d91,"car"]
 ];
 const traffic=trafficSpecs.map(([lane,color,kind],i)=>{
  const vehicle=car(scene,laneX[lane],-36-i*43,color,m,kind);
  vehicle.userData.baseLane=lane;vehicle.userData.trafficIndex=i;vehicle.visible=i<6;
  return vehicle;
 });
 const gate=new THREE.Group();gate.position.z=-14;world.add(gate);box(gate,.65,5.6,.8,m.stone,-7.5,2.8,0);box(gate,.65,5.6,.8,m.stone,7.5,2.8,0);box(gate,15.6,.7,1,m.dark,0,5.35,0);const board=new THREE.Mesh(new THREE.PlaneGeometry(8.6,.52),signTexture("CHIROMO CAMPUS"));board.position.set(0,5.38,.53);gate.add(board);
 for(let i=0;i<5;i++){const z=-32-i*48,s=i%2?1:-1,x=s*9.15;const bench=new THREE.Group();bench.position.set(x,0,z);world.add(bench);box(bench,1.55,.12,.42,m.warm,0,.56,0);box(bench,1.55,.12,.42,m.warm,0,.82,-.12);for(const dx of [-.58,.58])box(bench,.1,.58,.1,m.dark,dx,.3,0);const bin=new THREE.Mesh(new THREE.CylinderGeometry(.26,.3,.75,10),m.dark);bin.position.set(x+s*.75,.38,z);world.add(bin);}
 // A second 300-unit scenery segment follows the first so the road never runs out as the world scrolls.
 const repeatWorld=world.clone(true);repeatWorld.position.z=-300;scene.add(repeatWorld);
 const jayShadow=new THREE.Mesh(new THREE.CircleGeometry(.68,28),new THREE.MeshBasicMaterial({color:0x101816,transparent:true,opacity:.23,depthWrite:false}));jayShadow.rotation.x=-Math.PI/2;jayShadow.position.set(0,.024,2.06);jayShadow.renderOrder=2;scene.add(jayShadow);
 const impactRing=new THREE.Mesh(new THREE.TorusGeometry(.56,.055,8,36),new THREE.MeshBasicMaterial({color:0xffd28b,transparent:true,opacity:0,depthWrite:false}));
 impactRing.rotation.x=-Math.PI/2;impactRing.position.set(0,.035,2.06);impactRing.visible=false;impactRing.renderOrder=3;scene.add(impactRing);
 let jayRig=null,rigBaseY=0,rigBaseScaleX=1,rigBaseScaleY=1,rigBaseScaleZ=1,lastGameT=0,playerX=0,previousPlayerX=0,cameraBaseX=0,impactPulse=0,wasHit=false,landingPulse=0,previousJump=0,worldTravel=0,trafficTravel=0;
 jayRig=await loadJayCharacter({url:new URL("../../assets/3d/jay/jay-unified.glb",import.meta.url).href,scene,targetHeight:1.78,strictClips:false});
 rigBaseY=jayRig.root.position.y;rigBaseScaleX=jayRig.root.scale.x;rigBaseScaleY=jayRig.root.scale.y;rigBaseScaleZ=jayRig.root.scale.z;
 console.info("Jay unified gameplay rig loaded",jayRig.availableClips);
 mount.dataset.rendererReady="true";
 mount.dataset.jayClipCount=String(jayRig.availableClips.length);
 mount.dataset.jayClips=jayRig.availableClips.join(",");
 mount.dataset.jayMouthMorphsNeutralized=String(jayRig.neutralizedMouthMorphs.length);
 mount.dataset.jayMouthPose="neutral";
 mount.dataset.jayRunMotionFound=String(jayRig.runMotionFound);
 mount.dataset.jayRunMotionTracks=String(jayRig.runMotionTrackNames.length);
 mount.dataset.jayRunApproachEndpoint=String(jayRig.runApproachEndpointSeconds);
 mount.dataset.jayRunMotionFallback=String(jayRig.runMotionUsedFallback);
 const obstacles=Array.from({length:18},()=>{
  const g=new THREE.Group(),jump=new THREE.Group(),slide=new THREE.Group();
  box(jump,2.55,.66,.72,m.obstacle,0,.36,0);box(jump,2.62,.1,.78,m.warning,0,.72,0);box(jump,.9,.12,.08,m.white,0,.42,.38);
  g.add(jump);
  box(slide,3.05,.28,.62,m.warning,0,1.58,0);box(slide,3.12,.08,.68,m.white,0,1.4,.02);
  for(const x of [-1.42,1.42])box(slide,.22,1.48,.58,m.obstacle,x,.74,0);
  g.add(slide);g.userData.jump=jump;g.userData.slide=slide;scene.add(g);g.visible=false;return g;
});
 const lateBuses=Array.from({length:8},(_,i)=>{const v=car(scene,0,-500,[0x315d78,0x9a4c39,0xc1a65e][i],m,["shuttle","matatu","car"][i]);v.visible=false;return v;});
 const rampVehicles=Array.from({length:2},()=>createRampVehicle(scene,m));
 const carryVehicle=createCarryVehicle(scene,m);
 mount.dataset.vehicleObstacleModels=String(lateBuses.length);
 const coins=Array.from({length:36},()=>{const o=new THREE.Mesh(new THREE.TorusGeometry(.34,.105,10,20),m.gold);o.rotation.x=Math.PI/2;scene.add(o);o.visible=false;return o;});
 const bonuses=Array.from({length:16},()=>{const o=new THREE.Mesh(new THREE.OctahedronGeometry(.48,1),m.bonus);scene.add(o);o.visible=false;return o;});
 function collideWithTraffic(g){
  if(!g||g.vehicleImpact||g.pendingFinish)return false;
  if(g.rampState?.phase==="climbing")return false;
  if(g.carryState&&isCarryEventActive(g.carryState)&&["boarding","riding","slowing_down","stopped","dismounting"].includes(g.carryState.phase))return false;
  if(new URLSearchParams(location.search).has("smoke")&&!g.forceTrafficCollision)return false;
  for(const vehicle of traffic){
   if(!vehicle.visible)continue;
   const halfLength=(vehicle.userData.collisionLength||3.8)/2;
   const halfWidth=vehicle.userData.collisionHalfWidth||((vehicle.userData.collisionWidth||1.9)/2);
   // Conservative animated-body envelope: include Jay's shoulders, hands and rearward lean.
   const jayHalfWidth=.82,jayHalfDepth=.82,clearance=.12;
   const contactRadius=halfLength+jayHalfDepth+clearance;
   const contactBoundary=2-contactRadius;
   const previousZ=Number(vehicle.userData.previousCollisionZ??vehicle.position.z);
   const currentZ=vehicle.position.z;
   const overlapsLongitudinal=Math.abs(currentZ-2)<=contactRadius;
   const sweptLongitudinal=currentZ>=previousZ&&previousZ<contactBoundary&&currentZ>=contactBoundary;
   const overlapsLateral=Math.abs(vehicle.position.x-playerX)<=halfWidth+jayHalfWidth;
   if((!overlapsLongitudinal&&!sweptLongitudinal)||!overlapsLateral)continue;
   const energyBefore=Number(g.energy)||0;
   const airborne=Number(g.jump)>0.02;
   // Stop the vehicle at the first safe contact plane; never let its geometry pass through Jay.
   vehicle.position.z=contactBoundary;vehicle.userData.previousCollisionZ=contactBoundary;
   g.energy=0;g.hit=true;g.hitVehicle=true;g.vehicleImpact=true;g.vehicleImpactType=airborne?"airborne":"front";
   g.vehicleImpactClip=airborne?"jump":"fall";
   g.vehicleImpactStartHeight=airborne?Math.sin((1-Number(g.jump))*Math.PI)*1.12:0;
   g.impactTrafficIndex=vehicle.userData.trafficIndex;g.impactPlayerX=playerX;g.impactShakeScale=airborne?.78:.34;g.speed=0;g.inv=999;
   g.pendingFinish="TRAFFIC COLLISION";g.vehicleImpactDuration=Math.max(1.18,jayRig.getClipDuration(airborne?"jump":"fall")+.1);g.hitTimer=g.vehicleImpactDuration;g.recoveryTimer=0;
   g.lastCollision={label:"TRAFFIC CAR",action:airborne?"jump":"front",distance:g.d,energyBefore,energyAfter:0,vehicle:true};
   mount.dataset.trafficCollision="true";
   mount.dataset.trafficCollisionKind=vehicle.userData.trafficIndex===undefined?"car":String(vehicle.userData.trafficIndex);
   return true;
  }
  return false;
 }
 function resize(){const w=mount.clientWidth||innerWidth,h=mount.clientHeight||innerHeight;camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h);}
 const ro=typeof ResizeObserver!=="undefined"?new ResizeObserver(resize):null;if(ro)ro.observe(mount);else addEventListener("resize",resize);
 function render(g){
  if(!g)return;
  const dt=clamp(g.t-lastGameT,0,.05);lastGameT=g.t;
  // Obstacles advance 0.55 normalized units per second across a 46-unit depth span.
  // Scroll every piece of campus scenery at that exact same world-space speed.
  const renderSpeed=Number.isFinite(Number(g.speed))?Math.max(0,Number(g.speed)):367;
  const travelDelta=dt*(46*.55)*renderSpeed/(Number(g.baseSpeed)||367);
  worldTravel+=travelDelta;
  const difficulty=g.difficulty||{};const trafficLayout=getTrafficSpawnLayout(difficulty);const trafficApproach=clamp(Number(difficulty.trafficSpeedMultiplier)||1,1,1.18);const carryPhase=g.carryState?.phase;const independentTrafficDelta=dt*46*.55*(Number(g.baseSpeed)||367)/367;const trafficDelta=carryPhase==="stopped"||carryPhase==="dismounting"?independentTrafficDelta:carryPhase==="slowing_down"?Math.max(travelDelta,independentTrafficDelta*.45):travelDelta;trafficTravel+=trafficDelta*2*trafficApproach;mount.dataset.difficultyBand=difficulty.band||"Beginner";mount.dataset.difficultyProgress=String(Number(difficulty.progress)||0);mount.dataset.trafficApproachMultiplier=trafficApproach.toFixed(3);mount.dataset.trafficActiveCount=String(trafficLayout.activeVehicleCount);mount.dataset.trafficSpacing=trafficLayout.spacing.toFixed(3);
  world.position.z=worldTravel%300;repeatWorld.position.z=world.position.z-300;
  traffic.forEach((v,i)=>{
   if(i>=trafficLayout.activeVehicleCount){v.visible=false;return;}
   v.visible=true;
   // Extra vehicles enter from far ahead as density grows; spacing stays validated and recycling remains behind Jay.
   // Traffic approaches at an oncoming relative speed and only recycles after clearing the follow camera.
   const cycle=300,startZ=-36-i*trafficLayout.spacing;
   const phase=startZ+trafficTravel+280;
   const lap=Math.floor(phase/cycle);
   const lane=((v.userData.baseLane+Math.max(0,lap))%3+3)%3;
   if(g.vehicleImpact&&g.impactTrafficIndex===i){for(const wheel of v.userData.wheels||[])wheel.rotation.x=trafficTravel/.35;return;}
   const previousZ=v.position.z;
   v.position.x=laneX[lane];
   v.position.z=((phase%cycle)+cycle)%cycle-280;
   v.userData.previousCollisionZ=previousZ;
   for(const wheel of v.userData.wheels||[])wheel.rotation.x=trafficTravel/.35;
  });
  let rampN=0;
  for(const obstacle of g.obs||[]){
   if(!obstacle.ramp||rampN>=rampVehicles.length)continue;
   const vehicle=rampVehicles[rampN++];vehicle.visible=true;vehicle.userData.obstacle=obstacle;
   vehicle.position.set(laneX[obstacle.lane??1],0,rampVehicleWorldZ(obstacle.z));
   for(const wheel of vehicle.userData.wheels||[])wheel.rotation.x=worldTravel/.35;
  }
  for(let i=rampN;i<rampVehicles.length;i++){rampVehicles[i].visible=false;rampVehicles[i].userData.obstacle=null;}
  const carrySurfaceY=getCarryPlayerHeight(g.carryState);let rampSurfaceY=0;
  if(g.rampState?.phase==="climbing"){
   rampSurfaceY=rampSurfaceHeightAtProgress(g.rampState.obstacle?.z??0);
   g.rampState.surfaceHeight=rampSurfaceY;
  }else if(g.rampState?.phase==="jumpingOff"){
   const progress=clamp(g.rampState.elapsed/RAMP_VEHICLE.dismountDurationSeconds,0,1);
   rampSurfaceY=(Number(g.rampState.startHeight)||0)*(1-progress)+Math.sin(progress*Math.PI)*.62;
  }
  const jumpY=g.jump>0?Math.sin((1-g.jump)*Math.PI)*1.12:0;
  if(g.vehicleImpact)playerX=Number.isFinite(Number(g.impactPlayerX))?Number(g.impactPlayerX):laneX[g.lane??1];else playerX=THREE.MathUtils.damp(playerX,laneX[g.lane??1],13,dt);const carryVisible=!!g.carryState;const carryActive=!!(g.carryState&&isCarryEventActive(g.carryState));carryVehicle.visible=carryVisible;if(carryVisible){const carryX=carryActive?playerX:laneX[g.carryState.lane??g.lane??1];carryVehicle.position.set(carryX,0,Number(g.carryState.vehicleZ)||0);for(const wheel of carryVehicle.userData.wheels||[])wheel.rotation.x=worldTravel/.35;}
  collideWithTraffic(g);
  const lateralSpeed=dt>0?(playerX-previousPlayerX)/dt:0;previousPlayerX=playerX;
  const laneLean=clamp(-lateralSpeed*.035,-.14,.14);
  if(g.hit&&!wasHit)impactPulse=1;wasHit=!!g.hit;impactPulse=Math.max(0,impactPulse-dt*3.8);
  const airborne=Number(g.jump)>0;if(previousJump>0&&!airborne)landingPulse=1;previousJump=airborne?g.jump:0;landingPulse=Math.max(0,landingPulse-dt*5.5);
  const impact=clamp((Number(g.hitTimer)||0)/.62,0,1)*(Number.isFinite(Number(g.impactShakeScale))?Number(g.impactShakeScale):1);
  // Track Jay laterally on narrow mobile viewports so every lane remains fully visible.
  const cameraTrackX=playerX*.92;
  // Keep the damped tracking position independent from the temporary impact offset.
  // The original shake frequency and amplitude are preserved; only its accumulation is removed.
  cameraBaseX=THREE.MathUtils.damp(cameraBaseX,cameraTrackX,7.5,dt);
  const cameraShakeX=Math.sin(g.t*48)*impact*.035;
  const cameraShakeY=Math.sin(g.t*36)*impact*.025;
  camera.position.x=cameraBaseX+cameraShakeX;
  camera.position.y=4.9+cameraShakeY;
  mount.dataset.cameraTrackX=cameraTrackX.toFixed(5);
  mount.dataset.cameraBaseX=cameraBaseX.toFixed(5);
  mount.dataset.cameraShakeX=cameraShakeX.toFixed(5);
  mount.dataset.cameraShakeY=cameraShakeY.toFixed(5);
  mount.dataset.cameraWorldX=camera.position.x.toFixed(5);
  camera.fov=57+impact*.8;camera.updateProjectionMatrix();camera.lookAt(cameraTrackX,1.8+jumpY*.055,-9.5);
  impactRing.visible=impact>.015;impactRing.position.x=playerX;impactRing.scale.setScalar(.75+(1-impact)*1.8);impactRing.material.opacity=impact*.58;
  const eventSurfaceY=carryActive?carrySurfaceY:rampSurfaceY;const jumpHeight=clamp(jumpY/1.12,0,1);jayShadow.position.y=.024+eventSurfaceY;jayShadow.position.x=playerX;jayShadow.scale.setScalar(1+jumpHeight*.42);jayShadow.material.opacity=.23*(1-jumpHeight*.58);
  const animationState=resolveRunnerAnimationState(g);
  {
   const vehicleDuration=Math.max(1.18,Number(g.vehicleImpactDuration)||1.18);
   const vehicleElapsed=clamp(vehicleDuration-(Number(g.hitTimer)||0),0,vehicleDuration);
   const airborneImpact=g.vehicleImpactType==="airborne";
   const vehicleThrowHeight=airborneImpact?Math.max(0,7.8*vehicleElapsed-6.6*vehicleElapsed*vehicleElapsed):0;
   const vehicleThrowZ=airborneImpact?2+vehicleElapsed*3.6:g.vehicleImpactType==="front"?2:2+(impactPulse*.18);
   jayRig.root.position.x=playerX+(airborneImpact?Math.sin(vehicleElapsed*7)*.48:0);
   jayRig.root.position.y=rigBaseY+(airborneImpact?(Number(g.vehicleImpactStartHeight)||0)+vehicleThrowHeight:(carryActive?carrySurfaceY:g.rampState?rampSurfaceY:jumpY-landingPulse*.045));mount.dataset.jayRampSurfaceHeight=rampSurfaceY.toFixed(3);mount.dataset.jayRampPhase=g.rampState?.phase||"inactive";mount.dataset.jayRampFeetAligned=String(!g.rampState||Math.abs(jayRig.root.position.y-(rigBaseY+rampSurfaceY))<.001);
   jayRig.root.position.z=vehicleThrowZ;
   jayRig.root.rotation.y=Math.PI+(airborneImpact?Math.sin(vehicleElapsed*5)*.42:0); // Face down the track, away from the follow camera.
   jayRig.root.rotation.z=airborneImpact?Math.sin(vehicleElapsed*8)*1.15:laneLean;
   jayRig.root.rotation.x=airborneImpact?vehicleElapsed*7.8:0;
   mount.dataset.jayVehicleThrow=String(airborneImpact);
   mount.dataset.jayVehicleThrowHeight=vehicleThrowHeight.toFixed(4);
   mount.dataset.jayVehicleThrowZ=vehicleThrowZ.toFixed(4);
   const slideScale=animationState.startsWith("slide-")?.94:1;
   jayRig.root.scale.set(rigBaseScaleX*(1+landingPulse*.035),rigBaseScaleY*slideScale*(1-landingPulse*.075),rigBaseScaleZ*(1+landingPulse*.035));
   mount.dataset.jayLean=laneLean.toFixed(3);mount.dataset.jayImpact=impactPulse.toFixed(2);mount.dataset.jayLanding=landingPulse.toFixed(2);
   const carryPhase=g.carryState?.phase;const rigState=carryPhase==="boarding"||carryPhase==="dismounting"?"jump":["riding","slowing_down","stopped"].includes(carryPhase)?"idle":g.vehicleImpactType==="front"?"fall":g.vehicleImpactType==="airborne"?"jump":animationState==="slide-start"?"slideStart":animationState==="slide-loop"?"slideLoop":animationState==="slide-recover"?"slideRecover":animationState==="jump-running"?"jump":animationState==="fall-accidental"?"fall":animationState==="get-up"?"getUp":animationState;
   const chosen=jayRig.availableClips.includes(rigState)?rigState:(rigState==="slideStart"||rigState==="slideLoop"||rigState==="slideRecover"?"slide":jayRig.availableClips.includes("run")?"run":"idle");
   mount.dataset.activeAnimation=chosen;
   mount.dataset.jayRunPhase=jayRig.runApproachCompleted?"loop":"approach";
   const runTempo=clamp(.82+.18*((Number(g.speed)||345)/(Number(g.baseSpeed)||345)),.82,1.12);const clipTempo=g.vehicleImpactType==="front"?1:g.vehicleImpactType==="airborne"?1.12:chosen==="run"?runTempo:animationState==="fall-accidental"?1.45:animationState==="get-up"?1.08:1;jayRig.play(chosen,{timeScale:clipTempo});jayRig.update(dt);
  }
  let n=0,busN=0;for(const o of g.obs||[]){if(o.ramp)continue;if(/(?:late bus|matatu|campus shuttle)/i.test(o.label||"")&&busN<lateBuses.length){const bus=lateBuses[busN++];bus.visible=true;bus.position.set(laneX[o.lane??1],0,-42+clamp(o.z,0,1.12)*46+1.65);bus.scale.setScalar(.82);for(const wheel of bus.userData.wheels||[])wheel.rotation.x=worldTravel/.35;continue;}if(n>=obstacles.length)break;const v=obstacles[n++];v.visible=true;v.position.set(laneX[o.lane??1],0,-42+clamp(o.z,0,1.12)*46+3.1);const scale=o.boss?1.25:1;v.scale.setScalar(scale);v.userData.slide.visible=o.action==="slide";v.userData.jump.visible=o.action!=="slide";}for(let i=n;i<obstacles.length;i++)obstacles[i].visible=false;for(let i=busN;i<lateBuses.length;i++)lateBuses[i].visible=false;mount.dataset.activeVehicleObstacles=String(lateBuses.filter(v=>v.visible).length);mount.dataset.activeRampVehicles=String(rampVehicles.filter(v=>v.visible).length);mount.dataset.carryEventPhase=g.carryState?.phase||"inactive";mount.dataset.carryVehicleVisible=String(carryVehicle.visible);mount.dataset.carryVehicleLane=String(g.carryState?.lane??-1);mount.dataset.worldTravel=worldTravel.toFixed(3);mount.dataset.trafficTravel=trafficTravel.toFixed(3);
  n=0;for(const p of g.pick||[]){if(n>=coins.length)break;const v=coins[n++];v.visible=true;v.position.set(laneX[p.lane??1],1.15,-42+clamp(p.z,0,1.1)*46);v.rotation.y=g.t*1.8;}for(let i=n;i<coins.length;i++)coins[i].visible=false;
  n=0;for(const p of g.bonus||[]){if(n>=bonuses.length)break;const v=bonuses[n++];v.visible=true;v.position.set(laneX[p.lane??1],1.35,-42+clamp(p.z,0,1.1)*46);v.rotation.set(g.t*.8,g.t*1.5,0);}for(let i=n;i<bonuses.length;i++)bonuses[i].visible=false;
  renderer.render(scene,camera);
 }
 function chooseSafeCarryLane(currentLane=1,vehicleZ=-3.2,obstacles=[]){
  const laneForX=x=>laneX.reduce((best,value,index)=>Math.abs(value-x)<Math.abs(laneX[best]-x)?index:best,0);
  const score=lane=>{
   let risk=0;
   for(const vehicle of traffic){
    if(!vehicle.visible||laneForX(vehicle.position.x)!==lane)continue;
    const gap=vehicle.position.z-vehicleZ;
    if(gap>-65&&gap<14)risk+=10/(Math.abs(gap)+1);
   }
   for(const obstacle of obstacles||[]){
    if(obstacle.lane!==lane||obstacle.collided)continue;
    const obstacleZ=-42+clamp(obstacle.z,0,1.12)*46+3.1;
    const gap=obstacleZ-vehicleZ;
    if(gap>-32&&gap<12)risk+=14/(Math.abs(gap)+1);
   }
   return risk;
  };
  let best=clamp(Math.floor(Number(currentLane)||0),0,2),bestRisk=score(best);
  for(let lane=0;lane<3;lane++){const risk=score(lane);if(risk<bestRisk-.001){best=lane;bestRisk=risk;}}
  return best;
 }
 return {render,resize,setQuality:applyQuality,chooseSafeCarryLane,get quality(){return quality;},getClipDuration:state=>jayRig.getClipDuration(state),isAnimationFinished:state=>jayRig.isFinished(state),get activeAnimation(){return jayRig.activeState;},get runApproachCompleted(){return jayRig.runApproachCompleted;},probeImpactCamera(g){
  if(!g)return null;
  const base=cameraBaseX,scale=Number.isFinite(Number(g.impactShakeScale))?Number(g.impactShakeScale):1;
  const sample=(hitTimer,time)=>{const impact=clamp(hitTimer/.62,0,1)*scale;const shakeX=Math.sin(time*48)*impact*.035,shakeY=Math.sin(time*36)*impact*.025;return {base,world:base+shakeX,shakeX,shakeY};};
  let impactTime=g.t+.001,best=-1;
  for(let i=0;i<24;i++){const candidate=g.t+.001+i*.035;const score=Math.abs(Math.sin(candidate*48))+.7*Math.abs(Math.sin(candidate*36));if(score>best){best=score;impactTime=candidate;}}
  return {impact:sample(.62,impactTime),recovered:sample(0,impactTime+.031)};
 },resetRun(){
  lastGameT=0;worldTravel=0;trafficTravel=0;playerX=0;previousPlayerX=0;cameraBaseX=0;impactPulse=0;wasHit=false;landingPulse=0;previousJump=0;
  traffic.forEach((vehicle,index)=>{vehicle.position.set(laneX[vehicle.userData.baseLane],0,-36-index*43);vehicle.userData.previousCollisionZ=vehicle.position.z;for(const wheel of vehicle.userData.wheels||[])wheel.rotation.x=0;});rampVehicles.forEach(vehicle=>{vehicle.visible=false;vehicle.userData.obstacle=null;for(const wheel of vehicle.userData.wheels||[])wheel.rotation.x=0;});carryVehicle.visible=false;for(const wheel of carryVehicle.userData.wheels||[])wheel.rotation.x=0;
  jayRig.reset();jayRig.root.position.set(0,rigBaseY,2);jayRig.root.rotation.set(0,Math.PI,0);jayRig.root.scale.set(rigBaseScaleX,rigBaseScaleY,rigBaseScaleZ);jayRig.play("run",{fadeSeconds:0});
  camera.position.set(0,4.9,11.8);camera.fov=57;camera.updateProjectionMatrix();camera.lookAt(0,1.8,-9.5);impactRing.visible=false;impactRing.material.opacity=0;mount.dataset.trafficCollision="false";
 },probeTrafficCollision(g,{lane=1,jump=1,vehicleIndex=0}={}){
  if(!g)return null;
  const vehicle=traffic[vehicleIndex]||traffic[0],savedPositions=traffic.map(item=>item.position.clone()),savedPlayerX=playerX;
  const keys=["energy","hit","hitVehicle","vehicleImpact","vehicleImpactType","vehicleImpactStartHeight","vehicleImpactClip","impactTrafficIndex","impactPlayerX","impactShakeScale","vehicleImpactDuration","speed","inv","pendingFinish","hitTimer","recoveryTimer","lastCollision","jump","lane","d","forceTrafficCollision"];
  const saved={};for(const key of keys)saved[key]=g[key];
  const internal={lastGameT,wasHit,impactPulse,landingPulse,previousJump,cameraBaseX};
  traffic.forEach(item=>item.position.z=-1000);vehicle.position.set(laneX[lane],0,0);vehicle.userData.previousCollisionZ=-1000;playerX=laneX[lane];g.jump=jump;g.energy=100;g.speed=367;g.hit=false;g.hitVehicle=false;g.vehicleImpact=false;g.vehicleImpactType=null;g.vehicleImpactStartHeight=0;g.impactTrafficIndex=null;g.impactPlayerX=playerX;g.impactShakeScale=1;g.inv=0;g.pendingFinish=null;g.hitTimer=0;g.recoveryTimer=0;g.forceTrafficCollision=true;
  const hit=collideWithTraffic(g);
  let throwHeight=0,throwZ=2;
  if(hit){
   const sample={...g,t:g.t+.02,hitTimer:.6};
   render(sample);
   throwHeight=Number(mount.dataset.jayVehicleThrowHeight)||0;
   throwZ=Number(mount.dataset.jayVehicleThrowZ)||2;
  }
  const impactType=g.vehicleImpactType,impactAnimation=mount.dataset.activeAnimation,vehicleStayedVisible=vehicle.visible,impactSpeed=g.speed;
  const safeGap=(2-.82)-(vehicle.position.z+(vehicle.userData.collisionLength||3.8)/2),hitDuration=Number(g.hitTimer)||0,fallClipDuration=jayRig.getClipDuration("fall");
  traffic.forEach((item,index)=>item.position.copy(savedPositions[index]));playerX=savedPlayerX;
  for(const key of keys){if(saved[key]===undefined)delete g[key];else g[key]=saved[key];}
  lastGameT=internal.lastGameT;wasHit=internal.wasHit;impactPulse=internal.impactPulse;landingPulse=internal.landingPulse;previousJump=internal.previousJump;cameraBaseX=internal.cameraBaseX;
  mount.dataset.trafficCollision="false";
  render(g);
  return {hit,vehicle:!!(g.lastCollision?.vehicle||saved.lastCollision?.vehicle||hit),energy:hit?0:saved.energy,impactType,impactAnimation,speed:impactSpeed,vehicleVisible:vehicleStayedVisible,thrown:impactType==="airborne"&&throwHeight>0,throwHeight,throwZ,safeGap,hitDuration,fallClipDuration};
 },dispose(){ro?.disconnect();removeEventListener("resize",resize);jayRig.dispose();impactRing.geometry.dispose();impactRing.material.dispose();renderer.dispose();mount.replaceChildren();}};
}