import {makeFlightCourse} from './flight-course.js';
import * as T from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {FOOD,TOILET,PET,fmt} from './data.js';
import {makeAthlete} from './character.js';
import {eatingBeat} from './acting.js';
import {dressDistrict,canopyGeometry,batchScenery} from './district.js';

const materials=new Map(), geometries=new Map();
export function mat(color,roughness=.72,extra={}){const key=JSON.stringify([color,roughness,extra]);if(!materials.has(key))materials.set(key,new T.MeshStandardMaterial({color,roughness,...extra}));return materials.get(key);}
function geo(key,make){if(!geometries.has(key))geometries.set(key,make());return geometries.get(key);}
export function mesh(g,m,parent,pos=[0,0,0],scale){const o=new T.Mesh(g,m);o.position.set(...pos);if(scale)o.scale.set(...scale);o.castShadow=true;o.receiveShadow=true;parent?.add(o);return o;}
export function box(p,w,h,d,c,pos,r=.055){return mesh(geo(`box${w},${h},${d},${r}`,()=>new RoundedBoxGeometry(w,h,d,2,r)),typeof c==='number'?mat(c):c,p,pos);}
export function ball(p,c,pos,scale=[1,1,1],detail=16){return mesh(geo(`sphere${detail}`,()=>new T.SphereGeometry(1,detail,12)),typeof c==='number'?mat(c,.4):c,p,pos,scale);}
export function cylinder(p,r1,r2,h,c,pos,n=24){return mesh(geo(`cyl${r1},${r2},${h},${n}`,()=>new T.CylinderGeometry(r1,r2,h,n)),typeof c==='number'?mat(c):c,p,pos);}
export function group(parent,pos=[0,0,0]){const g=new T.Group();g.position.set(...pos);parent?.add(g);return g;}
export function texture(draw,w=512,h=512){const c=document.createElement('canvas');c.width=w;c.height=h;const ctx=c.getContext('2d');draw(ctx,w,h);const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;t.anisotropy=4;return t;}
function woodTexture(){return texture((c,w,h)=>{c.fillStyle='#bb8748';c.fillRect(0,0,w,h);for(let y=0;y<h;y+=64){c.fillStyle=y%128?'#c99b59':'#b88244';c.fillRect(0,y,w,62);c.strokeStyle='#986b3e';c.lineWidth=2;c.strokeRect(0,y,w,64);for(let k=0;k<9;k++){c.strokeStyle='rgba(106,65,31,.13)';c.beginPath();c.moveTo(0,y+k*7+4);c.bezierCurveTo(170,y+k*7-4,280,y+k*7+12,w,y+k*7+2);c.stroke();}}});}
let wood;
export function woodMat(){if(!wood)wood=new T.MeshStandardMaterial({map:woodTexture(),roughness:.9,color:0xffffff});return wood;}
export function textSprite(text,opts={}){const {size=42,color='#fff',bg=null,stroke='#263445',width=512,height=128}=opts;const tx=texture((c,w,h)=>{if(bg){c.fillStyle=bg;c.beginPath();c.roundRect(3,3,w-6,h-6,20);c.fill();}c.font=`900 ${size}px "Arial", "PingFang SC", sans-serif`;c.textAlign='center';c.textBaseline='middle';c.lineJoin='round';if(stroke){c.strokeStyle=stroke;c.lineWidth=7;c.strokeText(text,w/2,h/2);}c.fillStyle=color;c.fillText(text,w/2,h/2);},width,height);const s=new T.Sprite(new T.SpriteMaterial({map:tx,transparent:true,depthWrite:false}));s.scale.set(opts.scale||4,(opts.scale||4)*height/width,1);return s;}
function flatFace(parent,size=1,style='smile',color=0xffffff){const g=group(parent);const face=texture((c,w,h)=>drawFace(c,w,h,style),256,256);const m=new T.MeshBasicMaterial({map:face,transparent:true,depthWrite:false});const q=mesh(new T.PlaneGeometry(size,size),m,g,[0,0,.015]);q.castShadow=false;return {g,face,q,set(style){drawFace(face.image.getContext('2d'),256,256,style);face.needsUpdate=true;}};}
function drawFace(c,w,h,state){c.clearRect(0,0,w,h);c.fillStyle='#202126';c.strokeStyle='#202126';c.lineCap='round';c.lineWidth=10;
 const eye=(x,y,blink)=>{if(blink){c.beginPath();c.moveTo(x-12,y);c.lineTo(x+12,y);c.stroke();}else{c.beginPath();c.ellipse(x,y,9,15,0,0,Math.PI*2);c.fill();}};
 eye(85,102,state==='blink'||state==='win');eye(171,102,state==='blink'||state==='win');c.lineWidth=5;for(const x of[85,171]){c.beginPath();c.moveTo(x-12,76);c.quadraticCurveTo(x,70,x+11,76);c.stroke();}
 if(state==='strain'){for(const [x,a]of[[82,-1],[174,1]]){c.beginPath();c.moveTo(x-17,74-a*5);c.lineTo(x+17,74+a*5);c.stroke();}}
 if(['eat','surprise','strain','win'].includes(state)){c.beginPath();c.ellipse(128,163,state==='surprise'?17:30,state==='surprise'?25:23,0,0,Math.PI*2);c.fill();if(state!=='surprise'){c.fillStyle='#ff7494';c.beginPath();c.ellipse(128,175,17,7,0,0,Math.PI*2);c.fill();c.fillStyle='#fff';c.fillRect(111,143,34,8);}}
 else if(state==='sad'){c.beginPath();c.arc(128,189,31,Math.PI+0.3,Math.PI*2-.3);c.stroke();}
 else{c.beginPath();c.arc(128,143,35,.22,Math.PI-.22);c.stroke();}
}
function eyes(g,y=.1,z=.5,wide=.2){for(const x of [-wide,wide]){ball(g,0xffffff,[x,y,z],[.14,.19,.08]);ball(g,0x252c3b,[x,y,z+.067],[.06,.10,.035]);ball(g,0xffffff,[x-.02,y+.04,z+.09],[.021,.028,.015]);}}
function smile(g,y=-.18,z=.5){const curve=new T.CatmullRomCurve3([new T.Vector3(-.16,y+.06,z),new T.Vector3(0,y-.02,z+.015),new T.Vector3(.16,y+.06,z)]);mesh(new T.TubeGeometry(curve,10,.024,6,false),mat(0x242434),g);}

