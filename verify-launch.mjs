import * as T from 'three';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {makeActor} from './dist/character.js';
import {raceMotion,exhaustOrigin} from './dist/motion.js';
import {flightFraction,flightVelocity,LANDING_SECONDS} from './dist/race-rules.js';
import {JetEffects} from './dist/jet-effects.js';

const actor=makeActor();actor.setPower(10000);
for(let i=0;i<120;i++)actor.update(1/60,i/60,{});
let leanAt35=0;
for(let i=0;i<60;i++){
 const t=i/120,m=raceMotion(t,t/4.8);actor.root.position.y=m.height;actor.update(1/120,t,m);
 if(i===42)leanAt35=actor.pivot.rotation.x;
}
assert(leanAt35>1.2);
assert(flightVelocity(.135)>flightVelocity(1)*3);
let previous=0;
for(let t=0;t<5;t+=.01){const f=flightFraction(t);assert(f>=previous&&f<=1);previous=f;}
assert.equal(flightFraction(LANDING_SECONDS),1);
actor.root.updateMatrixWorld(true);
const origin=exhaustOrigin(actor,new T.Vector3()),local=actor.torso.worldToLocal(origin.clone());
assert(local.z<-.5&&local.y>1.4&&local.y<1.8);
const jets=new JetEffects(new T.Scene());
jets.begin(0,0);jets.burst('test',0);jets.update('test',origin,0,true,true,140);
jets.begin(.06,.06);jets.update('test',origin,.06,true,true,120);jets.begin(.18,.12);
const alive=jets.particles.filter(p=>.18-p.born<p.life&&p.born>=0);
const edge=(p,sign)=>p.position.x+sign*p.radius*(1+(1-Math.exp(-.18*16))*p.growth);
const cloudWidth=Math.max(...alive.map(p=>edge(p,1)))-Math.min(...alive.map(p=>edge(p,-1)));
assert(alive.length>=60&&cloudWidth>4);jets.begin(2,1.82);assert.equal(jets.live,0);
const report={status:'passed',checks:['Torso leans more than 68 degrees within 0.35 seconds','Initial impulse exceeds coast speed by 3x','Distance is continuous and stops exactly at landing','Exhaust follows the grown rear garment','One burst makes a wide expanding cloud that fully dissipates'],measurements:{leanAt35,burstPuffs:alive.length,cloudWidth}};
fs.mkdirSync('qa',{recursive:true});fs.writeFileSync('qa/r21-launch-check.json',JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));
