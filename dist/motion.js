import {LANDING_SECONDS} from './race-rules.js';
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const smooth=(v,a,b)=>{const t=clamp((v-a)/(b-a));return t*t*(3-2*t);};
export const RUN_CYCLE_DISTANCE=1.28/.48;
export function footPath(phase,weight){
 phase=((phase%1)+1)%1;
 if(phase<.48)return {z:(.64-1.28*phase/.48)*weight,y:.035,tilt:0,stance:true};
 const u=(phase-.48)/.52;
 return {z:(-.64+1.28*smooth(u,0,1))*weight,y:.035+Math.sin(Math.PI*u)*.19*weight,tilt:-Math.sin(Math.PI*u)*.20*weight,stance:false};
}
export function solveLeg(hipHeight,z,footHeight,upper=.67,lower=.778){
 const down=hipHeight-footHeight,distance=clamp(Math.hypot(down,z),Math.abs(upper-lower)+.001,upper+lower-.001);
 const knee=Math.acos(clamp((distance*distance-upper*upper-lower*lower)/(2*upper*lower),-1,1));
 const hip=Math.atan2(-z,down)-Math.atan2(lower*Math.sin(knee),upper+lower*Math.cos(knee));
 return {hip,knee};
}
export function raceMotion(elapsed,progress){
 const takeoff=smooth(elapsed,0,.12),descent=smooth(elapsed,3.38,LANDING_SECONDS),flight=takeoff*(1-smooth(elapsed,3.36,3.84));
 return {yaw:.55*smooth(elapsed,3.70,3.94),height:(1.35+Math.sin(clamp(elapsed/3.6)*Math.PI)*.08)*takeoff*(1-descent),fly:flight,launch:Math.sin(Math.PI*clamp(elapsed/.20)),landing:elapsed>3.94?Math.sin(Math.PI*clamp((elapsed-3.94)/.56)):0};
}

// A side-biased rear chase shows the forward torso and trailing knees in screen space.
export function flightCameraPose(elapsed,height,z,yaw,pitch,punch,reducedMotion,out={}){
 const open=Math.exp(-Math.max(0,elapsed)*10),landing=smooth(elapsed,3.50,LANDING_SECONDS),distance=8.6+.6*open+.8*landing,lag=reducedMotion?0:1.0*Math.sin(Math.PI*clamp(elapsed/.26));
 const impact=reducedMotion?0:Math.sin(Math.PI*clamp((elapsed-LANDING_SECONDS)/.40));
 out.x=Math.sin(yaw)*distance;out.y=height+6.1+.2*landing+pitch*2.5-impact*.18;out.z=z+Math.cos(yaw)*distance-lag;
 out.lookY=height+1.7-.25*landing;out.lookZ=z+1.0-.5*landing;
 const kick=(1-Math.exp(-Math.max(0,elapsed)*45))*Math.exp(-Math.max(0,elapsed)*7);
 out.fov=reducedMotion?62:62+kick*8+punch*4-landing*2;return out;
}

// Rear trousers surface, evaluated after the pelvis hinge has moved the model.
export function exhaustOrigin(actor,out){actor.body.localToWorld(out.set(0,1.48,-.25));out.z-=.28;return out;}
