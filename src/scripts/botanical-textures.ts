import * as THREE from 'three';

function seeded(seed:number){return()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};}
function texture(canvas:HTMLCanvasElement){const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;map.anisotropy=4;return map;}

function leaf(ctx:CanvasRenderingContext2D,x:number,y:number,length:number,width:number,angle:number,color:string,alpha:number){
  ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.globalAlpha=alpha;ctx.fillStyle=color;
  ctx.beginPath();ctx.moveTo(0,0);ctx.bezierCurveTo(-width,-length*.28,-width*.65,-length*.82,0,-length);
  ctx.bezierCurveTo(width*.75,-length*.7,width,-length*.18,0,0);ctx.fill();
  if(length>8){ctx.globalAlpha=alpha*.24;ctx.strokeStyle='#e8d8a1';ctx.lineWidth=.48;ctx.beginPath();ctx.moveTo(0,-1);ctx.quadraticCurveTo(-.3,-length*.5,0,-length*.89);ctx.stroke();}
  ctx.restore();
}

/** Original transparent pigment-and-ink foliage, painted at runtime; no image inputs. */
export function createCanopyTexture(seed:number,warm=false){
  const canvas=document.createElement('canvas');canvas.width=768;canvas.height=512;
  const ctx=canvas.getContext('2d')!;const random=seeded(seed);
  const palette=warm?['#4f5838','#687042','#8d8c52','#b3a16a','#89975d','#cfb57b']:['#294737','#3b5940','#52704b','#788a57','#98a169','#b4af78'];
  const clusters:Array<{x:number;y:number;rx:number;ry:number}>=[];
  const branchMasses=[[143,222,75,56],[263,163,98,74],[384,213,113,74],[529,228,98,74],[623,313,68,67],[451,348,71,49],[287,314,79,59],[183,360,38,43]];
  for(const [x,y,rx,ry] of branchMasses){
    clusters.push({x:x+(random()-.5)*33,y:y+(random()-.5)*28,rx:rx*(.8+random()*.35),ry:ry*(.82+random()*.35)});
  }
  // Uneven translucent underpainting binds the tiny leaves into a botanical mass.
  for(const cluster of clusters){
    for(let k=0;k<1;k++){
      ctx.save();ctx.translate(cluster.x+(random()-.5)*18,cluster.y+(random()-.5)*15);ctx.scale(cluster.rx,cluster.ry);
      const wash=ctx.createRadialGradient(-.25,-.3,.1,0,0,1.25);wash.addColorStop(0,'#415b3520');wash.addColorStop(.6,'#415b3509');wash.addColorStop(1,'#5b725e00');
      ctx.fillStyle=wash;ctx.beginPath();ctx.arc(0,0,1.25,0,Math.PI*2);ctx.fill();ctx.restore();
    }
  }
  // Fine tapered ink branches break into smaller twigs under the washes.
  ctx.lineCap='round';
  for(const cluster of clusters){
    ctx.strokeStyle='#555e48';ctx.globalAlpha=.47;ctx.lineWidth=1.5;
    ctx.beginPath();ctx.moveTo(cluster.x-12,cluster.y+cluster.ry*.32);ctx.quadraticCurveTo(cluster.x-5,cluster.y+9,cluster.x+9,cluster.y-13);ctx.stroke();
    for(let j=0;j<4;j++){
      const x=cluster.x+(random()-.5)*cluster.rx;const y=cluster.y+(random()-.5)*cluster.ry;
      ctx.lineWidth=.55;ctx.beginPath();ctx.moveTo(cluster.x,cluster.y+26);ctx.quadraticCurveTo(cluster.x,y,x,y-20);ctx.stroke();
    }
  }
  ctx.globalAlpha=1;
  for(const cluster of clusters){
    for(let i=0;i<300;i++){
      const a=random()*Math.PI*2;const radius=Math.sqrt(random())*(.87+.13*Math.sin(a*5+seed));
      const x=cluster.x+Math.cos(a)*radius*cluster.rx;const y=cluster.y+Math.sin(a)*radius*cluster.ry;
      const light=(1-(y-100)/320)*.32+random()*.48;
      const index=Math.min(palette.length-1,Math.floor(light*palette.length));
      const length=4+random()*11;const direction=(random()-.5)*Math.PI*1.7;
      leaf(ctx,x,y,length,length*(.23+random()*.17),direction,palette[index],.68+random()*.31);
      if(random()>.78)leaf(ctx,x+2,y+2,length*.7,length*.21,direction+.5,'#e0d6a6',.20);
    }
  }
  // Dry-brush grain and tiny transparent pinholes avoid a clean cut-out edge.
  ctx.globalCompositeOperation='source-atop';
  for(let i=0;i<6000;i++){
    ctx.globalAlpha=.035+random()*.055;ctx.fillStyle=random()>.5?'#f4e6bd':'#3b5148';
    ctx.fillRect(random()*768,random()*512,.6+random()*1.2,.4+random()*.8);
  }
  ctx.globalCompositeOperation='destination-out';ctx.globalAlpha=.11;
  for(let i=0;i<900;i++){ctx.beginPath();ctx.arc(random()*768,random()*512,.3+random()*1.4,0,Math.PI*2);ctx.fill();}
  ctx.globalCompositeOperation='source-over';ctx.globalAlpha=1;
  return texture(canvas);
}

/** A fine, asymmetrical fern silhouette, on its own transparent illustration layer. */
export function createFernTexture(seed:number){
  const canvas=document.createElement('canvas');canvas.width=640;canvas.height=640;
  const ctx=canvas.getContext('2d')!;const random=seeded(seed);
  const palette=['#526b4b','#70805a','#8c9566','#b6ae75','#627657'];
  for(let frond=0;frond<9;frond++){
    const direction=(frond-4)*.205;const length=245+random()*240;
    const start={x:325+(random()-.5)*25,y:599};
    const end={x:start.x+Math.sin(direction)*length,y:start.y-Math.cos(direction)*length};
    const control={x:start.x+Math.sin(direction)*length*.2,y:start.y-length*.85};
    ctx.globalAlpha=.8;ctx.strokeStyle='#727950';ctx.lineWidth=1.8;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(start.x,start.y);ctx.quadraticCurveTo(control.x,control.y,end.x,end.y);ctx.stroke();
    for(let j=2;j<31;j++){
      const t=j/32;const x=(1-t)*(1-t)*start.x+2*(1-t)*t*control.x+t*t*end.x;const y=(1-t)*(1-t)*start.y+2*(1-t)*t*control.y+t*t*end.y;
      const span=Math.sin(t*Math.PI)*(.12*length)*(1-t*.4);
      for(const side of [-1,1]){
        const angle=direction+side*(.83+(1-t)*.28);
        leaf(ctx,x,y,span*(.8+random()*.25),span*.14,angle,palette[(j+frond)%palette.length],.65+random()*.3);
        if(j%3===0)leaf(ctx,x,y,span*.88,span*.08,angle-.07,'#cfbb82',.27);
      }
    }
  }
  ctx.globalCompositeOperation='source-atop';ctx.globalAlpha=.09;
  for(let i=0;i<3000;i++){ctx.fillStyle=random()>.5?'#ecddaa':'#314b40';ctx.fillRect(random()*640,random()*640,1,1);}
  return texture(canvas);
}
