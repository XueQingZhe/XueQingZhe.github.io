import * as THREE from 'three';
import {createBlueHourIllustration} from './blue-hour-illustration';
import {createBlueHourLight} from './blue-hour-light';

class BlueHourScene extends HTMLElement{
  private renderer:THREE.WebGLRenderer|null=null;
  private scene=new THREE.Scene();
  private camera=new THREE.OrthographicCamera(0,1,0,-1,.1,2000);
  private illustration:ReturnType<typeof createBlueHourIllustration>|null=null;
  private light:ReturnType<typeof createBlueHourLight>|null=null;
  private time=20;
  private night=0;
  private targetNight=0;
  private frame=0;
  private frames=0;
  private previous=0;
  private gust=0;
  private gusts=0;
  private gustTarget=0;
  private inView=true;
  private paused=false;
  private lost=false;
  private pointer=new THREE.Vector2();
  private smoothPointer=new THREE.Vector2();
  private reduced=matchMedia('(prefers-reduced-motion:reduce)');
  private compact=matchMedia('(max-width:700px), (max-aspect-ratio:17/20)');
  private observers:Array<ResizeObserver|IntersectionObserver|MutationObserver>=[];

  connectedCallback(){
    const canvas=this.querySelector('canvas');if(!(canvas instanceof HTMLCanvasElement))return;
    this.lost=false;this.previous=0;this.inView=true;
    this.night=this.targetNight=this.readNight();this.paused=document.documentElement.dataset.motion==='paused';
    this.camera.position.z=1000;
    this.illustration=createBlueHourIllustration(this,()=>{
      if(!this.isConnected)return;
      this.resize();this.render();this.schedule();
    });
    try{
      this.renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'low-power'});
      this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));
      this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.NoToneMapping;
      this.light=createBlueHourLight();this.scene.add(this.light.group);
      this.dataset.renderer='webgl';
    }catch(error){
      console.warn('Blue Hour keeps its original SVG artwork without WebGL lighting.',error);
      this.renderer?.dispose();this.renderer=null;this.dataset.renderer='fallback';
    }
    this.resize();
    const resize=new ResizeObserver(this.resize);resize.observe(this);
    const view=new IntersectionObserver(([entry])=>{this.inView=entry.isIntersecting;this.schedule();},{rootMargin:'60px'});view.observe(this);
    const settings=new MutationObserver(this.settingsChanged);settings.observe(document.documentElement,{attributes:true,attributeFilter:['data-theme','data-motion']});
    this.observers=[resize,view,settings];this.reduced.addEventListener('change',this.settingsChanged);this.compact.addEventListener('change',this.resize);
    document.addEventListener('visibilitychange',this.visibilityChanged);
    window.addEventListener('pointermove',this.pointerMoved,{passive:true});window.addEventListener('pointerdown',this.pointerPressed,{passive:true});
    document.documentElement.addEventListener('pointerleave',this.pointerLeft);
    canvas.addEventListener('webglcontextlost',this.contextLost);canvas.addEventListener('webglcontextrestored',this.contextRestored);
    this.schedule();
  }
  disconnectedCallback(){this.dispose();}
  getSceneDiagnostics(){return{composition:'original-svg',frames:this.frames,time:this.time,gust:this.gust,gusts:this.gusts,characterReady:this.illustration?.ready||false,characterLayers:0,characterTime:this.time,illustrationLayers:this.illustration?.layers||0,expectedLayers:this.illustration?.expectedLayers||0,blink:0,night:this.illustration?.night||0,artViewport:this.illustration?.viewport,drawCalls:!this.lost?(this.renderer?.info.render.calls||0):0,textures:this.renderer?.info.memory.textures||0};}
  private readNight(){return document.documentElement.dataset.theme==='dark'?1:0;}
  private resize=()=>{
    const{width,height}=this.getBoundingClientRect();
    const art=this.querySelector('.blue-scene-art')?.getBoundingClientRect();
    const canvasHeight=this.compact.matches?(art?.height||height):height;
    this.renderer?.setSize(Math.max(1,width),Math.max(1,canvasHeight),false);
    this.camera.right=width;this.camera.bottom=-height;this.camera.updateProjectionMatrix();
    this.illustration?.resize(width,height,this.compact.matches);this.light?.resize(width,canvasHeight,this.compact.matches);this.render();this.schedule();
  };
  private settingsChanged=()=>{
    this.targetNight=this.readNight();this.paused=document.documentElement.dataset.motion==='paused';
    if(this.reduced.matches){this.night=this.targetNight;this.pointer.set(0,0);this.smoothPointer.set(0,0);this.render();}
    this.schedule();
  };
  private visibilityChanged=()=>this.schedule();
  private pointerMoved=(event:PointerEvent)=>{
    if(event.pointerType==='touch'||this.paused||this.reduced.matches)return;
    const rect=this.getBoundingClientRect();if(event.clientY<rect.top||event.clientY>rect.bottom)return;
    this.pointer.set((event.clientX-rect.left)/rect.width*2-1,1-(event.clientY-rect.top)/rect.height*2);
  };
  private pointerLeft=()=>this.pointer.set(0,0);
  private pointerPressed=(event:PointerEvent)=>{
    if(this.paused||this.reduced.matches)return;
    if(event.target instanceof Element&&event.target.closest('a,button,input,textarea,select,nav,[role="button"]'))return;
    const rect=this.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)return;
    this.gustTarget=1;this.gusts++;this.schedule();
  };
  private contextLost=(event:Event)=>{event.preventDefault();this.lost=true;this.dataset.renderer='fallback';this.schedule();};
  private contextRestored=()=>{this.lost=false;this.dataset.renderer='webgl';this.render();this.schedule();};
  private schedule(){
    const changing=Math.abs(this.night-this.targetNight)>.002;
    const active=this.isConnected&&this.illustration?.ready&&this.inView&&!document.hidden&&((!this.paused&&!this.reduced.matches)||changing);
    if(!active){cancelAnimationFrame(this.frame);this.frame=0;this.previous=0;return;}
    if(!this.frame)this.frame=requestAnimationFrame(this.tick);
  }
  private tick=(now:number)=>{
    this.frame=0;if(this.previous&&now-this.previous<1000/30){this.schedule();return;}
    const delta=this.previous?Math.min((now-this.previous)/1000,.075):1/30;this.previous=now;const ease=1-Math.exp(-delta*2.8);
    if(!this.paused&&!this.reduced.matches){this.time+=delta;this.smoothPointer.lerp(this.pointer,ease);this.gust+=(this.gustTarget-this.gust)*Math.min(1,delta*3.6);this.gustTarget=Math.max(0,this.gustTarget-delta*.2);}
    if(Math.abs(this.night-this.targetNight)>.002)this.night+=(this.targetNight-this.night)*ease;
    if(Math.abs(this.night-this.targetNight)<=.002)this.night=this.targetNight;
    this.render();this.schedule();
  };
  private render(){
    this.illustration?.update(this.time,this.night,this.gust,this.smoothPointer,this.reduced.matches);
    if(this.renderer&&!this.lost){
      this.light?.update(this.time,this.night,this.gust);
      this.renderer.render(this.scene,this.camera);
    }
    this.frames++;
  }
  private dispose(){
    cancelAnimationFrame(this.frame);this.frame=0;this.observers.forEach(observer=>observer.disconnect());this.observers=[];
    this.illustration?.dispose();this.light?.dispose();
    this.reduced.removeEventListener('change',this.settingsChanged);this.compact.removeEventListener('change',this.resize);document.removeEventListener('visibilitychange',this.visibilityChanged);
    window.removeEventListener('pointermove',this.pointerMoved);window.removeEventListener('pointerdown',this.pointerPressed);document.documentElement.removeEventListener('pointerleave',this.pointerLeft);
    const canvas=this.querySelector('canvas');canvas?.removeEventListener('webglcontextlost',this.contextLost);canvas?.removeEventListener('webglcontextrestored',this.contextRestored);
    this.renderer?.dispose();this.renderer=null;this.scene.clear();this.illustration=null;this.light=null;this.dataset.renderer='fallback';
  }
}
if(!customElements.get('blue-hour-scene'))customElements.define('blue-hour-scene',BlueHourScene);
