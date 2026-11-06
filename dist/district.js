import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// Keep animated actors/canopies independent; batch authored static scenery.
export function batchScenery(root){
 root.updateWorldMatrix(true,true);const inverse=root.matrixWorld.clone().invert(),batches=new Map();
 function visit(g){if(g.userData.dynamic)return;for(const child of [...g.children])visit(child);if(!g.isMesh||Array.isArray(g.material)||g.material.transparent)return;
  const key=g.material.uuid+':'+Object.keys(g.geometry.attributes).sort().join(',')+':'+g.castShadow+':'+g.receiveShadow;
  if(!batches.has(key))batches.set(key,[]);batches.get(key).push(g);
 }
 visit(root);
 for(const objects of batches.values()){if(objects.length<2)continue;const geos=objects.map(o=>{let g=o.geometry.clone();if(g.index)g=g.toNonIndexed();g.applyMatrix4(new T.Matrix4().multiplyMatrices(inverse,o.matrixWorld));return g;}),merged=mergeGeometries(geos,false);if(!merged)continue;const first=objects[0],mesh=new T.Mesh(merged,first.material);mesh.castShadow=first.castShadow;mesh.receiveShadow=first.receiveShadow;root.add(mesh);objects.forEach(o=>o.removeFromParent());geos.forEach(g=>g.dispose());}
}

