import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

type Variant = 'work' | 'notes' | 'study' | 'about';
type Installation = {
  update(time:number, dt:number):void;
  select(index:number, immediate:boolean):void;
  setNight(night:boolean):void;
  targets?:THREE.Object3D[];
  textures?:THREE.Texture[];
};

const TAU=Math.PI*2;
function material(color:THREE.ColorRepresentation, metalness=.1, roughness=.3){return new THREE.MeshPhysicalMaterial({color,metalness,roughness,clearcoat:.65,clearcoatRoughness:.22});}
function mesh(parent:THREE.Object3D, geometry:THREE.BufferGeometry, mat:THREE.Material, x=0,y=0,z=0){const item=new THREE.Mesh(geometry,mat);item.position.set(x,y,z);item.castShadow=true;item.receiveShadow=true;parent.add(item);return item;}
function ring(parent:THREE.Object3D,radius:number,tube:number,mat:THREE.Material){return mesh(parent,new THREE.TorusGeometry(radius,tube,12,128),mat);}
function pedestal(parent:THREE.Object3D,radius:number,mat:THREE.Material){return mesh(parent,new THREE.CylinderGeometry(radius,radius+.045,.16,80),mat,0,-1.56,0);}
function dialTicks(parent:THREE.Object3D,count:number,radius:number,mat:THREE.Material){
  const ticks=new THREE.InstancedMesh(new THREE.BoxGeometry(.014,.07,.024),mat,count),dummy=new THREE.Object3D();
  for(let i=0;i<count;i++){const a=i/count*TAU;dummy.position.set(Math.sin(a)*radius,Math.cos(a)*radius,-.02);dummy.rotation.z=-a;dummy.scale.y=i%4===0?1.45:.72;dummy.updateMatrix();ticks.setMatrixAt(i,dummy.matrix);}
  ticks.castShadow=true;ticks.receiveShadow=true;parent.add(ticks);
}

// A continuous folded ribbon, with true surface normals and an open centre.
function ribbonGeometry(){
  const positions:number[]=[],indices:number[]=[],uvs:number[]=[];const n=220,m=18;
  for(let i=0;i<=n;i++){const u=i/n*TAU;for(let j=0;j<=m;j++){const v=(j/m-.5)*.91;const r=1.02+v*Math.cos(u*1.5);positions.push(r*Math.cos(u),r*Math.sin(u),v*Math.sin(u*1.5));uvs.push(i/n,j/m);if(i<n&&j<m){const a=i*(m+1)+j,b=a+m+1;indices.push(a,b,a+1,b,b+1,a+1);}}}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));g.setIndex(indices);g.computeVertexNormals();return g;
}

function workInstallation(root:THREE.Group):Installation{
  const sculpture=new THREE.Group();root.add(sculpture);sculpture.position.set(-.12,.05,0);sculpture.rotation.set(.15,-.4,-.25);
  const porcelain=material('#e4d4c4',.25,.2);porcelain.side=THREE.DoubleSide;
  const ribbon=mesh(sculpture,ribbonGeometry(),porcelain);ribbon.scale.setScalar(1.16);
  const copper=material('#bb8751',.86,.21), violet=material('#8c82ab',.38,.23);
  const orb=mesh(root,new THREE.SphereGeometry(.37,40,28),copper,1.28,-1.05,.52);
  const bead=mesh(root,new THREE.OctahedronGeometry(.26,0),violet,-1.39,-.63,.2);bead.rotation.z=.3;
  pedestal(root,1.9,material('#c9bba8',.26,.38));
  let choice=0;
  return {select(index){choice=index%3;porcelain.color.set(choice===1?'#c7924f':choice===2?'#967fac':'#e4d4c4');porcelain.metalness=choice===1?.92:choice===2?.45:.18;porcelain.roughness=choice===1?.2:.29;porcelain.wireframe=choice===2;},update(t){sculpture.rotation.y=-.4+Math.sin(t*.22)*.32;sculpture.rotation.z=-.25+Math.sin(t*.17)*.065;bead.rotation.y=t*.28;orb.position.y=-1.04+Math.sin(t*.7)*.06;},setNight(n){porcelain.envMapIntensity=n?1.3:1;copper.envMapIntensity=n?1.5:1;}};
}

