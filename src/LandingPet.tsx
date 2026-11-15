import {useEffect,useRef,useState} from 'react';
import type {CSSProperties} from 'react';
import {PET_TIMING,petFrame} from './pet-state';
import type {PetFrame} from './pet-state';
import './pet.css';
// Original pixel geometry; no proprietary sprites, scripts, telemetry or model requests.
export function LandingPet(){
 const button=useRef<HTMLButtonElement>(null),activity=useRef(0),greet=useRef(-1),elapsed=useRef(0),look=useRef({x:0,y:0});
 const [frame,setFrame]=useState<PetFrame>(()=>petFrame(0,0,-1)),[eyes,setEyes]=useState({x:0,y:0}),[paused,setPaused]=useState(false),[reduced,setReduced]=useState(false);
 const update=useRef(()=>{});
 useEffect(()=>{
  const motion=matchMedia('(prefers-reduced-motion: reduce)');let disposed=false,raf:number|undefined,idleTimer:ReturnType<typeof setTimeout>|undefined,last=performance.now(),paint=0,inView=true,sleepingClock=false,nativeVisible=true;
  const advance=(now:number)=>{if(!document.hidden&&nativeVisible&&inView&&!sleepingClock)elapsed.current+=Math.max(0,now-last);last=now};
  const paintFrame=()=>{setFrame(petFrame(elapsed.current,activity.current,greet.current,motion.matches));setEyes({...look.current})};
  const stop=()=>{if(raf!==undefined)cancelAnimationFrame(raf);raf=undefined;clearTimeout(idleTimer);idleTimer=undefined};
  const tick=(now:number)=>{raf=undefined;if(disposed||document.hidden||!nativeVisible||!inView)return;advance(now);const sleepDue=elapsed.current-activity.current>=PET_TIMING.sleepAfter;if(sleepDue||now-paint>=PET_TIMING.frameEvery){paint=now;paintFrame()}if(sleepDue)sleepingClock=true;else raf=requestAnimationFrame(tick)};
  const resume=()=>{stop();const hidden=document.hidden||!nativeVisible||!inView;setPaused(hidden);last=performance.now();if(disposed||hidden)return;if(motion.matches){const remaining=PET_TIMING.sleepAfter-(elapsed.current-activity.current),greetRemaining=PET_TIMING.greetFor-(elapsed.current-greet.current),delay=greet.current>=0&&greetRemaining>0?Math.min(remaining,greetRemaining):remaining;if(delay>0)idleTimer=setTimeout(()=>{advance(performance.now());paintFrame();if(elapsed.current-activity.current>=PET_TIMING.sleepAfter)sleepingClock=true;else resume()},delay+1)}else raf=requestAnimationFrame(tick)};
  update.current=()=>{advance(performance.now());sleepingClock=false;paintFrame();resume()};
  const motionChange=()=>{advance(performance.now());if(motion.matches)look.current={x:0,y:0};setReduced(motion.matches);paintFrame();resume()};
  const wake=()=>{advance(performance.now());sleepingClock=false;activity.current=elapsed.current;paintFrame();resume()};
  const pointer=(event:PointerEvent)=>{if(!button.current)return;const r=button.current.getBoundingClientRect(),dx=event.clientX-r.left-r.width/2,dy=event.clientY-r.top-r.height/2;look.current=Math.hypot(dx,dy)<280&&!motion.matches?{x:Math.max(-1,Math.min(1,dx/80)),y:Math.max(-1,Math.min(1,dy/80))}:{x:0,y:0}};
  const observer=new IntersectionObserver(entries=>{inView=entries[0]?.isIntersecting??true;resume()});if(button.current)observer.observe(button.current);
  const offVisibility=window.tombuddy?.onVisibility(visible=>{nativeVisible=visible;resume()});window.tombuddy?.windowVisible().then(visible=>{if(!disposed){nativeVisible=visible;resume()}}).catch(()=>{});
  document.addEventListener('visibilitychange',resume);window.addEventListener('pointermove',pointer,{passive:true});window.addEventListener('pointerdown',wake,{passive:true});window.addEventListener('keydown',wake);motion.addEventListener('change',motionChange);motionChange();resume();
  return()=>{disposed=true;stop();offVisibility?.();observer.disconnect();document.removeEventListener('visibilitychange',resume);window.removeEventListener('pointermove',pointer);window.removeEventListener('pointerdown',wake);window.removeEventListener('keydown',wake);motion.removeEventListener('change',motionChange);update.current=()=>{}};
 },[]);
 function greetPet(){activity.current=elapsed.current;greet.current=elapsed.current;update.current()}
 const sleeping=frame.mood==='sleep';
 return <button ref={button} type="button" className="landing-pet" aria-label="Tombuddy 小伙伴，点击打招呼" title={sleeping?'小伙伴睡着了，点击唤醒':'和小伙伴打个招呼'} data-mood={frame.mood} data-paused={paused} data-reduced-motion={reduced} data-position={frame.x.toFixed(4)} onClick={greetPet} onPointerEnter={greetPet} style={{left:`calc((100% - 40px) * ${frame.x})`,'--pet-lift':`${frame.lift}px`} as CSSProperties}>
  <span className="pet-sleep" aria-hidden="true"><i>z</i><i>z</i><i>Z</i></span>
  <svg className="pet-figure" width="36" height="28" viewBox="0 0 36 28" shapeRendering="crispEdges" aria-hidden="true">
   <g className="pet-body"><path d="M8 4H28V9H33V14H28V21H8V14H3V9H8Z"/>{[8,13,21,26].map((x,i)=><rect key={x} x={x} y="20" width="2" height={frame.leg===(i%2)?6:4}/>)}
    <g className="pet-eyes" transform={`translate(${sleeping?0:eyes.x},${sleeping?0:eyes.y})`}>{frame.blink?<><path d="M11 10v2h3v-2M22 10v2h3v-2" fill="none" stroke="currentColor" strokeWidth="1"/></>:<><rect x="11" y="9" width="2" height="3"/><rect x="23" y="9" width="2" height="3"/></>}</g>
   </g>
  </svg>
 </button>;
}
