import * as T from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {footPath,solveLeg,RUN_CYCLE_DISTANCE} from './motion.js';
import {foodContactPose} from './food-pose.js';
const materials=new Map();
const mat=c=>{if(!materials.has(c))materials.set(c,new T.MeshStandardMaterial({color:c,roughness:.8}));return materials.get(c);};
function group(parent,x=0,y=0,z=0){const g=new T.Group();g.position.set(x,y,z);parent?.add(g);return g;}
function box(p,w,h,d,c,x=0,y=0,z=0,r=.045){const m=new T.Mesh(new RoundedBoxGeometry(w,h,d,3,r),mat(c));m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;p.add(m);return m;}
function sphere(p,r,c,x,y,z){const m=new T.Mesh(new T.SphereGeometry(r,16,12),mat(c));m.position.set(x,y,z);m.castShadow=true;p.add(m);return m;}
export const growthAmount=power=>Math.min(1,Math.log10(1+Math.max(0,Number(power)||0)/10)/3);
export const growthLabel=p=>{const g=growthAmount(p);return g<.12?'初始':g<.38?'微胖':g<.72?'圆滚滚':'大肚王';};
export function makeFood(){const g=new T.Group();const bread=box(g,.43,.28,.42,0xe5aa55,0,0,0,.12);for(let i=0;i<3;i++){const cut=box(g,.045,.018,.22,0xffdea0,(i-1)*.11,.141,0,.008);cut.rotation.y=-.25;}return g;}
export function makeActor(style='suit',label=''){
 const color={suit:0x222b34,bacon:0x355a70,mint:0x36796a,pink:0x9c566a}[style]||0x222b34,skin=0xffefd1;
 const root=group(),pivot=group(root),body=group(pivot),torso=group(body),head=group(torso,0,3.01,0);
 root.name='BlockAthlete-R20';
 // A single continuous garment grows through belly and seat; there is no separate waist ring.
 const geometry=new T.BoxGeometry(.96,1.24,.58,16,30,12),positions=geometry.attributes.position;
 const v=new T.Vector3(),q=new T.Vector3();for(let i=0;i<positions.count;i++){v.fromBufferAttribute(positions,i);q.set(T.MathUtils.clamp(v.x,-.36,.36),T.MathUtils.clamp(v.y,-.50,.50),T.MathUtils.clamp(v.z,-.17,.17));v.sub(q).normalize().multiplyScalar(.12).add(q);positions.setXYZ(i,v.x,v.y,v.z);}geometry.computeVertexNormals();const base=positions.array.slice();
 const outfit=new T.Mesh(geometry,mat(color));outfit.position.y=2.0;outfit.castShadow=outfit.receiveShadow=true;torso.add(outfit);
 box(torso,.31,.19,.30,skin,0,2.68,0,.05);box(head,.81,.78,.72,skin,0,0,0,.115);
 const hair=group(head);box(hair,.84,.28,.75,0x171e28,0,.34,-.03,.075);box(hair,.83,.32,.18,0x171e28,0,.17,-.32,.05);
 for(let i=0;i<4;i++){const lock=box(hair,.23,.23,.23,0x171e28,(i-1.5)*.18,.30,.27,.045);lock.rotation.z=(i-1.5)*.08;}
 const eyes=[];for(const side of[-1,1]){const eye=group(head,side*.155,.015,.367);const dot=sphere(eye,.038,0x17202c,0,0,0);dot.scale.set(.8,1.4,.30);eyes.push(eye);}
 const mouth=group(head,0,-.15,.37),smile=new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3([new T.Vector3(-.115,.022,0),new T.Vector3(0,-.026,.006),new T.Vector3(.115,.022,0)]),16,.014,5,false),mat(0x34303a));mouth.add(smile);
 const surprised=sphere(mouth,.055,0x34303a,0,0,0);surprised.scale.set(.8,1.1,.22);surprised.visible=false;
 const arms=[],legs=[];
 for(const side of[-1,1]){
  const shoulder=group(torso,side*.61,2.46,0);box(shoulder,.30,.61,.35,color,0,-.255,0,.065);
  const elbow=group(shoulder,0,-.57,0);box(elbow,.28,.53,.32,color,0,-.235,0,.06);
  const hand=group(elbow,0,-.57,0);box(hand,.27,.27,.28,skin,0,-.07,.015,.055);arms.push({shoulder,elbow,hand,side});
  const hip=group(body,side*.245,1.49,0);box(hip,.40,.70,.44,color,0,-.28,0,.065);
  const knee=group(hip,0,-.67,0);box(knee,.37,.64,.40,color,0,-.26,0,.055);
  const shoe=group(knee,0,-.778,0);box(shoe,.40,.22,.62,0xf8f0df,0,.11,.075,.055);box(shoe,.35,.16,.43,0x26323b,0,.22,.015,.04);legs.push({hip,knee,shoe,side});
 }
 const hold=group(arms[1].hand,0,-.01,.23);hold.rotation.x=.10;const food=makeFood();food.scale.setScalar(.85);hold.add(food);
 const equip=group(root);equip.visible=false;let bitePose=foodContactPose(torso,head,arms[1],food),lastFit=-1,lastGrowth=-1;const wrist=new T.Quaternion();
 function reshape(g){for(let i=0;i<positions.count;i++){const j=i*3,x=base[j],y=base[j+1]+2,z=base[j+2],belly=Math.exp(-(((y-1.97)/.50)**2)),seat=Math.exp(-(((y-1.66)/.36)**2));positions.setXYZ(i,x+Math.sign(x)*g*.30*belly*Math.min(1,Math.abs(x)/.4),base[j+1],z+Math.sign(z)*g*(z>0?.40*belly:.43*seat)*Math.min(1,Math.abs(z)/.25));}positions.needsUpdate=true;geometry.computeVertexNormals();geometry.computeBoundingBox();geometry.computeBoundingSphere();for(const a of arms)a.shoulder.position.x=a.side*(.61+g*.12);for(const l of legs)l.hip.position.x=l.side*(.245+g*.13);lastGrowth=g;}
 const actor={root,pivot,body,torso,head,arms,legs,food,hold,equip,style,motion:0,growth:0,growthTarget:0,step:0,phase:Math.random()*5,
  setGear(){},setPower(power){this.growthTarget=growthAmount(power);},
  update(dt,time,o={}){
   const moving=o.moving||0,fly=o.fly||0,land=o.landing||0,eat=o.eat||0,launch=o.launch||0,cheer=o.cheer||0,b=1-Math.exp(-dt*17);
   this.growth=T.MathUtils.lerp(this.growth,this.growthTarget,1-Math.exp(-dt*7));if(Math.abs(this.growth-lastGrowth)>.001){reshape(this.growth);if(Math.abs(this.growth-lastFit)>.025){bitePose=foodContactPose(torso,head,arms[1],food);lastFit=this.growth;}}
   this.motion=T.MathUtils.lerp(this.motion,moving,b);const weight=this.motion;this.step+=dt*(o.speed??moving*4.4)/Math.max(.35,weight)/RUN_CYCLE_DISTANCE*Math.PI*2;const step=this.step;
   let hipLimit=0;for(const l of legs){const f=footPath(step/(Math.PI*2)+(l.side===1?.5:0),weight);hipLimit=Math.min(hipLimit,Math.sqrt(Math.max(.01,1.442**2-f.z*f.z))+f.y-1.49);}
   const crouch=hipLimit-.035*(.5-.5*Math.cos(step*2))*weight-.40*land-.16*(o.anticipation||0);body.position.y=T.MathUtils.lerp(body.position.y,T.MathUtils.lerp(crouch,0,fly),b);
   pivot.rotation.x=T.MathUtils.lerp(pivot.rotation.x,fly*(1.19+launch*.08),b);pivot.rotation.z=fly*Math.sin(time*2.5)*.035;const rx=pivot.rotation.x,rz=pivot.rotation.z;pivot.position.set(Math.sin(rz)*1.49,(1-Math.cos(rx)*Math.cos(rz))*1.49,-Math.sin(rx)*Math.cos(rz)*1.49);
   body.rotation.y=Math.sin(step)*weight*.055;torso.rotation.y=-Math.sin(step)*weight*.10;torso.rotation.z=Math.sin(step)*weight*.025;
   torso.rotation.x=.07*weight+.10*land-.025*eat;head.rotation.x=-fly*.25+eat*.075;head.rotation.y=Math.sin(step)*weight*.04+Math.sin(time*.65)*.025*(1-weight);
   const breath=1+Math.sin(time*2.4)*.003;outfit.scale.y=breath+launch*.05-land*.035;
   for(const a of arms){const right=a.side===1,wave=Math.sin(step+(right?Math.PI:0));let sx=right?-.27+wave*.19:wave*.55-.12*weight,sy=0,sz=a.side*(.055+this.growth*.18),ex=right?-.84:-.23-(.22+.20*Math.sin(step+.7))*weight;if(!right)sx*=weight;
    if(right&&eat){sx=T.MathUtils.lerp(sx,bitePose.sx,eat);sy=bitePose.sy*eat;sz=T.MathUtils.lerp(sz,bitePose.sz,eat);ex=T.MathUtils.lerp(ex,bitePose.ex,eat);}
    sx=T.MathUtils.lerp(sx,-.24,fly);sz=T.MathUtils.lerp(sz,a.side*.43,fly);ex=T.MathUtils.lerp(ex,right?-.9:-.35,fly);sx=T.MathUtils.lerp(sx,-.65,land);ex=T.MathUtils.lerp(ex,-.62,land);if(cheer){sz=T.MathUtils.lerp(sz,a.side*2.3,cheer);ex=-.4;}
    a.shoulder.rotation.x=T.MathUtils.lerp(a.shoulder.rotation.x,sx,b);a.shoulder.rotation.y=T.MathUtils.lerp(a.shoulder.rotation.y,sy,b);a.shoulder.rotation.z=T.MathUtils.lerp(a.shoulder.rotation.z,sz,b);a.elbow.rotation.x=T.MathUtils.lerp(a.elbow.rotation.x,ex,b);
    if(right){wrist.multiplyQuaternions(a.shoulder.quaternion,a.elbow.quaternion).invert();a.hand.quaternion.identity().slerp(wrist,eat*(1-fly));}
   }
   for(const l of legs){const f=footPath(step/(Math.PI*2)+(l.side===1?.5:0),weight),p=solveLeg(1.49+body.position.y,f.z,f.y);l.hip.rotation.x=T.MathUtils.lerp(p.hip,l.side>0?-.12:.10,fly);l.knee.rotation.x=T.MathUtils.lerp(p.knee,l.side>0?.72:1.03,fly);l.shoe.rotation.x=T.MathUtils.lerp(-(p.hip+p.knee)+f.tilt,-(pivot.rotation.x+l.hip.rotation.x+l.knee.rotation.x)*.8,fly);}
   const blink=Math.sin(time*1.3+this.phase)>.997;for(const e of eyes)e.scale.y=T.MathUtils.lerp(e.scale.y,blink?.12:land>.2?.6:1,b);smile.visible=fly<.25;surprised.visible=fly>=.25;mouth.scale.y=1+(o.chew||0)*Math.sin(time*25)*.14;equip.visible=false;
  }};return actor;
}