function pageTexture(left=false){
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=640;const c=canvas.getContext('2d')!;
  c.fillStyle=left?'#eee4d1':'#fcf5e7';c.fillRect(0,0,512,640);
  c.fillStyle='#7b647e';c.font='18px sans-serif';c.fillText('NOTES / IN PROGRESS',52,64);c.fillRect(52,91,408,2);
  c.fillStyle='#161826';c.font='bold 48px sans-serif';c.fillText(left?'慢慢看见':'记录微光',52,174);
  if(left){c.strokeStyle='#ad92a6';c.lineWidth=2;for(let i=0;i<5;i++){c.beginPath();c.ellipse(245,365,118-i*12,83-i*4,-.7+i*.34,0,TAU);c.stroke();}c.font='17px sans-serif';c.fillText('每个问题，都有自己的形状。',52,555);}
  else{for(let i=0;i<10;i++){c.fillStyle=i===3||i===7?'#997060':'#92877f';c.fillRect(52,228+i*26,i%4===3?230:400,3);}c.font='17px sans-serif';c.fillStyle='#7b647e';c.fillText('LIGHT, CODE & A LITTLE POETRY',52,555);}
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;return texture;
}

function notesInstallation(root:THREE.Group):Installation{
  const book=new THREE.Group();root.add(book);book.rotation.set(-1.28,.05,-.1);book.position.set(0,-.1,0);
  const leftTexture=pageTexture(true),rightTexture=pageTexture();
  const paper=new THREE.MeshPhysicalMaterial({color:'#fff8ee',map:rightTexture,roughness:.8,side:THREE.DoubleSide});
  const leftPaper=new THREE.MeshPhysicalMaterial({map:leftTexture,roughness:.8,side:THREE.DoubleSide});
  const width=1.53,height=2.12;
  function geometry(side:number,curl=.12){const g=new THREE.PlaneGeometry(width,height,40,1),p=g.attributes.position;for(let i=0;i<p.count;i++){const u=(p.getX(i)+width/2)/width;p.setXYZ(i,side*u*width,p.getY(i),Math.sin(u*Math.PI)*curl+u*.07);}g.computeVertexNormals();return g;}
  const cover=material('#79728b',.13,.55);mesh(book,new THREE.BoxGeometry(3.22,2.22,.09),cover,0,0,-.065);
  for(let i=0;i<7;i++){const mat=material(i%2?'#dfd5c1':'#f0e7d8',0,.9);mat.side=THREE.DoubleSide;mesh(book,geometry(1),mat,0,0,-i*.012);mesh(book,geometry(-1),mat,0,0,-i*.012);}
  const left=mesh(book,geometry(-1,.14),leftPaper,0,0,.02);left.geometry.attributes.uv.needsUpdate=true;
  // The left sheet is mirrored geometrically; reverse its UVs to keep words readable.
  const uv=left.geometry.attributes.uv;for(let i=0;i<uv.count;i++)uv.setX(i,1-uv.getX(i));
  mesh(book,geometry(1,.14),paper,0,0,.035);
  const turning=mesh(book,geometry(1,.14),paper,0,0,.055);const positions=turning.geometry.attributes.position;
  const gold=material('#b59368',.75,.3);mesh(book,new THREE.BoxGeometry(.055,2.27,.025),gold,0,0,.06);
  pedestal(root,2.05,material('#c6bbca',.22,.42));
  let phase=0,target=0,flipping=false;
  return {textures:[leftTexture,rightTexture],select(_i,immediate){target+=Math.PI;flipping=true;if(immediate)phase=target;},update(t,dt){
    phase=THREE.MathUtils.damp(phase,target,4,dt);if(Math.abs(target-phase)<.002){phase=target;flipping=false;}
    const turn=phase%TAU,flip=Math.sin(turn),side=Math.cos(turn);for(let i=0;i<positions.count;i++){const u=(i%41)/40;const originalY=i<41?height/2:-height/2;const bend=Math.sin(u*Math.PI)*(.14+Math.abs(flip)*.24);positions.setXYZ(i,u*width*side,originalY,u*width*Math.abs(flip)+bend+.07*u);}positions.needsUpdate=true;turning.geometry.computeVertexNormals();
    book.rotation.z=-.1+Math.sin(t*.19)*.025;book.position.y=-.15+Math.sin(t*.4)*.04;root.userData.flipping=flipping;root.userData.pagePhase=phase;
  },setNight(){}};
}

