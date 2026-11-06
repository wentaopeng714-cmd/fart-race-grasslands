import * as T from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {footPath,solveLeg,RUN_CYCLE_DISTANCE} from './motion.js';

const geometries=new Map(),materials=new Map();
const gcache=(key,fn)=>{if(!geometries.has(key))geometries.set(key,fn());return geometries.get(key);};
const material=(color,roughness=.68)=>{const key=color+':'+roughness;if(!materials.has(key))materials.set(key,new T.MeshStandardMaterial({color,roughness}));return materials.get(key);};
function node(parent,pos=[0,0,0]){const g=new T.Group();g.position.set(...pos);parent?.add(g);return g;}
function part(parent,geometry,mat,pos=[0,0,0],scale){const m=new T.Mesh(geometry,mat);m.position.set(...pos);if(scale)m.scale.set(...scale);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
function round(parent,w,h,d,mat,pos,r=.06){return part(parent,gcache(`r:${w}:${h}:${d}:${r}`,()=>new RoundedBoxGeometry(w,h,d,2,r)),mat,pos);}
function oval(parent,mat,pos,scale){return part(parent,gcache('sphere',()=>new T.SphereGeometry(1,20,12)),mat,pos,scale);}
function line(parent,points,r,mat){return part(parent,new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),Math.max(8,points.length*4),r,6,false),mat);}

