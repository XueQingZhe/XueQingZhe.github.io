import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

export interface PortalScenery {
  group: THREE.Group;
  update: (time: number, night: number, lightNight?: number) => void;
}

type Lamp = {
  pivot: THREE.Group;
  paper: THREE.MeshStandardMaterial;
  halo: THREE.SpriteMaterial;
  light: THREE.PointLight;
  phase: number;
};

function randomSequence(seed: number) {
  return () => { seed=(seed*1664525+1013904223)>>>0;return seed/4294967296; };
}

/** Quiet granulation painted here, rather than an imported photograph or artwork. */
function mineralTexture() {
  const canvas=document.createElement('canvas');canvas.width=256;canvas.height=256;
  const ctx=canvas.getContext('2d')!;const random=randomSequence(932);
  ctx.fillStyle='#d9d5bf';ctx.fillRect(0,0,256,256);
  for(let i=0;i<56;i++){
    const x=random()*256,y=random()*256,r=7+random()*29;
    const gradient=ctx.createRadialGradient(x,y,0,x,y,r);
    gradient.addColorStop(0,i%3?'#7b795527':'#eee7d343');gradient.addColorStop(1,'#a9a68500');
    ctx.fillStyle=gradient;ctx.fillRect(x-r,y-r,r*2,r*2);
  }
  for(let i=0;i<12000;i++){
    ctx.fillStyle=i%3?'#454e3914':'#ffffea24';
    ctx.fillRect(random()*256,random()*256,.3+random()*.8,.3+random()*.7);
  }
  ctx.strokeStyle='#77796424';ctx.lineWidth=.5;
  for(let i=0;i<7;i++){
    const x=random()*256,y=random()*256;
    ctx.beginPath();ctx.moveTo(x,y);ctx.bezierCurveTo(x+19,y-7,x+28,y+12,x+46,y+6);ctx.stroke();
  }
  const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;
  map.wrapS=map.wrapT=THREE.RepeatWrapping;map.repeat.set(2,2);map.anisotropy=2;
  return map;
}

function lampHalo() {
  const canvas=document.createElement('canvas');canvas.width=96;canvas.height=96;
  const ctx=canvas.getContext('2d')!;const gradient=ctx.createRadialGradient(48,48,0,48,48,48);
  gradient.addColorStop(0,'#fff1d2cc');gradient.addColorStop(.1,'#ffdb9d8a');
  gradient.addColorStop(.3,'#ffc57224');gradient.addColorStop(1,'#ffb55d00');
  ctx.fillStyle=gradient;ctx.fillRect(0,0,96,96);return new THREE.CanvasTexture(canvas);
}

/** Ring mesh with its perimeter below the pool: no straight vertical island sides. */
function bankGeometry(width: number, depth: number, height: number, seed: number, pale=false) {
  const rings=9,sides=72;const positions:number[]=[],colors:number[]=[],uvs:number[]=[],indices:number[]=[];
  const earth=new THREE.Color(pale?'#aab6aa':'#68735a');
  const moss=new THREE.Color(pale?'#c0c6b3':'#8d9262');
  const silt=new THREE.Color(pale?'#879e97':'#565f4d');
  const mixed=new THREE.Color();
  for(let ring=0;ring<=rings;ring++){
    const radius=ring/rings;
    for(let segment=0;segment<=sides;segment++){
      const angle=segment/sides*Math.PI*2;
      const outline=1+Math.sin(angle*3+seed)*.11+Math.cos(angle*5-seed*.3)*.055+Math.sin(angle*11)*.014;
      const x=Math.cos(angle)*radius*width*outline;
      const z=Math.sin(angle)*radius*depth*outline;
      const crest=Math.pow(Math.max(0,1-radius*radius),1.8);
      const undulation=.72+.20*Math.sin(x*1.9+seed)+.12*Math.cos(z*2.2-seed);
      const y=-.052+height*crest*undulation;
      positions.push(x,y,z);uvs.push(x/width*.5+.5,z/depth*.5+.5);
      mixed.copy(earth).lerp(moss,Math.max(0,Math.sin(x*1.6-z*.9+seed))*.55).lerp(silt,Math.pow(radius,4)*.65);
      colors.push(mixed.r,mixed.g,mixed.b);
      if(ring<rings&&segment<sides){
        const a=ring*(sides+1)+segment,b=a+sides+1;
        indices.push(a,a+1,b,a+1,b+1,b);
      }
    }
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
  geometry.setIndex(indices);geometry.computeVertexNormals();return geometry;
}

function pebbleGeometry() {
  const geometry=new THREE.SphereGeometry(1,22,12);
  const positions=geometry.attributes.position;
  for(let i=0;i<positions.count;i++){
    const x=positions.getX(i),y=positions.getY(i),z=positions.getZ(i);
    const variation=1+.065*Math.sin(x*6+z*3)+.04*Math.cos(z*7-y*4);
    positions.setXYZ(i,x*variation,y*(.87+.05*Math.sin(z*5)),z*variation);
  }
  geometry.computeVertexNormals();return geometry;
}

function grassGeometry() {
  const positions:number[]=[],uvs:number[]=[],indices:number[]=[];
  for(let i=0;i<=8;i++){
    const t=i/8,width=.021*Math.pow(1-t,.85)+.001;
    const bend=Math.pow(t,1.65)*.25;
    positions.push(-width+bend,t,-Math.sin(t*Math.PI)*.06,width+bend,t,-Math.sin(t*Math.PI)*.06);
    uvs.push(0,t,1,t);
    if(i<8){const a=i*2;indices.push(a,a+1,a+2,a+1,a+3,a+2);}
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));geometry.setIndex(indices);geometry.computeVertexNormals();return geometry;
}

