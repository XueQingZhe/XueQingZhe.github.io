import * as THREE from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';
import {createCanopyTexture,createFernTexture} from './botanical-textures';
import {createPortalScenery} from './portal-scenery';
import {createPortalFlora} from './portal-flora';
import {createPondLife} from './pond-life';

type Variant = 'portal' | 'work' | 'notes' | 'study' | 'about';
type Sway = { object: THREE.Object3D; amount: number; phase: number; base: number; axis: 'x' | 'y' | 'z' };
type Float = { object: THREE.Object3D; base: number; phase: number; amount: number; spin?: number };

// Both sky and distant water use this exact linear-light palette before tone mapping.
const atmospherePalette = `
  vec3 gardenSky(float height,float mood,float nightAmount){
    vec3 day=mix(vec3(.37,.43,.42),vec3(.19,.29,.34),height);
    vec3 night=mix(vec3(.043,.046,.082),vec3(.012,.016,.035),height);
    if(mood>.5&&mood<1.5)day=mix(vec3(.34,.35,.25),vec3(.13,.25,.23),height);
    if(mood>1.5&&mood<2.5)day=mix(vec3(.26,.39,.43),vec3(.10,.23,.29),height);
    if(mood>2.5&&mood<3.5)day=mix(vec3(.18,.32,.34),vec3(.07,.19,.25),height);
    if(mood>3.5)day=mix(vec3(.25,.40,.29),vec3(.085,.235,.20),height);
    return mix(day,night,nightAmount);
  }
`;

const waterShader = {
  name: 'QuietGardenWater',
  uniforms: {
    color: { value: new THREE.Color('#5caba0') },
    tDiffuse: { value: null },
    textureMatrix: { value: new THREE.Matrix4() },
    uTime: { value: 0 },
    uNight: { value: 0 },
    uMood: { value: 0 },
    uPointer: { value: new THREE.Vector2(0, 0) },
    uInteraction: { value: 0 },
  },
  vertexShader: `
    uniform mat4 textureMatrix;
    varying vec4 vReflection;
    varying vec3 vWorld;
    void main(){
      vReflection = textureMatrix * vec4(position,1.0);
      vWorld = (modelMatrix * vec4(position,1.0)).xyz;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform vec3 color;
    uniform float uTime;
    uniform float uNight;
    uniform float uMood;
    uniform vec2 uPointer;
    uniform float uInteraction;
    varying vec4 vReflection;
    varying vec3 vWorld;
    ${atmospherePalette}
    void main(){
      vec2 p = vWorld.xz;
      float t = uTime * .43;
      vec2 wave = vec2(sin(p.y*2.6+t)+sin(p.x*1.7+t*.7), cos(p.x*2.3-t)+sin(p.y*3.1+t*.8));
      float pointerDistance = length(p-uPointer);
      float ripple = sin(pointerDistance*7.0-uTime*3.2)*exp(-pointerDistance*.75)*uInteraction;
      vec2 uv = vReflection.xy/vReflection.w;
      uv += wave*.0028 + vec2(ripple)*.002;
      vec3 reflection = texture2D(tDiffuse,uv).rgb;
      float veins = abs(sin(p.x*3.6+sin(p.y*3.2+t)*1.8)+sin(p.y*4.1+sin(p.x*2.8-t)*1.7));
      float detailFade = 1.0-smoothstep(6.0,23.0,length(p-vec2(1.0,4.0)));
      float causticPatch=smoothstep(.0,.75,sin(p.x*.43+p.y*.27)*cos(p.y*.61-p.x*.12));
      float caustic = pow(max(0.0,1.0-veins*.75),16.0)*detailFade*causticPatch;
      vec2 grid = abs(fract(p*.63)-.5);
      float tileEdge = smoothstep(.478,.496,max(grid.x,grid.y));
      float tileTone = sin(floor(p.x*.63)*1.7+floor(p.y*.63)*2.8)*.012;
      vec3 jade = mix(vec3(.065,.135,.102),vec3(.009,.020,.035),uNight);
      if(uMood>.5&&uMood<1.5)jade=mix(vec3(.066,.119,.085),vec3(.015,.025,.031),uNight);
      if(uMood>1.5&&uMood<2.5)jade=mix(vec3(.035,.105,.143),vec3(.008,.025,.043),uNight);
      if(uMood>2.5&&uMood<3.5)jade=mix(vec3(.018,.087,.11),vec3(.003,.014,.029),uNight);
      if(uMood>3.5)jade=mix(vec3(.028,.119,.086),vec3(.005,.029,.027),uNight);
      vec3 water = mix(jade+tileTone*.35,reflection,mix(.29,.43,uNight));
      water -= tileEdge*mix(.003,.001,uNight)*detailFade*causticPatch;
      water += caustic*mix(vec3(.047,.061,.035),vec3(.007,.012,.022),uNight);
      float rippleGlow=pow(max(0.0,sin(pointerDistance*7.0-uTime*3.2)),8.0)*exp(-pointerDistance*.75)*uInteraction;
      water += rippleGlow*mix(vec3(.024,.048,.035),vec3(.006,.018,.022),uNight)*detailFade;
      water += pow(max(0.0,sin(p.y*7.0+p.x*2.0-t)),28.0)*.005*detailFade;
      float distanceFade = smoothstep(25.0,70.0,length(vWorld-cameraPosition));
      water = mix(water,gardenSky(.25,uMood,uNight),distanceFade);
      gl_FragColor = vec4(water,1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }
  `,
};

const skyVertex = `varying vec3 vPosition; void main(){ vPosition=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`;
const skyFragment = `
  uniform float uNight;
  uniform float uMood;
  varying vec3 vPosition;
  ${atmospherePalette}
  void main(){
    float height=clamp(normalize(vPosition).y*.8+.25,.25,1.0);
    gl_FragColor=vec4(gardenSky(height,uMood,uNight),1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

const particleVertex = `
  attribute float aScale;
  attribute float aPhase;
  uniform float uTime;
  uniform float uNight;
  uniform float uDpr;
  varying float vOpacity;
  varying float vPhase;
  void main(){
    vec3 p=position;
    p.x+=sin(uTime*.24+aPhase*6.28)*.28;
    p.y+=sin(uTime*.31+aPhase*13.0)*.22;
    p.z+=cos(uTime*.16+aPhase*9.0)*.15;
    vec4 mv=modelViewMatrix*vec4(p,1.0);
    gl_Position=projectionMatrix*mv;
    gl_PointSize=clamp((3.0+aScale*8.0)*uDpr*(10.0/-mv.z),1.0,22.0);
    vOpacity=mix(.30,.65,uNight)*(.62+.38*sin(uTime*.8+aPhase*30.0));
    vPhase=aPhase;
  }
`;
const particleFragment = `
  uniform float uNight;
  varying float vOpacity;
  varying float vPhase;
  void main(){
    float r=length(gl_PointCoord-.5);
    float alpha=exp(-r*r*24.0)*(1.0-smoothstep(.30,.5,r));
    vec3 c=mix(vec3(.99,.86,.49),mix(vec3(.68,.65,.93),vec3(1.0,.66,.22),step(.32,vPhase)),uNight);
    gl_FragColor=vec4(c,alpha*vOpacity);
  }