// Original community-sports cast and equipment. Shared IDs preserve existing saves.
function capsule(p,r,len,c,pos){return mesh(geo(`caps${r},${len}`,()=>new T.CapsuleGeometry(r,len,5,12)),typeof c==='number'?mat(c):c,p,pos);}
function scatter(p,items,cube=false){const geom=geo(cube?'small-cubes':'small-seeds',()=>cube?new T.BoxGeometry(1,1,1):new T.SphereGeometry(1,8,6)),o=new T.InstancedMesh(geom,mat(0xffffff,.65),items.length),d=new T.Object3D();items.forEach((v,i)=>{d.position.set(...v.p);d.scale.set(...v.s);d.rotation.set(0,v.y||0,v.z||0);d.updateMatrix();o.setMatrixAt(i,d.matrix);o.setColorAt(i,new T.Color(v.c));});o.castShadow=true;p.add(o);return o;}
function badge(p,txt,pos,color='#193e56',size=.48){const tx=texture((c,w,h)=>{c.fillStyle='#fff5d9';c.beginPath();c.roundRect(6,6,w-12,h-12,24);c.fill();c.font='900 90px Arial';c.fillStyle=color;c.textAlign='center';c.textBaseline='middle';c.fillText(txt,w/2,h/2+4);},160,128);const b=mesh(new T.PlaneGeometry(size,size*.8),new T.MeshBasicMaterial({map:tx,transparent:true}),p,pos);b.castShadow=false;return b;}
export function makeFood(id='poop'){
 const kind=FOOD[id]?.kind||id,g=group();g.userData.kind=kind;
 if(kind==='roll'){
  ball(g,mat(0xdf9d52,.82),[0,0,0],[.47,.35,.34]);for(let i=0;i<3;i++){const x=(i-1)*.21,points=[];for(let k=0;k<=10;k++){const z=-.17+k*.034,xx=x+z*.14,y=.35*Math.sqrt(Math.max(0,1-(xx/.47)**2-(z/.34)**2))+.006;points.push(new T.Vector3(xx,y,z));}mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points),16,.017,5),mat(0xffde9a,.9),g);}
  for(let i=0;i<12;i++){const s=ball(g,0xffe4a2,[Math.sin(i*2.4)*.32,.30+Math.cos(i)*.03,Math.cos(i*2.4)*.24],[.018,.025,.018],8);s.rotation.z=i;}
  const paper=box(g,.68,.22,.5,0xf5eee0,[0,-.24,.04],.04);paper.rotation.z=-.08;
 }else if(kind==='hotdog'){
  for(const x of[-.14,.14]){const bun=capsule(g,.19,.66,0xeeb768,[x,0,0]);bun.rotation.z=.10;}
  const sausage=capsule(g,.15,.70,0xb94e39,[0,.02,.16]);const mustard=new T.CatmullRomCurve3(Array.from({length:18},(_,i)=>new T.Vector3(Math.sin(i*1.5)*.075,-.38+i*.045,.30)));mesh(new T.TubeGeometry(mustard,30,.025,6),mat(0xffd64a,.42),g);
  box(g,.64,.29,.38,0xf7f0d7,[0,-.37,.01],.07);
 }else if(kind==='corn'){
  const core=capsule(g,.23,.65,0xe8b52e,[0,.06,0]);const kernels=[];for(let y=0;y<9;y++)for(let k=0;k<7;k++){const a=k/7*Math.PI*2;kernels.push({p:[Math.sin(a)*.23,-.37+y*.10,Math.cos(a)*.23],s:[.075,.065,.067],c:[0xffd444,0xf0bb32,0xffdf6d][(k+y)%3]});}scatter(g,kernels);
  const stick=cylinder(g,.045,.045,.42,0xcf9a60,[0,-.68,0],8);for(const side of[-1,1]){const leaf=ball(g,0x72ae49,[side*.19,-.35,-.05],[.12,.42,.09]);leaf.rotation.z=-side*.35;}
 }else if(kind==='skewer'){
  cylinder(g,.035,.035,1.45,0xc99755,[0,0,0],8);for(const [i,c]of[0xe55641,0xf7c847,0x65ac55,0xe77939].entries()){const v=box(g,.43,.24,.36,c,[Math.sin(i)*.05,-.33+i*.25,0],.09);v.rotation.y=i*.5;box(g,.28,.035,.39,0x9b583c,[Math.sin(i)*.05,-.33+i*.25,.02],.01).rotation.y=i*.5;}
 }else if(kind==='donut'){
  const d=mesh(geo('donut',()=>new T.TorusGeometry(.34,.16,12,32)),mat(0xc98743,.65),g);
  const frosting=mesh(new T.TorusGeometry(.34,.145,10,32),mat(0xf5a9a8,.38),g,[0,0,.045]);frosting.scale.z=.60;
  for(let i=0;i<23;i++){const a=i*2.4,r=.29+.07*Math.sin(i*1.1),b=box(g,.055,.017,.027,[0xfff2c6,0x4daca7,0xf2ca45,0x994f66][i%4],[Math.cos(a)*r,Math.sin(a)*r,.18],.007);b.rotation.z=a*1.7;}
 }else if(kind==='burger'){
  const bottom=ball(g,0xdd994f,[0,-.34,0],[.53,.14,.45]);const top=ball(g,0xedb565,[0,.26,0],[.54,.27,.45]);cylinder(g,.50,.50,.14,0x654330,[0,-.12,0],24);cylinder(g,.49,.49,.10,0xd86542,[0,.02,0],24);
  const lettuce=mesh(new T.TorusGeometry(.40,.095,6,18),mat(0x7db54a),g,[0,-.02,0]);lettuce.rotation.x=Math.PI/2;lettuce.scale.set(1.12,1,.6);
  const cheese=box(g,.80,.055,.73,0xffd352,[0,.10,0],.02);cheese.rotation.y=.3;
  scatter(g,Array.from({length:18},(_,i)=>{const a=i*2.4,r=.37*Math.sqrt(i/18);return{p:[Math.cos(a)*r,.46-.15*(r/.4)**2,Math.sin(a)*r*.85],s:[.018,.009,.045],y:a,c:0xffedb8};}));
  box(g,.71,.19,.54,0xf5eedc,[0,-.42,0],.03);
 }
 return g;
}

