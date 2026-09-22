/** Video previews are an explicit desktop interaction; the cover image is always the fallback. */
export {};
const root=document.documentElement;
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const fine=matchMedia('(hover: hover) and (pointer: fine)');
type Preview={tile:HTMLAnchorElement;video:HTMLVideoElement;hovered:boolean;focused:boolean;visible:boolean;failed:boolean;playing:boolean;ticket:number};
let cleanup:(()=>void)|undefined;

function initialize(){
  cleanup?.();
  const abort=new AbortController(),options={signal:abort.signal};
  const states:Preview[]=[];
  function allowed(s:Preview){
    return (s.hovered||s.focused)&&s.visible&&!s.failed&&fine.matches&&!reduced.matches&&root.dataset.motion!=='paused'&&!document.hidden&&!s.tile.closest('[hidden]');
  }
  function stop(s:Preview){
    s.ticket++;s.playing=false;s.tile.removeAttribute('data-video-playing');s.video.pause();
    // Abort downloading when the preview is no longer requested. The normal browser cache remains available.
    if(s.video.hasAttribute('src')){s.video.removeAttribute('src');s.video.load();}
  }
  async function sync(s:Preview){
    if(!allowed(s)){stop(s);return;}
    if(s.playing)return;
    const ticket=++s.ticket;s.playing=true;
    s.video.muted=true;s.video.loop=true;s.video.controls=false;
    s.video.src=s.video.dataset.videoSrc!;
    try{await s.video.play();if(ticket!==s.ticket)return;if(!allowed(s)){stop(s);return;}s.tile.setAttribute('data-video-playing','');}
    catch{if(ticket!==s.ticket)return;s.failed=true;stop(s);}
  }
  const syncAll=()=>states.forEach(s=>void sync(s));
  const stopAll=()=>states.forEach(stop);
  for(const video of document.querySelectorAll<HTMLVideoElement>('[data-work-preview]')){
    const tile=video.closest<HTMLAnchorElement>('[data-artwork]');if(!tile)continue;
    const s:Preview={tile,video,hovered:false,focused:false,visible:false,failed:false,playing:false,ticket:0};states.push(s);
    const updateVisibility=()=>{const rect=tile.getBoundingClientRect();s.visible=rect.width>0&&rect.height>0&&rect.bottom>0&&rect.top<innerHeight&&rect.right>0&&rect.left<innerWidth;};
    tile.addEventListener('pointerenter',e=>{if(e.pointerType==='touch')return;s.hovered=true;updateVisibility();void sync(s);},options);
    tile.addEventListener('pointerleave',()=>{s.hovered=false;void sync(s);},options);
    tile.addEventListener('focus',()=>{s.focused=tile.matches(':focus-visible');updateVisibility();void sync(s);},options);
    tile.addEventListener('blur',()=>{s.focused=false;void sync(s);},options);
    tile.addEventListener('click',()=>stop(s),options);
    video.addEventListener('error',()=>{if(!video.hasAttribute('src'))return;s.failed=true;stop(s);},options);
  }
  const intersection=new IntersectionObserver(entries=>{for(const entry of entries){const s=states.find(s=>s.tile===entry.target);if(s){s.visible=entry.isIntersecting;void sync(s);}}},{threshold:0});
  states.forEach(s=>intersection.observe(s.tile));
  const motion=new MutationObserver(syncAll);motion.observe(root,{attributes:true,attributeFilter:['data-motion']});
  const filtering=new MutationObserver(syncAll);filtering.observe(document.body,{attributes:true,subtree:true,attributeFilter:['hidden']});
  reduced.addEventListener('change',syncAll,options);fine.addEventListener('change',syncAll,options);
  document.addEventListener('visibilitychange',syncAll,options);document.addEventListener('site:layout',syncAll,options);
  cleanup=()=>{stopAll();intersection.disconnect();motion.disconnect();filtering.disconnect();abort.abort();};
}
initialize();
addEventListener('pagehide',()=>cleanup?.());
addEventListener('pageshow',e=>{if(e.persisted)initialize();});
