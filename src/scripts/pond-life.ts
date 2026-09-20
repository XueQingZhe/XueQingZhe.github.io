import * as THREE from 'three';

function koiPainting(warm:boolean){
  const canvas=document.createElement('canvas');canvas.width=768;canvas.height=256;
  const c=canvas.getContext('2d')!;
  c.fillStyle=warm?'#ecdab7':'#e8e4cf';
  c.beginPath();c.moveTo(581,128);c.bezierCurveTo(570,79,445,70,294,108);c.bezierCurveTo(246,117,211,108,162,72);c.quadraticCurveTo(189,126,147,187);c.bezierCurveTo(216,143,247,139,294,147);c.bezierCurveTo(446,185,572,172,581,128);c.fill();
  c.globalCompositeOperation='source-atop';
  c.fillStyle=warm?'#b66037':'#be7656';
  for(const [x,y,rx,ry,rot] of [[510,104,37,24,.5],[407,132,58,21,-.3],[308,126,22,28,.4]]){c.beginPath();c.ellipse(x,y,rx,ry,rot,0,Math.PI*2);c.fill();}
  c.fillStyle='#5c645e';c.globalAlpha=.32;
  c.beginPath();c.ellipse(456,143,24,12,.3,0,Math.PI*2);c.fill();
  c.strokeStyle='#fff8dd';c.globalAlpha=.18;c.lineWidth=1;
  for(let x=270;x<520;x+=13){c.beginPath();c.ellipse(x,128,9,20,0,-1,1);c.stroke();}
  c.globalCompositeOperation='source-over';c.globalAlpha=.4;c.fillStyle='#ded8c2';
  c.beginPath();c.moveTo(465,100);c.quadraticCurveTo(422,48,401,76);c.lineTo(440,111);c.fill();
  c.beginPath();c.moveTo(465,154);c.quadraticCurveTo(422,204,401,179);c.lineTo(440,146);c.fill();
  c.globalAlpha=.85;c.fillStyle='#514c3b';c.beginPath();c.ellipse(551,108,4,3,-.3,0,Math.PI*2);c.fill();c.beginPath();c.ellipse(551,148,4,3,.3,0,Math.PI*2);c.fill();
  c.strokeStyle='#9e7b59';c.globalAlpha=.34;c.lineWidth=2;c.beginPath();c.moveTo(523,104);c.quadraticCurveTo(504,128,523,150);c.stroke();
  const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;return map;
}

function wingPainting(){
  const canvas=document.createElement('canvas');canvas.width=256;canvas.height=256;
  const c=canvas.getContext('2d')!;
  const wash=c.createLinearGradient(15,128,221,85);wash.addColorStop(0,'#a96b3f');wash.addColorStop(.4,'#e6b572');wash.addColorStop(1,'#fff0c5');
  c.fillStyle=wash;c.strokeStyle='#967b59';c.lineWidth=2;
  c.beginPath();c.moveTo(22,139);c.bezierCurveTo(72,63,180,13,217,43);c.bezierCurveTo(241,75,188,126,137,139);c.bezierCurveTo(218,144,190,210,153,218);c.bezierCurveTo(83,223,47,175,22,139);c.fill();c.stroke();
  c.strokeStyle='#987352';c.globalAlpha=.36;c.lineWidth=1;
  for(const [x,y] of [[210,52],[217,83],[183,112],[163,191],[115,202]]){c.beginPath();c.moveTo(22,139);c.quadraticCurveTo(99,132,x,y);c.stroke();}
  c.globalAlpha=.55;c.fillStyle='#fff2d3';for(const [x,y,r] of [[183,60,7],[196,84,4],[168,185,5],[150,202,3]]){c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fill();}
  const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;return map;
}