export function makeToilet(id='white'){
 const g=group();if(id==='none')return g;const c=TOILET[id]?.color||0xf1e3c5;
 // A portable, padded sports commode: rounded chassis, grab handles and race bib.
 box(g,1.14,.23,1.35,0x304b5d,[0,.22,.02],.15);cylinder(g,.31,.42,.65,0xf7eedc,[0,.55,.10]);
 const profile=[[.27,.32],[.38,.50],[.58,.77],[.61,.94],[.55,1.07],[.44,1.08],[.38,.92],[.26,.60]].map(v=>new T.Vector2(...v));const bowl=mesh(new T.LatheGeometry(profile,28),mat(c,.38),g,[0,0,.10]);bowl.scale.z=1.12;const seat=mesh(new T.TorusGeometry(.46,.095,8,32),mat(0x314c5a,.4),g,[0,1.10,.14]);seat.rotation.x=Math.PI/2;seat.scale.y=1.16;cylinder(g,.35,.35,.025,0x9bdddf,[0,.87,.14]);
 box(g,1.02,1.06,.30,c,[0,1.30,-.58],.20);box(g,.72,.59,.14,0xf5e9c9,[0,1.40,-.39],.15);badge(g,id==='white'?'01':id==='rocket'?'02':'GO',[0,1.44,-.305],'#224d61',.42);
 for(const x of[-.73,.73]){const h=mesh(new T.TorusGeometry(.19,.055,6,12,Math.PI),mat(0xf0bb4b),g,[x,1.01,.10]);h.rotation.set(Math.PI/2,0,Math.PI/2);}
 if(id==='rocket')for(const x of[-.88,.88]){const r=group(g,[x,.87,-.14]);const tank=cylinder(r,.20,.20,.82,0x6ec9c6,[0,0,0],18);tank.rotation.x=Math.PI/2;for(const z of[-.34,.34]){const band=cylinder(r,.215,.215,.10,0xf1c64d,[0,0,z]);band.rotation.x=Math.PI/2;}const f=mesh(new T.ConeGeometry(.14,.48,10),mat(0xffb83b,.3,{emissive:0xf77834,emissiveIntensity:.7}),r,[0,0,-.65]);f.rotation.x=-Math.PI/2;f.userData.flame=true;badge(r,'POP',[0,.1,.22],'#b64e39',.32);}
 if(id==='pink')for(const x of[-.88,.88]){const pts=[];for(let k=0;k<=45;k++){const t=k/45;pts.push(new T.Vector3(x+Math.sin(t*Math.PI*10)*.11,.35+t*.70,.05+Math.cos(t*Math.PI*10)*.11));}mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts),45,.026,5),mat(0x6a8190,.35),g);ball(g,0xee8e95,[x,1.17,.05],[.24,.12,.31]);}
 if(id==='noob'){box(g,1.76,.16,1.70,0xe6ba45,[0,.08,0],.15);for(const x of[-.75,.75])for(const z of[-.60,.60]){const wh=cylinder(g,.17,.17,.14,0x3f6c7c,[x,.10,z],12);wh.rotation.z=Math.PI/2;}const back=mesh(new T.TorusGeometry(.36,.06,6,22),mat(0x2e747f),g,[0,2,-.6]);}
 if(id==='crab')for(const x of[-1.0,1.0]){const h=cylinder(g,.06,.06,.60,0xc5d9df,[x,1.13,0]);h.rotation.z=Math.PI/2;for(const z of[-.22,.22]){const w=cylinder(g,.25,.25,.13,0x34586c,[x+z,1.13,0],18);w.rotation.z=Math.PI/2;}box(g,.12,.60,.13,c,[x*.78,.80,0],.05);}
 if(id==='balloon')for(const side of[-1,1]){const sh=new T.Shape();sh.moveTo(0,.6);sh.lineTo(.42,0);sh.lineTo(0,-.45);sh.lineTo(-.42,0);sh.closePath();const kite=mesh(new T.ShapeGeometry(sh),mat(side>0?0xf5c356:0x70bdbb,.65,{side:T.DoubleSide}),g,[side*.65,2.43,-.6]);kite.rotation.z=side*.24;const cord=new T.LineCurve3(new T.Vector3(side*.2,1.5,-.5),new T.Vector3(side*.65,2.4,-.6));mesh(new T.TubeGeometry(cord,1,.012,4),mat(0xf4edd9),g);}
 if(id==='octopus')for(const side of[-1,1]){const fan=group(g,[side*.94,1.0,-.1]);const duct=mesh(new T.TorusGeometry(.36,.10,8,24),mat(0x4d8695,.4),fan);for(let i=0;i<3;i++){const p=box(fan,.10,.57,.055,0xb8dbd6,[0,0,.02],.045);p.rotation.z=i*Math.PI/3;}ball(fan,0xf1c354,[0,0,.09],[.12,.12,.08]);}
 if(id==='bat'){for(const side of[-1,1]){const wing=box(g,1.05,.12,.72,0xe6c267,[side*.98,.53,-.12],.15);wing.rotation.z=side*.18;}ball(g,0xefc85c,[0,2.01,-.59],[.27,.27,.10]);badge(g,'★',[0,2.02,-.47],'#bd6d32',.39);}
 return g;
}

