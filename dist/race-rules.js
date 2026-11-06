export const COUNTDOWN_MS=0;
export function inLaunchZone(pose){return !!pose&&Math.abs(pose.x)<=6.6&&pose.z>=14.2&&pose.z<=20.5;}
export const FLIGHT_MS=4800;
export const LANDING_SECONDS=3.98;
export const BOOST_ACTIVE_MS=3600;
export const BOOST_CYCLE_MS=1200;
export const BOOST_COOLDOWN_MS=550;
export const BOOST_CHARGES=3;
export function boostPhase(elapsedMs){return ((elapsedMs%BOOST_CYCLE_MS)+BOOST_CYCLE_MS)%BOOST_CYCLE_MS/BOOST_CYCLE_MS;}
export function boostGrade(elapsedMs){const phase=boostPhase(elapsedMs);return phase>=.62&&phase<=.98?'perfect':'normal';}
export function raceDistance(r){return Number(r?.distance??r?.power)||0;}
export function flightLength(distance){return 96+150*Math.log10(1+Math.max(0,distance)/80);}
// Integrate a brief launch impulse, coast, then brake. Logical rewards stay server authoritative.
const ACCEL=.055,SETTLE=.36,BRAKE=3.6,STOP=LANDING_SECONDS,PEAK=2.05;
const FIRST=ACCEL*PEAK/2,SECOND=(SETTLE-ACCEL)*(PEAK+1)/2;
const PATH=FIRST+SECOND+(BRAKE-SETTLE)+(STOP-BRAKE)/2;
export function flightFraction(elapsed){
 const t=Math.max(0,elapsed);if(t<ACCEL)return PEAK*t*t/(2*ACCEL)/PATH;
 if(t<SETTLE){const s=t-ACCEL;return (FIRST+PEAK*s-(PEAK-1)*s*s/(2*(SETTLE-ACCEL)))/PATH;}
 if(t<BRAKE)return (FIRST+SECOND+t-SETTLE)/PATH;
 if(t<STOP){const s=t-BRAKE;return (FIRST+SECOND+BRAKE-SETTLE+s-s*s/(2*(STOP-BRAKE)))/PATH;}
 return 1;
}
export function flightVelocity(elapsed){
 const t=Math.max(0,elapsed);if(t<ACCEL)return PEAK*t/ACCEL/PATH;
 if(t<SETTLE)return (PEAK-(PEAK-1)*(t-ACCEL)/(SETTLE-ACCEL))/PATH;
 if(t<BRAKE)return 1/PATH;if(t<STOP)return (1-(t-BRAKE)/(STOP-BRAKE))/PATH;return 0;
}
