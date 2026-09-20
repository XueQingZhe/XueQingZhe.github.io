import * as THREE from 'three';

type Pigment = {
  material: THREE.MeshBasicMaterial | THREE.MeshStandardMaterial;
  day: THREE.Color;
  night: THREE.Color;
  dayOpacity?: number;
  nightOpacity?: number;
};
type Sway = { object: THREE.Object3D; rest: number; phase: number; amount: number };

function seeded(seed: number) {
  return () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
}

function paper(width: number, height: number) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('The botanical painting needs a 2D canvas.');
  return { canvas, context };
}

function paintedTexture(canvas: HTMLCanvasElement) {
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function leaf(ctx: CanvasRenderingContext2D, x: number, y: number, length: number, angle: number, color: string) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.bezierCurveTo(-length * .25, -length * .22, -length * .22, -length * .68, 0, -length);
  ctx.bezierCurveTo(length * .33, -length * .68, length * .28, -length * .22, 0, 0);
  ctx.fill();
  ctx.strokeStyle = '#d8cb9866';
  ctx.lineWidth = .65;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(length * .03, -length * .48, 0, -length * .89);
  ctx.stroke();
  ctx.restore();
}

/** A hanging raceme painted petal by petal, with overlapping wings and gaps. */
function hangingTexture(seed: number, lavender: boolean) {
  const { canvas, context: ctx } = paper(256, 512);
  const random = seeded(seed);
  const spineX = (t: number) => 127 + Math.sin(t * 3.8 + seed) * 12 * t;
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#71816aa6';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(127, 5);
  ctx.bezierCurveTo(119, 140, 146, 319, spineX(1), 494);
  ctx.stroke();
  for (let level = 0; level < 24; level++) {
    const t = level / 23;
    const y = 52 + t * 431;
    const spread = Math.pow(Math.sin((t * .88 + .10) * Math.PI), .7) * (1 - t * .84) * 65;
    const count = t < .7 ? 3 + Math.floor(random() * 3) : 2;
    for (let j = 0; j < count; j++) {
      const side = j % 2 ? 1 : -1;
      const x = spineX(t) + side * spread * (.24 + random() * .76);
      const py = y + (random() - .5) * 15;
      const size = (15 + random() * 9) * (1 - t * .57);
      ctx.strokeStyle = '#79846e87';
      ctx.lineWidth = .75;
      ctx.beginPath();
      ctx.moveTo(spineX(t), y - 7);
      ctx.quadraticCurveTo(x - side * 9, py - 5, x, py);
      ctx.stroke();
      ctx.save();
      ctx.translate(x, py);
      ctx.rotate(side * (.34 + random() * .32));
      // The dark underside reads as a folded petal rather than a luminous dot.
      ctx.fillStyle = lavender ? '#9e95b7d9' : '#b5b2a3d9';
      ctx.beginPath();
      ctx.ellipse(1, size * .36, size * .39, size * .64, -.16, 0, Math.PI * 2);
      ctx.fill();
      const wash = ctx.createLinearGradient(-size * .5, -size * .3, size * .7, size * .8);
      wash.addColorStop(0, lavender ? '#f0e8e1' : '#f5edda');
      wash.addColorStop(.45, lavender ? '#dcd0df' : '#e8dfc7');
      wash.addColorStop(1, lavender ? '#aba3c5' : '#c5c3b0');
      ctx.fillStyle = wash;
      ctx.beginPath();
      ctx.moveTo(0, size * .56);
      ctx.bezierCurveTo(-size * .92, size * .05, -size * .74, -size * .70, -size * .08, -size * .40);
      ctx.bezierCurveTo(size * .38, -size * .85, size * .95, -.1 * size, 0, size * .56);
      ctx.fill();
      ctx.strokeStyle = '#faf2df70';
      ctx.lineWidth = .55;
      ctx.beginPath();
      ctx.moveTo(-size * .23, -size * .29);
      ctx.quadraticCurveTo(-size * .37, -.04 * size, 0, size * .35);
      ctx.stroke();
      ctx.restore();
    }
  }
  leaf(ctx, 127, 26, 34, -1.05, '#779071');
  leaf(ctx, 129, 39, 25, .92, '#90a079');
  // Pigment granulation is confined to the painted silhouette.
  ctx.globalCompositeOperation = 'source-atop';
  for (let i = 0; i < 950; i++) {
    ctx.fillStyle = random() > .48 ? '#fff4df16' : '#807b9416';
    ctx.fillRect(random() * 256, random() * 512, .5 + random(), .5 + random());
  }
  return paintedTexture(canvas);
}