// Authored cross sections give the jaw, jacket, tapered sleeves and shoes their
// own silhouettes. They share no lathed-cylinder body or capsule limb geometry.
function surface(name,rings,power=.66,segments=28){return gcache(name,()=>{
 const p=[],uv=[],indices=[];
 for(let j=0;j<rings.length;j++){const [y,rx,rz,cz=0,cx=0]=rings[j];for(let i=0;i<=segments;i++){const a=i/segments*Math.PI*2,s=Math.sin(a),c=Math.cos(a);p.push(cx+Math.sign(s)*Math.abs(s)**power*rx,y,cz+Math.sign(c)*Math.abs(c)**power*rz);uv.push(i/segments,j/(rings.length-1));}}
 for(let j=0;j<rings.length-1;j++)for(let i=0;i<segments;i++){const a=j*(segments+1)+i,b=a+segments+1;indices.push(a,a+1,b,a+1,b+1,b);}
 const bottom=p.length/3;p.push(rings[0][4]||0,rings[0][0],rings[0][3]||0);uv.push(.5,0);const top=p.length/3,last=rings.at(-1);p.push(last[4]||0,last[0],last[3]||0);uv.push(.5,1);
 for(let i=0;i<segments;i++){indices.push(bottom,i+1,i);const a=(rings.length-1)*(segments+1)+i;indices.push(top,a,a+1);}
 if(rings.at(-1)[0]<rings[0][0])for(let i=0;i<indices.length;i+=3){const v=indices[i+1];indices[i+1]=indices[i+2];indices[i+2]=v;}
 const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(p,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geo.setIndex(indices);geo.computeVertexNormals();return geo;
 });}

function cloth(color){const key='cloth:'+color;if(materials.has(key))return materials.get(key);const c=document.createElement('canvas');c.width=c.height=64;const ctx=c.getContext('2d');ctx.fillStyle='#f1f3f0';ctx.fillRect(0,0,64,64);ctx.strokeStyle='#dfe6df';ctx.lineWidth=1;for(let n=0;n<64;n+=4){ctx.beginPath();ctx.moveTo(n,0);ctx.lineTo(n,64);ctx.stroke();}ctx.strokeStyle='#fff';for(let n=0;n<64;n+=4){ctx.beginPath();ctx.moveTo(0,n);ctx.lineTo(64,n);ctx.stroke();}const tx=new T.CanvasTexture(c);tx.colorSpace=T.SRGBColorSpace;tx.wrapS=tx.wrapT=T.RepeatWrapping;tx.repeat.set(4,5);const m=new T.MeshStandardMaterial({color,map:tx,roughness:.82});materials.set(key,m);return m;}
function chestMark(parent,text,x,y,z,size=.25){const key='mark:'+text;let m=materials.get(key);if(!m){const c=document.createElement('canvas');c.width=c.height=256;const ctx=c.getContext('2d');ctx.clearRect(0,0,256,256);ctx.fillStyle='#fff5dd';ctx.font='900 146px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,128,138);ctx.font='800 24px Arial';ctx.fillText('NEIGHBORHOOD',128,232);const tx=new T.CanvasTexture(c);tx.colorSpace=T.SRGBColorSpace;m=new T.MeshStandardMaterial({map:tx,transparent:true,roughness:.88,depthWrite:false});materials.set(key,m);}const o=part(parent,new T.PlaneGeometry(size,size),m,[x,y,z]);o.castShadow=false;return o;}

function hairShape(parent,style){const hairColor=style==='bacon'?0x714630:style==='pink'||style==='pizza'?0x593946:style==='doge'?0x737d90:0x202936,hair=material(hairColor,.75),edge=material(hairColor,.79);
 const rings=[[-.09,.397,.31,-.035],[.06,.425,.357,-.035],[.25,.43,.36,-.03],[.39,.37,.30,-.04],[.47,.22,.20,-.05],[.49,.02,.02,-.05]];
 const shell=surface('hair-cap-r12',rings,.64,32).clone();const a=shell.attributes.position;
 // Raise the front hairline while keeping the nape close to the skull.
 for(let i=0;i<a.count;i++){const z=a.getZ(i);if(a.getY(i)<.10&&z>.10){a.setY(i,a.getY(i)+.24*T.MathUtils.smoothstep(z,.1,.28));}}
 shell.computeVertexNormals();part(parent,shell,hair);
 const locks=[
  [[-.35,.24,.255],[-.21,.40,.345],[.00,.39,.382],[.18,.26,.39]],
  [[-.24,.35,.28],[-.06,.49,.335],[.18,.43,.345],[.31,.29,.29]],
  [[-.10,.41,.19],[.09,.49,.25],[.31,.40,.24],[.39,.24,.17]]
 ];
 locks.forEach((pts,i)=>{const curve=new T.CatmullRomCurve3(pts.map(p=>new T.Vector3(...p)));const verts=[],uv=[],idx=[];const rings=20,sides=12;for(let j=0;j<=rings;j++){const t=j/rings,p=curve.getPoint(t),tangent=curve.getTangent(t).normalize(),b=new T.Vector3(0,0,1).cross(tangent).normalize(),n=new T.Vector3().crossVectors(tangent,b).normalize();const r=(.073+.021*i)*Math.sin(Math.PI*(.08+t*.88))**.5;for(let k=0;k<=sides;k++){const angle=k/sides*Math.PI*2,v=p.clone().addScaledVector(b,Math.cos(angle)*r).addScaledVector(n,Math.sin(angle)*r*.48);verts.push(v.x,v.y,v.z);uv.push(k/sides,t);if(j<rings&&k<sides){const a=j*(sides+1)+k,c=a+sides+1;idx.push(a,a+1,c,a+1,c+1,c);}}}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(verts,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();part(parent,g,i===1?edge:hair);});
 if(style==='bacon')for(let i=0;i<11;i++){const angle=i*2.4;oval(parent,hair,[Math.sin(angle)*(.20+.12*(i%2)),.39+(i%3)*.035,Math.cos(angle)*.23],[.135,.11,.125]);}
 if(style==='pink'||style==='pizza'){oval(parent,hair,[.12,.26,-.40],[.20,.20,.18]);const tail=oval(parent,hair,[.16,-.02,-.48],[.15,.31,.14]);tail.rotation.x=-.25;round(parent,.19,.075,.13,material(0xeea254),[.14,.19,-.49],.03);}
 if(style==='doge'){oval(parent,hair,[0,.43,-.24],[.22,.19,.20]);round(parent,.74,.08,.05,material(0xedc76a),[0,.21,.355],.025);}
 if(style==='noob'){const visor=round(parent,.82,.09,.26,material(0xf0bd45),[0,.27,.38],.045);visor.rotation.x=.08;line(parent,[[-.40,.26,.22],[-.42,.26,-.12],[0,.26,-.37],[.42,.26,-.12],[.40,.26,.22]],.045,material(0xf0bd45));}
 if(style==='shrek'){const band=part(parent,new T.TorusGeometry(.388,.038,6,36),material(0xffe5ab),[0,.24,0],[1,.91,1]);band.rotation.x=Math.PI/2;}
 for(const side of[-1,1]){const sideburn=round(parent,.065,.16,.13,hair,[side*.385,-.045,-.01],.029);sideburn.rotation.z=side*.10;}
}

function faceRig(head,skin){const eyeNodes=[],brows=[],ink=material(0x27303a,.62),white=material(0xfffcf2,.32),iris=material(0x584036,.42),pupil=material(0x1b212b,.35),shine=material(0xffffff,.12);
 for(const side of[-1,1]){const e=node(head,[side*.166,.035,.333]);oval(e,white,[0,0,0],[.108,.129,.049]);oval(e,iris,[.005,-.006,.048],[.061,.088,.022]);oval(e,pupil,[.009,-.005,.066],[.043,.064,.014]);oval(e,shine,[-.009,.032,.079],[.017,.024,.009]);oval(e,shine,[.027,-.034,.078],[.007,.009,.006]);eyeNodes.push(e);
  const brow=node(head,[side*.172,.218,.336]);line(brow,[[-.094,-.012,-.008],[-.01,.018,.008],[.088,.005,-.008]],.025,ink);brows.push({g:brow,side});
  oval(head,material(0xeaa18b,.90),[side*.274,-.127,.317],[.056,.027,.010]);
 }
 // A small bridge and rounded tip keep the nose readable from the side.
 oval(head,skin,[0,-.067,.356],[.046,.087,.047]);oval(head,skin,[0,-.105,.396],[.066,.046,.062]);
 const mouth=node(head,[0,-.228,.342]),closed=node(mouth),opened=node(mouth),sad=node(mouth),red=material(0x713e37,.73);
 line(closed,[[-.115,.030,-.006],[-.058,-.012,.012],[.017,-.022,.018],[.087,.006,.005],[.127,.047,-.012]],.013,red);
 oval(opened,material(0x623439,.85),[0,.003,.009],[.132,.083,.017]);round(opened,.175,.031,.018,white,[0,.042,.025],.008);oval(opened,material(0xe58080,.70),[.005,-.041,.026],[.076,.023,.011]);
 line(sad,[[-.112,-.015,-.005],[0,.037,.014],[.112,-.015,-.005]],.013,red);
 opened.visible=sad.visible=false;let target='smile';
 return {g:mouth,set(v){target=v;},update(dt,time,phase,acting={}){const b=1-Math.exp(-dt*21),blink=(Math.sin(time*1.1+phase)>.9985)||target==='blink',squint=target==='strain'?.22:target==='win'?.55:blink?.07:target==='eat'||target==='chew'?.86:1;eyeNodes.forEach(e=>{e.scale.y=T.MathUtils.lerp(e.scale.y,squint,b);});brows.forEach(({g,side})=>{const z=target==='strain'?side*.20:target==='sad'?-side*.20:target==='win'?-side*.12:0;g.rotation.z=T.MathUtils.lerp(g.rotation.z,z,b);g.position.y=T.MathUtils.lerp(g.position.y,target==='surprise'?.27:.218,b);});const open=['eat','surprise','strain','win'].includes(target);closed.visible=!open&&target!=='sad';opened.visible=open;sad.visible=target==='sad';mouth.scale.x=T.MathUtils.lerp(mouth.scale.x,1+Math.sin(time*24)*.10*(acting.chew||0),b);mouth.scale.y=T.MathUtils.lerp(mouth.scale.y,1+Math.cos(time*24)*.12*(acting.chew||0),b);opened.scale.x=T.MathUtils.lerp(opened.scale.x,target==='surprise'?.57:target==='win'?1.17:1,b);opened.scale.y=T.MathUtils.lerp(opened.scale.y,target==='surprise'?1.25:target==='eat'?.78:1,b);}};
}

// Fit each held food to the mouth once, keeping the hand/prop transform fixed.
// The resulting joint pose is blended along the authored eating beat at runtime.
function foodContactPose(body,head,arm,food){
 body.updateWorldMatrix(true,true);
 // A top/rear surface point makes each food touch with its own silhouette.
 const rayStart=food.localToWorld(new T.Vector3(0,2.0,-.6)),center=food.getWorldPosition(new T.Vector3()),hits=new T.Raycaster(rayStart,center.clone().sub(rayStart).normalize()).intersectObject(food,true);
 const anchor=hits.length?food.worldToLocal(hits[0].point.clone()):new T.Vector3(0,.30,-.10);
 const gripOffset=arm.hand.worldToLocal(food.localToWorld(anchor.clone()));
 const target=new T.Vector3(.025,head.position.y-.228*head.scale.y,.38*head.scale.z).sub(gripOffset),upper=arm.elbow.position.length(),lower=arm.hand.position.length();
 const direction=target.sub(arm.shoulder.position),distance=T.MathUtils.clamp(direction.length(),Math.abs(upper-lower)+.005,upper+lower-.005);direction.normalize();
 const along=(upper*upper-lower*lower+distance*distance)/(2*distance),height=Math.sqrt(Math.max(0,upper*upper-along*along));
 const bend=new T.Vector3(1,-.35,.08);bend.addScaledVector(direction,-bend.dot(direction)).normalize();
 const elbow=direction.clone().multiplyScalar(along).addScaledVector(bend,height),upperDir=elbow.clone().normalize();
 const foreDir=direction.clone().multiplyScalar(distance).sub(elbow).normalize(),z=foreDir.clone().addScaledVector(upperDir,-foreDir.dot(upperDir)).normalize(),y=upperDir.clone().negate(),x=new T.Vector3().crossVectors(y,z).normalize();z.crossVectors(x,y).normalize();
 const rotation=new T.Euler().setFromRotationMatrix(new T.Matrix4().makeBasis(x,y,z),'XYZ');
 const bendAngle=Math.acos(T.MathUtils.clamp((distance*distance-upper*upper-lower*lower)/(2*upper*lower),-1,1));
 return {sx:rotation.x,sy:rotation.y,sz:rotation.z,ex:Math.atan2(arm.hand.position.z,-arm.hand.position.y)-bendAngle};
}

// Merge only meshes directly attached to the same joint and material; every
// animated eye, hand, shoulder and knee retains its independent transform.
function batchJoint(g){for(const child of [...g.children])if(child.isGroup)batchJoint(child);const byMat=new Map();for(const m of g.children)if(m.isMesh&&!m.isSkinnedMesh&&!Array.isArray(m.material)){if(!byMat.has(m.material))byMat.set(m.material,[]);byMat.get(m.material).push(m);}for(const [mat,objects]of byMat){if(objects.length<2)continue;const geos=objects.map(o=>{o.updateMatrix();let geo=o.geometry.clone();if(geo.index)geo=geo.toNonIndexed();geo.applyMatrix4(o.matrix);return geo;});const geometry=mergeGeometries(geos,false);if(!geometry)continue;for(const o of objects)g.remove(o);part(g,geometry,mat);geos.forEach(x=>x.dispose());}}

export function makeAthlete(style='suit',label='',factories){
 const palette={suit:[0x288f9d,0x243c54,0xefb48f],bacon:[0xd77c45,0x304d64,0xe6ae85],noob:[0xd0ac42,0x345668,0xe7ae86],pink:[0xc16d8d,0x45455d,0xecb99b],mint:[0x48a395,0x2a485a,0xc98f6e],pizza:[0xb76076,0x3f4e67,0xe8b99b],doge:[0x8a7caa,0x3c4b66,0xd9a080],shrek:[0x527481,0x2e4355,0xd9a080]};
 const [shirtColor,pantsColor,skinColor]=palette[style]||palette.suit,shirt=cloth(shirtColor),pants=cloth(pantsColor),skin=material(skinColor,.72),cream=material(0xf7e9cd,.77),accent=material(0xedb362,.69),navy=material(0x20374e,.76),sole=material(0xf8f1de,.63),metal=material(0xd7dad1,.4);
 const root=node(),pivot=node(root),body=node(pivot),torsoPivot=node(body,[0,2.2,0]),torso=node(torsoPivot,[0,-2.2,0]);root.name='CommunityAthlete-r18';
 const jacket=part(torso,surface('jacket-r16',[[1.46,.377,.245],[1.51,.406,.265],[1.56,.425,.28],[1.74,.412,.27],[2.02,.435,.28],[2.30,.462,.285],[2.46,.444,.255],[2.56,.34,.22],[2.64,.20,.15]],.72),shirt);jacket.name='Tailored_Jacket';
 // A curved fabric cuff replaces the projecting rectangular waist plates.
 const hemShade=material(new T.Color(shirtColor).multiplyScalar(.84).getHex(),.88);
 const hem=part(torso,surface('jacket-hem-r16',[[1.455,.377,.245],[1.48,.390,.253],[1.515,.409,.267]],.72),hemShade);hem.name='Contoured_Jacket_Hem';
 const pelvis=part(body,surface('pants-seat-r16',[[1.25,.30,.195],[1.34,.375,.232],[1.46,.400,.247],[1.57,.378,.235],[1.63,.350,.215]],.68),pants);pelvis.name='Connected_Pants_Waist';
 // Inset tee, layered collar, zip tape and welt pockets sit on the jacket surface.
 const tee=round(torso,.24,.24,.035,cream,[0,2.50,.228],.035);
 for(const side of[-1,1]){const collar=round(torso,.14,.22,.075,navy,[side*.171,2.575,.181],.04);collar.rotation.z=-side*.34;const piping=line(torso,[[side*.22,2.60,.19],[side*.29,2.48,.235],[side*.38,2.39,.215]],.015,cream);const pocket=round(torso,.235,.037,.035,navy,[side*.265,1.806,.283],.012);pocket.rotation.z=-side*.19;const lip=round(torso,.235,.012,.042,cream,[side*.265,1.831,.293],.006);lip.rotation.z=-side*.19;}
 round(torso,.048,.915,.026,navy,[0,2.04,.294],.008);line(torso,[[0,1.61,.312],[0,2.44,.312]],.0075,metal);round(torso,.044,.073,.026,metal,[0,2.365,.322],.009);round(torso,.015,.032,.015,navy,[0,2.368,.339],.005);
 const bib=style==='suit'?'07':style==='pink'?'03':style==='shrek'?'88':'12';chestMark(torso,bib,.252,2.24,.300,.29);const back=chestMark(torso,bib,0,2.13,-.290,.59);back.rotation.y=Math.PI;
 for(const side of[-1,1])line(torso,[[side*.38,1.67,-.17],[side*.405,1.94,-.19],[side*.43,2.23,-.17]],.008,navy);
 oval(torso,skin,[0,2.72,0],[.156,.17,.145]);
 const head=node(torso,[0,3.08,0]);part(head,surface('head-r12',[[-.416,.12,.15,-.012],[-.389,.25,.245,-.005],[-.31,.345,.309],[-.14,.398,.341],[.10,.407,.350,-.012],[.29,.38,.320,-.021],[.38,.29,.25,-.027],[.414,.10,.11,-.033]],.62,36),skin);
 for(const side of[-1,1]){oval(head,skin,[side*.403,-.048,-.002],[.089,.133,.079]);oval(head,material(0xd98e78,.86),[side*.459,-.044,.040],[.024,.074,.024]);}
 head.scale.setScalar(1.045);const hair=node(head);hairShape(hair,style);const face=faceRig(head,skin);
 if(style==='shrek'){for(const side of[-1,1]){const m=oval(head,material(0x32303a,.85),[side*.07,-.178,.36],[.085,.025,.019]);m.rotation.z=side*.18;}}
 const arms=[],legs=[];
 for(const side of[-1,1]){
  const shoulder=node(torso,[side*.555,2.48,0]);part(shoulder,surface('upper-sleeve-r14',[[.063,.08,.12],[.025,.143,.173],[-.08,.174,.194],[-.28,.169,.185],[-.48,.155,.165],[-.59,.148,.158]],.79,20),shirt);
  const stripe=round(shoulder,.028,.29,.018,cream,[side*.095,-.235,.181],.009);stripe.rotation.z=-side*.13;
  const elbow=node(shoulder,[0,-.595,0]);part(elbow,surface('fore-sleeve-r14',[[.035,.148,.158],[-.06,.153,.169],[-.26,.15,.163],[-.46,.132,.14],[-.53,.129,.135]],.78,20),shirt);
  round(elbow,.282,.088,.294,navy,[0,-.485,0],.04);round(elbow,.285,.020,.296,cream,[0,-.463,.002],.009);
  const hand=node(elbow,[0,-.605,.005]);part(hand,surface('palm-r12',[[.055,.078,.071],[.02,.114,.090],[-.073,.127,.099],[-.126,.102,.090]],.67,20),skin);
  for(let j=0;j<4;j++){const finger=oval(hand,skin,[(j-1.5)*.054,-.143-(j===0||j===3?-.012:.007),.010],[.031,.056,.073]);}
  const thumb=oval(hand,skin,[-side*.127,-.055,.060],[.053,.086,.053]);thumb.rotation.z=-side*.38;arms.push({shoulder,elbow,hand,side});
  const hip=node(body,[side*.225,1.49,0]);part(hip,surface('upper-pants-r12',[[.055,.185,.205],[-.04,.218,.232],[-.26,.216,.228],[-.47,.190,.206],[-.66,.174,.187]],.52,24),pants);line(hip,[[side*.19,-.11,-.04],[side*.19,-.40,-.02],[side*.163,-.57,0]],.012,shirt);
  const knee=node(hip,[0,-.67,0]);part(knee,surface('lower-pants-r12',[[.045,.172,.185],[-.07,.177,.189],[-.29,.162,.17],[-.51,.145,.15],[-.59,.144,.148]],.56,24),pants);round(knee,.304,.10,.314,navy,[0,-.535,.003],.025);
  const shoe=node(knee,[0,-.778,0]),footModel=node(shoe,[side*.035,0,0]);part(footModel,surface('shoe-sole-r12',[[0,.22,.355,.09],[.025,.242,.385,.095],[.087,.241,.383,.095],[.105,.222,.365,.095]],.62,28),sole);part(footModel,surface('shoe-upper-r12',[[.089,.219,.356,.08],[.13,.222,.348,.08],[.21,.207,.292,.035],[.29,.164,.213,-.04],[.33,.139,.165,-.065]],.65,28),navy);
  const toe=oval(footModel,cream,[0,.149,.326],[.197,.070,.105]);const vamp=round(footModel,.276,.045,.214,shirt,[0,.241,.13],.035);vamp.rotation.x=.33;
  for(const s of[-1,1]){const panel=round(footModel,.030,.098,.265,shirt,[s*.213,.153,.008],.018);panel.rotation.x=-.09;const slash=round(footModel,.038,.032,.17,cream,[s*.231,.18,.10],.012);slash.rotation.x=-.36;}
  round(footModel,.22,.095,.038,cream,[0,.213,-.272],.025);round(footModel,.067,.12,.046,accent,[0,.294,-.228],.02);
  for(let j=0;j<3;j++)line(footModel,[[-.103,.263-j*.019,.05+j*.066],[0,.281-j*.021,.065+j*.066],[.103,.263-j*.019,.05+j*.066]],.009,cream);
  legs.push({hip,knee,shoe,side,previousPhase:null});
 }
 batchJoint(body);
 const hold=node(arms[1].hand,[0,-.048,.213]);hold.rotation.set(.19,0,.08);
 const equip=node(root),shadow=part(root,new T.CircleGeometry(.72,32),new T.MeshBasicMaterial({color:0x294b39,transparent:true,opacity:.13,depthWrite:false}),[0,.026,0]);shadow.rotation.x=-Math.PI/2;shadow.castShadow=false;
 const name=label?factories.textSprite(label,{scale:2.3,size:40,width:512,height:100}):null;if(name){root.add(name);name.position.y=4.08;}
 const wristGoal=new T.Quaternion();
 let currentFood='',currentToilet='',lastFace='',bitePose={sx:-.7,sy:0,sz:-.9,ex:-1.5};
 const actor={root,pivot,body,torso,torsoPivot,head,arms,legs,hold,equip,face,shadow,name,style,step:Math.random()*5,phase:Math.random()*7,motion:0,contactCount:0,food:null,toilet:null,
  setGear(food,toilet){if(currentFood!==food){hold.clear();this.food=factories.makeFood(food);hold.add(this.food);this.food.scale.setScalar(.80);bitePose=foodContactPose(torso,head,arms[1],this.food);currentFood=food;}if(currentToilet!==toilet){equip.clear();this.toilet=factories.makeToilet(toilet);equip.add(this.toilet);currentToilet=toilet;}},
  update(dt,time,opts={}){
   const seated=opts.seated??currentToilet!=='none',fly=opts.fly||0,moving=T.MathUtils.clamp(opts.moving||0,0,1),eat=opts.eat||0,cheer=opts.cheer||0,anticipation=opts.anticipation||0,landing=opts.landing||0,launch=opts.launch||0,boost=opts.boost||0;
   const b=1-Math.exp(-dt*(launch>.1||landing>.01?32:20)),speed=opts.speed??moving*4.4;this.motion=T.MathUtils.lerp(this.motion,moving,b);
   this.step+=dt*speed/(RUN_CYCLE_DISTANCE*Math.max(.35,this.motion))*Math.PI*2;const step=this.step,weight=this.motion;
   // Rotate around the pelvis, so the chest dives forward while the knees trail behind.
   pivot.rotation.x=T.MathUtils.lerp(pivot.rotation.x,fly*(1.30+launch*.07+boost*.055),b);pivot.rotation.z=T.MathUtils.lerp(pivot.rotation.z,fly*(-.09+Math.sin(time*2)*.018),b);
   const rx=pivot.rotation.x,rz=pivot.rotation.z,hipAnchor=1.49;
   pivot.position.x=Math.sin(rz)*hipAnchor;pivot.position.z=-Math.sin(rx)*Math.cos(rz)*hipAnchor;
   const hingeY=(1-Math.cos(rx)*Math.cos(rz))*hipAnchor;pivot.position.y=seated&&fly<.05?T.MathUtils.lerp(pivot.position.y,-.37,b):hingeY;
   let hipLimit=0;for(const l of legs){const f=footPath(step/(Math.PI*2)+(l.side===1?.5:0),weight),reach=l.knee.position.length()+l.shoe.position.length()-.006;hipLimit=Math.min(hipLimit,Math.sqrt(Math.max(.01,reach*reach-f.z*f.z))+f.y-l.hip.position.y-(seated?-.37:0));}const bodyTarget=T.MathUtils.lerp(hipLimit-.23*anticipation-.48*landing,0,fly);body.position.y=T.MathUtils.lerp(body.position.y,bodyTarget,b);if(!seated&&fly<.02)body.position.y=Math.min(body.position.y,hipLimit);body.rotation.z=0;body.rotation.y=Math.sin(step)*weight*.035;
   torsoPivot.rotation.x=T.MathUtils.lerp(torsoPivot.rotation.x,.13*weight+.22*anticipation+.38*landing-.08*launch+fly*.08,b);
   torsoPivot.rotation.z=Math.sin(step)*weight*.018;torsoPivot.rotation.y=-Math.sin(step)*weight*.060;torsoPivot.scale.set(1+anticipation*.025+landing*.040-boost*.045,1-anticipation*.045-landing*.085+launch*.12+boost*.075,1+landing*.025-boost*.025);
   equip.visible=seated&&fly<.08;shadow.visible=fly<.1&&(opts.airborneHeight??0)<.15;shadow.scale.setScalar(1-.2*fly);head.rotation.x=Math.sin(time*2)*.010+eat*.025-.025*weight-fly*.30;head.rotation.y=Math.sin(time*.7+this.phase)*.023;
   for(const a of arms){const right=a.side===1,walk=Math.sin(step+(right?Math.PI:0))*.62*weight;const holding=right&&this.food?.visible;let sy=0,sx=holding?-.31+walk*.16:walk-.12*weight,ex=holding?-.88:-.12-.48*weight,sz=holding?-.07:a.side*-.065;
    if(eat&&right){sx=T.MathUtils.lerp(sx,bitePose.sx,eat);sy=bitePose.sy*eat;ex=T.MathUtils.lerp(ex,bitePose.ex,eat);sz=T.MathUtils.lerp(sz,bitePose.sz,eat);}
    sx=T.MathUtils.lerp(sx,right?-.50:-.18,fly);sz=T.MathUtils.lerp(sz,right?.65:-.90,fly);ex=T.MathUtils.lerp(ex,right?-1.05:-.30,fly);sy*=1-fly;
    if(anticipation){sx=T.MathUtils.lerp(sx,right?-.5:-.3,anticipation);ex=T.MathUtils.lerp(ex,right?-1:-.4,anticipation);}if(landing){sx=T.MathUtils.lerp(sx,-.75,landing);sz=T.MathUtils.lerp(sz,a.side*.45,landing);ex=T.MathUtils.lerp(ex,-.60,landing);}
    if(opts.wave&&!right){sz=-2.18;sx=-.25;ex=-.75+Math.sin(time*8)*.15;a.hand.rotation.z=Math.sin(time*10)*.15;}if(cheer){sz=T.MathUtils.lerp(sz,a.side*2.45,cheer);sx=-.12;ex=-.25;}
    const response=1-Math.exp(-dt*(eat?30:launch>.1?34:20));a.shoulder.rotation.x=T.MathUtils.lerp(a.shoulder.rotation.x,sx,response);a.shoulder.rotation.y=T.MathUtils.lerp(a.shoulder.rotation.y,sy,response);a.shoulder.rotation.z=T.MathUtils.lerp(a.shoulder.rotation.z,sz,response);a.elbow.rotation.x=T.MathUtils.lerp(a.elbow.rotation.x,ex,response);
    if(right){wristGoal.multiplyQuaternions(a.shoulder.quaternion,a.elbow.quaternion).invert();a.hand.quaternion.identity().slerp(wristGoal,fly||anticipation?0:eat);}else if(!opts.wave)a.hand.rotation.z=T.MathUtils.lerp(a.hand.rotation.z,0,response);
   }
   for(const l of legs){const phase=((step/(Math.PI*2)+(l.side===1?.5:0))%1+1)%1,foot=footPath(phase,weight),hipHeight=l.hip.position.y+body.position.y+(seated?-.37:0);
    let pose=solveLeg(hipHeight,foot.z,foot.y),hx=pose.hip,kx=pose.knee;
    if(seated){hx=-1.42;kx=1.38;}hx=T.MathUtils.lerp(hx,l.side>0?-.10:.08,fly);kx=T.MathUtils.lerp(kx,(l.side>0?.70:.98)+Math.sin(time*5+l.side)*(.025+boost*.04),fly);
    l.hip.rotation.x=hx;l.knee.rotation.x=kx;l.shoe.rotation.x=seated?0:T.MathUtils.lerp(-(hx+kx)+foot.tilt,-(pivot.rotation.x+hx+kx)*.80,fly);
    if(!seated&&fly<.1&&weight>.25&&l.previousPhase!==null&&phase<l.previousPhase)this.contactCount++;l.previousPhase=phase;
   }
   const expression=cheer?'win':anticipation>.3||boost>.4?'strain':landing>.3?'strain':fly>.3?'surprise':opts.sad?'sad':eat>.65&&!(opts.chew>.2)?'eat':opts.chew>.1?'chew':'smile';if(expression!==lastFace){face.set(expression);lastFace=expression;}face.update(dt,time,this.phase,opts);
   equip.traverse(o=>{if(o.userData.flame)o.scale.y=.7+.25*Math.sin(time*24+o.position.x);});
  }
 };actor.setGear('poop','none');return actor;
}
