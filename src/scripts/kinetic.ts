import {gsap} from 'gsap';
import {SplitText} from 'gsap/SplitText';
import {ScrollTrigger} from 'gsap/ScrollTrigger';
gsap.registerPlugin(SplitText,ScrollTrigger);

const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const root=document.documentElement;
let scope:gsap.Context|undefined;
const splits:SplitText[]=[];
const teardowns:Array<()=>void>=[];

function clear(){scope?.revert();while(splits.length)splits.pop()?.revert();while(teardowns.length)teardowns.pop()?.();}
async function initialize(){
  await document.fonts.ready;clear();
  const still=reduced.matches||root.dataset.motion==='paused';
  if(still)return;
  scope=gsap.context(()=>{
    document.querySelectorAll<HTMLElement>('[data-kinetic]').forEach((element,index)=>{
      const ink=element.dataset.kineticStyle==='ink';
      const wide=element.dataset.kineticStyle==='wide';
      const split=SplitText.create(element,{type:'chars,words',mask:'chars',charsClass:'kinetic-char',aria:'auto',onSplit(self){
        return gsap.from(self.chars,{yPercent:ink?115:wide?140:110,rotate:ink?-13:wide?0:4,scale:ink?.86:1,opacity:0,duration:ink?1.55:1.1,ease:'power3.out',stagger:ink?.1:.033,delay:Math.min(index*.1,.4),scrollTrigger:{trigger:element,start:'top 94%',once:true}});
      }});
      splits.push(split);
      if(ink){const chars=split.chars;const enter=()=>gsap.to(chars,{y:i=>i%2?-5:3,rotation:i=>i%2?3:-2,duration:.8,stagger:.07,ease:'sine.inOut'});const leave=()=>gsap.to(chars,{y:0,rotation:0,duration:1,ease:'elastic.out(1,.7)'});element.addEventListener('pointerenter',enter);element.addEventListener('pointerleave',leave);teardowns.push(()=>{element.removeEventListener('pointerenter',enter);element.removeEventListener('pointerleave',leave)});}
    });
    document.querySelectorAll<HTMLElement>('[data-reveal]').forEach((el,index)=>gsap.from(el,{y:36,opacity:0,duration:.95,ease:'power3.out',delay:(index%3)*.065,scrollTrigger:{trigger:el,start:'top 96%',once:true}}));
    document.querySelectorAll<HTMLElement>('.room-link').forEach((el,index)=>gsap.from(el,{y:55,opacity:0,rotateX:12,duration:1.2,delay:.35+index*.1,ease:'power3.out'}));
    if(matchMedia('(hover:hover) and (pointer:fine)').matches){
      document.querySelectorAll<HTMLElement>('[data-variable]').forEach(el=>{
        const chars=[...el.querySelectorAll<HTMLElement>('.kinetic-char')];
        const move=(event:PointerEvent)=>{chars.forEach(char=>{const b=char.getBoundingClientRect();const distance=Math.hypot(event.clientX-b.x-b.width/2,event.clientY-b.y-b.height/2);gsap.to(char,{fontWeight:300+Math.max(0,1-distance/160)*400,duration:.4,overwrite:'auto'})})};
        const reset=()=>gsap.to(chars,{fontWeight:600,duration:.6});el.addEventListener('pointermove',move);el.addEventListener('pointerleave',reset);teardowns.push(()=>{el.removeEventListener('pointermove',move);el.removeEventListener('pointerleave',reset)});
      });
      document.querySelectorAll<HTMLElement>('[data-magnetic]').forEach(el=>{
        const x=gsap.quickTo(el,'x',{duration:.7,ease:'power3'}),y=gsap.quickTo(el,'y',{duration:.7,ease:'power3'});
        const move=(event:PointerEvent)=>{const box=el.getBoundingClientRect();x((event.clientX-box.left-box.width/2)*.035);y((event.clientY-box.top-box.height/2)*.065)};
        const reset=()=>{x(0);y(0)};el.addEventListener('pointermove',move);el.addEventListener('pointerleave',reset);teardowns.push(()=>{el.removeEventListener('pointermove',move);el.removeEventListener('pointerleave',reset)});
      });
    }
  });
  ScrollTrigger.refresh();
}
void initialize();reduced.addEventListener('change',()=>void initialize());
document.addEventListener('site:layout',()=>ScrollTrigger.refresh());
new MutationObserver(records=>{if(records.some(r=>r.attributeName==='data-motion'))void initialize()}).observe(root,{attributes:true,attributeFilter:['data-motion']});
addEventListener('pagehide',clear);
addEventListener('pageshow',event=>{if(event.persisted)void initialize();});