export function makePet(p){const spec=PET[p.species]||PET.cat,g=group(),c=spec.color;
 if(spec.kind==='cat'){ball(g,c,[0,0,0],[.40,.35,.35]);for(const x of[-.24,.24]){const ear=mesh(new T.ConeGeometry(.15,.27,3),mat(c),g,[x,.32,-.03]);ball(g,0xffcfab,[x,.30,.05],[.065,.095,.025]);}for(const x of[-.17,.17])ball(g,0xf3dfbc,[x,-.29,.17],[.13,.09,.18]);eyes(g,.02,.31,.14);smile(g,-.19,.35);for(const x of[-.27,.27])box(g,.1,.025,.03,0xb37646,[x,.10,.26],.01);}
 else if(spec.kind==='dog'){ball(g,c,[0,0,0],[.40,.35,.36]);for(const x of[-.34,.34]){const ear=ball(g,0xa86843,[x,.10,-.03],[.14,.28,.12]);ear.rotation.z=-x*.5;ball(g,0xf3dcb4,[x*.5,-.28,.13],[.13,.10,.17]);}eyes(g,.04,.32,.14);ball(g,0xf4dfbd,[0,-.15,.33],[.20,.13,.09]);ball(g,0x3d4548,[0,-.1,.42],[.06,.045,.035]);}
 else if(spec.kind==='bomb'){ball(g,c,[0,0,0],[.38,.38,.38]);for(const a of[0,Math.PI/2]){const ln=mesh(new T.TorusGeometry(.377,.016,5,28),mat(0x805d49),g);ln.rotation.y=a;}eyes(g,.02,.35,.14);smile(g,-.19,.36);}
 else if(spec.kind==='blob'){ball(g,c,[0,0,0],[.42,.31,.34]);const cap=ball(g,0x4e927f,[0,.26,0],[.38,.12,.33]);box(g,.44,.04,.25,0x4e927f,[0,.25,.29],.08);eyes(g,-.01,.30,.14);smile(g,-.2,.32);}
 else{for(const [x,y,s]of[[-.24,0,.25],[0,.07,.34],[.25,0,.24]])ball(g,c,[x,y,0],[s,s*.8,s]);eyes(g,.01,.30,.14);smile(g,-.18,.33);}
 if(spec.kind!=='blob'){const band=mesh(new T.TorusGeometry(.35,.045,5,24),mat(0xf1e9cc),g,[0,.18,0]);band.rotation.x=Math.PI/2;band.scale.set(1.12,.93,1);}
 if(p.tier>0){const medal=cylinder(g,.13,.13,.045,0xf7c955,[0,-.13,.40],20);medal.rotation.x=Math.PI/2;badge(g,'★',[0,-.12,.43],'#c47b35',.20);g.scale.setScalar(1.08+.08*Math.min(3,p.tier));}
 g.userData.dynamic=true;g.traverse(o=>{if(o.isMesh)o.castShadow=false;});return g;
}