/** Painted aquatic silhouettes sit just over the opaque reflection plane, like an ink wash. */
export function createPondLife(){
  const group=new THREE.Group();group.name='pond-life';
  const timeUniform={value:0};const fish:Array<{mesh:THREE.Mesh<THREE.PlaneGeometry,THREE.MeshBasicMaterial>;phase:number}> = [];
  const maps=[koiPainting(true),koiPainting(false)];
  for(let i=0;i<3;i++){
    const material=new THREE.MeshBasicMaterial({map:maps[i%2],transparent:true,opacity:.66,color:'#b7c6ab',depthWrite:false});
    material.onBeforeCompile=shader=>{
      shader.uniforms.uPondTime=timeUniform;shader.uniforms.uPhase={value:i*2.2};
      shader.vertexShader='uniform float uPondTime;uniform float uPhase;\n'+shader.vertexShader;
      shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\ntransformed.y+=sin(uPondTime*3.0+uPhase+uv.x*7.0)*.035*pow(1.0-uv.x,2.0);');
    };
    material.customProgramCacheKey=()=> 'painted-pond-koi';
    const mesh=new THREE.Mesh(new THREE.PlaneGeometry(1.5-i*.13,.5-i*.04,15,2),material);
    mesh.rotation.x=-Math.PI/2;mesh.position.y=-.021+i*.001;mesh.renderOrder=2;group.add(mesh);fish.push({mesh,phase:i*2.07});
  }

  const wingMap=wingPainting();
  const butterflies:Array<{root:THREE.Group;left:THREE.Group;right:THREE.Group;material:THREE.MeshBasicMaterial;phase:number}>=[];
  for(let i=0;i<2;i++){
    const root=new THREE.Group();group.add(root);
    const material=new THREE.MeshBasicMaterial({map:wingMap,transparent:true,side:THREE.DoubleSide,depthWrite:false,opacity:.84});
    const wingGeo=new THREE.PlaneGeometry(.28,.32);
    const left=new THREE.Group(),right=new THREE.Group();root.add(left,right);
    const a=new THREE.Mesh(wingGeo,material);a.position.x=.115;right.add(a);
    const b=new THREE.Mesh(wingGeo,material);b.position.x=-.115;b.scale.x=-1;left.add(b);
    const body=new THREE.Mesh(new THREE.CapsuleGeometry(.009,.115,3,5),new THREE.MeshBasicMaterial({color:'#867351',transparent:true}));root.add(body);
    root.scale.setScalar(i?.68:.9);butterflies.push({root,left,right,material,phase:i*3.1});
  }
  let previous=-1,disturbed=-100;const disturbance=new THREE.Vector2();
  const target=new THREE.Vector3();const previousPosition=new THREE.Vector3();
  const fishDay=new THREE.Color('#b7c6ab'),fishNight=new THREE.Color('#8fabc3');
  function update(time:number,night:number,pointer:THREE.Vector2,activity:number){
    const first=previous<0;const delta=first?1:Math.max(0,Math.min(.1,time-previous));previous=time;
    timeUniform.value=time;
    const startle=Math.exp(-Math.max(0,time-disturbed)*.85);
    fish.forEach(({mesh,phase},i)=>{
      mesh.material.opacity=THREE.MathUtils.lerp(.68,.24,night);mesh.material.color.copy(fishDay).lerp(fishNight,night);
      if(delta===0)return;
      const angle=time*.16+phase;
      target.set(1.0+Math.cos(angle)*(1.38+i*.12),mesh.position.y,.85+Math.sin(angle*1.08)*(.68+i*.2));
      if(activity>.1&&pointer.x>-.5&&pointer.x<5.5&&pointer.y>.1&&pointer.y<5){
        target.x=THREE.MathUtils.lerp(target.x,pointer.x+Math.cos(phase)*.42,activity*.38);
        target.z=THREE.MathUtils.lerp(target.z,pointer.y+Math.sin(phase)*.3,activity*.38);
      }
      const dx=target.x-disturbance.x,dz=target.z-disturbance.y;const distance=Math.hypot(dx,dz)||1;
      target.x+=dx/distance*startle*.8;target.z+=dz/distance*startle*.65;
      previousPosition.copy(mesh.position);mesh.position.lerp(target,first?1:1-Math.exp(-delta*(.8+startle*1.5)));
      const heading=Math.atan2(mesh.position.z-previousPosition.z,mesh.position.x-previousPosition.x);
      if(first||mesh.position.distanceToSquared(previousPosition)>.00000001)mesh.rotation.z=-heading;
    });
    butterflies.forEach(({root,left,right,material,phase},i)=>{
      root.visible=night<.98;material.opacity=(1-night)*.87;
      root.position.set(2.5+Math.sin(time*.24+phase)*1.5,2.45+Math.sin(time*.39+phase)*.6+i*.8,.6+Math.cos(time*.18+phase)*.65);
      root.rotation.z=Math.sin(time*.49+phase)*.16;
      left.rotation.y=Math.sin(time*9+phase)*.95;right.rotation.y=-left.rotation.y;
    });
  }
  return {group,update,disturb(point:THREE.Vector2,time:number){disturbance.copy(point);disturbed=time;}};
}
