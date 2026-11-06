const smooth=v=>{v=Math.max(0,Math.min(1,v));return v*v*(3-2*v);};
// Lift, make contact, chew, then lower; shared by play and the model review.
export function eatingBeat(age){
 if(age<0||age>=.52)return {eat:0,chew:0};
 const eat=age<.16?smooth(age/.16):age<.29?1:1-smooth((age-.29)/.23);
 const chew=age<.25?0:Math.sin(Math.PI*Math.min(1,(age-.25)/.27));
 return {eat,chew};
}