function vineLeavesTexture() {
  const { canvas, context: ctx } = paper(512, 256);
  const random = seeded(216);
  ctx.lineCap = 'round';
  for (let branch = 0; branch < 7; branch++) {
    const startX = 32 + branch * 65;
    const startY = 70 + Math.sin(branch * .85) * 21;
    const direction = (branch % 2 ? 1 : -1) * (.65 + random() * .4);
    ctx.save();ctx.translate(startX, startY);ctx.rotate(direction);
    ctx.strokeStyle = '#6c795dbb';ctx.lineWidth = 1.5;
    ctx.beginPath();ctx.moveTo(0, 0);ctx.bezierCurveTo(-3, 25, 10, 64, 4, 116);ctx.stroke();
    for (let node = 0; node < 5; node++) {
      const y = 14 + node * 19;
      const length = 23 + Math.sin(node / 5 * Math.PI) * 15;
      leaf(ctx, 2, y, length, -2.1, ['#5d7554', '#8b9b70', '#a6ad80'][node % 3]);
      leaf(ctx, 3, y + 8, length * .91, 2.1, ['#81946b', '#6d825c', '#a1a37a'][node % 3]);
    }
    leaf(ctx, 4, 112, 24, Math.PI - .07, '#98a477');
    ctx.restore();
  }
  return paintedTexture(canvas);
}

function blossom(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, warm: boolean, random: () => number) {
  const rotation = random() * Math.PI;
  ctx.save();ctx.translate(x, y);ctx.rotate(rotation);
  const petals = 5 + (random() > .55 ? 1 : 0);
  for (let i = 0; i < petals; i++) {
    ctx.save();ctx.rotate(i / petals * Math.PI * 2);
    const wash = ctx.createLinearGradient(0, 2, 0, -radius);
    wash.addColorStop(0, warm ? '#caa77e' : '#c5c09b');
    wash.addColorStop(.4, warm ? '#e5bfa0' : '#e9e0bf');
    wash.addColorStop(1, warm ? '#f0d8bb' : '#f3ecd7');
    ctx.fillStyle = wash;
    ctx.beginPath();ctx.moveTo(-radius * .10, 2);
    ctx.bezierCurveTo(-radius * .69, -radius * .32, -radius * .57, -radius * 1.18, 0, -radius);
    ctx.bezierCurveTo(radius * .70, -radius * 1.22, radius * .61, -radius * .21, radius * .10, 2);
    ctx.fill();
    ctx.strokeStyle = '#f8efd347';ctx.lineWidth = .75;
    ctx.beginPath();ctx.moveTo(0, -radius * .17);ctx.quadraticCurveTo(-radius * .06, -radius * .57, 0, -radius * .88);ctx.stroke();
    ctx.restore();
  }
  ctx.fillStyle = '#bca063';ctx.beginPath();ctx.ellipse(0, 0, radius * .21, radius * .18, .2, 0, Math.PI * 2);ctx.fill();
  for (let i = 0; i < 6; i++) {
    const a = i / 6 * Math.PI * 2;
    ctx.fillStyle = i % 2 ? '#e0ca82' : '#a99257';
    ctx.beginPath();ctx.arc(Math.cos(a) * radius * .16, Math.sin(a) * radius * .12, Math.max(.6, radius * .034), 0, Math.PI * 2);ctx.fill();
  }
  ctx.restore();
}

