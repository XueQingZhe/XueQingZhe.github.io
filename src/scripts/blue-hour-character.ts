import * as THREE from 'three';

/** Aligned original illustration layers share the garden's clock and depth. */
export function createBlueHourCharacter(invalidate:()=>void){
  const group=new THREE.Group();group.name='blue-hour-character';group.visible=false;
  const materials:THREE.MeshBasicMaterial[]=[];
  const textures=new Set<THREE.Texture>();
  const timeUniform={value:20},gustUniform={value:0};
  const day=new THREE.Color('#ffffff'),night=new THREE.Color('#9eaeda');
  let disposed=false,loaded=0,failed=false,previousNight=-1;
  const layerUrls=['/art/blue-hour/character-back-hair.svg','/art/blue-hour/character-body.svg','/art/blue-hour/character-front-hair.svg','/art/blue-hour/character-ribbon.svg'];
  const loader=new THREE.TextureLoader();
  layerUrls.forEach((url,index)=>{
    const material=new THREE.MeshBasicMaterial({transparent:true,alphaTest:.015,depthWrite:false,depthTest:true,side:THREE.FrontSide,toneMapped:false});
    material.onBeforeCompile=shader=>{
      shader.uniforms.uCharacterTime=timeUniform;shader.uniforms.uCharacterGust=gustUniform;
      shader.vertexShader='uniform float uCharacterTime;uniform float uCharacterGust;\n'+shader.vertexShader;
      // The face, neck and book stay pinned; only free ends of hair and fabric move.
      const movement=index===1?'(1.0-smoothstep(.04,.40,uv.y))*.09':index===2?'(1.0-smoothstep(.58,.79,uv.y))*.55':index===3?'1.0-smoothstep(.48,.88,uv.y)':'1.0-smoothstep(.45,.82,uv.y)';
      shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`
        #include <begin_vertex>
        float freedom=${movement};
        float breeze=sin(uCharacterTime*.62+uv.y*5.0)*.028+sin(uCharacterTime*.91+uv.y*8.0)*.012;
        transformed.x+=breeze*freedom*(1.0+uCharacterGust*2.4);
        transformed.y+=sin(uCharacterTime*.53+uv.x*5.0)*.014*freedom;
      `);
    };
    material.customProgramCacheKey=()=> 'blue-character-layer-'+index;
    const mesh=new THREE.Mesh(new THREE.PlaneGeometry(6.1*900/1100,6.1,28,36),material);
    mesh.name=url.split('/').pop()!;mesh.position.z=index*.018;mesh.renderOrder=1+index;mesh.frustumCulled=false;group.add(mesh);materials.push(material);
    const texture=loader.load(url,map=>{
      if(disposed){map.dispose();return;}
      loaded++;
      if(loaded===layerUrls.length&&!failed){group.visible=true;invalidate();}
    },undefined,error=>{
      if(disposed)return;
      failed=true;group.visible=false;
      console.warn('A character illustration layer could not be loaded.',error);
    });
    texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;
    material.map=texture;textures.add(texture);
  });
  const setCompact=(compact:boolean)=>{
    group.position.set(compact?2.15:3.15,compact?1.48:1.95,1.1);
    group.scale.setScalar(compact?.82:1);
  };
  setCompact(false);
  return{
    group,setCompact,
    get ready(){return!disposed&&!failed&&loaded===layerUrls.length;},
    get layers(){return loaded;},
    update(time:number,nightAmount:number,gust:number){
      timeUniform.value=time;gustUniform.value=gust;
      if(previousNight!==nightAmount){materials.forEach(material=>material.color.copy(day).lerp(night,nightAmount));previousNight=nightAmount;}
    },
    dispose(){disposed=true;group.visible=false;textures.forEach(texture=>texture.dispose());textures.clear();materials.forEach(material=>{material.map=null;});},
  };
}