export function dressDistrict(lobby,k){
 const {group,box,ball,cylinder,mesh,mat,makeFood,makePet,fixedText}=k;
 const solids=[];
 const C={food:0xf0a247,rest:0x39bbaa,gear:0x5293d5,pets:0xb69bdd,race:0xe87563,cream:0xffedcc,ink:0x274c62};
 const paint=(color,layer)=>mat(color,.95,{polygonOffset:true,polygonOffsetFactor:-layer,polygonOffsetUnits:-layer});
 const deck=(x,z,w,d,c)=>{const m=mesh(new T.PlaneGeometry(w,d),paint(c,1),lobby,[x,.04,z]);m.rotation.x=-Math.PI/2;m.castShadow=false;return m;};
 const arrowShape=new T.Shape();arrowShape.moveTo(-.22,.12);arrowShape.lineTo(0,-.12);arrowShape.lineTo(.22,.12);arrowShape.lineTo(.16,.18);arrowShape.lineTo(0,.01);arrowShape.lineTo(-.16,.18);arrowShape.closePath();const arrowGeometry=new T.ShapeGeometry(arrowShape);
 function route(points,color){for(let j=1;j<points.length;j++){const [ax,az]=points[j-1],[bx,bz]=points[j],dx=bx-ax,dz=bz-az,length=Math.hypot(dx,dz),angle=Math.atan2(dx,dz),g=group(lobby,[(ax+bx)/2,.045,(az+bz)/2]);g.rotation.y=angle;const strip=mesh(new T.PlaneGeometry(1.65,length),paint(color,4),g);strip.rotation.x=-Math.PI/2;strip.castShadow=false;for(let t=-length/2+.8;t<length/2-.2;t+=1.25){const arrow=mesh(arrowGeometry,paint(C.cream,8),g,[0,.002,t]);arrow.rotation.x=-Math.PI/2;arrow.castShadow=false;}}}
 function floorName(text,x,z,color,w=4.4,angle=0){const g=group(lobby,[x,.047,z]);g.rotation.x=-Math.PI/2;g.rotation.z=angle;const textMesh=fixedText(g,text,[0,0,0],{scale:w,size:80,width:512,height:128,color,stroke:null});textMesh.material.polygonOffset=true;textMesh.material.polygonOffsetFactor=-12;textMesh.material.polygonOffsetUnits=-12;}
 function planter(x,z,color){solids.push([x-.45,x+.45,z-.45,z+.45,1.0]);const g=group(lobby,[x,0,z]);box(g,.9,.48,.9,color,[0,.25,0],.13);for(const [xx,yy,zz]of[[-.18,.62,.05],[.17,.69,0],[0,.58,-.18]])ball(g,mat(0x58a466,.9),[xx,yy,zz],[.30,.29,.29],10);}
 route([[-8.5,-9],[-13,-13],[-19,-18]],C.food);
 route([[-8,0],[-11,-1],[-16,-3]],C.rest);
 route([[8.5,-9],[13,-12],[19,-13.6]],C.gear);
 route([[9,3],[16,3],[21,2]],C.pets);
 route([[0,9],[0,13],[0,17]],C.race);

 // Food: toasted-orange brick apron, an oversized hotdog and chalk menus.
 deck(-19,-18.0,10,7.2,0xf5c783);for(let i=-4;i<=4;i++)box(lobby,.035,.012,7,0xe0a465,[-19+i,.068,-18],.003);for(let z=-21;z<=-15;z+=1.2)box(lobby,9.7,.012,.035,0xe0a465,[-19,.069,z],.003);
 const snack=makeFood('fish');lobby.add(snack);snack.position.set(-19,5.2,-22);snack.rotation.z=-Math.PI/2;snack.scale.setScalar(1.75);for(const x of[-19.65,-18.35])cylinder(lobby,.045,.045,1.65,C.cream,[x,4.18,-22],8);
 const menu=group(lobby,[-23.4,0,-17.4]);menu.rotation.y=.25;solids.push([-24.2,-22.6,-17.8,-17.0,2.2]);for(const x of[-.52,.52])box(menu,.13,.3,.22,C.food,[x,.15,0],.025);box(menu,1.42,1.85,.14,C.ink,[0,1.2,0],.08);box(menu,1.65,.14,.35,C.food,[0,.22,0],.04);fixedText(menu,'今日补给',[0,1.80,.09],{scale:1.15,size:62,width:256,height:100,color:'#ffdf9c',stroke:null});
 for(let i=0;i<3;i++){const f=makeFood(['poop','fish','walnut'][i]);menu.add(f);f.scale.setScalar(.22);f.position.set(-.38,1.36-i*.36,.21);box(menu,.53,.035,.025,C.cream,[.20,1.36-i*.36,.09],.006);}
 planter(-14.8,-16.4,C.food);floorName('运动补给',-19,-15.6,'#765026',4.8);

 // Rest: a cream-and-mint deck border, picnic mats and small planted corners.
 for(const x of[-22.15,-9.85])box(lobby,.16,.07,12.3,C.rest,[x,.16,-3],.04);
 for(const z of[-9.15,3.15])box(lobby,12.3,.07,.16,C.rest,[-16,.16,z],.04);
 planter(-22.3,3.5,0x98d8bb);planter(-9.7,-9.6,0x98d8bb);floorName('一起开吃',-16,4.2,'#287d71',4.6);

 // Equipment: blue service floor, amber safety stripes and a real 3D wrench.
 deck(19,-13.6,11,7.6,0x87b8e4);for(const x of[13.8,24.2])for(let i=0;i<8;i++){const stripe=box(lobby,.50,.012,.14,i%2?C.cream:0xe4b84f,[x,.068,-16.8+i*.85],.015);stripe.rotation.y=.45;}
 cylinder(lobby,.07,.07,.6,C.ink,[19,5.25,-19],10);const wrench=group(lobby,[19,6.4,-19]);wrench.rotation.z=-.48;box(wrench,.26,1.4,.18,0xffcb61,[0,-.12,0],.08);const jaw=mesh(new T.TorusGeometry(.47,.15,8,22,Math.PI*1.52),mat(C.cream,.55),wrench,[0,.73,0]);jaw.rotation.z=-.25;const eye=mesh(new T.TorusGeometry(.22,.095,8,22),mat(C.cream,.55),wrench,[0,-.9,0]);
 box(lobby,2.3,.12,2.3,C.gear,[22.5,.08,-15],.18);floorName('器材升级',18.5,-11.0,'#245a8f',4.8);planter(13.2,-11.4,C.gear);

 // Companions: lilac boardwalk and a paw-shaped landmark facing the court.
 deck(23,3,6.8,24.4,0xd1bdec);for(const x of[19.65,26.35])box(lobby,.12,.07,24.4,C.pets,[x,.09,3],.035);
 for(const z of[.8,3.2])cylinder(lobby,.085,.085,4.7,C.cream,[25,2.35,z],12);const paw=group(lobby,[25,5.0,2]);ball(paw,mat(0x9369bb,.7),[0,0,0],[.20,.53,.67]);for(const [y,z,sy,sz]of[[.70,-.52,.26,.23],[.94,-.18,.28,.22],[.94,.21,.28,.22],[.68,.55,.26,.23]])ball(paw,mat(0xedc2dd,.65),[0,y,z],[.18,sy,sz]);
 for(const z of[-9.5,15.5])planter(23,z,0xb69bdd);floorName('伙伴乐园',20.8,2,'#72518f',5.1,-Math.PI/2);

 // Race: coral sprint lanes, a striped gateway and flags visible from the hub.
 deck(0,17,15,6,C.race);for(const x of[-5,-2.5,0,2.5,5])box(lobby,.055,.015,5.9,C.cream,[x,.074,17],.004);
 for(let row=0;row<2;row++)for(let col=0;col<20;col++)box(lobby,.60,.017,.60,(row+col)%2?C.ink:C.cream,[-5.7+col*.60,.091,18.4+row*.60],.005);
 const gate=group(lobby,[0,0,21.5]);gate.rotation.y=Math.PI;for(const x of[-7,7]){box(gate,.48,5.8,.55,C.race,[x,2.9,0],.12);for(let i=0;i<4;i++)box(gate,.50,.16,.58,C.cream,[x,1.0+i,0],.025);}box(gate,14.5,1.05,.50,C.race,[0,5.55,0],.18);fixedText(gate,'喷 气 挑 战',[0,5.55,.28],{scale:9.2,size:90,width:768,height:128,color:'#fff4cf',stroke:null});
 for(const x of[-6,6]){const post=group(gate,[x,6.1,0]);cylinder(post,.035,.035,1.7,C.ink,[0,.6,0],8);const flag=box(post,1.0,.70,.04,C.cream,[.47,1.02,0],.015);for(let r=0;r<2;r++)for(let c=0;c<3;c++)if((r+c)%2===0)box(post,.32,.34,.045,C.ink,[.15+c*.32,.85+r*.34,.01],.004);}
 return {colors:C,solids};
}

export function canopyGeometry(){
 const positions=[],colors=[],a=new T.Color(0x35b6a5),b=new T.Color(0xffedcc);
 for(let i=0;i<12;i++){const a0=i/12*Math.PI*2,a1=(i+1)/12*Math.PI*2,c=i%2?a:b;positions.push(0,.5,0,Math.sin(a0)*3,-.5,Math.cos(a0)*3,Math.sin(a1)*3,-.5,Math.cos(a1)*3);for(let v=0;v<3;v++)colors.push(c.r,c.g,c.b);}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.computeVertexNormals();return g;
}
