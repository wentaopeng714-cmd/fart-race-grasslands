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
// Continuous cross-sections: the abdomen and seat inflate as volumes, with rounded
// undersides. All rings share a smooth surface instead of displacing box corners.
function profile(y,points){
 let i=0;while(i<points.length-2&&y>points[i+1][0])i++;const a=points[i],b=points[i+1],prev=points[Math.max(0,i-1)],next=points[Math.min(points.length-1,i+2)],d=b[0]-a[0],t=T.MathUtils.clamp((y-a[0])/d,0,1),m0=(b[1]-prev[1])/(b[0]-prev[0]),m1=(next[1]-a[1])/(next[0]-a[0]);return Math.max(0,(2*t**3-3*t*t+1)*a[1]+(t**3-2*t*t+t)*d*m0+(-2*t**3+3*t*t)*b[1]+(t**3-t*t)*d*m1);
}
const bellyProfile=[[1.31,0],[1.40,.36],[1.55,.61],[1.75,.76],[1.95,.80],[2.15,.74],[2.35,.59],[2.50,.39],[2.62,.22],[2.69,0]];
const seatProfile=[[1.31,0],[1.40,.34],[1.52,.54],[1.67,.65],[1.82,.65],[2.05,.53],[2.30,.36],[2.50,.28],[2.62,.17],[2.69,0]];
function garmentGeometry(){
 const sides=48,rings=40,vertices=new Float32Array((sides+1)*(rings+1)*3),indices=[];
 for(let i=0;i<rings;i++)for(let j=0;j<sides;j++){const a=i*(sides+1)+j,b=a+sides+1;indices.push(a,b,a+1,b,b+1,a+1);}
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.BufferAttribute(vertices,3));geometry.setIndex(indices);
 function shape(g){const position=geometry.attributes.position;
  for(let i=0;i<=rings;i++){const latitude=-Math.PI/2+Math.PI*i/rings,y=2+.69*Math.sin(latitude),edge=Math.max(0,Math.abs(y-2)-.50)/.19,cap=Math.sqrt(Math.max(0,1-edge*edge)),belly=Math.exp(-(((y-1.94)/.48)**2)),seat=Math.exp(-(((y-1.65)/.36)**2)),upper=Math.exp(-(((y-2.43)/.25)**2)),width=(.455+.025*upper+.32*g*belly)*cap,front=T.MathUtils.lerp(.28*cap,profile(y,bellyProfile),g),back=T.MathUtils.lerp(.28*cap,profile(y,seatProfile),g),power=.32+.55*g;
   for(let j=0;j<=sides;j++){const a=j/sides*Math.PI*2,c=Math.cos(a),s=Math.sin(a);position.setXYZ(i*(sides+1)+j,Math.sign(c)*Math.abs(c)**power*width,y-2,Math.sign(s)*Math.abs(s)**power*(s>=0?front:back));}
  }
  position.needsUpdate=true;geometry.computeVertexNormals();const normal=geometry.attributes.normal;
  for(let i=0;i<=rings;i++){const a=i*(sides+1),b=a+sides,x=normal.getX(a)+normal.getX(b),y=normal.getY(a)+normal.getY(b),z=normal.getZ(a)+normal.getZ(b),d=Math.hypot(x,y,z)||1;normal.setXYZ(a,x/d,y/d,z/d);normal.setXYZ(b,x/d,y/d,z/d);}
  normal.needsUpdate=true;geometry.computeBoundingBox();geometry.computeBoundingSphere();
 }
 shape(0);return {geometry,shape};
}
export function makeActor(style='suit',label=''){
 const color={suit:0x222b34,bacon:0x355a70,mint:0x36796a,pink:0x9c566a}[style]||0x222b34,skin=0xffefd1;
 const root=group(),pivot=group(root),body=group(pivot),torso=group(body),head=group(torso,0,3.01,0);
 root.name='BlockAthlete-R21';
 // A single continuous garment grows through belly and seat; there is no separate waist ring.
 const garment=garmentGeometry(),geometry=garment.geometry;
 const outfit=new T.Mesh(geometry,mat(color));outfit.position.y=2.0;outfit.castShadow=outfit.receiveShadow=true;torso.add(outfit);
 box(torso,.31,.19,.30,skin,0,2.68,0,.05);box(head,.81,.78,.72,skin,0,0,0,.115);
 const hair=group(head);box(hair,.84,.28,.75,0x171e28,0,.34,-.03,.075);box(hair,.83,.32,.18,0x171e28,0,.17,-.32,.05);
 for(let i=0;i<4;i++){const lock=box(hair,.23,.23,.23,0x171e28,(i-1.5)*.18,.30,.27,.045);lock.rotation.z=(i-1.5)*.08;}
 const eyes=[];for(const side of[-1,1]){const eye=group(head,side*.155,.015,.367);const dot=sphere(eye,.038,0x17202c,0,0,0);dot.scale.set(.8,1.4,.30);eyes.push(eye);}
 const mouth=group(head,0,-.15,.37),smile=new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3([new T.Vector3(-.115,.022,0),new T.Vector3(0,-.026,.006),new T.Vector3(.115,.022,0)]),16,.014,5,false),mat(0x34303a));mouth.add(smile);
 const surprised=sphere(mouth,.055,0x34303a,0,0,0);surprised.scale.set(.8,1.1,.22);surprised.visible=false;
 const arms=[],legs=[];
 for(const side of[-1,1]){
  const shoulder=group(torso,side*.58,2.45,0);sphere(shoulder,.185,color,0,0,0);box(shoulder,.32,.59,.35,color,0,-.255,0,.105);
  const elbow=group(shoulder,0,-.57,0);sphere(elbow,.157,color,0,0,0);box(elbow,.29,.51,.32,color,0,-.22,0,.095);
  const hand=group(elbow,0,-.50,0);sphere(hand,.115,skin,0,.005,0);box(hand,.27,.28,.29,skin,0,-.065,.015,.08);arms.push({shoulder,elbow,hand,side});
  const hip=group(body,side*.245,1.49,0);sphere(hip,.22,color,0,-.04,0);box(hip,.43,.68,.45,color,0,-.29,0,.105);
  const knee=group(hip,0,-.67,0);sphere(knee,.194,color,0,0,0);box(knee,.38,.66,.41,color,0,-.29,0,.10);
  const shoe=group(knee,0,-.778,0);box(shoe,.40,.22,.59,0xf8f0df,0,.11,.07,.07);box(shoe,.36,.22,.43,0x26323b,0,.24,.015,.085);legs.push({hip,knee,shoe,side});
 }
 const hold=group(arms[1].hand,0,-.01,.23);hold.rotation.x=.10;const food=makeFood();food.scale.setScalar(.85);hold.add(food);
 const equip=group(root);equip.visible=false;let bitePose=foodContactPose(torso,head,arms[1],food),lastFit=-1,lastGrowth=-1;const wrist=new T.Quaternion();
 function reshape(g){garment.shape(g);for(const a of arms){a.shoulder.position.x=a.side*(.58+g*.15);a.shoulder.position.z=-g*.025;}for(const l of legs)l.hip.position.x=l.side*(.245+g*.09);lastGrowth=g;}
 const actor={root,pivot,body,torso,head,arms,legs,food,hold,equip,outfit,style,motion:0,growth:0,growthTarget:0,step:0,phase:Math.random()*5,
  setGear(){},setPower(power){this.growthTarget=growthAmount(power);},
  update(dt,time,o={}){
   const moving=o.moving||0,fly=o.fly||0,land=o.landing||0,eat=o.eat||0,launch=o.launch||0,cheer=o.cheer||0,b=1-Math.exp(-dt*17);
   this.growth=T.MathUtils.lerp(this.growth,this.growthTarget,1-Math.exp(-dt*7));if(Math.abs(this.growth-lastGrowth)>.001){reshape(this.growth);if(Math.abs(this.growth-lastFit)>.025){bitePose=foodContactPose(torso,head,arms[1],food);lastFit=this.growth;}}
   this.motion=T.MathUtils.lerp(this.motion,moving,b);const weight=this.motion;this.step+=dt*(o.speed??moving*4.4)/Math.max(.35,weight)/RUN_CYCLE_DISTANCE*Math.PI*2;const step=this.step;
   let hipLimit=0;for(const l of legs){const f=footPath(step/(Math.PI*2)+(l.side===1?.5:0),weight);hipLimit=Math.min(hipLimit,Math.sqrt(Math.max(.01,1.442**2-f.z*f.z))+f.y-1.49);}
   const crouch=hipLimit-.035*(.5-.5*Math.cos(step*2))*weight-.40*land-.16*(o.anticipation||0);body.position.y=T.MathUtils.lerp(body.position.y,T.MathUtils.lerp(crouch,0,fly),b);
   const flightBlend=1-Math.exp(-dt*(fly>.3?34:20));pivot.rotation.x=T.MathUtils.lerp(pivot.rotation.x,fly*(1.34+launch*.10),flightBlend);pivot.rotation.z=fly*Math.sin(time*2.5)*.025;const rx=pivot.rotation.x,rz=pivot.rotation.z;pivot.position.set(Math.sin(rz)*1.49,(1-Math.cos(rx)*Math.cos(rz))*1.49,-Math.sin(rx)*Math.cos(rz)*1.49);
   body.rotation.y=Math.sin(step)*weight*.055;torso.rotation.y=-Math.sin(step)*weight*.10;torso.rotation.z=Math.sin(step)*weight*.025;
   torso.rotation.x=.07*weight+.10*land-.025*eat+.10*(o.anticipation||0);head.rotation.x=-fly*.72+eat*.075;head.rotation.y=Math.sin(step)*weight*.04+Math.sin(time*.65)*.025*(1-weight);
   const breath=1+Math.sin(time*2.4)*.003;outfit.scale.set(1+land*.035-launch*.018,breath+launch*.035-land*.045,1+land*.035-launch*.018);
   for(const a of arms){const right=a.side===1,wave=Math.sin(step+(right?Math.PI:0));let sx=right?-.27+wave*.19:wave*.55-.12*weight,sy=0,sz=a.side*(.055+this.growth*.18),ex=right?-.84:-.23-(.22+.20*Math.sin(step+.7))*weight;if(!right)sx*=weight;
    if(right&&eat){sx=T.MathUtils.lerp(sx,bitePose.sx,eat);sy=bitePose.sy*eat;sz=T.MathUtils.lerp(sz,bitePose.sz,eat);ex=T.MathUtils.lerp(ex,bitePose.ex,eat);}
    sx=T.MathUtils.lerp(sx,.30,fly);sz=T.MathUtils.lerp(sz,a.side*.24,fly);ex=T.MathUtils.lerp(ex,-.85,fly);sx=T.MathUtils.lerp(sx,-.65,land);ex=T.MathUtils.lerp(ex,-.62,land);if(cheer){sz=T.MathUtils.lerp(sz,a.side*2.3,cheer);ex=-.4;}
    a.shoulder.rotation.x=T.MathUtils.lerp(a.shoulder.rotation.x,sx,b);a.shoulder.rotation.y=T.MathUtils.lerp(a.shoulder.rotation.y,sy,b);a.shoulder.rotation.z=T.MathUtils.lerp(a.shoulder.rotation.z,sz,b);a.elbow.rotation.x=T.MathUtils.lerp(a.elbow.rotation.x,ex,b);
    if(right){wrist.multiplyQuaternions(a.shoulder.quaternion,a.elbow.quaternion).invert();a.hand.quaternion.identity().slerp(wrist,eat*(1-fly));}
   }
   for(const l of legs){const f=footPath(step/(Math.PI*2)+(l.side===1?.5:0),weight),p=solveLeg(1.49+body.position.y,f.z,f.y);l.hip.rotation.x=T.MathUtils.lerp(p.hip,l.side>0?-.47:-.35,fly);l.knee.rotation.x=T.MathUtils.lerp(p.knee,l.side>0?1.48:1.66,fly);l.shoe.rotation.x=T.MathUtils.lerp(-(p.hip+p.knee)+f.tilt,-.25,fly);}
   const blink=Math.sin(time*1.3+this.phase)>.997;for(const e of eyes)e.scale.y=T.MathUtils.lerp(e.scale.y,blink?.12:land>.2?.6:1,b);smile.visible=fly<.25;surprised.visible=fly>=.25;mouth.scale.y=1+(o.chew||0)*Math.sin(time*25)*.14;equip.visible=false;
  }};return actor;
}
