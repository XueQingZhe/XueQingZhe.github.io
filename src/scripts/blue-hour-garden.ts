import * as THREE from 'three';
import {createBlueFlowerTexture,createBluePetalTexture} from './blue-hour-paint';

export interface BlueHourGarden {
  group:THREE.Group;
  update:(time:number,night:number,gust:number)=>void;
}
type Flower={x:number;y:number;z:number;height:number;size:number;angle:number;variant:number};
type RibbonSpec={points:number[][];width:number;day:string;night:string;phase:number;twist:number};
function seeded(seed:number){return()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};}

function bladeGeometry(){
  const vertices:number[]=[],indices:number[]=[];
  for(let i=0;i<=7;i++){
    const t=i/7,width=Math.sin(Math.PI*t)*.075+.002;
    const x=Math.pow(t,1.8)*.33,z=Math.sin(t*Math.PI)*.045;
    vertices.push(x-width,t,z,x+width,t,z);
    if(i<7){const k=i*2;indices.push(k,k+1,k+2,k+1,k+3,k+2);}
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.setIndex(indices);geometry.computeVertexNormals();return geometry;
}

function ribbonGeometry(spec:RibbonSpec){
  const curve=new THREE.CatmullRomCurve3(spec.points.map(p=>new THREE.Vector3(p[0],p[1],p[2])));
  const positions:number[]=[],centers:number[]=[],along:number[]=[],uvs:number[]=[],colors:number[]=[],indices:number[]=[];
  const rows=90,columns=10;const tangent=new THREE.Vector3(),widthDirection=new THREE.Vector3(),point=new THREE.Vector3();
  const cream=new THREE.Color('#fff4df'),rose=new THREE.Color('#eab9bd'),tint=new THREE.Color();
  for(let i=0;i<=rows;i++){
    const t=i/rows,center=curve.getPoint(t);curve.getTangent(t,tangent);
    widthDirection.set(0,0,1).cross(tangent).normalize();
    widthDirection.applyAxisAngle(tangent,Math.sin(t*7+spec.phase)*.35+spec.twist*t);
    const width=spec.width*(.79+.21*Math.sin(t*Math.PI))*(1-.22*Math.pow(t,7));
    for(let j=0;j<=columns;j++){
      const across=j/columns-.5;
      point.copy(center).addScaledVector(widthDirection,across*width);
      // A shallow cupped cross-section and changing fold give the backlit silk volume.
      point.z+=Math.sin(j/columns*Math.PI)*(.10+.075*Math.sin(t*8+spec.phase));
      point.z+=Math.sin(j/columns*Math.PI*3+t*5+spec.phase)*Math.sin(j/columns*Math.PI)*.025;
      positions.push(point.x,point.y,point.z);centers.push(center.x,center.y,center.z);along.push(t);uvs.push(j/columns,t);
      tint.copy(cream).lerp(rose,Math.pow(Math.abs(across)*2,7)*.44);colors.push(tint.r,tint.g,tint.b);
      if(i<rows&&j<columns){const a=i*(columns+1)+j,b=a+columns+1;indices.push(a,a+1,b,a+1,b+1,b);}
    }
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('normal',new THREE.Float32BufferAttribute(new Float32Array(positions.length),3));
  geometry.setAttribute('aRibbonCenter',new THREE.Float32BufferAttribute(centers,3));geometry.setAttribute('aRibbonAlong',new THREE.Float32BufferAttribute(along,1));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.setIndex(indices);geometry.computeVertexNormals();return geometry;
}

/** An independent original cobalt meadow; the host owns rendering and all event listeners. */
export function createBlueHourGarden():BlueHourGarden{
  const group=new THREE.Group();group.name='Blue hour garden';
  const field=new THREE.Group();field.name='blue-flower-field';
  const ribbons=new THREE.Group();ribbons.name='blue-silk-ribbons';
  const petals=new THREE.Group();petals.name='blue-air-petals';group.add(field,ribbons,petals);
  const random=seeded(41807),timeUniform={value:14},gustUniform={value:0},nightUniform={value:0};
  const flowerDay=new THREE.Color('#ffffff'),flowerNight=new THREE.Color('#8299d5');
  const stemDay=new THREE.Color('#374d75'),stemNight=new THREE.Color('#233052');
  const flowerMaterials:THREE.MeshBasicMaterial[]=[];
  const ribbonMaterials:Array<{material:THREE.MeshPhysicalMaterial;day:THREE.Color;night:THREE.Color}>=[];
  const stemMaterial=new THREE.MeshStandardMaterial({color:stemDay,roughness:.94,side:THREE.DoubleSide});
  const leafMaterial=new THREE.MeshStandardMaterial({color:'#20395e',roughness:.92,side:THREE.DoubleSide});

  const attachMeadowWind=(material:THREE.Material,kind:'flower'|'stem'|'leaf')=>{
    material.onBeforeCompile=shader=>{
      shader.uniforms.uMeadowTime=timeUniform;shader.uniforms.uMeadowGust=gustUniform;shader.uniforms.uMeadowNight=nightUniform;
      shader.vertexShader='uniform float uMeadowTime;uniform float uMeadowGust;\n'+shader.vertexShader;
      const bend=kind==='flower'?'1.0':kind==='stem'?'pow(position.y+.5,2.0)':'position.y*position.y';
      shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>',`
        vec4 mvPosition=vec4(transformed,1.0);
        #ifdef USE_INSTANCING
          vec3 meadowCenter=instanceMatrix[3].xyz;
          float meadowPhase=meadowCenter.x*.52+meadowCenter.z*.35;
          float meadowWind=(sin(uMeadowTime*.71+meadowPhase)+.34*sin(uMeadowTime*1.23+meadowPhase*1.6))*(.035+uMeadowGust*.095);
          mvPosition=instanceMatrix*mvPosition;
          mvPosition.x+=meadowWind*${bend};
          mvPosition.z+=cos(uMeadowTime*.58+meadowPhase)*(.016+uMeadowGust*.035)*${bend};
        #endif
        mvPosition=modelViewMatrix*mvPosition;
        gl_Position=projectionMatrix*mvPosition;
      `);
      if(kind==='flower'){
        shader.fragmentShader='uniform float uMeadowNight;\n'+shader.fragmentShader;
        shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>',`
          vec3 paintedPetal=texture2D(map,vMapUv).rgb;
          float paleFilament=smoothstep(.7,.97,min(paintedPetal.r,min(paintedPetal.g,paintedPetal.b)));
          outgoingLight+=vec3(.12,.18,.36)*paleFilament*uMeadowNight*.32;
          #include <opaque_fragment>
        `);
      }
    };
    material.customProgramCacheKey=()=> 'blue-meadow-'+kind;
  };
  attachMeadowWind(stemMaterial,'stem');attachMeadowWind(leafMaterial,'leaf');

  const flowers:Flower[]=[];
  const meadowHeight=(x:number,z:number)=>-1.2+Math.sin(x*.29+z*.13)*.16+Math.sin(x*.63-z*.36)*.08;
  const colony=(x:number,z:number)=>Math.sin(x*.57+z*.27)*Math.cos(x*.23-z*.41);
  // Carry the same painted flowers into the distance, with no separate horizon strip.
  for(let row=0;row<34;row++){
    const z=-45+row*1.03;
    for(let column=0;column<75;column++){
      const x=-26+column/74*52+(random()-.5)*.85;
      const depth=z+(random()-.5)*1.35;
      const patch=colony(x,depth),perspective=THREE.MathUtils.clamp((depth+45)/35,0,1);
      if(random()<.07+(patch<-.35?.07:0))continue;
      flowers.push({x,y:meadowHeight(x,depth),z:depth,height:.32+(patch+1)*.18+random()*.34,size:.24+perspective*.12+random()*.22,angle:(random()-.5)*1.9,variant:Math.floor(random()*3)});
    }
  }
  for(let row=0;row<31;row++){
    const z=-10.7+row*.54;
    const columns=row<20?47:36;
    for(let column=0;column<columns;column++){
      const x=-13.3+column/(columns-1)*26.6+(random()-.5)*.56;
      const depth=z+(random()-.5)*.55;
      // Keep the figure's upper silhouette open; low clustered flowers meet the hem below.
      const inFigureForeground=x>.95&&x<5.55&&depth>1.1;
      if(inFigureForeground&&(depth<3.65||random()<.86))continue;
      if(random()<.04)continue;
      const near=THREE.MathUtils.clamp((depth+8)/13,0,1);
      const patch=colony(x,depth),hero=depth<1&&depth>-8&&random()<.047;
      const height=inFigureForeground?.35+random()*.24:.33+near*.46+(patch+1)*.17+random()*(.35+near*.32)+(hero?.29:0);
      const size=inFigureForeground?.30+random()*.18:(.23+near*.30+random()*(.26+near*.18))*(.85+(patch+1)*.12)*(hero?1.55:1);
      flowers.push({x,y:meadowHeight(x,depth),z:depth,height,size,angle:(random()-.5)*1.7,variant:Math.floor(random()*3)});
    }
  }
  // Readable foreground blossoms: each is a complete hand-painted flower, not a point sprite.
  for(const [x,z] of [[-5.8,4.6],[-4.25,5.1],[-2.9,4.4],[-1.65,5.5],[.0,4.9],[.45,5.2],[5.85,4.9],[6.4,4.25],[7.2,3.8]]){
    for(let i=0;i<3;i++)flowers.push({x:x+(random()-.5)*.55,y:meadowHeight(x,z),z:z+(random()-.5)*.45,height:.93+random()*.67,size:.79+random()*.49,angle:(random()-.5)*1.2,variant:i%3});
  }
  // Unequal, overlapping pockets settle the skirt into flowers rather than an empty clearing.
  const hemClusters=[{x:2.12,z:2.42,rx:.68,rz:.76,count:22},{x:3.32,z:2.12,rx:.81,rz:.65,count:16},{x:4.49,z:2.49,rx:.78,rz:.72,count:27}];
  for(const cluster of hemClusters){
    for(let i=0;i<cluster.count;i++){
      const angle=random()*Math.PI*2,radius=Math.sqrt(random());
      const x=THREE.MathUtils.clamp(cluster.x+Math.cos(angle)*radius*cluster.rx,1.7,5.1);
      const z=THREE.MathUtils.clamp(cluster.z+Math.sin(angle)*radius*cluster.rz,1.4,3.2);
      const y=meadowHeight(x,z),height=THREE.MathUtils.clamp(-.48+random()*.32-y,.65,1.05);
      flowers.push({x,y,z,height,size:.43+random()*.27,angle:(random()-.5)*1.25,variant:Math.floor(random()*3)});
    }
  }
  const matrixDummy=new THREE.Object3D(),tint=new THREE.Color();
  const headGeometry=new THREE.PlaneGeometry(1,1,3,3);
  for(let variant=0;variant<3;variant++){
    const members=flowers.filter(flower=>flower.variant===variant);
    const material=new THREE.MeshBasicMaterial({map:createBlueFlowerTexture(variant),color:flowerDay,transparent:true,alphaTest:.04,depthWrite:true,side:THREE.DoubleSide,fog:true});
    attachMeadowWind(material,'flower');flowerMaterials.push(material);
    const heads=new THREE.InstancedMesh(headGeometry,material,members.length);heads.name='blue-flower-heads-'+variant;
    members.forEach((flower,index)=>{
      const patch=colony(flower.x,flower.z),profile=random()<.18;
      matrixDummy.position.set(flower.x,flower.y+flower.height,flower.z);matrixDummy.rotation.set(-.16+(random()-.5)*.85,(random()-.5)*(profile?2.05:1.04),flower.angle);matrixDummy.scale.set(flower.size,flower.size*(.91+random()*.14),flower.size);matrixDummy.updateMatrix();heads.setMatrixAt(index,matrixDummy.matrix);
      const tone=random();
      if(tone<.23)tint.setHSL(.635+patch*.018,.36,.49+random()*.15);
      else if(tone>.78)tint.setHSL(.70+patch*.028,.22,.75+random()*.14);
      else tint.setHSL(.611+patch*.022,.20,.70+random()*.27);
      heads.setColorAt(index,tint);
    });
    heads.instanceMatrix.needsUpdate=true;if(heads.instanceColor)heads.instanceColor.needsUpdate=true;field.add(heads);
  }
  const stemGeometry=new THREE.CylinderGeometry(.006,.012,1,5,5);
  // Fine stems beyond the middle distance are subpixel; only visible plants need them.
  const nearPlants=flowers.filter(flower=>flower.z>-19);
  const stems=new THREE.InstancedMesh(stemGeometry,stemMaterial,nearPlants.length);stems.name='blue-flower-stems';
  const hemGrassTufts=22,hemGrassLeaves=hemGrassTufts*3;
  const leaves=new THREE.InstancedMesh(bladeGeometry(),leafMaterial,nearPlants.length*2+hemGrassLeaves);leaves.name='blue-meadow-leaves';
  nearPlants.forEach((flower,index)=>{
    matrixDummy.position.set(flower.x,flower.y+flower.height*.5,flower.z+.015);matrixDummy.rotation.set(0,0,0);matrixDummy.scale.set(1,flower.height,1);matrixDummy.updateMatrix();stems.setMatrixAt(index,matrixDummy.matrix);
    for(let side=0;side<2;side++){
      matrixDummy.position.set(flower.x,flower.y+flower.height*(.13+side*.15),flower.z);
      matrixDummy.rotation.set(-.25+random()*.5,random()*Math.PI*2,(side?1:-1)*(.32+random()*.42));matrixDummy.scale.set(.65+random()*.4,flower.height*(.43+random()*.27),1);matrixDummy.updateMatrix();leaves.setMatrixAt(index*2+side,matrixDummy.matrix);
    }
  });
  // Small irregular fans of grass close the dark ground between flower pockets and the foreground.
  for(let tuft=0;tuft<hemGrassTufts;tuft++){
    const x=1.65+random()*3.6,z=1.55+random()*3.05,y=meadowHeight(x,z);
    for(let blade=0;blade<3;blade++){
      matrixDummy.position.set(x+(random()-.5)*.08,y,z+(random()-.5)*.08);
      matrixDummy.rotation.set((random()-.5)*.5,random()*Math.PI*2,(blade-1)*(.28+random()*.27));matrixDummy.scale.set(.8+random()*.45,.42+random()*.35,1);matrixDummy.updateMatrix();leaves.setMatrixAt(nearPlants.length*2+tuft*3+blade,matrixDummy.matrix);
    }
  }
  stems.instanceMatrix.needsUpdate=true;leaves.instanceMatrix.needsUpdate=true;field.add(stems,leaves);

  const soilGeometry=new THREE.PlaneGeometry(59,62,54,52);soilGeometry.rotateX(-Math.PI/2);
  const soilPositions=soilGeometry.attributes.position;
  for(let i=0;i<soilPositions.count;i++){const x=soilPositions.getX(i),z=soilPositions.getZ(i)-18;soilPositions.setY(i,meadowHeight(x,z)-.07);}
  soilGeometry.computeVertexNormals();
  const soilMaterial=new THREE.MeshBasicMaterial({color:'#152247',fog:true});
  const soil=new THREE.Mesh(soilGeometry,soilMaterial);soil.position.z=-18;soil.name='blue-meadow-shadow';field.add(soil);

  const ribbonSpecs:RibbonSpec[]=[
    {points:[[10.1,10,-5.2],[8.1,6.1,-2.9],[8.65,2.8,-.2],[7.4,-.2,1.4]],width:1.04,day:'#8d354e',night:'#4e294c',phase:2.1,twist:-1.25},
    {points:[[-8.7,10,-5],[-7.1,6.2,-2.4],[-7.0,3.2,.1],[-8.65,-.1,2.4]],width:1.36,day:'#1a2551',night:'#101932',phase:4.0,twist:1.2},
    {points:[[10.0,10.5,-8],[9.1,7.2,-6.2],[7.9,4.0,-4.7],[8.55,.95,-3.6]],width:.67,day:'#b996aa',night:'#64577e',phase:5.7,twist:-.8},
  ];
  for(const spec of ribbonSpecs){
    const material=new THREE.MeshPhysicalMaterial({color:spec.day,roughness:.47,metalness:.025,sheen:.72,sheenColor:'#f1bac0',sheenRoughness:.6,side:THREE.DoubleSide,vertexColors:true});
    material.onBeforeCompile=shader=>{
      shader.uniforms.uSilkTime=timeUniform;shader.uniforms.uSilkGust=gustUniform;shader.uniforms.uSilkPhase={value:spec.phase};
      shader.vertexShader='uniform float uSilkTime;uniform float uSilkGust;uniform float uSilkPhase;attribute vec3 aRibbonCenter;attribute float aRibbonAlong;\n'+shader.vertexShader;
      shader.vertexShader=shader.vertexShader.replace('#include <beginnormal_vertex>',`
        #include <beginnormal_vertex>
        float silkTwist=sin(uSilkTime*.43+aRibbonAlong*7.0+uSilkPhase)*(.16+uSilkGust*.25)*aRibbonAlong;
        mat2 silkTurn=mat2(cos(silkTwist),-sin(silkTwist),sin(silkTwist),cos(silkTwist));
        objectNormal.xz=silkTurn*objectNormal.xz;
      `);
      shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`
        #include <begin_vertex>
        vec3 silkOffset=position-aRibbonCenter;
        silkOffset.xz=silkTurn*silkOffset.xz;
        transformed=aRibbonCenter+silkOffset;
        float silkEnvelope=smoothstep(0.0,.65,aRibbonAlong);
        transformed.x+=sin(uSilkTime*.57+aRibbonAlong*5.4+uSilkPhase)*(.15+uSilkGust*.29)*silkEnvelope;
        transformed.z+=sin(uSilkTime*.41+aRibbonAlong*7.5+uSilkPhase*.8)*(.22+uSilkGust*.42)*silkEnvelope;
        transformed.y+=sin(uSilkTime*.62+aRibbonAlong*4.0+uSilkPhase)*.055*silkEnvelope;
      `);
    };
    material.customProgramCacheKey=()=> 'blue-hour-silk';
    const silk=new THREE.Mesh(ribbonGeometry(spec),material);silk.name='border-silk-ribbon';silk.frustumCulled=false;ribbons.add(silk);
    ribbonMaterials.push({material,day:new THREE.Color(spec.day),night:new THREE.Color(spec.night)});
  }

  const petalCount=44,petalGeometry=new THREE.PlaneGeometry(1,1,2,3);
  const petalMaterial=new THREE.MeshBasicMaterial({map:createBluePetalTexture(),color:'#ddccea',transparent:true,alphaTest:.035,depthWrite:false,side:THREE.DoubleSide,fog:true});
  const airborne=new THREE.InstancedMesh(petalGeometry,petalMaterial,petalCount);airborne.name='blue-airborne-petal-instances';airborne.frustumCulled=false;petals.add(airborne);
  const seeds=new Float32Array(petalCount*7);
  for(let i=0;i<petalCount;i++){
    const x=-11+random()*23,y=.1+random()*7,z=-9+random()*15;
    // Higher airborne petals drift behind the portrait, keeping its face unobstructed.
    seeds.set([x,y,y>1.45?Math.min(z,-1.3):z,.055+random()*.13,random()*6.28,.13+random()*.24,random()*6.28],i*7);
  }
  let lastNight=-1;
  return {
    group,
    update(time:number,night:number,gust:number){
      const n=THREE.MathUtils.clamp(night,0,1),wind=THREE.MathUtils.clamp(gust,0,1);
      timeUniform.value=time;gustUniform.value=wind;nightUniform.value=n;
      if(Math.abs(lastNight-n)>.0005){
        for(const material of flowerMaterials)material.color.copy(flowerDay).lerp(flowerNight,n);
        stemMaterial.color.copy(stemDay).lerp(stemNight,n);
        for(const ribbon of ribbonMaterials)ribbon.material.color.copy(ribbon.day).lerp(ribbon.night,n);
        petalMaterial.color.set('#ddccea').lerp(flowerNight,n*.55);soilMaterial.color.set('#152247').lerp(stemNight,n*.8);lastNight=n;
      }
      for(let i=0;i<petalCount;i++){
        const k=i*7,phase=seeds[k+4],speed=seeds[k+5],size=seeds[k+3];
        const drift=(time*speed+seeds[k]+24)%26-13;
        matrixDummy.position.set(drift+Math.sin(time*.4+phase)*(.22+wind*.38),seeds[k+1]+Math.sin(time*.36+phase)*.4,seeds[k+2]+Math.cos(time*.25+phase)*.3);
        matrixDummy.rotation.set(time*.67+phase,Math.sin(time*.51+phase)*1.2,seeds[k+6]+time*.29);matrixDummy.scale.set(size*.68,size,1);matrixDummy.updateMatrix();airborne.setMatrixAt(i,matrixDummy.matrix);
      }
      airborne.instanceMatrix.needsUpdate=true;
    },
  };
}
