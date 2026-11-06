import * as T from 'three';

// Detached, world-space gas puffs. Nothing is stretched into a beam or tethered to the runner.
const CAPACITY=200,clamp=T.MathUtils.clamp;
export class JetEffects{
 constructor(scene){
  this.scene=scene;this.jets=new Map();this.cursor=0;this.live=0;this.transform=new T.Object3D();this.color=new T.Color();
  this.particles=Array.from({length:CAPACITY},()=>({position:new T.Vector3(),velocity:new T.Vector3(),born:-100,life:1,radius:1,growth:1,opacity:.74,vertical:.65,spin:0}));
  const geometry=new T.SphereGeometry(1,18,14);const vertices=geometry.attributes.position;for(let i=0;i<vertices.count;i++){const x=vertices.getX(i),y=vertices.getY(i),z=vertices.getZ(i),lobe=1+.09*Math.sin(4*x+2*z)*Math.cos(3*y)+.05*Math.sin(5*z-2*y);vertices.setXYZ(i,x*lobe,y*lobe,z*lobe);}geometry.computeVertexNormals();this.alpha=new T.InstancedBufferAttribute(new Float32Array(CAPACITY),1);geometry.setAttribute('gasAlpha',this.alpha);
  const material=new T.MeshStandardMaterial({color:0xffffff,roughness:1,metalness:0,transparent:true,opacity:1,depthWrite:false});
  material.onBeforeCompile=shader=>{shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nattribute float gasAlpha; varying float vGasAlpha;').replace('#include <begin_vertex>','#include <begin_vertex>\nvGasAlpha = gasAlpha;');shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying float vGasAlpha;').replace('#include <opaque_fragment>','float gasFace = abs(dot(normalize(normal), normalize(vViewPosition))); diffuseColor.a *= vGasAlpha * smoothstep(0.08, 0.5, gasFace);\n#include <opaque_fragment>');};material.customProgramCacheKey=()=> 'soft-pelvis-gas-r18';
  this.clouds=new T.InstancedMesh(geometry,material,CAPACITY);this.clouds.instanceMatrix.setUsage(T.DynamicDrawUsage);this.clouds.frustumCulled=false;this.clouds.castShadow=false;scene.add(this.clouds);
  this.transform.scale.setScalar(0);this.transform.updateMatrix();for(let i=0;i<CAPACITY;i++){this.clouds.setMatrixAt(i,this.transform.matrix);this.clouds.setColorAt(i,this.color.set(0xd5e2b2));}
  this.rings=Array.from({length:6},()=>{const mesh=new T.Mesh(new T.RingGeometry(.86,1,36),new T.MeshBasicMaterial({color:0xf0f4da,transparent:true,opacity:0,side:T.DoubleSide,depthWrite:false}));mesh.visible=false;scene.add(mesh);return {mesh,born:-100,life:.26};});this.ringCursor=0;
  this.linePos=new Float32Array(30*6);this.lines=new T.BufferGeometry();this.lines.setAttribute('position',new T.BufferAttribute(this.linePos,3).setUsage(T.DynamicDrawUsage));this.streaks=new T.LineSegments(this.lines,new T.LineBasicMaterial({color:0xf6f9e8,transparent:true,opacity:.28,depthWrite:false}));this.streaks.frustumCulled=false;this.streaks.visible=false;scene.add(this.streaks);
 }
 get(id){if(!this.jets.has(id))this.jets.set(id,{pending:0,continuationAt:-100,continuationDone:true,lastTrail:-100,wasActive:false,lastPosition:new T.Vector3(),lastTime:-100,emitCarry:0});return this.jets.get(id);}
 burst(id,t){const jet=this.get(id);jet.pending++;jet.burstAt=t;}
 particle(position,t,{radius=.55,life=.65,x=0,y=0,z=0,vx=0,vy=0,vz=0,growth=1.9,opacity=.74,vertical=.65,tint=0xdce7ba}={}){
  const index=this.cursor++%CAPACITY,p=this.particles[index];p.born=t;p.life=life;p.position.copy(position);p.position.x+=x;p.position.y+=y;p.position.z+=z;p.velocity.set(vx,vy,vz);p.radius=radius;p.growth=growth;p.opacity=opacity;p.vertical=vertical;p.spin=index*2.39996;this.clouds.setColorAt(index,this.color.set(tint));
 }
 blast(position,t,speed,scale=1){
  const inherit=Math.min(220,Math.max(0,speed))*.12;
  // A cauliflower-shaped central cloud plus smaller rolling lobes, all born in one short impulse.
  for(let i=0;i<34;i++){const angle=i*2.39996,spread=i<10?.26:.70,rnd=((i*31)%23)/23,side=Math.cos(angle),up=Math.sin(angle);this.particle(position,t,{radius:(i<10?.65:.36+rnd*.23)*scale,life:.60+rnd*.30,x:side*spread*scale,y:up*spread*.55*scale,z:-.2-rnd*.8,vx:side*(2+rnd*3.5)*scale,vy:up*(.8+rnd*.65)-1.1,vz:inherit-(10+rnd*8),growth:i<10?1.65:1.9,vertical:.9,opacity:.83,tint:[0xe5ebc8,0xccddb0,0xdce8c4,0xf1f0d8][i%4]});}
  const ring=this.rings[this.ringCursor++%this.rings.length];ring.born=t;ring.mesh.position.copy(position);ring.mesh.position.z-=.4;ring.mesh.rotation.set(0,0,0);
 }
 begin(t,dt){
  this.streaks.visible=false;let alive=0;
  for(let i=0;i<CAPACITY;i++){const p=this.particles[i],age=t-p.born,u=age/p.life;if(u<0||u>=1){this.alpha.setX(i,0);this.transform.scale.setScalar(0);}else{
    alive++;const drag=Math.exp(-dt*2.1);p.velocity.multiplyScalar(drag);p.velocity.y+=dt*.65;p.position.addScaledVector(p.velocity,dt);const swell=1+(1-Math.exp(-age*16))*p.growth,fade=1-T.MathUtils.smoothstep(u,.38,1),radius=p.radius*swell;this.transform.position.copy(p.position);this.transform.rotation.set(.12*Math.sin(age*9+p.spin),p.spin+age*.9,.13*Math.cos(age*8+p.spin));this.transform.scale.set(radius*(1+.10*Math.sin(p.spin+age*9)),radius*(p.vertical+.07*Math.cos(p.spin)),radius*.94);this.alpha.setX(i,fade*p.opacity);
   }this.transform.updateMatrix();this.clouds.setMatrixAt(i,this.transform.matrix);
  }
  this.clouds.visible=alive>0;this.live=alive;this.clouds.instanceMatrix.needsUpdate=true;this.clouds.instanceColor.needsUpdate=true;this.alpha.needsUpdate=true;
  for(const ring of this.rings){const u=(t-ring.born)/ring.life;ring.mesh.visible=u>=0&&u<1;if(ring.mesh.visible){ring.mesh.scale.set(1+u*4,1+u*3.2,1);ring.mesh.material.opacity=.34*(1-u);}}
 }
 update(id,position,t,active,main=false,speed=0){
  const jet=this.get(id);if(!active){jet.wasActive=false;jet.pending=0;jet.continuationDone=true;jet.lastTime=-100;jet.emitCarry=0;return;}
  if(jet.pending){this.blast(position,t,speed,main?1.15:.70);jet.pending=0;jet.continuationAt=t+.045;jet.continuationDone=false;jet.lastTrail=t;}
  if(!jet.continuationDone&&t>=jet.continuationAt){this.blast(position,t,speed,(main?.76:.5));jet.continuationDone=true;}
  // Keep gaps between soft lobes: use relative exhaust speed, not the render frame rate.
  const elapsed=jet.wasActive?t-jet.lastTime:1/60,dt=clamp(elapsed,1/240,.05),inherited=Math.min(220,Math.max(0,speed))*.25-9,rate=clamp((Math.max(0,speed)-inherited)/2,14,42);
  jet.emitCarry+=dt*rate;const count=Math.min(4,Math.floor(jet.emitCarry));jet.emitCarry-=count;
  if(!jet.wasActive||elapsed>.10)jet.lastPosition.copy(position);
  for(let i=0;i<count;i++){const u=(i+1)/count,phase=t*35+i*2.3,side=Math.sin(phase)*.15,rnd=(Math.sin(t*71+i*5.7)+1)/2,origin=this.transform.position.copy(jet.lastPosition).lerp(position,u);this.particle(origin,t,{radius:(main?.29:.18)+rnd*.12,life:.28+rnd*.10,x:side,y:0,z:-.10,vx:side*4,vy:-1.4+Math.cos(phase)*.3,vz:inherited,growth:1.65,opacity:.54+rnd*.10,vertical:.9+rnd*.20,tint:rnd>.45?0xd0dfb1:0xe4e8c6});}
  jet.lastPosition.copy(position);jet.lastTime=t;

  jet.wasActive=true;
 }
 land(position,t){for(let i=0;i<6;i++){const a=i*Math.PI/3;this.particle(position,t,{radius:.11,life:.28,x:Math.cos(a)*.35,y:.09,z:Math.sin(a)*.30,vx:Math.cos(a)*1.7,vy:.20,vz:Math.sin(a)*1.7,growth:1.45,opacity:.28,vertical:.65,tint:0xffefcc});}}
 view(camera){for(let i=0;i<CAPACITY;i++){const alpha=this.alpha.getX(i);if(alpha>0)this.alpha.setX(i,alpha*T.MathUtils.smoothstep(camera.position.distanceTo(this.particles[i].position),1.2,4.5));}this.alpha.needsUpdate=true;}
 speed(position,t,intensity){
  this.streaks.visible=intensity>.02;if(!this.streaks.visible)return;
  for(let i=0;i<30;i++){const side=i%2?-1:1,x=side*(2.8+(i*.731)%8),y=.5+(i*.823)%8,z=position.z+29-((t*(75+intensity*50)+i*2.91)%45),j=i*6;this.linePos[j]=position.x+x;this.linePos[j+1]=position.y+y;this.linePos[j+2]=z;this.linePos[j+3]=position.x+x;this.linePos[j+4]=position.y+y;this.linePos[j+5]=z-(1.3+(i%4)+intensity*2.4);}
  this.lines.attributes.position.needsUpdate=true;this.streaks.material.opacity=.12+intensity*.20;
 }
}
