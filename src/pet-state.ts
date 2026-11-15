export const PET_TIMING={sleepAfter:30000,greetFor:760,routeFor:18000,frameEvery:70} as const;
export type PetMood='idle'|'walk'|'sleep'|'greet';
export type PetFrame={mood:PetMood;x:number;direction:number;blink:boolean;leg:number;lift:number};
function route(t:number){const p=Math.max(0,t)%PET_TIMING.routeFor;if(p<2200)return {x:.88,direction:-1,walking:false};if(p<7500)return {x:.88-(p-2200)/5300*.73,direction:-1,walking:true};if(p<10500)return {x:.15,direction:1,walking:false};if(p<16000)return {x:.15+(p-10500)/5500*.73,direction:1,walking:true};return {x:.88,direction:-1,walking:false};}
export function petFrame(elapsed:number,lastActivity:number,greetAt:number,reduced=false):PetFrame{
 const t=Math.max(0,elapsed),sleep=t-Math.max(0,lastActivity)>=PET_TIMING.sleepAfter;
 const r=route(sleep?Math.max(0,lastActivity)+PET_TIMING.sleepAfter:t),greeting=!sleep&&greetAt>=0&&t>=greetAt&&t-greetAt<PET_TIMING.greetFor;
 const mood:PetMood=sleep?'sleep':greeting?'greet':r.walking&&!reduced?'walk':'idle';
 return {mood,x:reduced?.88:r.x,direction:r.direction,blink:sleep||!reduced&&(t+1500)%4700<150,leg:!reduced&&mood==='walk'?Math.floor(t/140)%2:0,lift:reduced||sleep?0:greeting?Math.round(Math.sin((t-greetAt)/PET_TIMING.greetFor*Math.PI)*7):Math.round(Math.sin(t/1800*Math.PI*2))};
}