`;

function randomGenerator(seed: number) {
  return () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
}

function leafGeometry() {
  const geometry = new THREE.BufferGeometry();
  const vertices=[0,.48,.028];const indices:number[]=[];const segments=22;
  for(let i=0;i<=segments;i++){
    const angle=i/segments*Math.PI*2;
    vertices.push(Math.sin(angle)*.245*(.88+.12*Math.cos(angle)),.5+Math.cos(angle)*.5,0);
    if(i>0)indices.push(0,i,i+1);
  }
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function archGeometry(width: number, springHeight: number, thickness: number, depth = .42) {
  const r = width/2;
  const inner = r-thickness;
  const shape = new THREE.Shape();
  shape.moveTo(-r,0);
  shape.lineTo(-r,springHeight);
  shape.absarc(0,springHeight,r,Math.PI,0,true);
  shape.lineTo(r,0);
  shape.lineTo(inner,0);
  shape.lineTo(inner,springHeight);
  shape.absarc(0,springHeight,inner,0,Math.PI,false);
  shape.lineTo(-inner,0);
  shape.closePath();
  return new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:true,bevelSegments:3,steps:1,bevelSize:.023,bevelThickness:.023,curveSegments:48});
}

function glowTexture() {
  const canvas=document.createElement('canvas');
  canvas.width=128; canvas.height=128;
  const ctx=canvas.getContext('2d')!;
  const gradient=ctx.createRadialGradient(64,64,0,64,64,64);
  gradient.addColorStop(0,'rgba(255,255,255,1)');
  gradient.addColorStop(.08,'rgba(255,255,255,.9)');
  gradient.addColorStop(.23,'rgba(255,255,255,.3)');
  gradient.addColorStop(.55,'rgba(255,255,255,.055)');
  gradient.addColorStop(1,'rgba(255,255,255,0)');
  ctx.fillStyle=gradient;ctx.fillRect(0,0,128,128);
  return new THREE.CanvasTexture(canvas);
}

function taperedBranch(curve:THREE.Curve<THREE.Vector3>,base:number,tip:number){
  const segments=22,sides=7,frames=curve.computeFrenetFrames(segments,false),vertices:number[]=[],indices:number[]=[];
  for(let i=0;i<=segments;i++){
    const t=i/segments,p=curve.getPoint(t),r=tip+(base-tip)*Math.pow(1-t,.85);
    for(let j=0;j<=sides;j++){
      const a=j/sides*Math.PI*2;const normal=frames.normals[i].clone().multiplyScalar(Math.cos(a)*r).addScaledVector(frames.binormals[i],Math.sin(a)*r);
      vertices.push(p.x+normal.x,p.y+normal.y,p.z+normal.z);
      if(i<segments&&j<sides){const k=i*(sides+1)+j;indices.push(k,k+sides+1,k+1,k+1,k+sides+1,k+sides+2);}
    }
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.setIndex(indices);geometry.computeVertexNormals();return geometry;
}

function wornStone(radius:number,height:number,seed:number){
  const geometry=new THREE.CylinderGeometry(radius,radius*1.025,height,48,1);
  const positions=geometry.attributes.position;
  for(let i=0;i<positions.count;i++){
    const x=positions.getX(i),z=positions.getZ(i),angle=Math.atan2(z,x);
    const irregular=1+Math.sin(angle*3+seed)*.075+Math.sin(angle*7-seed)*.023;
    positions.setX(i,x*irregular);positions.setZ(i,z*irregular);
  }
  geometry.computeVertexNormals();return geometry;
}

function stoneTexture() {
  const canvas=document.createElement('canvas');canvas.width=256;canvas.height=256;
  const ctx=canvas.getContext('2d')!;
  ctx.fillStyle='#d4d0c4';ctx.fillRect(0,0,256,256);
  const random=randomGenerator(981);
  for(let i=0;i<95;i++){
    const x=random()*256,y=random()*256,r=8+random()*45;const wash=ctx.createRadialGradient(x,y,0,x,y,r);
    wash.addColorStop(0,i%2?'#987c551b':'#f8e9c430');wash.addColorStop(1,'#bbae8200');ctx.fillStyle=wash;ctx.fillRect(x-r,y-r,r*2,r*2);
  }
  ctx.strokeStyle='#7b78562c';ctx.lineWidth=.5;
  for(let i=0;i<12;i++){const x=random()*256;ctx.beginPath();ctx.moveTo(x,0);ctx.bezierCurveTo(x-9,70,x+12,154,x+3,256);ctx.stroke();}
  for(let i=0;i<16000;i++){
    const light=random()>.5;
    ctx.fillStyle=light?'rgba(255,255,241,.065)':'rgba(85,87,62,.045)';
    const size=random()*1.4+.3;
    ctx.fillRect(random()*256,random()*256,size,size);
  }
  const texture=new THREE.CanvasTexture(canvas);
  texture.wrapS=texture.wrapT=THREE.RepeatWrapping;
  texture.repeat.set(2,3);texture.colorSpace=THREE.SRGBColorSpace;
  return texture;
}

function celestialTexture(){
  const canvas=document.createElement('canvas');canvas.width=256;canvas.height=256;
  const ctx=canvas.getContext('2d')!;const gradient=ctx.createRadialGradient(128,128,0,128,128,128);
  gradient.addColorStop(0,'rgba(255,255,255,1)');gradient.addColorStop(.28,'rgba(255,255,255,1)');
  gradient.addColorStop(.295,'rgba(255,255,255,.5)');gradient.addColorStop(.33,'rgba(255,255,255,.1)');
  gradient.addColorStop(.5,'rgba(255,255,255,.035)');gradient.addColorStop(1,'rgba(255,255,255,0)');
  ctx.fillStyle=gradient;ctx.fillRect(0,0,256,256);return new THREE.CanvasTexture(canvas);
}

class LivingScene extends HTMLElement {
  private renderer: THREE.WebGLRenderer | null = null;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(41,1,.1,130);
  private water: Reflector | null = null;
  private sky: THREE.ShaderMaterial | null = null;
  private particleMaterial: THREE.ShaderMaterial | null = null;
  private sun: THREE.DirectionalLight | null = null;
  private ambient: THREE.HemisphereLight | null = null;
  private glowMap: THREE.Texture | null = null;
  private sunDisc: THREE.Sprite | null = null;
  private nightFill:THREE.SpotLight|null=null;
  private archInlay:THREE.MeshStandardMaterial|null=null;
  private botanicalTime={value:14};
  private botanicalMaterials:THREE.MeshBasicMaterial[]=[];
  private botanicalNight=new THREE.Color('#68718f');
  private foregroundBotanical:THREE.Group|null=null;
  private portalScenery:ReturnType<typeof createPortalScenery>|null=null;
  private portalFlora:ReturnType<typeof createPortalFlora>|null=null;
  private pondLife:ReturnType<typeof createPondLife>|null=null;
  private rippleCount=0;
  private shafts: THREE.ShaderMaterial[] = [];
  private shaftTime=14;
  private lamps: THREE.SpriteMaterial[] = [];
  private sways: Sway[] = [];
  private floats: Float[] = [];
  private variantRoot = new THREE.Group();
  private motionQuery=matchMedia('(prefers-reduced-motion: reduce)');
  private darkQuery=matchMedia('(prefers-color-scheme: dark)');
  private observers: (ResizeObserver | IntersectionObserver | MutationObserver)[]=[];
  private pointer=new THREE.Vector2();
  private smoothPointer=new THREE.Vector2();
  private waterPointer=new THREE.Vector2();
  private tapPointer=new THREE.Vector2();
  private waterHit=new THREE.Vector3();
  private raycaster=new THREE.Raycaster();
  private waterPlane=new THREE.Plane(new THREE.Vector3(0,1,0),.035);
  private frame=0;
  private previousTime=0;
  private nextFrameTime=0;
  private hasSize=false;
  private dirty=true;
  private renderWidth=0;
  private renderHeight=0;
  private time=14;
  private night=0;
  private lampNight=0;
  private targetNight=0;
  private themeTransition:{started:number;fromNight:number;fromLamps:number;target:number}|null=null;
  private themeTransitionId='';
  private inView=true;
  private paused=false;
  private lost=false;
  private interaction=0;
  private interactionTarget=0;
  private touchRippleRemaining=0;
  private quality=1;
  private frameCount=0;
  private focusBlend=0;
  private focusTarget=0;
  private variant: Variant='portal';
  private readonly palettes={
    fogDay:new THREE.Color('#a8b6b0'),fogNight:new THREE.Color('#17233d'),
    sunDay:new THREE.Color('#ffddb0'),sunNight:new THREE.Color('#c5bfde'),
    skyDay:new THREE.Color('#ddd7bd'),skyNight:new THREE.Color('#9a95b3'),
    groundDay:new THREE.Color('#697254'),groundNight:new THREE.Color('#2b344e'),
  };

  connectedCallback(){
    if(this.renderer)return;
    const canvas=this.querySelector('canvas');
    if(!(canvas instanceof HTMLCanvasElement))return;
    this.variant=(this.dataset.variant as Variant)||'portal';
    this.targetNight=this.readTheme();this.night=this.targetNight;this.lampNight=this.targetNight;
    this.themeTransition=null;this.themeTransitionId=document.documentElement.dataset.themeTransitionId||'';
    this.paused=document.documentElement.dataset.motion==='paused';
    this.lost=false;this.inView=true;this.hasSize=false;this.dirty=true;
    this.previousTime=0;this.nextFrameTime=0;this.renderWidth=0;this.renderHeight=0;
    this.quality=innerWidth<700?.8:1;
    try{
      this.renderer=new THREE.WebGLRenderer({canvas,alpha:false,antialias:true,powerPreference:'low-power'});
      this.renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5)*this.quality);
      this.renderer.outputColorSpace=THREE.SRGBColorSpace;
      this.renderer.toneMapping=THREE.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure=.98;
      this.renderer.shadowMap.enabled=true;
      this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;
      this.renderer.info.autoReset=false;
      this.buildScene();
      // A saved pause preference must show the same pose and shader phase as a running scene.
      this.updateMotion(0);
      this.applyTheme();
      this.resize();
      this.dataset.renderer='webgl';
    }catch(error){
      console.warn('The garden is using its illustrated fallback.',error);
      this.dataset.renderer='fallback';
      this.dispose();return;
    }
    const resize=new ResizeObserver(this.resize);resize.observe(this);
    const intersection=new IntersectionObserver(([entry])=>{this.inView=entry.isIntersecting;this.schedule();},{rootMargin:'80px'});intersection.observe(this);
    const theme=new MutationObserver(this.settingsChanged);theme.observe(document.documentElement,{attributes:true,attributeFilter:['data-theme','data-motion','data-theme-transition','data-theme-transition-id']});
    const focus=new MutationObserver(()=>{this.focusTarget={work:.7,notes:-.5,study:1,about:-.8}[this.dataset.focus||'']||0;this.schedule();});focus.observe(this,{attributes:true,attributeFilter:['data-focus']});
    this.observers=[resize,intersection,theme,focus];
    this.motionQuery.addEventListener('change',this.settingsChanged);
    this.darkQuery.addEventListener('change',this.settingsChanged);
    document.addEventListener('visibilitychange',this.visibilityChanged);
    window.addEventListener('pointermove',this.pointerMoved,{passive:true});
    window.addEventListener('pointerdown',this.pointerPressed,{passive:true});
    document.documentElement.addEventListener('pointerleave',this.pointerLeft);
    canvas.addEventListener('webglcontextlost',this.contextLost);
    canvas.addEventListener('webglcontextrestored',this.contextRestored);
    this.schedule();
  }

  disconnectedCallback(){this.dispose();}

  getSceneDiagnostics(){
    return {frames:this.frameCount,ripples:this.rippleCount,lightShaftTime:this.shaftTime,themeMix:this.night,lampMix:this.lampNight,skyMix:this.sky?.uniforms.uNight.value,waterMix:(this.water?.material as THREE.ShaderMaterial|undefined)?.uniforms.uNight.value,lampIntensity:this.nightFill?.intensity,themeTransition:!!this.themeTransition,portalLayers:this.portalScenery?['scenery','flora','pond-life']:[],drawCalls:this.renderer?.info.render.calls||0,textures:this.renderer?.info.memory.textures||0,pixelRatio:this.renderer?.getPixelRatio()||0,reflectionSize:this.water?.getRenderTarget().width||0,visible:this.inView,paused:this.paused||this.motionQuery.matches};
  }

  private buildScene(){
    const scene=this.scene;
    scene.fog=new THREE.FogExp2(this.palettes.fogDay,.015);
    const mood={portal:0,work:1,notes:2,study:3,about:4}[this.variant];
    this.sky=new THREE.ShaderMaterial({uniforms:{uNight:{value:this.night},uMood:{value:mood}},vertexShader:skyVertex,fragmentShader:skyFragment,side:THREE.BackSide,depthWrite:false});
    const skyDome=new THREE.Mesh(new THREE.SphereGeometry(90,24,14),this.sky);scene.add(skyDome);
    this.ambient=new THREE.HemisphereLight('#c2d9d0','#37615d',1.35);scene.add(this.ambient);
    this.sun=new THREE.DirectionalLight('#ffedcc',2.6);
    this.sun.position.set(-5,11,7);this.sun.castShadow=true;
    this.sun.shadow.mapSize.set(1024,1024);
    Object.assign(this.sun.shadow.camera,{left:-11,right:11,top:12,bottom:-8,near:1,far:36});
    this.sun.shadow.bias=-.0006;this.sun.shadow.normalBias=.035;
    this.sun.target.position.set(2,1,-1);scene.add(this.sun,this.sun.target);
    const fill=new THREE.DirectionalLight('#80b6b5',.46);fill.position.set(6,5,-8);scene.add(fill);
    this.nightFill=new THREE.SpotLight('#ffd5a4',0,15,Math.PI/3,1,1.2);
    this.nightFill.position.set(1.6,4.6,5.3);this.nightFill.target.position.set(3.3,2.65,.1);scene.add(this.nightFill,this.nightFill.target);

    this.glowMap=glowTexture();
    const sunMaterial=new THREE.SpriteMaterial({map:celestialTexture(),color:'#fff0c9',transparent:true,opacity:.78,depthWrite:false,blending:THREE.AdditiveBlending});
    this.sunDisc=new THREE.Sprite(sunMaterial);this.sunDisc.position.set(-5,10,-24);this.sunDisc.scale.set(6.3,6.3,1);scene.add(this.sunDisc);

    this.water=new Reflector(new THREE.PlaneGeometry(250,250),{textureWidth:Math.round(768*this.quality),textureHeight:Math.round(768*this.quality),clipBias:.003,multisample:0,shader:waterShader});
    this.water.rotation.x=-Math.PI/2;this.water.position.y=-.035;
    (this.water.material as THREE.ShaderMaterial).uniforms.uMood.value=mood;
    scene.add(this.water);

    const stone=new THREE.MeshStandardMaterial({color:'#f4f0df',map:stoneTexture(),roughness:.88,metalness:0});
    const paleStone=new THREE.MeshStandardMaterial({color:'#b2bdad',roughness:.91});
    const darkStone=new THREE.MeshStandardMaterial({color:'#708c78',roughness:1});
    const brass=new THREE.MeshStandardMaterial({color:'#b69b5d',roughness:.5,metalness:.55});
    if(this.variant==='portal'){
    const architecture=new THREE.Group();architecture.position.set(3.5,.12,-.8);architecture.rotation.y=-.18;scene.add(architecture);
    const terraceShape=new THREE.Shape();terraceShape.moveTo(-2.15,-.95);terraceShape.lineTo(-1.6,-1.28);terraceShape.lineTo(-.3,-1.12);terraceShape.lineTo(.5,-1.34);terraceShape.lineTo(2.15,-.8);terraceShape.lineTo(2.08,.25);terraceShape.lineTo(1.68,.85);terraceShape.lineTo(.63,1.21);terraceShape.lineTo(-.72,1.06);terraceShape.lineTo(-1.94,.65);terraceShape.closePath();
    const terrace=new THREE.Mesh(new THREE.ExtrudeGeometry(terraceShape,{depth:.045,bevelEnabled:true,bevelThickness:.02,bevelSize:.035,bevelSegments:2,steps:1}),stone);terrace.rotation.x=-Math.PI/2;terrace.position.set(.1,-.015,.2);terrace.receiveShadow=true;terrace.castShadow=true;architecture.add(terrace);
    const mainArch=new THREE.Mesh(archGeometry(2.85,2.64,.20,.25),stone);mainArch.position.set(-.25,.1,.1);mainArch.castShadow=true;mainArch.receiveShadow=true;architecture.add(mainArch);
    const second=new THREE.Mesh(archGeometry(1.95,2.05,.14,.20),paleStone);second.position.set(1.82,.09,-1.15);second.rotation.y=-.19;second.castShadow=true;second.receiveShadow=true;architecture.add(second);
    // Narrow bronze inlay traces the inner threshold without forming a neon outline.
    this.archInlay=new THREE.MeshStandardMaterial({color:'#b49c68',roughness:.5,metalness:.4,emissive:'#ffd695',emissiveIntensity:0});
    const inlay=new THREE.Mesh(archGeometry(2.43,2.64,.008,.008),this.archInlay);inlay.position.set(-.25,.1,.376);architecture.add(inlay);

    const random=randomGenerator(71);
    // Low garden islands and stepping stones give the water a human scale.
    for(let i=0;i<6;i++){
      const mesh=new THREE.Mesh(wornStone(.3+random()*.16,.045,71+i),i%2?stone:paleStone);
      mesh.position.set(1.1-Math.sin(i*.51)*1.1,.006,1.6+i*.64);mesh.rotation.y=random()*3;mesh.scale.z=.7+random()*.3;mesh.receiveShadow=true;scene.add(mesh);
    }
    this.makeTree(7.65,.08,-2.4,1.32,901,true);
    this.makeTree(-9.2,-.08,1.6,1.8,441,false);
    this.makeTree(12.2,-.05,-8,1.6,291,true);
    this.makeTree(-6.8,-.1,-15,1.3,27,true);
    this.makeTree(4.8,-.1,-21,1.65,677,false);
    this.makeFern(5.6,.14,-.6,.8,18);
    this.makeFern(8.2,.07,-2.0,1.1,46);
    this.makeFern(-7.5,-.03,5.6,1.35,33);
    this.makeFern(8.8,-.03,5.4,1.55,81);
    this.makeGrasses(5.9,.29,-1.1,1.0,66);
    this.makeGrasses(-5.8,-.03,4.5,1.1,26);
    this.makeLilyPads();
    this.makeForegroundBotanical();
    this.portalScenery=createPortalScenery();this.portalFlora=createPortalFlora();this.pondLife=createPondLife();
    scene.add(this.portalScenery.group,this.portalFlora.group,this.pondLife.group);
    }
    this.makeParticles();
    this.makeShafts();
    if(this.variant==='portal'){
    this.makeLantern(4.55,1.25,.55,.14);
    this.makeLantern(6.0,1.9,-.45,.12);
    this.makeLantern(2.9,3.1,-.4,.065);
    }
    scene.add(this.variantRoot);
    this.buildVariant(stone,brass);
  }

  private block(parent:THREE.Object3D,material:THREE.Material,size:number[],position:number[]){
    const mesh=new THREE.Mesh(new THREE.BoxGeometry(...size as [number,number,number]),material);
    mesh.position.set(...position as [number,number,number]);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;
  }

  private makeTree(x:number,y:number,z:number,scale:number,seed:number,light:boolean){
    const random=randomGenerator(seed);
    const root=new THREE.Group();root.position.set(x,y,z);root.scale.setScalar(scale);this.scene.add(root);
    const bark=new THREE.MeshStandardMaterial({color:light?'#786f53':'#5e604b',roughness:1});
    const trunkPath=new THREE.CatmullRomCurve3([new THREE.Vector3(0,0,0),new THREE.Vector3(-.14,.9,.08),new THREE.Vector3(.04,1.8,-.06),new THREE.Vector3(-.35,2.75,.04),new THREE.Vector3(-.12,3.55,0)]);
    const trunk=new THREE.Mesh(taperedBranch(trunkPath,.135,.009),bark);trunk.castShadow=true;root.add(trunk);
    const crown=new THREE.Group();root.add(crown);this.sways.push({object:crown,base:0,phase:seed*.17,amount:.014,axis:'z'});
    const maps=[createCanopyTexture(seed,false),createCanopyTexture(seed+13,true),createCanopyTexture(seed+51,false)];
    for(let branch=0;branch<7;branch++){
      const t=.50+branch*.045;const start=trunkPath.getPoint(t);
      const side=branch%2?1:-1;const reach=.7+random()*.9;
      const tip=new THREE.Vector3(side*reach-.1,2.58+branch*.13+random()*.4,(random()-.5)*1.65);
      const middle=start.clone().lerp(tip,.14);middle.y=start.y+(tip.y-start.y)*1.08;
      const curve=new THREE.QuadraticBezierCurve3(start,middle,tip);
      if(z>-8){const twig=new THREE.Mesh(taperedBranch(curve,.022*(1-branch*.05),.001),bark);twig.castShadow=true;crown.add(twig);}
      const card=this.botanicalCard(maps[branch%3],seed+branch,2.5+random()*.55,1.68+random()*.2);
      card.position.copy(tip);card.position.y+=.11;card.rotation.y=(random()-.5)*.7;card.rotation.z=(random()-.5)*.16;crown.add(card);
    }
    const top=this.botanicalCard(maps[1],seed+18,2.6,1.8);top.position.set(-.16,3.67,.18);crown.add(top);
  }

  private botanicalCard(map:THREE.Texture,seed:number,width:number,height:number){
    const material=new THREE.MeshBasicMaterial({map,color:'#ffffff',transparent:true,alphaTest:.008,depthWrite:false,side:THREE.DoubleSide,fog:true});
    material.onBeforeCompile=shader=>{
      shader.uniforms.uGardenTime=this.botanicalTime;shader.uniforms.uGardenPhase={value:seed*.13};
      shader.vertexShader='uniform float uGardenTime;uniform float uGardenPhase;\n'+shader.vertexShader;
      shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nfloat flutter=sin(uGardenTime*.67+uGardenPhase+position.y*1.4);transformed.x+=flutter*.037*(uv.y+.2);transformed.y+=sin(uGardenTime*.53+position.x*2.0+uGardenPhase)*.012;');
    };
    material.customProgramCacheKey=()=> 'garden-watercolor-v3';material.userData.dayTint=new THREE.Color('#ffffff');material.userData.nightTint=this.botanicalNight;this.botanicalMaterials.push(material);
    const card=new THREE.Mesh(new THREE.PlaneGeometry(width,height,8,5),material);card.castShadow=true;return card;
  }

  private makeForegroundBotanical(){
    const group=new THREE.Group();this.foregroundBotanical=group;this.scene.add(group);
    const map=createCanopyTexture(7211,false);
    for(let i=0;i<2;i++){
      const card=this.botanicalCard(map,7211+i,3.7-i*.35,2.65-i*.22);
      card.position.set(i*.8,-i*.65,-i*.28);card.rotation.z=-.15+i*.08;card.rotation.y=-.12;
      card.material.fog=false;card.material.userData.dayTint=new THREE.Color(i?'#829268':'#71865a');card.material.userData.nightTint=new THREE.Color('#3e4b67');
      card.castShadow=false;group.add(card);
    }
    this.sways.push({object:group,base:0,phase:6.2,amount:.009,axis:'z'});
  }

  private makeFern(x:number,y:number,z:number,scale:number,seed:number){
    const random=randomGenerator(seed);
    const root=new THREE.Group();root.position.set(x,y,z);root.scale.setScalar(scale);this.scene.add(root);
    const map=createFernTexture(seed);
    for(let i=0;i<3;i++){
      const fern=this.botanicalCard(map,seed+i,1.75,1.75);fern.position.set((i-1)*.17,.73,(i-1)*.19);fern.rotation.y=(i-1)*.55;fern.rotation.z=(random()-.5)*.15;root.add(fern);
    }
    this.sways.push({object:root,base:0,phase:seed,amount:.025,axis:'z'});
  }

  private makeGrasses(x:number,y:number,z:number,scale:number,seed:number){
    const random=randomGenerator(seed);const root=new THREE.Group();root.position.set(x,y,z);root.scale.setScalar(scale);this.scene.add(root);
    const mat=new THREE.MeshStandardMaterial({color:'#8eaa68',roughness:1,side:THREE.DoubleSide});
    for(let i=0;i<24;i++){
      const height=.4+random()*.8;const bend=(random()-.5)*.6;
      const shape=new THREE.Shape();shape.moveTo(-.013,0);shape.quadraticCurveTo(bend*.3,height*.7,bend,height);shape.quadraticCurveTo(bend*.3+.028,height*.45,.013,0);
      const mesh=new THREE.Mesh(new THREE.ShapeGeometry(shape),mat);mesh.position.set((random()-.5)*.65,0,(random()-.5)*.6);mesh.rotation.y=random()*6.28;root.add(mesh);
    }
    this.sways.push({object:root,base:0,phase:seed,amount:.046,axis:'z'});
  }

  private makeLilyPads(){
    const random=randomGenerator(297);const mat=new THREE.MeshStandardMaterial({color:'#447c57',roughness:.72,side:THREE.DoubleSide});
    for(let i=0;i<18;i++){
      const pad=new THREE.Mesh(new THREE.CircleGeometry(.18+random()*.22,28,.15,Math.PI*2-.3),mat);
      pad.rotation.x=-Math.PI/2;pad.rotation.z=random()*6.28;pad.position.set(5.3+(random()-.5)*5,.006,3.7+random()*4);this.scene.add(pad);
      this.floats.push({object:pad,base:.008,phase:i,amount:.012});
      if(i%5===0){
        const flower=new THREE.Group();flower.position.copy(pad.position);flower.position.y=.045;this.scene.add(flower);
        const petals=new THREE.MeshStandardMaterial({color:'#f0e5c4',roughness:.6,side:THREE.DoubleSide});
        for(let j=0;j<7;j++){const petal=new THREE.Mesh(leafGeometry(),petals);petal.scale.set(.16,.24,.16);petal.rotation.set(-.8,j*Math.PI*2/7,0);flower.add(petal);}
        this.floats.push({object:flower,base:.045,phase:i,amount:.012});
      }
    }
  }

  private makeParticles(){
    const random=randomGenerator(161);const count=this.quality<1?65:110;
    const positions=new Float32Array(count*3),scales=new Float32Array(count),phases=new Float32Array(count);
    for(let i=0;i<count;i++){positions.set([(random()-.38)*16,.4+random()*7,(random()-.5)*12],i*3);scales[i]=random();phases[i]=random();}
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));geometry.setAttribute('aScale',new THREE.BufferAttribute(scales,1));geometry.setAttribute('aPhase',new THREE.BufferAttribute(phases,1));
    this.particleMaterial=new THREE.ShaderMaterial({uniforms:{uTime:{value:0},uNight:{value:this.night},uDpr:{value:this.renderer!.getPixelRatio()}},vertexShader:particleVertex,fragmentShader:particleFragment,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending});
    this.scene.add(new THREE.Points(geometry,this.particleMaterial));
  }

  private makeShafts(){
    for(let i=0;i<3;i++){
      const mat=new THREE.ShaderMaterial({uniforms:{uNight:{value:this.night},uTime:{value:this.shaftTime},uPhase:{value:i*1.73}},transparent:true,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,
        vertexShader:`
          uniform float uTime;
          uniform float uPhase;
          uniform float uNight;
          varying vec2 vUv;
          void main(){
            vUv=uv;
            vec3 p=position;
            // Anchor the upper source; only the lower spill wanders with the canopy.
            float drift=sin(uTime*.38+uPhase)*.21+sin(uTime*.67+uPhase*2.1)*.065;
            p.x+=drift*(1.0-uv.y)*mix(1.0,.55,uNight);
            gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.0);
          }
        `,
        fragmentShader:`
          uniform float uNight;
          uniform float uTime;
          uniform float uPhase;
          varying vec2 vUv;
          void main(){
            float t=uTime;
            float drift=(sin(vUv.y*6.0-t*.43+uPhase)*.042+sin(vUv.y*11.0+t*.29+uPhase)*.015)*(1.0-vUv.y);
            float width=.94+.065*sin(t*.51+uPhase);
            float across=(vUv.x-.5-drift)/width+.5;
            float feather=pow(max(0.0,sin(clamp(across,0.0,1.0)*3.14159)),4.0);
            float taper=pow(vUv.y,.7)*(1.0-smoothstep(.87,1.0,vUv.y));
            float breath=.084+.013*sin(t*.57+uPhase)+.006*sin(t*.91+uPhase*1.8);
            float leafShadow=.82+.18*smoothstep(-.65,.8,sin(vUv.y*9.0-t*.64+uPhase)+.35*sin(vUv.x*12.0+t*.37));
            float alpha=feather*taper*breath*leafShadow*mix(1.0,.29,uNight);
            gl_FragColor=vec4(mix(vec3(1.0,.88,.51),vec3(.3,.55,.7),uNight),alpha);
          }
        `});
      const beam=new THREE.Mesh(new THREE.PlaneGeometry(1.1+i*.2,12),mat);beam.frustumCulled=false;beam.position.set(-1+i*2.7,5.5,-1.4-i*1.5);beam.rotation.z=-.3;this.scene.add(beam);this.shafts.push(mat);
    }
  }

  private makeLantern(x:number,y:number,z:number,size:number){
    const mat=new THREE.SpriteMaterial({map:this.glowMap!,color:'#ffca72',transparent:true,opacity:.15,blending:THREE.AdditiveBlending,depthWrite:false});
    const sprite=new THREE.Sprite(mat);sprite.position.set(x,y,z);sprite.scale.setScalar(size*9);this.scene.add(sprite);this.lamps.push(mat);
    this.floats.push({object:sprite,base:y,phase:x*3,amount:.12});
    const core=new THREE.Mesh(new THREE.SphereGeometry(size*.16,8,6),new THREE.MeshBasicMaterial({color:'#fce4a6'}));core.position.copy(sprite.position);this.scene.add(core);this.floats.push({object:core,base:y,phase:x*3,amount:.12});
  }

  private buildVariant(stone:THREE.Material,brass:THREE.Material){
    const group=this.variantRoot;group.position.set(3.5,2.8,.2);
    if(this.variant==='portal')return;
    if(this.variant==='work'){
      group.position.set(3.55,2.7,-.2);
      const colors=['#62998a','#c6aa72','#87a6bb'];
      for(let i=0;i<3;i++){
        const frame=new THREE.Group();frame.position.set((i-1)*1.9,(i===1?.82:0),i===1?-.35:.15);frame.rotation.y=(i-1)*-.17;frame.rotation.z=(i-1)*-.025;group.add(frame);
        this.block(frame,brass,[1.61,2.2,.105],[0,0,0]);
        const interior=new THREE.MeshStandardMaterial({color:i===1?'#b9b193':'#b2c3b6',roughness:.95});
        this.block(frame,interior,[1.5,2.09,.12],[0,0,.025]);
        const sculptureGeometry=i===0?new THREE.SphereGeometry(.5,40,24):i===1?new THREE.IcosahedronGeometry(.56,0):new THREE.TorusKnotGeometry(.33,.115,80,10,2,3);
        const sculpture=new THREE.Mesh(sculptureGeometry,new THREE.MeshStandardMaterial({color:colors[i],roughness:i===0?.17:.42,metalness:i===0?.32:.15}));sculpture.position.set(0,.04,.38);sculpture.castShadow=true;frame.add(sculpture);
        this.floats.push({object:sculpture,base:.04,phase:i*1.7,amount:.08,spin:.09});
        this.floats.push({object:frame,base:frame.position.y,phase:i*2,amount:.14});
        const plinth=new THREE.Mesh(new THREE.CylinderGeometry(.7,.78,.5,48),stone);plinth.position.set(3.55+(i-1)*1.9,.25,i===1?-.35:.15);plinth.castShadow=true;plinth.receiveShadow=true;this.scene.add(plinth);
        this.makeLantern(3.55+(i-1)*1.9,1.05,i===1?-.35:.15,.08);
      }
    }else if(this.variant==='notes'){
      group.position.set(3.65,3.05,-.1);group.scale.setScalar(1.55);
      const paper=new THREE.MeshStandardMaterial({color:'#eae4cb',roughness:1,side:THREE.DoubleSide});
      for(let i=0;i<5;i++){
        const page=new THREE.Group();page.position.set((i-2)*.71,Math.sin(i*1.8)*.67,(i%2)*.42);page.rotation.set(-.12+i*.05,(i-2)*.18,(i-2)*-.15);group.add(page);
        const geometry=new THREE.PlaneGeometry(.92,1.26,10,14);const positions=geometry.attributes.position;
        for(let j=0;j<positions.count;j++)positions.setZ(j,Math.sin(positions.getY(j)*3.1+positions.getX(j)*1.7)*.06);geometry.computeVertexNormals();
        const sheet=new THREE.Mesh(geometry,paper);sheet.castShadow=true;page.add(sheet);
        const ink=new THREE.LineBasicMaterial({color:'#749787',transparent:true,opacity:.7});
        for(let j=0;j<5;j++){
          const points:THREE.Vector3[]=[];for(let k=0;k<12;k++){const x=-.3+k*.051;const y=.32-j*.14;points.push(new THREE.Vector3(x,y,Math.sin(y*3.1+x*1.7)*.06+.006));}page.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),ink));
        }
        this.floats.push({object:page,base:page.position.y,phase:i*1.3,amount:.16,spin:.025});
      }
      const inkPath=new THREE.CatmullRomCurve3([new THREE.Vector3(-2.3,-.5,.5),new THREE.Vector3(-1.2,-1.25,.4),new THREE.Vector3(.2,-1.2,.0),new THREE.Vector3(1.2,-.6,-.4),new THREE.Vector3(2.3,.2,-.7)]);
      const flowingInk=new THREE.Mesh(new THREE.TubeGeometry(inkPath,70,.009,5,false),new THREE.MeshBasicMaterial({color:'#95c7c0',transparent:true,opacity:.63}));group.add(flowingInk);
      this.makeFern(7.7,-.02,3.4,1.15,315);
      for(let i=0;i<4;i++)this.makeLantern(1.7+i*1.1,1.7+Math.sin(i)*.3,.7,.065);
    }else if(this.variant==='study'){
      group.position.set(3.65,2.7,-.2);group.scale.setScalar(1.75);
      const material=new THREE.LineBasicMaterial({color:'#d4d9a0',transparent:true,opacity:.68});
      for(let i=0;i<5;i++){
        const points:THREE.Vector3[]=[];
        for(let j=0;j<=100;j++){const a=j/100*Math.PI*2;points.push(new THREE.Vector3(Math.cos(a)*(1+i*.085),Math.sin(a)*(1+i*.085),0));}
        const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),material);line.rotation.set(i*.48,i*.57,.25);group.add(line);
      }
      const crystal=new THREE.Mesh(new THREE.OctahedronGeometry(.53),new THREE.MeshStandardMaterial({color:'#94b4a1',roughness:.2,metalness:.4}));group.add(crystal);
      this.floats.push({object:group,base:group.position.y,phase:2,amount:.13,spin:.08});
      for(let i=0;i<5;i++)this.makeLantern(3.65+Math.cos(i*1.256)*1.75,2.7+Math.sin(i*1.256)*1.75,.2,.065);
    }else{
      const island=new THREE.Mesh(wornStone(1.74,.13,617),stone);island.position.set(3.9,.07,-.3);island.castShadow=true;island.receiveShadow=true;this.scene.add(island);
      const earth=new THREE.Mesh(wornStone(1.52,.035,671),new THREE.MeshStandardMaterial({color:'#79774f',roughness:1}));earth.position.set(3.9,.15,-.3);this.scene.add(earth);
      this.makeTree(3.9,.17,-.3,1.18,883,true);
      this.makeGrasses(3.0,.38,.2,.75,913);this.makeFern(5.0,.36,-.2,.72,125);
      for(let i=0;i<10;i++)this.makeLantern(3.9+Math.cos(i*2.4)*1.3,1.1+i*.32,Math.sin(i*2.4)*.85,.075);
      this.makeLilyPads();
    }
  }

  private readTheme(){const theme=document.documentElement.dataset.theme;return theme==='dark'||(!theme&&this.darkQuery.matches)?1:0;}

  private applyTheme(){
    const n=this.night,l=this.lampNight;
    this.sky!.uniforms.uNight.value=n;
    (this.scene.fog as THREE.FogExp2).color.copy(this.palettes.fogDay).lerp(this.palettes.fogNight,n);
    this.sun!.color.copy(this.palettes.sunDay).lerp(this.palettes.sunNight,n);this.sun!.intensity=THREE.MathUtils.lerp(2.6,.85,n);
    this.ambient!.color.copy(this.palettes.skyDay).lerp(this.palettes.skyNight,n);this.ambient!.groundColor.copy(this.palettes.groundDay).lerp(this.palettes.groundNight,n);this.ambient!.intensity=THREE.MathUtils.lerp(1.35,.88,n);
    this.nightFill!.intensity=l*8.5;if(this.archInlay)this.archInlay.emissiveIntensity=l*.26;
    this.botanicalMaterials.forEach(material=>{material.color.copy(material.userData.dayTint as THREE.Color).lerp(material.userData.nightTint as THREE.Color,n);});
    (this.water!.material as THREE.ShaderMaterial).uniforms.uNight.value=n;
    this.particleMaterial!.uniforms.uNight.value=l;
    this.shafts.forEach(mat=>{mat.uniforms.uNight.value=n;});
    this.lamps.forEach(mat=>{mat.opacity=THREE.MathUtils.lerp(.13,.85,l);});
    this.sunDisc!.material.color.copy(this.palettes.sunDay).lerp(this.palettes.sunNight,n);
    this.sunDisc!.material.opacity=THREE.MathUtils.lerp(.78,.62,n);
    this.renderer!.toneMappingExposure=THREE.MathUtils.lerp(.98,.93,n);
  }

  private resize=()=>{
    if(!this.renderer)return;
    const {width,height}=this.getBoundingClientRect();
    this.hasSize=width>0&&height>0;
    if(!this.hasSize){this.schedule();return;}
    this.quality=width<700?.8:1;
    const pixelRatio=Math.min(devicePixelRatio||1,1.5)*this.quality;
    if(this.renderer.getPixelRatio()!==pixelRatio){
      this.renderer.setPixelRatio(pixelRatio);
      if(this.particleMaterial)this.particleMaterial.uniforms.uDpr.value=pixelRatio;
      this.dirty=true;
    }
    const resolution=Math.round(768*this.quality);
    const reflection=this.water?.getRenderTarget();
    if(reflection&&reflection.width!==resolution){reflection.setSize(resolution,resolution);this.dirty=true;}
    if(width!==this.renderWidth||height!==this.renderHeight){
      this.renderer.setSize(width,height,false);this.renderWidth=width;this.renderHeight=height;
      this.camera.aspect=width/height;this.camera.updateProjectionMatrix();this.dirty=true;
    }
    this.positionCamera();
    // setSize/setPixelRatio clear the drawing buffer immediately. ResizeObserver runs
    // before paint, so refill it here instead of exposing a blank canvas until the
    // next throttled animation frame. render() still skips hidden/offscreen scenes.
    if(this.dirty)this.render();
    this.schedule();
  };

  private positionCamera(){
    const mobile=this.camera.aspect<.85;
    const baseX=mobile?2.1:0;
    const distance=mobile?18:14.5;
    if(this.foregroundBotanical){
      this.foregroundBotanical.position.set(mobile?4.45:4.03,mobile?5.4:5.45,7.4);
      this.foregroundBotanical.scale.setScalar(mobile?.65:1);
    }
    this.camera.position.set(baseX+this.smoothPointer.x*.32+this.focusBlend*.1,4.75-this.smoothPointer.y*.16,distance);
    this.camera.lookAt(baseX+this.smoothPointer.x*.1,2.04+this.smoothPointer.y*.05,-1.4);
  }

  private pointerMoved=(event:PointerEvent)=>{
    if(event.pointerType==='touch'||this.motionQuery.matches||this.paused||!this.inView||!this.hasSize||this.lost)return;
    const rect=this.getBoundingClientRect();
    if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom){this.pointerLeft();return;}
    this.pointer.set((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);
    if(this.overControl(event)){this.interactionTarget=0;return;}
    this.raycaster.setFromCamera(this.pointer,this.camera);
    if(this.raycaster.ray.intersectPlane(this.waterPlane,this.waterHit)&&Math.abs(this.waterHit.x)<125&&Math.abs(this.waterHit.z)<125){this.waterPointer.set(this.waterHit.x,this.waterHit.z);this.interactionTarget=1;}
    else this.interactionTarget=0;
  };
  private pointerLeft=()=>{this.pointer.set(0,0);this.interactionTarget=0;};
  private overControl(event:PointerEvent){return event.target instanceof Element&&!!event.target.closest('a,button,input,select,textarea,summary,[role="button"],[role="slider"],[contenteditable],nav');}
  private pointerPressed=(event:PointerEvent)=>{
    if(this.motionQuery.matches||this.paused||!this.inView||!this.hasSize||this.lost||event.button!==0||!event.isPrimary)return;
    if(this.variant!=='portal'&&event.pointerType!=='touch'&&event.pointerType!=='pen')return;
    if(this.overControl(event))return;
    const rect=this.getBoundingClientRect();
    if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)return;
    this.tapPointer.set((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);
    this.raycaster.setFromCamera(this.tapPointer,this.camera);
    if(!this.raycaster.ray.intersectPlane(this.waterPlane,this.waterHit)||Math.abs(this.waterHit.x)>125||Math.abs(this.waterHit.z)>125)return;
    this.waterPointer.set(this.waterHit.x,this.waterHit.z);this.touchRippleRemaining=.7;this.interaction=1;this.interactionTarget=0;
    this.rippleCount++;this.pondLife?.disturb(this.waterPointer,this.time);
    this.schedule();
  };
  private visibilityChanged=()=>{if(document.hidden)this.pointerLeft();this.schedule();};
  private settingsChanged=()=>{
    const root=document.documentElement;
    const now=performance.now();
    this.advanceTheme(now);
    this.targetNight=this.readTheme();this.paused=root.dataset.motion==='paused';
    if(this.paused||this.motionQuery.matches)this.pointerLeft();
    const id=root.dataset.themeTransitionId||'';
    const manual=root.dataset.themeTransition==='manual'&&!this.paused&&!this.motionQuery.matches&&!document.hidden;
    if(manual&&id!==this.themeTransitionId){
      this.themeTransition={started:Number(root.dataset.themeStarted)||now,fromNight:this.night,fromLamps:this.lampNight,target:this.targetNight};
    }else if(!manual){
      this.themeTransition=null;this.night=this.targetNight;this.lampNight=this.targetNight;
      if(this.motionQuery.matches)this.smoothPointer.set(0,0);
      this.applyTheme();this.positionCamera();this.dirty=true;
      this.render();
    }
    this.themeTransitionId=id;
    this.schedule();
  };

  private advanceTheme(now:number){
    const transition=this.themeTransition;
    if(!transition)return;
    const progress=THREE.MathUtils.clamp((now-transition.started)/1000,0,1);
    const smooth=(start:number,end:number)=>THREE.MathUtils.smoothstep(progress,start,end);
    // At dusk the water cools before the lamps appear; dawn extinguishes lamps first.
    const atmosphere=transition.target===1?smooth(0,.82):smooth(.16,1);
    const lights=transition.target===1?smooth(.30,1):smooth(0,.64);
    this.night=THREE.MathUtils.lerp(transition.fromNight,transition.target,atmosphere);
    this.lampNight=THREE.MathUtils.lerp(transition.fromLamps,transition.target,lights);
    if(progress===1){this.night=transition.target;this.lampNight=transition.target;this.themeTransition=null;}
    this.applyTheme();this.dirty=true;
  }
  private contextLost=(event:Event)=>{event.preventDefault();this.lost=true;this.dataset.renderer='fallback';this.schedule();};
  private contextRestored=()=>{this.lost=false;this.dirty=true;this.dataset.renderer='webgl';this.schedule();};

  private schedule(){
    const transition=!!this.themeTransition;
    const animate=this.isConnected&&this.hasSize&&this.inView&&!document.hidden&&!this.lost&&this.renderer&&(this.dirty||(!this.paused&&!this.motionQuery.matches)||transition);
    if(!animate){cancelAnimationFrame(this.frame);this.frame=0;this.previousTime=0;this.nextFrameTime=0;return;}
    if(!this.frame)this.frame=requestAnimationFrame(this.tick);
  }
  private tick=(now:number)=>{
    this.frame=0;
    // Keep a 30 Hz deadline instead of rounding every interval up to the next display frame.
    const interval=1000/30;
    if(this.nextFrameTime&&now+.5<this.nextFrameTime){this.schedule();return;}
    this.nextFrameTime=this.nextFrameTime?this.nextFrameTime+(1+Math.floor(Math.max(0,now-this.nextFrameTime)/interval))*interval:now+interval;
    const delta=this.previousTime?Math.min((now-this.previousTime)/1000,.08):1/30;
    this.previousTime=now;const ease=1-Math.exp(-delta*2.7);
    if(!this.paused&&!this.motionQuery.matches){
      this.time+=delta;
      this.smoothPointer.lerp(this.pointer,ease);
      this.focusBlend+=(this.focusTarget-this.focusBlend)*ease;
      this.touchRippleRemaining=Math.max(0,this.touchRippleRemaining-delta);
      const rippleTarget=this.touchRippleRemaining>0?1:this.interactionTarget;
      this.interaction+=(rippleTarget-this.interaction)*ease;
      this.shaftTime+=delta*THREE.MathUtils.lerp(1,.6,this.night);
      this.updateMotion(delta);
    }
    this.advanceTheme(now);
    this.positionCamera();this.render();this.schedule();
  };

  private updateMotion(delta:number){
    this.botanicalTime.value=this.time;
    this.sways.forEach(sway=>{sway.object.rotation[sway.axis]=sway.base+Math.sin(this.time*.65+sway.phase)*sway.amount;});
    this.floats.forEach(item=>{item.object.position.y=item.base+Math.sin(this.time*.55+item.phase)*item.amount;if(item.spin)item.object.rotation.y+=delta*item.spin;});
    const uniforms=(this.water!.material as THREE.ShaderMaterial).uniforms;
    uniforms.uTime.value=this.time;uniforms.uPointer.value.copy(this.waterPointer);uniforms.uInteraction.value=this.interaction;
    this.particleMaterial!.uniforms.uTime.value=this.time;
    this.shafts.forEach(mat=>{mat.uniforms.uTime.value=this.shaftTime;});
  }

  private render(){
    if(!this.renderer||this.lost||!this.hasSize||!this.inView||document.hidden)return;
    this.portalScenery?.update(this.time,this.night,this.lampNight);this.portalFlora?.update(this.time,this.night);this.pondLife?.update(this.time,this.night,this.waterPointer,this.interaction);
    this.renderer.info.reset();
    this.renderer.render(this.scene,this.camera);
    this.dirty=false;
    this.frameCount++;
    // Small inspectable counters support runtime checks without changing the interface.
    if(this.frameCount%30===0)this.dataset.frames=String(this.frameCount);
  }

  private dispose(){
    cancelAnimationFrame(this.frame);this.frame=0;this.previousTime=0;this.nextFrameTime=0;this.hasSize=false;this.themeTransition=null;
    this.observers.forEach(observer=>observer.disconnect());this.observers=[];
    this.motionQuery.removeEventListener('change',this.settingsChanged);this.darkQuery.removeEventListener('change',this.settingsChanged);
    document.removeEventListener('visibilitychange',this.visibilityChanged);window.removeEventListener('pointermove',this.pointerMoved);window.removeEventListener('pointerdown',this.pointerPressed);document.documentElement.removeEventListener('pointerleave',this.pointerLeft);
    const canvas=this.querySelector('canvas');canvas?.removeEventListener('webglcontextlost',this.contextLost);canvas?.removeEventListener('webglcontextrestored',this.contextRestored);
    const geometries=new Set<THREE.BufferGeometry>(),materials=new Set<THREE.Material>(),textures=new Set<THREE.Texture>();
    this.scene.traverse(object=>{
      const mesh=object as THREE.Mesh;
      if((mesh as THREE.InstancedMesh).isInstancedMesh)(mesh as THREE.InstancedMesh).dispose();
      if(mesh.geometry)geometries.add(mesh.geometry);
      if(mesh.material){const list=Array.isArray(mesh.material)?mesh.material:[mesh.material];list.forEach(material=>{materials.add(material);Object.values(material).forEach(value=>{if(value instanceof THREE.Texture)textures.add(value);});});}
    });
    geometries.forEach(geometry=>geometry.dispose());textures.forEach(texture=>texture.dispose());materials.forEach(material=>material.dispose());
    this.water?.getRenderTarget().dispose();this.glowMap?.dispose();this.sun?.shadow.dispose();this.renderer?.dispose();this.renderer=null;
    this.water=null;this.sky=null;this.particleMaterial=null;this.sun=null;this.ambient=null;this.glowMap=null;this.sunDisc=null;this.nightFill=null;this.archInlay=null;
    this.pointer.set(0,0);this.smoothPointer.set(0,0);this.interaction=0;this.interactionTarget=0;this.touchRippleRemaining=0;
    this.scene.clear();this.sways=[];this.floats=[];this.shafts=[];this.lamps=[];this.botanicalMaterials=[];this.foregroundBotanical=null;this.portalScenery=null;this.portalFlora=null;this.pondLife=null;this.variantRoot=new THREE.Group();
  }
}

if(!customElements.get('living-scene'))customElements.define('living-scene',LivingScene);
