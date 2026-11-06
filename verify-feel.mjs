import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as T from 'three';
import {JetEffects} from './dist/jet-effects.js';
import {flightFraction,flightVelocity,flightLength} from './dist/race-rules.js';
import {footPath,flightCameraPose,raceMotion,exhaustOrigin,RUN_CYCLE_DISTANCE} from './dist/motion.js';
const report={revision:'r18',status:'passed',checks:[],measurements:{}};
function check(condition,name){assert.ok(condition,name);report.checks.push(name);console.log('PASS',name);}
try{
 let previous=0;for(let i=0;i<=600;i++){const t=i/120,p=flightFraction(t);assert.ok(Number.isFinite(p)&&p>=previous-1e-9&&p>=0&&p<=1);previous=p;}
 check(flightFraction(0)===0&&flightFraction(4.2)===1&&flightVelocity(4.2)===0,'Launch path advances monotonically and stops before the result');
 check(flightFraction(.15)>.04&&flightVelocity(.075)>flightVelocity(1)*1.6,'Initial launch visibly outruns coasting within 150ms');
 for(const hz of[30,60,120]){let estimate=0;for(let t=0;t<4.2;t+=1/hz)estimate+=flightVelocity(t)/hz;assert.ok(Math.abs(estimate-1)<.012);}
 check(true,'Launch distance stays consistent at 30, 60 and 120 frames per second');
 const a=flightCameraPose(.15,2,100,Math.PI-.27,0,.7,false),b=flightCameraPose(.15,2,100000,Math.PI-.27,0,.7,false);
 check(Math.abs((a.z-100)-(b.z-100000))<1e-9&&b.lookZ-a.lookZ===99900,'Camera follows the same-frame world displacement without accumulating lag');
 const camera=new T.PerspectiveCamera(69,390/844,.1,500);let ymin=1,ymax=-1,xmin=1,xmax=-1;
 for(const elapsed of[.02,.075,.15,.4,1,3.6,4.2]){const pose=flightCameraPose(elapsed,2,100,Math.PI-.27,0,.4,false);camera.fov=pose.fov;camera.position.set(pose.x,pose.y,pose.z);camera.lookAt(0,pose.lookY,pose.lookZ);camera.updateProjectionMatrix();camera.updateMatrixWorld(true);for(const p of[new T.Vector3(-.8,2,100),new T.Vector3(.8,3.35,103.4)]){p.project(camera);xmin=Math.min(xmin,p.x);xmax=Math.max(xmax,p.x);ymin=Math.min(ymin,p.y);ymax=Math.max(ymax,p.y);}}
 check(xmin>-.9&&xmax<.9&&ymin>-.60&&ymax<.45,'Portrait camera keeps the flying body clear of top HUD and bottom button');report.measurements.projectedBounds={xmin,xmax,ymin,ymax};
 const scene=new T.Scene(),jets=new JetEffects(scene),source=new T.Vector3(0,1,72);jets.begin(0,1/60);jets.burst('test',0);jets.update('test',source,0,true,true,90);jets.begin(.10,.10);const first=jets.particles[0].position.clone();jets.update('test',new T.Vector3(0,1,112),.10,true,true,90);jets.begin(.18,.08);const displacement=jets.particles[0].position.distanceTo(first);
 check(jets.live>=26&&displacement<8,'A large cloud is emitted as independent particles instead of following a 40m actor jump');
 check(jets.clouds.geometry.type==='SphereGeometry'&&jets.clouds.material.emissive.getHex()===0&&!scene.children.some(o=>o.geometry?.type==='PlaneGeometry'),'Gas uses shaded round volumes with no emissive plane or light column');
 jets.update('test',source,.20,false);jets.begin(1.30,.05);check(jets.live===0,'Burst cloud fully disappears after the impulse; no permanent attached exhaust');
 check(footPath(.74,0).tilt===0,'Stopping movement returns foot roll to neutral for a flat landing');
 check(Math.abs((footPath(.12,1).z-footPath(.10,1).z)/.02+RUN_CYCLE_DISTANCE)<1e-8,'Planted foot counter-motion matches the slowed stride cadence');
 const tailCounts=[];for(const hz of[30,60,144]){const plume=new JetEffects(new T.Scene());for(let i=0;i<hz;i++){const t=i/hz;plume.begin(t,1/hz);plume.update('tail',new T.Vector3(0,2,24*t),t,true,true,24);}tailCounts.push(plume.cursor);assert.ok(plume.cursor>=14&&plume.cursor<=28);}
 check(Math.max(...tailCounts)-Math.min(...tailCounts)<=2,'Continuous butt exhaust density stays consistent across 30, 60 and 144 FPS');report.measurements.tailEmissionCounts=tailCounts;
 const ctx=new Proxy({},{get:(obj,key)=>obj[key]||(()=>{}),set:(obj,key,v)=>(obj[key]=v,true)});globalThis.document={createElement:()=>({width:256,height:256,getContext:()=>ctx})};const {makeActor}=await import('./dist/art.js');const actor=makeActor();actor.food.visible=false;let low=1,high=-1;
 for(let i=0;i<240;i++){actor.update(1/120,i/120,{moving:1,speed:4.4,seated:false});actor.root.updateMatrixWorld(true);for(const leg of actor.legs){const phase=actor.step/(Math.PI*2)+(leg.side===1?.5:0);if(footPath(phase,1).stance){const bounds=new T.Box3().setFromObject(leg.shoe);low=Math.min(low,bounds.min.y);high=Math.max(high,bounds.min.y);}}}
 check(low>-.015&&high<.085,'Both feet land close to the ground through two seconds of running');report.measurements.stanceSoleHeight={low,high};
 let flatWaist=false;actor.torso.traverse(o=>{if(o.isMesh&&o.material?.color?.getHex()===0xf7e9cd){const p=o.geometry.attributes.position;for(let i=0;i<p.count;i++)if(p.getY(i)>1.52&&p.getY(i)<1.63&&Math.abs(p.getX(i))>.34&&Math.abs(p.getZ(i))>.20)flatWaist=true;}});
 check(!flatWaist,'No cream rectangular waist corners remain outside the jacket');
 const flightHead=new T.Vector3(),flightHip=new T.Vector3(),tailOrigin=new T.Vector3();let projectedFlightSpine=0,flightRatio=0,compression=0,screenForeshortening=0,screenPoseHeightRatio=0;
 const phaseBounds={xmin:1,xmax:-1,ymin:1,ymax:-1};let minLandingSole=1,maxLandingSole=-1;
 actor.setGear('poop','white');actor.food.visible=false;
 for(let i=0;i<=576;i++){const elapsed=i/120,motion=raceMotion(elapsed,elapsed/4.8),z=72+flightLength(23930)*flightFraction(elapsed);actor.root.position.set(0,motion.height,z);actor.root.rotation.y=motion.yaw;actor.update(1/120,elapsed,{seated:false,fly:motion.fly,launch:motion.launch,landing:motion.landing,airborneHeight:motion.height});actor.root.updateMatrixWorld(true);
  if(elapsed>=.5&&elapsed<=4.5&&i%12===0){const pose=flightCameraPose(elapsed,motion.height,z,Math.PI-.27,0,0,false);camera.fov=pose.fov;camera.position.set(pose.x,pose.y,pose.z);camera.lookAt(0,pose.lookY,pose.lookZ);camera.updateProjectionMatrix();camera.updateMatrixWorld(true);const v=new T.Vector3();actor.body.traverse(o=>{if(!o.isMesh||!o.visible)return;const p=o.geometry.attributes.position;for(let k=0;k<p.count;k++){v.fromBufferAttribute(p,k).applyMatrix4(o.matrixWorld).project(camera);phaseBounds.xmin=Math.min(phaseBounds.xmin,v.x);phaseBounds.xmax=Math.max(phaseBounds.xmax,v.x);phaseBounds.ymin=Math.min(phaseBounds.ymin,v.y);phaseBounds.ymax=Math.max(phaseBounds.ymax,v.y);}});}

  if(elapsed>=4.15){for(const leg of actor.legs){const y=new T.Box3().setFromObject(leg.shoe).min.y;minLandingSole=Math.min(minLandingSole,y);maxLandingSole=Math.max(maxLandingSole,y);}assert.equal(actor.equip.visible,false);}
  if(Math.abs(elapsed-1.5)<.001){check(actor.pivot.rotation.x>1.20&&actor.pivot.rotation.x<1.48,'Flying body pitches forward around its pelvis with clearly trailing knees');actor.head.getWorldPosition(flightHead);actor.body.localToWorld(flightHip.set(0,1.49,0));flightRatio=Math.abs((flightHead.z-flightHip.z)/(flightHead.y-flightHip.y));projectedFlightSpine=flightHead.clone().project(camera).distanceTo(flightHip.clone().project(camera));const standing=makeActor();standing.root.position.copy(actor.root.position);standing.food.visible=false;for(let j=0;j<50;j++)standing.update(1/60,j/60,{seated:false,moving:0});standing.root.updateMatrixWorld(true);const standHead=standing.head.getWorldPosition(new T.Vector3()).project(camera),standHip=standing.body.localToWorld(new T.Vector3(0,1.49,0)).project(camera);screenForeshortening=projectedFlightSpine/standHead.distanceTo(standHip);const viewHeight=root=>{let low=1,high=-1;const v=new T.Vector3();root.traverse(o=>{if(!o.isMesh)return;for(let parent=o;parent&&parent!==root.parent;parent=parent.parent)if(!parent.visible)return;const position=o.geometry.attributes.position;for(let index=0;index<position.count;index++){v.fromBufferAttribute(position,index).applyMatrix4(o.matrixWorld).project(camera);low=Math.min(low,v.y);high=Math.max(high,v.y);}});return high-low;};screenPoseHeightRatio=viewHeight(actor.body)/viewHeight(standing.body);check(screenPoseHeightRatio<.78,'Actual chase-camera full-body silhouette is visibly different from standing');check(flightRatio>2.8&&actor.legs.every(l=>l.knee.rotation.x>.65),'Chest projects ahead of hips while both knees visibly fold behind');exhaustOrigin(actor,tailOrigin);check(tailOrigin.distanceTo(flightHip)<.55&&tailOrigin.z<flightHip.z-.3,'Exhaust origin stays immediately behind the pelvis instead of at the feet');}
  if(Math.abs(elapsed-4.2)<.001)compression=-actor.body.position.y;
 }
 check(phaseBounds.xmin>-.88&&phaseBounds.xmax<.88&&phaseBounds.ymin>-.60&&phaseBounds.ymax<.52,'Full authored body stays inside mobile-safe framing through flight, descent and standing');
 check(minLandingSole>-.015&&maxLandingSole<.085,'Both feet remain grounded during landing recovery, with equipped seat hidden');
 check(compression>.25,'Landing visibly compresses the hips after contact, before standing recovery');report.measurements.screenPoseHeightRatioToStanding=screenPoseHeightRatio;report.measurements.screenSpineRatioToStanding=screenForeshortening;report.measurements.forwardToVerticalSpine=flightRatio;report.measurements.landingCompression=compression;report.measurements.projectedFlightSpine=projectedFlightSpine;
 report.measurements.fullBodyProjection=phaseBounds;report.measurements.landingSoleHeight={minLandingSole,maxLandingSole};
 const {makeFlightCourse,FLIGHT_COLORS,BAND_LENGTH}=await import('./dist/flight-course.js');const art=await import('./dist/art.js'),{batchScenery}=await import('./dist/district.js');const course=makeFlightCourse(new T.Group(),{group:art.group,box:art.box,textSprite:art.textSprite,batchScenery});
 for(const z of[72,280,2000,200000]){course.update(z,23930,flightLength(23930));const starts=course.chunks.map(c=>c.position.z);for(let i=1;i<starts.length;i++)assert.equal(starts[i]-starts[i-1],BAND_LENGTH*FLIGHT_COLORS.length);assert.ok(starts[0]<=Math.max(z,75)&&starts.at(-1)+BAND_LENGTH*FLIGHT_COLORS.length>z+245);}
 check(true,'Recycled color bands stay continuous and cover the forward view at very large distances');
 check(new Set(FLIGHT_COLORS).size===8&&course.labels.every(label=>label.text&&label.map.image),'Eight distinct clean colors and world-position distance marks remain available');
 report.measurements.strideCycleSeconds=RUN_CYCLE_DISTANCE/4.4;
}catch(e){report.status='failed';report.error=e.stack;process.exitCode=1;console.error(e);}
fs.writeFileSync('qa/r18-motion-effects-check.json',JSON.stringify(report,null,2));