export function makeActor(style='suit',label=''){const a=makeAthlete(style,label,{makeFood,makeToilet,textSprite});a.root.userData.dynamic=true;return a;}

function fixedText(p,text,pos,opts){const sprite=textSprite(text,opts),s=mesh(new T.PlaneGeometry(sprite.scale.x,sprite.scale.y),new T.MeshBasicMaterial({map:sprite.material.map,transparent:true,depthWrite:false}),p,pos);s.castShadow=false;sprite.material.dispose();return s;}
function labelBoard(p,text,x,y,z,w=4,color=0xf5e5c6){box(p,w,.85,.14,color,[x,y,z],.10);return fixedText(p,text,[x,y,z+.10],{scale:w*.89,size:60,width:512,height:100,color:'#244c60',stroke:null});}
function ground(p,w,d,c,x,z,y=.01){return box(p,w,.05,d,c,[x,y,z],.02);}
function parkBench(p,x,z,yaw=0){const g=group(p,[x,0,z]);g.rotation.y=yaw;for(const xx of[-.95,.95]){box(g,.12,.75,.14,0x476773,[xx,.37,0]);box(g,.12,1.25,.12,0x476773,[xx,.7,-.38]);}for(let i=0;i<4;i++)box(g,2.4,.10,.16,woodMat(),[0,.78,(i-1.5)*.18],.025);for(let i=0;i<3;i++)box(g,2.4,.15,.10,woodMat(),[0,1.1+i*.18,-.4],.025);}
function pennants(p,x,z,length=8){for(const xx of[-length/2,length/2])cylinder(p,.045,.045,3.8,0x52717c,[x+xx,1.9,z],8);const pts=[];for(let i=0;i<25;i++){const t=i/24;pts.push(new T.Vector3(x-length/2+t*length,3.6-Math.sin(t*Math.PI)*.6,z));}mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts),24,.018,4),mat(0xeee3ca),p);for(let i=0;i<9;i++){const t=(i+.5)/9,sh=new T.Shape();sh.moveTo(-.22,0);sh.lineTo(.22,0);sh.lineTo(0,-.43);sh.closePath();mesh(new T.ShapeGeometry(sh),mat([0xed9b63,0x75b2ae,0xe5c562][i%3],.8,{side:T.DoubleSide}),p,[x-length/2+t*length,3.6-Math.sin(t*Math.PI)*.6,z]);}}
function tree(p,x,z,s=1){const g=group(p,[x,0,z]);cylinder(g,.20,.30,3.5,0xa77c58,[0,1.6,0],9);for(const [xx,yy,zz,rr]of[[0,3.9,0,1.3],[-.75,3.4,.10,.95],[.7,3.5,-.1,1.0]])ball(g,mat(0x6ab875,.95),[xx,yy,zz],[rr,rr*1.1,rr],12);cylinder(g,1.0,.85,.50,0xead8b5,[0,.2,0]);g.scale.setScalar(s);}
function hoop(p,x,z,yaw){const g=group(p,[x,0,z]);g.rotation.y=yaw;box(g,.18,4.8,.18,0x577888,[0,2.4,0]);box(g,2.0,1.2,.12,0xeee9d3,[0,4.50,.45],.06);const tx=texture((c,w,h)=>{c.strokeStyle='#c67053';c.lineWidth=12;c.strokeRect(16,16,w-32,h-32);c.strokeRect(w*.34,h*.34,w*.32,h*.55);},256,160);mesh(new T.PlaneGeometry(1.85,1.12),new T.MeshBasicMaterial({map:tx,transparent:true}),g,[0,4.51,.52]);const ring=mesh(new T.TorusGeometry(.35,.045,6,24),mat(0xe59655),g,[0,4.08,.9]);ring.rotation.x=Math.PI/2;for(let i=0;i<10;i++){const a=i/10*Math.PI*2;const pts=[new T.Vector3(Math.sin(a)*.34,4.08,.9+Math.cos(a)*.34),new T.Vector3(Math.sin(a+.2)*.23,3.53,.9+Math.cos(a+.2)*.23)];mesh(new T.TubeGeometry(new T.LineCurve3(...pts),1,.012,4),mat(0xf7efda),g);}}