/** One irregular flowering bank; open stems leave water visible through it. */
function bankTexture(seed: number) {
  const { canvas, context: ctx } = paper(512, 512);
  const random = seeded(seed);
  const blooms = [[105,250,18],[157,203,23],[198,277,16],[245,166,25],[306,222,20],[371,288,22],[403,354,15],[261,326,28],[181,352,21],[334,362,18],[110,390,12],[296,267,13]];
  // A few dry seed stems rise behind the softer flowers, not a regular fence.
  for (let i = 0; i < 11; i++) {
    const baseX = 151 + random() * 214;
    const tipX = baseX + (random() - .5) * 163;
    const tipY = 35 + random() * 185;
    ctx.strokeStyle = i % 3 ? '#879169b5' : '#b6a878b5';ctx.lineWidth = .9 + random() * .6;
    ctx.beginPath();ctx.moveTo(baseX, 497);ctx.bezierCurveTo(baseX - 14, 320, tipX - 10, 170, tipX, tipY);ctx.stroke();
    for (let j = 0; j < 8; j++) {
      const y = tipY + j * 5;
      ctx.strokeStyle = '#c9ba86c2';ctx.lineWidth = 1.1;
      ctx.beginPath();ctx.moveTo(tipX, y + 4);ctx.quadraticCurveTo(tipX - 9, y - 4, tipX - 4, y - 7);ctx.stroke();
      ctx.beginPath();ctx.moveTo(tipX, y + 6);ctx.quadraticCurveTo(tipX + 8, y - 2, tipX + 4, y - 5);ctx.stroke();
    }
  }
  for (let i = 0; i < blooms.length; i++) {
    const [baseX, baseY, radius] = blooms[i];
    const x = baseX + (random() - .5) * 18;
    const y = baseY + (random() - .5) * 23;
    const rootX = 248 + (random() - .5) * 84;
    ctx.strokeStyle = '#657b56';ctx.lineWidth = 1.4;
    ctx.beginPath();ctx.moveTo(rootX, 494);ctx.bezierCurveTo(rootX - 13, 416, x - 11, y + 68, x, y);ctx.stroke();
    const leafY = y + (494 - y) * .62;
    const leafX = rootX * .46 + x * .54;
    leaf(ctx, leafX, leafY, 43 + random() * 23, i % 2 ? -.75 : .94, ['#687e58', '#8b9666', '#536f54'][i % 3]);
    leaf(ctx, leafX + 3, leafY + 19, 28 + random() * 21, i % 2 ? 1.04 : -.95, '#8c9b6c');
    blossom(ctx, x, y, radius, i % 3 === 0 || i === 7, random);
  }
  for (let i = 0; i < 13; i++) leaf(ctx, 222 + (random() - .5) * 164, 493, 55 + random() * 49, (random() - .5) * 2.3, i % 2 ? '#68845d' : '#889869');
  return paintedTexture(canvas);
}