function studyInstallation(root:THREE.Group):Installation{
  const instrument=new THREE.Group();root.add(instrument);instrument.position.y=.02;
  const brass=material('#b29261',.85,.25),ivory=material('#d1c4a2',.65,.32),purple=material('#817596',.65,.25);
  const rings:THREE.Group[]=[];const targets:THREE.Object3D[]=[];
  for(let i=0;i<3;i++){
    const g=new THREE.Group();instrument.add(g);g.rotation.set(.4+i*.52,.18+i*.59,.35+i*.31);ring(g,1.3+i*.13,.031+i*.011,i===1?purple:brass);rings.push(g);
    if(i===2)dialTicks(g,48,1.57,ivory);
  }
  const crystal=material('#a9a0c8',.52,.16);crystal.iridescence=.8;crystal.iridescenceIOR=1.35;
  const core=mesh(instrument,new THREE.OctahedronGeometry(.55,0),crystal);core.rotation.set(.2,.35,.2);
  const halo=ring(instrument,.76,.009,ivory);halo.rotation.x=Math.PI/2;
  const satellites=new THREE.Group();instrument.add(satellites);satellites.rotation.x=.32;satellites.rotation.z=-.2;
  const colors=['#8aab94','#8c87b6','#c18c9f','#c6a668'];
  for(let i=0;i<4;i++){
    const angle=i/4*TAU+.45;const node=mesh(satellites,new THREE.SphereGeometry(.16,28,20),material(colors[i],.6,.24),Math.cos(angle)*1.63,Math.sin(angle)*1.63,0);node.userData.index=i;targets.push(node);
    const collar=ring(node,.215,.013,brass);collar.rotation.y=.35;
  }
  const support=mesh(root,new THREE.CylinderGeometry(.045,.09,.53,20),brass,0,-1.25,0);support.castShadow=true;
  pedestal(root,1.6,material('#91859c',.5,.33));const foot=ring(root,1.43,.018,brass);foot.rotation.x=Math.PI/2;foot.position.y=-1.46;
  let selected=0;
  return {targets,select(i){selected=i;},update(t){rings[0].rotation.y=.18+Math.sin(t*.22)*.23;rings[1].rotation.z=.66+Math.sin(t*.17)*.18;core.rotation.y=.35+t*.15;satellites.rotation.z=-.2+t*.065;targets.forEach((node,i)=>{node.scale.setScalar(i===selected?1.35:1);const mat=(node as THREE.Mesh<THREE.SphereGeometry,THREE.MeshPhysicalMaterial>).material;mat.emissive.copy(mat.color);mat.emissiveIntensity=i===selected?.24:.015;});},setNight(n){crystal.emissive.set(n?'#433459':'#000000');crystal.emissiveIntensity=.25;}};
}