export function makeWorld(scene){
 const lobby=group(scene),race=group(scene),decorActors=[],zones=[],flags=[],cameraOccluders=[];
 const meal={x:-16,z:-3,r:5.2,slots:12,solid:2.1},blocks=[[-23,-15,-24.5,-20.5,4.6],[14,25,-22,-16,6.5],[-24.5,-20.5,10,15,5.0],[-9,11,-30,-26,8.3]];
 const turf=texture((c,w,h)=>{c.fillStyle='#93c77c';c.fillRect(0,0,w,h);for(let i=0;i<3200;i++){c.fillStyle=i%2?'rgba(65,108,68,.10)':'rgba(237,234,179,.15)';c.fillRect(i*97%w,i*197%h,2,4);}},512,512);turf.wrapS=turf.wrapT=T.RepeatWrapping;turf.repeat.set(10,10);
 box(lobby,61,.48,68,new T.MeshStandardMaterial({map:turf,roughness:1}),[0,-.29,-3],1.0);
 // An oval running circuit wraps a painted community court: no reference cliffs or stone cross.
 const running=mesh(new T.RingGeometry(10.5,14.2,80),mat(0xdf8c6d,.94),lobby,[0,.012,-1]);running.rotation.x=-Math.PI/2;running.scale.y=1.52;
 for(const r of[10.65,11.72,12.82,14.03]){const ln=mesh(new T.RingGeometry(r,r+.035,80),mat(0xf1dfbb),lobby,[0,.045,-1]);ln.rotation.x=-Math.PI/2;ln.scale.y=1.52;}
 const courtTx=texture((c,w,h)=>{c.fillStyle='#51aaa5';c.fillRect(0,0,w,h);c.fillStyle='#388f93';c.fillRect(w*.22,0,w*.56,h*.23);c.fillRect(w*.22,h*.77,w*.56,h*.23);c.strokeStyle='#f5e5bf';c.lineWidth=8;c.strokeRect(25,25,w-50,h-50);c.beginPath();c.moveTo(25,h/2);c.lineTo(w-25,h/2);c.stroke();for(const y of[0,h]){c.strokeRect(w*.24,y?y-h*.23:0,w*.52,h*.23);c.beginPath();c.arc(w/2,y?y-h*.23:h*.23,w*.23,y?Math.PI:0,y?Math.PI*2:Math.PI);c.stroke();}c.beginPath();c.arc(w/2,h/2,120,0,Math.PI*2);c.stroke();c.textAlign='center';c.fillStyle='#f5e5bf';c.font='900 58px sans-serif';c.fillText('邻里运动场',w/2,h/2+18);},768,1024);
 const court=mesh(new T.PlaneGeometry(15,20),new T.MeshStandardMaterial({map:courtTx,roughness:1}),lobby,[0,.052,-3]);court.rotation.x=-Math.PI/2;court.receiveShadow=true;hoop(lobby,-4.8,-14.1,0);hoop(lobby,4.8,8.1,Math.PI);
 // Open neighborhood edges with low railings, plants and a warm town skyline.
 for(const side of[-1,1])for(let i=0;i<19;i++){box(lobby,.12,1.45,.12,0xd5e1d4,[side*29,.73,-29+i*3],.025);if(i<18){box(lobby,.10,.08,3,0xd5e1d4,[side*29,1.2,-27.5+i*3],.015);box(lobby,.10,.08,3,0xd5e1d4,[side*29,.5,-27.5+i*3],.015);}}
 for(const [x,z,s]of[[-26,-26,1.1],[27,-26,1.2],[26,19,1.0],[-26,20,1.05],[-27,3,.75],[26,-13,.8],[-6,-27,.65],[9,-27,.65]])tree(lobby,x,z,s);
 for(let i=0;i<7;i++){const x=-35+i*11,h=6+i%3*2;box(lobby,8,h,5,[0xe5b99b,0xb8c8bc,0xd7c4aa,0xb3c7c8][i%4],[x,h/2,-38],.16);box(lobby,8.5,.35,5.4,0xe8d9bd,[x,h,-38]);for(let xx=0;xx<3;xx++)for(let yy=0;yy<Math.floor(h/2);yy++)box(lobby,1.2,1.1,.06,0x6c929b,[x-2.5+xx*2.5,1.5+yy*2.0,-35.46],.03);}
 for(const x of[-25,25])for(const z of[-18,17]){cylinder(lobby,.07,.10,5.4,0x587b85,[x,2.7,z],10);const light=box(lobby,1.0,.2,.5,0xf7e9bb,[x,5.35,z+.1],.09);light.material=mat(0xffefd0,.4,{emissive:0xffd9a1,emissiveIntensity:.2});}
 // The clubhouse is the progression landmark; the target is displayed on an outdoor board.
 const club=group(lobby,[1,0,-28]);box(club,17,6.8,4.2,0xebcfad,[0,3.3,0],.20);box(club,17.6,.38,4.9,0x6a9a9e,[0,6.78,0],.14);for(const x of[-5.3,5.3]){box(club,3.5,2.8,.08,0x86afb5,[x,3.4,2.16],.10);box(club,.10,2.8,.10,0xf3e3c4,[x,3.4,2.23]);}box(club,2.4,3.8,.12,0x4d7886,[0,2.0,2.18],.15);labelBoard(club,'邻里喷气运动会',0,5.78,2.25,11.5);const goal=textSprite('挑战社区纪录 614.40K',{scale:7,size:45,color:'#f5ebc7',stroke:null});goal.position.set(0,7.5,1.9);club.add(goal);const portalText=goal;pennants(lobby,1,-23.6,19);zones.push({id:'world',x:1,z:-23,r:4});
 // Picnic/rest area: benches, canopy, thermos and numbered warm-up mats.
 const rest=group(lobby,[meal.x,0,meal.z]);box(rest,12,.18,12,0xc4aa82,[0,.05,0],.3);for(let i=-5;i<=5;i++)box(rest,.035,.012,11.5,0xa08b70,[i,.15,0],.005);
 for(const z of[-1.0,1.0]){box(rest,4.3,.15,1.25,woodMat(),[0,1.04,z],.05);for(const x of[-1.6,1.6])box(rest,.14,.95,.14,0x58717c,[x,.48,z]);}
 cylinder(rest,.065,.065,5.25,0x637b7c,[0,2.6,0],10);const canopy=group(rest);canopy.userData.dynamic=true;const umbrella=mesh(canopyGeometry(),mat(0xffffff,.9,{side:T.DoubleSide,vertexColors:true}),canopy,[0,5.08,0]);const umbrellaTrim=mesh(new T.TorusGeometry(3,.07,6,48),mat(0xf3e1ba),canopy,[0,4.58,0]);umbrellaTrim.rotation.x=Math.PI/2;
 cylinder(rest,.16,.16,.45,0x76b4ad,[.8,1.35,1],16);box(rest,.65,.12,.65,0xf1dfbb,[-1,1.15,-1],.03);labelBoard(canopy,'邻里休息站',0,5.75,0,5.5);cameraOccluders.push(canopy);
 for(let i=0;i<meal.slots;i++){const a=i/meal.slots*Math.PI*2,x=Math.sin(a)*meal.r,z=Math.cos(a)*meal.r;const pad=box(rest,.87,.025,.86,i%2?0x6fa6a0:0xe7cf9c,[x,.17,z],.12);const tx=textSprite(String(i+1),{scale:.42,size:100,width:128,height:128,stroke:null,color:'#f8eed6'});const num=mesh(new T.PlaneGeometry(.35,.35),new T.MeshBasicMaterial({map:tx.material.map,transparent:true}),rest,[x,.19,z]);num.rotation.x=-Math.PI/2;if(i%4===1){const ai=Math.floor(i/4),a=makeActor(['bacon','mint','pink'][ai]);rest.add(a.root);a.root.position.set(x,.16,z);a.root.rotation.y=i/meal.slots*Math.PI*2+Math.PI;a.setGear(['fish','walnut','banana5'][ai],['rocket','pink','noob'][ai]);decorActors.push(a);}}
 zones.push({id:'table',x:meal.x,z:meal.z,r:7});parkBench(lobby,-25,-9,Math.PI/2);parkBench(lobby,-24,6,Math.PI/2);
 // A neighborhood snack van, with its own rounded body, service hatch and two-tone awning.
 const van=group(lobby,[-19,0,-22]);box(van,6.8,2.7,3.1,0xe4b65b,[0,2,0],.45);box(van,6.95,.22,3.2,0xf2e5c8,[0,3.35,0],.12);for(const x of[-2.2,2.2]){const wheel=cylinder(van,.52,.52,.28,0x3f5260,[x,.58,1.45],18);wheel.rotation.x=Math.PI/2;const hub=cylinder(van,.25,.25,.3,0xe5d8bf,[x,.58,1.48],14);hub.rotation.x=Math.PI/2;}
 box(van,4.15,1.35,.08,0x486e79,[-.4,2.3,1.60],.10);box(van,4.55,.15,.85,0xf5e8cb,[-.4,1.55,1.80],.05);for(let i=0;i<8;i++)box(van,.52,.10,1.05,i%2?0x82b5b0:0xf0dec1,[-2.25+i*.55,3.35,1.84],.01);labelBoard(van,'街角小卖部',0,4.25,0,6.4);const vendor=makeActor('mint');van.add(vendor.root);vendor.root.position.set(-.2,.48,1.75);vendor.root.scale.setScalar(.75);vendor.setGear('poop','none');vendor.role='vendor';vendor.food.visible=false;vendor.legs.forEach(l=>l.hip.visible=false);decorActors.push(vendor);for(const [i,id]of['fish','pepper'].entries()){const f=makeFood(id);van.add(f);f.scale.setScalar(.70);f.position.set(-1.5+i*2.6,1.95,1.88);}zones.push({id:'food',x:-19,z:-18.5,r:3.5});
 // Sports gear workshop: striped shutters, an open repair bay, spare wheels and toolkit.
 const shop=group(lobby,[19,0,-19]);box(shop,10,5.0,5.8,0xc9dbce,[0,2.45,0],.20);box(shop,10.4,.25,6.3,0x5d8693,[0,5.02,0]);box(shop,5.6,3.0,.10,0x446b79,[0,1.62,2.95],.08);for(let i=0;i<5;i++)box(shop,5.5,.07,.13,0x6c8e97,[0,.5+i*.5,3.02],.02);labelBoard(shop,'喷气器材社',0,4.12,3.04,8.3);const chair=makeToilet('rocket');shop.add(chair);chair.position.set(3.5,.12,4.0);chair.rotation.y=-.35;box(shop,2.4,.12,1.1,woodMat(),[-3.1,1.15,3.8]);box(shop,.75,.46,.42,0xce825e,[-3.1,1.43,3.8],.06);zones.push({id:'toilets',x:19,z:-13.6,r:4});
 // Capsule stands on the right-hand walkway; companions float visibly inside.
 const eggC=[0xe6bf64,0x7ab6b2,0xa99cbb,0xd7989c,0x8fa9bc];for(let i=0;i<5;i++){const x=23+Math.sin(i)*1.0,z=-7+i*4.8,g=group(lobby,[x,0,z]);cylinder(g,1.05,1.2,.24,0xe7d8b9,[0,.15,0]);box(g,1.28,.95,1.1,eggC[i],[0,.77,0],.21);ball(g,new T.MeshStandardMaterial({color:0xc7ece6,transparent:true,opacity:.28,roughness:.12,depthWrite:false}),[0,1.85,0],[.90,.90,.90]);cylinder(g,.55,.78,.25,eggC[i],[0,2.6,0]);const pet=makePet({species:['cat','dog','blob','octo','bomb'][i],tier:0});g.add(pet);pet.position.set(0,1.90,0);pet.scale.setScalar(.85);flags.push({egg:pet,base:1.9,phase:i});fixedText(g,['50','250','1.25K','6.25K','31.25K'][i],[0,.82,.59],{scale:1.6,size:65,width:256,height:100,stroke:null,color:'#365c68'});g.rotation.y=-Math.PI/2;zones.push({id:'eggs',egg:i,x:x-1.8,z,r:3.0});}const companionSign=group(lobby,[24,4.1,2]);companionSign.rotation.y=-Math.PI/2;labelBoard(companionSign,'社区伙伴站',0,0,0,6.5);ground(lobby,5.8,27,0xcfc3a5,23,2);
 // Scoreboard and community spectators' benches.
 const board=group(lobby,[-22.5,0,12]);for(const x of[-1.7,1.7])box(board,.15,3.9,.16,0x63808b,[x,1.8,0]);box(board,5.4,3.5,.30,0x2f5368,[0,3.1,0],.13);labelBoard(board,'飞行里程碑',0,5.30,0,6.2);for(const [i,text]of['起步   100 m','腾空   1K m','冲云   10K m','破风   100K m','极限   614.40K m'].entries()){const line=textSprite(text,{scale:4.8,size:35,height:90,stroke:null,color:'#f1dc9d'});line.position.set(0,4.35-i*.57,.19);board.add(line);}zones.push({id:'leaderboard',x:-22.5,z:14,r:4});
 ground(lobby,31,8,0xc48168,0,20);const startTx=texture((c,w,h)=>{c.fillStyle='#f4e4bd';c.fillRect(0,0,w,h);c.fillStyle='#476d78';c.font='900 110px sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillText('邻 里 起 跑 区',w/2,h/2);},1024,256);const startFloor=mesh(new T.PlaneGeometry(12,3),new T.MeshBasicMaterial({map:startTx}),lobby,[0,.08,18.0]);startFloor.rotation.x=-Math.PI/2;
 pennants(lobby,0,22,29);zones.push({id:'race',x:0,z:17,r:4.8});
 const district=dressDistrict(lobby,{group,box,ball,cylinder,mesh,mat,makeFood,makePet,fixedText});blocks.push(...district.solids);
 // Broad, clean color bands retain the reference's readable flying-ground contrast.
 const course=makeFlightCourse(race,{group,box,textSprite,batchScenery}),updateCourse=course.update;
 const start=textSprite('预备',{scale:8,size:88,width:512,height:128});start.position.set(0,4,75);race.add(start);race.visible=false;
 for(const a of decorActors)a.root.traverse(o=>{if(o.isMesh)o.castShadow=false;});for(const districtRoot of[lobby,race]){districtRoot.updateWorldMatrix(true,true);districtRoot.traverse(o=>{if(o.isMesh&&new T.Box3().setFromObject(o).max.y<.24)o.castShadow=false;});}batchScenery(lobby);batchScenery(race);
 return {lobby,race,zones,decorActors,portalText,start,meal,blocks,cameraOccluders,updateCourse,surfaceAt(x,z){return Math.abs(x-meal.x)<6&&Math.abs(z-meal.z)<6?.16:0;},update(dt,t,acting={}){for(const f of flags){f.egg.position.y=f.base+Math.sin(t*1.8+f.phase)*.10;f.egg.rotation.y=Math.sin(t*.7+f.phase)*.23;}for(const a of decorActors){const ap=a.root.getWorldPosition(new T.Vector3()),close=acting.pos&&ap.distanceTo(acting.pos)<14;a.update(dt,t,{cheer:acting.cheer||0,seated:a.toilet?.children.length>0,wave:close&&(a.role==='vendor'||a.role==='rival'&&a.style==='bacon')?1:0,...(a.role==='vendor'||a.role==='rival'?{eat:0,chew:0}:eatingBeat((t+a.phase)%.9))});if(close){const dir=new T.Vector3().subVectors(acting.pos,ap).applyQuaternion(a.root.getWorldQuaternion(new T.Quaternion()).invert());a.head.rotation.y=T.MathUtils.clamp(Math.atan2(dir.x,dir.z),-.45,.45);}}}};
}