/** Original flora for the portal. The caller owns time, theme and disposal. */
export function createPortalFlora(): { group: THREE.Group; update: (time: number, night: number) => void } {
  const group = new THREE.Group();
  group.name = 'portal-flora';
  const pigments: Pigment[] = [];
  const sways: Sway[] = [];

  function paint(map: THREE.Texture, day: string, night: string, dayOpacity=1, nightOpacity=dayOpacity) {
    const material = new THREE.MeshBasicMaterial({ map, color: day, opacity:dayOpacity, transparent: true, alphaTest: .035, depthWrite: false, side: THREE.DoubleSide, fog: true });
    pigments.push({ material, day: new THREE.Color(day), night: new THREE.Color(night), dayOpacity, nightOpacity });
    return material;
  }
  // Painted petals inherit the canopy's shade; they are never a source of light.
  const ivory = paint(hangingTexture(74, false), '#cfccb7', '#586174', .95, .78);
  const lavender = paint(hangingTexture(208, true), '#ccc3ca', '#596079', .94, .76);
  const greenery = paint(vineLeavesTexture(), '#c3c7a9', '#414e60', .94, .84);
  const flowers = paint(bankTexture(791), '#eee2c9', '#a39c9a');
  const twig = new THREE.MeshStandardMaterial({ color: '#6b7454', roughness: 1 });
  pigments.push({ material: twig, day: new THREE.Color('#6b7454'), night: new THREE.Color('#354653') });

  function curve(points: number[][], radius: number, parent: THREE.Object3D = group) {
    const path = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p as [number, number, number])));
    const mesh = new THREE.Mesh(new THREE.TubeGeometry(path, 22, radius, 5, false), twig);
    parent.add(mesh);
    return mesh;
  }

  // Begin at the actual crown of the tree at (7.65,.08,-2.4), scale 1.32.
  // The previous forward-offset branch and independently placed blooms appeared detached.
  const vine = curve([[7.49,4.74,-2.40],[6.97,5.12,-2.08],[6.30,5.25,-1.78],[5.58,5.02,-1.58],[4.86,4.79,-1.55]], .012);
  vine.name='tree-attached-flowering-vine';
  const vinePath=vine.geometry.parameters.path;
  const leafPlane = new THREE.PlaneGeometry(1, 1);
  for (const [t,w,h,r] of [[.31,1.62,.65,-.08],[.72,1.37,.57,.12]]) {
    const anchor=vinePath.getPoint(t);
    const foliage = new THREE.Mesh(leafPlane, greenery);
    foliage.position.copy(anchor);foliage.position.y+=.09;foliage.position.z+=.018;
    foliage.scale.set(w,h,1);foliage.rotation.z=r;
    group.add(foliage);
    sways.push({ object:foliage, rest:r, phase:t*5.7, amount:.004 });
  }

  // Pivot at each stem's attachment point; every length and angle is deliberate.
  const hangingPlane = new THREE.PlaneGeometry(1, 1, 2, 5);
  hangingPlane.translate(0, -.5, 0);
  const racemes = [
    [.25,.26,.55,-.045,0],
    [.42,.31,.73,.035,1],
    [.59,.24,.52,-.055,0],
    [.77,.29,.69,.045,1],
    [.92,.23,.49,-.04,0],
  ];
  racemes.forEach(([t,width,height,angle,tone], index) => {
    const pivot = new THREE.Group();pivot.position.copy(vinePath.getPoint(t));pivot.rotation.z=angle;
    pivot.name=`attached-raceme-${index+1}`;
    const blooms = new THREE.Mesh(hangingPlane, tone ? lavender : ivory);
    // Texture begins with a fine stem; its first pixel remains on the branch.
    blooms.position.y=height*5/512;blooms.scale.set(width,height,1);blooms.rotation.y=(index%3-1)*.13;
    pivot.add(blooms);group.add(pivot);
    sways.push({ object:pivot, rest:angle, phase:index*1.71, amount:.009+index%3*.002 });
  });

  const bankPlane = new THREE.PlaneGeometry(1,1);
  bankPlane.translate(0,.5,0);
  for (const [x,z,width,height,angle] of [[6.55,1.62,1.65,1.47,.04],[7.36,2.40,1.54,1.20,-.07],[6.03,2.67,1.12,.97,.10]]) {
    const bank = new THREE.Group();bank.position.set(x,.015,z);bank.rotation.z=angle;
    const painted = new THREE.Mesh(bankPlane,flowers);painted.scale.set(width,height,1);painted.rotation.y=-.10+(x-6)*.10;
    bank.add(painted);group.add(bank);
    sways.push({ object:bank, rest:angle, phase:x*3.1, amount:.009 });
  }
  // Fine spatial stems keep the painted bank from reading as a flat sticker.
  for (let i=0;i<6;i++) {
    const x=6.31+i*.22;
    const z=1.77+Math.sin(i*1.6)*.26;
    const height=.66+Math.sin(i*2.1)*.18+i*.045;
    const reed=new THREE.Group();reed.position.set(x,.008,z);
    curve([[0,0,0],[.016,height*.35,0],[.06,height*.79,.018],[.11+(i%2)*.05,height,.03]],.004,reed);
    group.add(reed);
    sways.push({ object:reed, rest:0, phase:i*1.2, amount:.015 });
  }

  let lastNight = -1;
  const update = (time: number, night: number) => {
    const blend = THREE.MathUtils.clamp(night,0,1);
    if (Math.abs(blend-lastNight)>.0003) {
      for (const pigment of pigments) {
        pigment.material.color.copy(pigment.day).lerp(pigment.night,blend);
        if(pigment.dayOpacity!==undefined) pigment.material.opacity=THREE.MathUtils.lerp(pigment.dayOpacity,pigment.nightOpacity??pigment.dayOpacity,blend);
      }
      lastNight=blend;
    }
    for (const sway of sways) sway.object.rotation.z=sway.rest+Math.sin(time*.47+sway.phase)*sway.amount;
  };
  update(0,0);
  return { group, update };
}
