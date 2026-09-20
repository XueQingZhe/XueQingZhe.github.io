const WIDTH=1672,HEIGHT=941;
const smoothstep=(a:number,b:number,value:number)=>{
  const t=Math.max(0,Math.min(1,(value-a)/(b-a)));return t*t*(3-2*t);
};

/** One original image per season. All camera movement preserves the painted contacts. */
export function createBlueHourIllustration(host:HTMLElement,invalidate:()=>void){
  const stage=host.querySelector<HTMLElement>('.blue-scene-art');
  const seasons=Array.from(host.querySelectorAll<SVGSVGElement>('svg[data-art-season]'));
  const images=seasons.map(svg=>svg.querySelector<SVGImageElement>('[data-art-image]'));
  const cameras=seasons.map(svg=>svg.querySelector<SVGGElement>('[data-art-camera]'));
  const noise=host.querySelector<SVGFETurbulenceElement>('[data-water-noise]');
  const water=host.querySelector<SVGFEDisplacementMapElement>('[data-water-displacement]');
  let loaded=0,failed=seasons.length!==2,disposed=false;
  let compact=false,nightAmount=host.ownerDocument.documentElement.dataset.theme==='dark'?1:0;
  let viewport={x:0,y:0,width:WIDTH,height:HEIGHT};
  let lastNight=-1,lastWater=-1,lastFrequency=-1;
  const preload:HTMLImageElement[]=[];

  for(const image of images){
    if(!image){failed=true;continue;}
    const probe=new Image();preload.push(probe);
    probe.onload=()=>{
      if(disposed)return;
      loaded++;
      if(loaded===2&&!failed){
        paintTheme(nightAmount);
        host.dataset.artReady='true';
        invalidate();
      }
    };
    probe.onerror=()=>{if(!disposed){failed=true;invalidate();}};
    probe.src=image.href.baseVal;
  }
  function paintTheme(amount:number){
    if(amount===lastNight)return;
    lastNight=amount;
    // Fade through the page colour; the two differently posed faces never overlap.
    seasons[0]?.style.setProperty('opacity',String(1-smoothstep(.03,.47,amount)));
    seasons[1]?.style.setProperty('opacity',String(smoothstep(.53,.97,amount)));
  }
  function layout(){
    if(!stage)return;
    const rect=stage.getBoundingClientRect();
    const width=Math.max(1,rect.width),height=Math.max(1,rect.height);
    // Tiny shared overscan accommodates camera drift without exposing an image edge.
    const scale=Math.max(width/WIDTH,height/HEIGHT)*1.012;
    const viewWidth=width/scale,viewHeight=height/scale;
    viewport={x:(WIDTH-viewWidth)*(compact?.75:.54),y:(HEIGHT-viewHeight)*.40,width:viewWidth,height:viewHeight};
    const box=`${viewport.x} ${viewport.y} ${viewWidth} ${viewHeight}`;
    for(const svg of seasons)svg.setAttribute('viewBox',box);
  }
  return{
    get ready(){return !disposed&&!failed&&loaded===2;},
    get failed(){return failed;},
    get layers(){return loaded;},
    get expectedLayers(){return 2;},
    get night(){return nightAmount;},
    get viewport(){return {...viewport};},
    resize(_width:number,_height:number,isCompact:boolean){compact=isCompact;layout();},
    update(time:number,night:number,wind:number,pointer:{x:number;y:number},quiet=false){
      if(disposed)return;
      nightAmount=Math.max(0,Math.min(1,night));paintTheme(nightAmount);
      const x=quiet||compact?0:pointer.x*-2.2;
      const y=quiet||compact?0:pointer.y*-.9;
      for(const camera of cameras)camera?.setAttribute('transform',`translate(${x.toFixed(3)} ${y.toFixed(3)})`);
      // One continuous displacement map on the original image, neutral everywhere
      // outside the clear-water mask. No duplicate painted water or character layers.
      const scale=quiet||nightAmount===0?0:.50+.13*Math.sin(time*.63)+.12*wind;
      const frequency=.105+.008*Math.sin(time*.24);
      if(water&&Math.abs(lastWater-scale)>.002){water.setAttribute('scale',scale.toFixed(3));lastWater=scale;}
      if(noise&&Math.abs(lastFrequency-frequency)>.00008){noise.setAttribute('baseFrequency',`.013 ${frequency.toFixed(5)}`);lastFrequency=frequency;}
    },
    dispose(){
      disposed=true;
      for(const probe of preload){probe.onload=null;probe.onerror=null;}
      delete host.dataset.artReady;
      for(const svg of seasons)svg.style.removeProperty('opacity');
      for(const camera of cameras)camera?.removeAttribute('transform');
      water?.setAttribute('scale','0');
    },
  };
}