/** Original supporting set dressing. The caller owns time, visibility and disposal. */
export function createPortalScenery(): PortalScenery {
  const group=new THREE.Group();group.name='Portal shoreline and hanging lanterns';
  const random=randomSequence(2107);const timeUniform={value:0};
  const mineral=mineralTexture();
  const ground=new THREE.MeshStandardMaterial({color:'#e2e0cd',vertexColors:true,roughness:1,map:mineral});
  const distantGround=new THREE.MeshBasicMaterial({color:'#dce6e3',vertexColors:true,transparent:true,opacity:.48,depthWrite:false});
  const stone=new THREE.MeshStandardMaterial({color:'#ffffff',roughness:.95,map:mineral});
  const bronze=new THREE.MeshStandardMaterial({color:'#8b7650',metalness:.65,roughness:.47});
  const grasses=new THREE.MeshStandardMaterial({color:'#ffffff',roughness:1,side:THREE.DoubleSide});
  const paleSage=new THREE.Color('#9a9d75'),darkSage=new THREE.Color('#526c51'),ochre=new THREE.Color('#b2a678');
  const temporaryColor=new THREE.Color();

  const bank=new THREE.Mesh(bankGeometry(1.72,2.82,.43,19),ground);
  bank.position.set(7.55,0,-.55);bank.rotation.y=-.1;bank.receiveShadow=true;group.add(bank);
  const lobe=new THREE.Mesh(bankGeometry(.75,1.15,.23,57),ground);
  lobe.position.set(6.27,0,.75);lobe.rotation.y=.43;lobe.receiveShadow=true;group.add(lobe);

  // The distant tree bases settle into three different shore silhouettes.
  for(const [x,z,w,d,h,seed] of [[-6.8,-15,4.05,1.35,.37,46],[4.8,-21,5.0,1.65,.54,27],[12.0,-18,3.8,1.15,.29,93]]){
    const shore=new THREE.Mesh(bankGeometry(w,d,h,seed,true),distantGround);
    shore.position.set(x,0,z);shore.rotation.y=(seed%5-2)*.12;group.add(shore);
  }

  // Smooth, differently proportioned river stones cluster along the waterline.
  const rockPositions:THREE.Vector3[]=[];
  for(let i=0;i<15;i++){
    const t=i/14+(random()-.5)*.026,angle=-Math.PI*.25+t*Math.PI*.9;
    rockPositions.push(new THREE.Vector3(7.2-Math.sin(angle)*(1.3+random()*.2),.03,Math.cos(angle)*2.15-.2));
  }
  for(let i=0;i<7;i++)rockPositions.push(new THREE.Vector3(6.8+random()*1.25,.13,-1.9+random()*2.2));
  const rocks=new THREE.InstancedMesh(pebbleGeometry(),stone,rockPositions.length);
  const dummy=new THREE.Object3D();
  rockPositions.forEach((point,index)=>{
    const radius=.16+random()*.28;
    dummy.position.copy(point);dummy.position.y+=radius*.24;
    dummy.rotation.set((random()-.5)*.2,random()*6.28,(random()-.5)*.15);
    dummy.scale.set(radius*(.9+random()*.5),radius*(.3+random()*.35),radius*(.7+random()*.5));dummy.updateMatrix();rocks.setMatrixAt(index,dummy.matrix);
    temporaryColor.copy(paleSage).lerp(ochre,random()*.42).multiplyScalar(.87+random()*.2);rocks.setColorAt(index,temporaryColor);
  });
  rocks.instanceMatrix.needsUpdate=true;if(rocks.instanceColor)rocks.instanceColor.needsUpdate=true;
  rocks.castShadow=true;rocks.receiveShadow=true;group.add(rocks);

  grasses.onBeforeCompile=shader=>{
    shader.uniforms.uShoreTime=timeUniform;
    shader.vertexShader='uniform float uShoreTime;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\ntransformed.x+=sin(uShoreTime*.75+instanceMatrix[3].x*1.7+instanceMatrix[3].z)*.045*position.y*position.y;');
  };
  grasses.customProgramCacheKey=()=> 'portal-shore-grass';
  const clumps=[[6.1,.065,1.13],[6.42,.14,.48],[7.05,.28,-.1],[7.58,.29,-1.02],[8.28,.15,1.05],[8.52,.13,-1.79],[6.74,.13,-1.44],[7.51,.18,1.51]];
  const blades=new THREE.InstancedMesh(grassGeometry(),grasses,clumps.length*19);
  let bladeIndex=0;
  for(const [x,y,z] of clumps){
    for(let i=0;i<19;i++){
      const angle=random()*Math.PI*2,radius=random()*.17;
      dummy.position.set(x+Math.cos(angle)*radius,y,z+Math.sin(angle)*radius);
      dummy.rotation.set((random()-.5)*.25,angle,(random()-.5)*.38);
      const height=.24+random()*.42;dummy.scale.set(.45+random()*.7,height,.6+random()*.5);dummy.updateMatrix();blades.setMatrixAt(bladeIndex,dummy.matrix);
      temporaryColor.copy(darkSage).lerp(ochre,random()*.7);blades.setColorAt(bladeIndex++,temporaryColor);
    }
  }
  blades.instanceMatrix.needsUpdate=true;if(blades.instanceColor)blades.instanceColor.needsUpdate=true;blades.castShadow=true;group.add(blades);

  const haloMap=lampHalo();const lamps:Lamp[]=[];
  const addLantern=(position:THREE.Vector3,height:number,direction:number,scale:number,phase:number)=>{
    const support=new THREE.Group();support.position.copy(position);group.add(support);
    const hook=new THREE.CatmullRomCurve3([
      new THREE.Vector3(0,-.05,0),new THREE.Vector3(-direction*.035,height*.38,.025),
      new THREE.Vector3(direction*.025,height*.84,.012),new THREE.Vector3(direction*.12,height,0),
      new THREE.Vector3(direction*.36,height+.08,0),new THREE.Vector3(direction*.48,height-.065,0),
    ]);
    const staff=new THREE.Mesh(new THREE.TubeGeometry(hook,42,.013*scale,7,false),bronze);staff.castShadow=true;support.add(staff);
    const tip=hook.getPoint(1);const pivot=new THREE.Group();pivot.position.copy(tip);support.add(pivot);
    const chainCurve=new THREE.LineCurve3(new THREE.Vector3(),new THREE.Vector3(0,-.22*scale,0));
    pivot.add(new THREE.Mesh(new THREE.TubeGeometry(chainCurve,1,.0045*scale,5,false),bronze));
    const lantern=new THREE.Group();lantern.position.y=-.46*scale;lantern.scale.setScalar(scale);pivot.add(lantern);
    const profile=[new THREE.Vector2(.047,-.23),new THREE.Vector2(.105,-.20),new THREE.Vector2(.133,-.08),new THREE.Vector2(.126,.10),new THREE.Vector2(.085,.21),new THREE.Vector2(.041,.24)];
    const paper=new THREE.MeshStandardMaterial({color:'#c4b88c',roughness:.82,emissive:'#ffac52',emissiveIntensity:0,side:THREE.DoubleSide});
    lantern.add(new THREE.Mesh(new THREE.LatheGeometry(profile,24),paper));
    const glass=new THREE.MeshStandardMaterial({color:'#bbcab0',roughness:.26,metalness:.12,transparent:true,opacity:.15,depthWrite:false,side:THREE.DoubleSide});
    const shell=new THREE.Mesh(new THREE.LatheGeometry(profile.map(p=>new THREE.Vector2(p.x*1.035,p.y)),24),glass);lantern.add(shell);
    const cagePieces:THREE.BufferGeometry[]=[];
    for(let i=0;i<6;i++){
      const angle=i*Math.PI/3;
      const points=profile.map(p=>new THREE.Vector3(Math.cos(angle)*(p.x+.006),p.y,Math.sin(angle)*(p.x+.006)));
      cagePieces.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),16,.0035,5,false));
    }
    for(const [radius,y] of [[.048,.24],[.088,.20],[.105,-.20],[.047,-.23]]){
      const rim=new THREE.TorusGeometry(radius,.0045,5,28);rim.rotateX(Math.PI/2);rim.translate(0,y,0);cagePieces.push(rim);
    }
    const merged=mergeGeometries(cagePieces,false);cagePieces.forEach(geometry=>geometry.dispose());
    if(merged)lantern.add(new THREE.Mesh(merged,bronze));
    const finial=new THREE.Mesh(new THREE.SphereGeometry(.022,10,8),bronze);finial.scale.set(.7,1.45,.7);finial.position.y=-.256;lantern.add(finial);
    const halo=new THREE.SpriteMaterial({map:haloMap,color:'#ffd49a',transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending});
    const sprite=new THREE.Sprite(halo);sprite.scale.setScalar(1.28);lantern.add(sprite);
    const light=new THREE.PointLight('#ffc184',0,4.2,2);lantern.add(light);
    lamps.push({pivot,paper,halo,light,phase});
  };
  addLantern(new THREE.Vector3(6.07,.065,.62),2.64,-1,.96,.4);
  addLantern(new THREE.Vector3(1.96,.085,-.59),1.63,1,.72,2.1);

  const groundDay=new THREE.Color('#e2e0cd'),groundNight=new THREE.Color('#a7b0c8');
  const bronzeDay=new THREE.Color('#8b7650'),bronzeNight=new THREE.Color('#9a8063');
  const paperDay=new THREE.Color('#c4b88c'),paperNight=new THREE.Color('#d99d4f');
  const distantDay=new THREE.Color('#dce6e3'),distantNight=new THREE.Color('#66718d');
  let previousNight=-1,previousLight=-1;
  return {
    group,
    update(time:number,night:number,lightNight=night){
      const n=THREE.MathUtils.clamp(night,0,1),lightMix=THREE.MathUtils.clamp(lightNight,0,1);timeUniform.value=time;
      if(Math.abs(n-previousNight)>.0005){
        ground.color.copy(groundDay).lerp(groundNight,n);bronze.color.copy(bronzeDay).lerp(bronzeNight,n);
        distantGround.color.copy(distantDay).lerp(distantNight,n);distantGround.opacity=THREE.MathUtils.lerp(.48,.29,n);
        previousNight=n;
      }
      if(Math.abs(lightMix-previousLight)>.0005){
        for(const lamp of lamps)lamp.paper.color.copy(paperDay).lerp(paperNight,lightMix);
        previousLight=lightMix;
      }
      for(const lamp of lamps){
        lamp.pivot.rotation.z=Math.sin(time*.63+lamp.phase)*.024;
        lamp.pivot.rotation.x=Math.sin(time*.47+lamp.phase*.7)*.013;
        const breath=.96+Math.sin(time*1.1+lamp.phase)*.04;
        lamp.paper.emissiveIntensity=lightMix*.95*breath;lamp.halo.opacity=lightMix*.33*breath;lamp.light.intensity=lightMix*1.1*breath;
      }
    },
  };
}
