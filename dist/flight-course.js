import * as T from 'three';
import {fmt} from './data.js';

export const FLIGHT_COLORS=[0xf06f83,0xf2ba63,0xe4e778,0x88d775,0x76cfc7,0x769fd6,0xa48bd0,0xe58fbc];
export const BAND_LENGTH=26,RUNWAY_WIDTH=30;
const START=75,CHUNK_LENGTH=BAND_LENGTH*FLIGHT_COLORS.length;

export function makeFlightCourse(parent,{group,box,textSprite,batchScenery}){
 const flat=color=>new T.MeshBasicMaterial({color,toneMapped:false});
 const paint=FLIGHT_COLORS.map(flat),edge=flat(0xf7f7e5),chunks=[],labels=[];
 box(parent,32,.35,10,flat(0xe694a1),[0,-.175,70],.06);
 for(let section=0;section<4;section++){
  const chunk=group(parent);
  for(let i=0;i<FLIGHT_COLORS.length;i++){
   const band=new T.Mesh(new T.PlaneGeometry(RUNWAY_WIDTH,BAND_LENGTH),paint[i]);band.rotation.x=-Math.PI/2;band.position.z=(i+.5)*BAND_LENGTH;band.castShadow=false;chunk.add(band);
   const sprite=textSprite('',{scale:7,size:100,width:512,height:160,color:'#fff',stroke:null}),map=sprite.material.map;
   const material=new T.MeshBasicMaterial({map,transparent:true,depthWrite:false,toneMapped:false}),mark=new T.Mesh(new T.PlaneGeometry(7,2.19),material);
   mark.position.set(0,.045,(i+.70)*BAND_LENGTH);mark.rotation.set(-Math.PI/2,0,Math.PI);chunk.add(mark);sprite.material.dispose();labels.push({chunk,mark,map,text:''});
  }
  for(const x of[-RUNWAY_WIDTH/2+.10,RUNWAY_WIDTH/2-.10]){const strip=new T.Mesh(new T.PlaneGeometry(.07,CHUNK_LENGTH),edge);strip.rotation.x=-Math.PI/2;strip.position.set(x,.01,CHUNK_LENGTH/2);chunk.add(strip);}
  batchScenery(chunk);chunk.userData.dynamic=true;chunks.push(chunk);
 }
 const shadow=new T.Mesh(new T.PlaneGeometry(46,140),new T.ShadowMaterial({color:0x30475c,opacity:.20,depthWrite:false}));shadow.rotation.x=-Math.PI/2;shadow.position.y=.018;shadow.receiveShadow=true;parent.add(shadow);
 function update(pz,distance=0,travel=1){
  const first=Math.max(0,Math.floor((pz-START)/CHUNK_LENGTH)-1);chunks.forEach((chunk,i)=>chunk.position.z=START+(first+i)*CHUNK_LENGTH);shadow.position.z=pz+30;
  for(const label of labels){const worldZ=label.chunk.position.z+label.mark.position.z,m=Math.max(0,(worldZ-72)/Math.max(1,travel)*distance),step=10**Math.max(-2,Math.floor(Math.log10(Math.max(1,distance)))-2),rounded=Math.round(m/step)*step,text=rounded<10?Number(rounded.toFixed(2)).toString():fmt(rounded);if(text===label.text)continue;label.text=text;const canvas=label.map.image,ctx=canvas.getContext('2d');ctx.clearRect(0,0,canvas.width,canvas.height);ctx.font='900 102px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.lineJoin='round';ctx.lineWidth=5;ctx.strokeStyle='rgba(58,82,110,.35)';ctx.fillStyle='#fffff4';ctx.strokeText(text,canvas.width/2,canvas.height/2);ctx.fillText(text,canvas.width/2,canvas.height/2);label.map.needsUpdate=true;}
 }
 update(72);return {update,chunks,labels};
}