function aboutInstallation(root:THREE.Group):Installation{
  const lens=new THREE.Group();root.add(lens);lens.rotation.set(-.18,-.32,.13);lens.position.y=.05;
  const gold=material('#ba9274',.84,.2),pink=material('#c5a8b8',.62,.19),edge=material('#908caa',.7,.23);
  for(let i=0;i<3;i++){const outer=ring(lens,1.24+i*.065,.024,i%2?edge:gold);outer.position.z=-.11*i;}
  dialTicks(lens,36,1.4,gold);
  const petals:THREE.Group[]=[];
  for(let i=0;i<9;i++){
    const a=i/9*TAU;const pivot=new THREE.Group();pivot.position.set(Math.cos(a)*.98,Math.sin(a)*.98,0);pivot.rotation.z=a-Math.PI/2;lens.add(pivot);petals.push(pivot);
    const shape=new THREE.Shape();shape.moveTo(-.19,0);shape.bezierCurveTo(-.51,-.4,-.43,-.97,.12,-1.12);shape.bezierCurveTo(.37,-.67,.3,-.17,.19,0);shape.closePath();
    const blade=mesh(pivot,new THREE.ExtrudeGeometry(shape,{depth:.017,bevelEnabled:true,bevelThickness:.012,bevelSize:.012,bevelSegments:2,steps:1,curveSegments:18}),i%3===0?gold:i%3===1?pink:edge);blade.position.z=i*.019;
  }
  const glass=material('#ae91bd',.36,.1);glass.iridescence=1;glass.iridescenceIOR=1.4;glass.transparent=true;glass.opacity=.8;
  const centre=mesh(lens,new THREE.SphereGeometry(.34,40,24),glass,0,0,-.17);centre.scale.z=.28;
  const stand=mesh(root,new THREE.CylinderGeometry(.055,.095,.65,24),gold,0,-1.19,-.08);stand.castShadow=true;
  pedestal(root,1.6,material('#c1aeb5',.45,.32));let openness=0,target=0;
  return {select(_i,immediate){target=target?0:1;if(immediate)openness=target;},update(t,dt){openness=THREE.MathUtils.damp(openness,target,3,dt);petals.forEach((p,i)=>{const a=i/9*TAU;p.rotation.z=a-Math.PI/2+openness*1.12;p.rotation.y=openness*.12;p.position.set(Math.cos(a)*(.98+openness*.1),Math.sin(a)*(.98+openness*.1),0);});lens.rotation.y=-.32+Math.sin(t*.21)*.17;centre.rotation.z=t*.1;root.userData.openness=openness;},setNight(n){glass.emissive.set(n?'#6b3d75':'#000000');glass.emissiveIntensity=.35;}};
}

function mount(host:HTMLElement){
  const canvas=host.querySelector<HTMLCanvasElement>('[data-flower-canvas]')!,viewport=host.querySelector<HTMLElement>('[data-flower-viewport]')!;
  const status=host.querySelector<HTMLElement>('[data-flower-status]')!,hint=host.querySelector<HTMLElement>('[data-flower-hint]')!;
  const variant=host.dataset.variant as Variant,html=document.documentElement,reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const buttons=[...host.querySelectorAll<HTMLButtonElement>('[data-flower-action]')];
  let renderer:THREE.WebGLRenderer;
  const fallback=()=>{host.dataset.ready='false';host.dataset.fallback='true';hint.textContent='此刻，静静欣赏';status.textContent='光影装置 · 静态视图';canvas.tabIndex=-1;};
  try{renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'low-power'});}catch{fallback();return;}
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.25;
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(37,1,.1,40);camera.position.set(3.15,2.35,6.7);if(variant==='notes')camera.position.set(2.4,3.6,6.1);
  const controls=new OrbitControls(camera,canvas);controls.target.set(0,-.15,0);controls.enablePan=false;controls.enableZoom=false;controls.enableDamping=false;controls.minPolarAngle=.6;controls.maxPolarAngle=Math.PI*.65;controls.rotateSpeed=.55;controls.update();controls.saveState();
  // Keep vertical touch gestures available to the document; a horizontal drag turns the object.
  canvas.style.touchAction='pan-y';
  const pmrem=new THREE.PMREMGenerator(renderer),environment=new RoomEnvironment();const env=pmrem.fromScene(environment,.06);scene.environment=env.texture;environment.dispose();pmrem.dispose();
  const ambient=new THREE.HemisphereLight('#fff5dc','#8c809e',2.4);scene.add(ambient);
  const key=new THREE.DirectionalLight('#fff2cf',4);key.position.set(-3,6,4);key.castShadow=true;key.shadow.mapSize.set(1024,1024);key.shadow.camera.left=-4;key.shadow.camera.right=4;key.shadow.camera.top=4;key.shadow.camera.bottom=-4;key.shadow.normalBias=.035;key.shadow.bias=-.0003;key.shadow.radius=4;scene.add(key);
  const rim=new THREE.DirectionalLight('#aea9ff',3);rim.position.set(4,2,-3);scene.add(rim);
  const floor=mesh(scene,new THREE.PlaneGeometry(30,30),new THREE.ShadowMaterial({opacity:.16}),0,-1.655,0);floor.rotation.x=-Math.PI/2;floor.castShadow=false;
  const root=new THREE.Group();scene.add(root);
  const installation=({work:workInstallation,notes:notesInstallation,study:studyInstallation,about:aboutInstallation}[variant])(root);
  let time=0,frames=0,last=0,lastStep=0,request=0,interacting=false,visible=true,dead=false,lost=false,selection=0,dirty=true,settle=0;
  const stopped=()=>html.dataset.motion==='paused'||reduced.matches;
  function render(dt=0){if(lost||dead)return;installation.update(time,dt);renderer.render(scene,camera);frames++;dirty=false;host.dataset.frames=String(frames);}
  function schedule(){if(!request&&!dead&&!lost&&visible&&!document.hidden)request=requestAnimationFrame(tick);}
  function tick(now:number){request=0;if(dead||lost||!visible||document.hidden)return;const dt=Math.min((now-(last||now))/1000,.06);last=now;if(!stopped())time+=dt;
    if(dirty||interacting||!stopped()||settle>0){if(dirty||now-(Number(host.dataset.lastFrame)||0)>=30){const step=lastStep?Math.min((now-lastStep)/1000,.08):0;render(step);lastStep=now;host.dataset.lastFrame=String(now);settle=Math.max(0,settle-step);}}
    if(!stopped()||interacting||dirty||settle>0)schedule();
  }
  function invalidate(){dirty=true;schedule();}
  function resize(){const {width,height}=viewport.getBoundingClientRect();if(!width||!height)return;renderer.setSize(width,height,false);camera.aspect=width/height;camera.fov=width/height<1.15?43:37;camera.updateProjectionMatrix();invalidate();}
  function appearance(){const night=html.dataset.theme==='dark';ambient.color.set(night?'#c3c8ff':'#fff5dc');ambient.groundColor.set(night?'#625273':'#8c809e');ambient.intensity=night?.9:1.4;key.color.set(night?'#d3d7ff':'#fff2cf');key.intensity=night?2.2:2.7;rim.intensity=night?3:2.5;renderer.toneMappingExposure=night?.78:1;scene.environmentIntensity=night?.7:.75;installation.setNight(night);last=0;settle=0;invalidate();}
  const onChange=()=>invalidate();controls.addEventListener('change',onChange);controls.addEventListener('start',()=>{interacting=true;hint.textContent='换个角度，细看光影';invalidate();});controls.addEventListener('end',()=>{interacting=false;});
  const tracks=[...document.querySelectorAll<HTMLAnchorElement>('[data-track-link]')];
  const trackLink=host.querySelector<HTMLAnchorElement>('[data-flower-track]');
  if(variant==='study')buttons.forEach((button,i)=>{const label=tracks[i]?.querySelector('.rail-name')?.childNodes[0]?.textContent?.trim();if(label)button.lastChild!.textContent=label;});
  function choose(index:number){selection=index;installation.select(index,stopped());buttons.forEach((b,i)=>{if(variant==='work'||variant==='study')b.setAttribute('aria-pressed',String(i===index));});
    if(variant==='work')status.textContent=['釉白 · 柔和漫反射','流金 · 细看环境映像','结构 · 看见曲面的走向'][index];
    if(variant==='notes'){const count=Number(host.dataset.page||1)+1;host.dataset.page=String(count);status.textContent=`${String(count).padStart(2,'0')} / 思绪接着生长`;}
    if(variant==='study'){if(trackLink&&tracks[index])trackLink.href=tracks[index].href;status.textContent=tracks[index]?`${tracks[index].querySelector('.rail-name')?.textContent?.trim()} · ${tracks[index].querySelector('.rail-count')?.textContent} 篇`:'选择一条自己的路径';}
    if(variant==='about'){const open=host.dataset.open!=='true';host.dataset.open=String(open);buttons[0].lastChild!.textContent=open?'合拢光圈':'展开光圈';buttons[0].setAttribute('aria-pressed',String(open));status.textContent=open?'敞开一点，让光进来':'光在交叠的缝隙里停留';}
    settle=stopped()?0:3;invalidate();
  }
  buttons.forEach((b,i)=>b.addEventListener('click',()=>choose(i)));
  host.querySelector('[data-flower-reset]')?.addEventListener('click',()=>{controls.reset();invalidate();});
  canvas.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home'].includes(e.key))return;e.preventDefault();if(e.key==='Home')controls.reset();else{const offset=camera.position.clone().sub(controls.target),s=new THREE.Spherical().setFromVector3(offset);if(e.key==='ArrowLeft')s.theta-=.12;if(e.key==='ArrowRight')s.theta+=.12;if(e.key==='ArrowUp')s.phi=Math.max(.6,s.phi-.1);if(e.key==='ArrowDown')s.phi=Math.min(Math.PI*.65,s.phi+.1);camera.position.copy(new THREE.Vector3().setFromSpherical(s).add(controls.target));controls.update();}invalidate();});
  const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();let downX=0,downY=0;
  canvas.addEventListener('pointerdown',e=>{downX=e.clientX;downY=e.clientY;});
  canvas.addEventListener('pointerup',e=>{if(!installation.targets||Math.hypot(e.clientX-downX,e.clientY-downY)>7)return;const rect=canvas.getBoundingClientRect();pointer.set((e.clientX-rect.left)/rect.width*2-1,1-(e.clientY-rect.top)/rect.height*2);raycaster.setFromCamera(pointer,camera);const hit=raycaster.intersectObjects(installation.targets,false)[0];if(hit)choose(hit.object.userData.index);});
  const observer=new MutationObserver(appearance);observer.observe(html,{attributes:true,attributeFilter:['data-theme','data-motion']});
  const size=new ResizeObserver(resize);size.observe(viewport);
  const intersection=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;last=0;if(visible)invalidate();else{cancelAnimationFrame(request);request=0;}},{rootMargin:'80px'});intersection.observe(host);
  const visibility=()=>{last=0;if(!document.hidden)invalidate();else{cancelAnimationFrame(request);request=0;}};document.addEventListener('visibilitychange',visibility);
  const motion=()=>appearance();reduced.addEventListener('change',motion);
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();lost=true;cancelAnimationFrame(request);request=0;fallback();});
  canvas.addEventListener('webglcontextrestored',()=>{lost=false;host.dataset.ready='true';delete host.dataset.fallback;canvas.tabIndex=0;hint.textContent='拖动装置，细看光影';appearance();resize();});
  const respond=(event:Event)=>{const detail=(event as CustomEvent).detail;if(detail?.variant!==variant||detail.index<0||!visible)return;if(variant==='work'){rim.intensity=3.2+(detail.index%3)*.4;invalidate();}};document.addEventListener('flower:selection',respond);
  const diagnostics=()=>({variant,frames,time,selection,paused:stopped(),visible,contextLost:lost,drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,geometries:renderer.info.memory.geometries,camera:camera.position.toArray(),pagePhase:root.userData.pagePhase,openness:root.userData.openness});
  (host as HTMLElement&{getSceneDiagnostics:typeof diagnostics}).getSceneDiagnostics=diagnostics;
  function dispose(){dead=true;cancelAnimationFrame(request);observer.disconnect();size.disconnect();intersection.disconnect();controls.dispose();document.removeEventListener('visibilitychange',visibility);document.removeEventListener('flower:selection',respond);reduced.removeEventListener('change',motion);scene.traverse(o=>{if(o instanceof THREE.Mesh){o.geometry.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose();}});installation.textures?.forEach(t=>t.dispose());env.dispose();renderer.dispose();}
  addEventListener('pagehide',e=>{if(e.persisted){cancelAnimationFrame(request);request=0;}else dispose();},{once:true});addEventListener('pageshow',e=>{if(e.persisted){last=0;invalidate();}});
  appearance();resize();host.dataset.ready='true';render(0);schedule();
}

document.querySelectorAll<HTMLElement>('[data-flower-stage]').forEach(mount);
