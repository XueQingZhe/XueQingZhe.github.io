import * as THREE from 'three';

type Palette = { heart: string; shadow: string; blue: string; face: string; rim: string; fold: string };
const palettes: Palette[] = [
  { heart: '#131c60', shadow: '#232c91', blue: '#325dcc', face: '#638be8', rim: '#d5bada', fold: '#adbdf7' },
  { heart: '#201557', shadow: '#352276', blue: '#5046b7', face: '#7f80d9', rim: '#e4b9dc', fold: '#c5b9ef' },
  { heart: '#102963', shadow: '#173c8c', blue: '#316fce', face: '#78a8ed', rim: '#e3c9dc', fold: '#c8d4fb' },
];

function seeded(seed: number) {
  return () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
}

function paper() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 512;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Blue-hour flowers require a 2D canvas.');
  return { canvas, context };
}

function texture(canvas: HTMLCanvasElement) {
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 4;
  map.wrapS = map.wrapT = THREE.ClampToEdgeWrapping;
  return map;
}

/** Rounded, lightly notched lobes, drawn from the throat toward the rim. */
function petalShape(length: number, width: number, ruffle: number) {
  const path = new Path2D();
  path.moveTo(-9, 10);
  path.bezierCurveTo(-width * .28, -length * .2, -width * .97, -length * .49, -width * .92, -length * .75);
  path.bezierCurveTo(-width, -length * .97, -width * .66, -length * 1.045, -width * .4, -length * .985);
  path.bezierCurveTo(-width * .24, -length * (1.04 + ruffle), -width * .06, -length * 1.03, width * .04, -length * .98);
  path.bezierCurveTo(width * .24, -length * 1.055, width * .36, -length * 1.02, width * .45, -length * .97);
  path.bezierCurveTo(width * .7, -length * 1.025, width * .96, -length * .9, width * .89, -length * .71);
  path.bezierCurveTo(width * .85, -length * .43, width * .22, -length * .15, 8, 10);
  path.quadraticCurveTo(0, 15, -9, 10);
  path.closePath();
  return path;
}

function paintPetal(ctx: CanvasRenderingContext2D, palette: Palette, length: number, width: number, angle: number, random: () => number, layer: number) {
  ctx.save();
  ctx.rotate(angle);
  const shape = petalShape(length, width, .02 + random() * .025);
  const wash = ctx.createLinearGradient(-width * .35, 5, width * .25, -length * 1.02);
  wash.addColorStop(0, palette.heart);
  wash.addColorStop(.19, palette.shadow);
  wash.addColorStop(.48, palette.blue);
  wash.addColorStop(.81, palette.face);
  wash.addColorStop(1, palette.rim);
  ctx.fillStyle = wash;
  ctx.fill(shape);
  ctx.save();
  ctx.clip(shape);

  // Asymmetric side folds make each petal read as a softly cupped surface.
  const side = ctx.createLinearGradient(-width, 0, width, -length * .1);
  side.addColorStop(0, '#16256888');
  side.addColorStop(.25, '#1d317525');
  side.addColorStop(.52, '#bfd1ff22');
  side.addColorStop(.72, '#25419400');
  side.addColorStop(1, '#241e6473');
  ctx.fillStyle = side;
  ctx.fillRect(-width * 1.2, -length * 1.2, width * 2.4, length * 1.35);

  const sheen = ctx.createRadialGradient(-width * .28, -length * .73, 2, -width * .2, -length * .68, length * .63);
  sheen.addColorStop(0, '#cbd5ff34');
  sheen.addColorStop(.58, '#99b5f80c');
  sheen.addColorStop(1, '#708ec900');
  ctx.fillStyle = sheen;
  ctx.fillRect(-width * 1.1, -length * 1.1, width * 2.2, length * 1.2);

  ctx.lineCap = 'round';
  for (let vein = -4; vein <= 4; vein++) {
    const spread = vein / 4;
    const endX = spread * width * (.69 + random() * .08);
    const endY = -length * (.83 + (1 - Math.abs(spread)) * .135);
    ctx.strokeStyle = vein % 2 ? '#d9d8ff29' : '#18296731';
    ctx.lineWidth = .7 + random() * .65;
    ctx.beginPath();
    ctx.moveTo(spread * 6, -length * .08);
    ctx.bezierCurveTo(endX * .22 + 5, -length * .34, endX * .81 - 4, -length * .61, endX, endY);
    ctx.stroke();
    if (vein !== 0) {
      ctx.strokeStyle = '#d0d7ff18';
      ctx.lineWidth = .65;
      ctx.beginPath();
      ctx.moveTo(endX * .4, -length * .44);
      ctx.quadraticCurveTo(endX * .8, -length * .56, endX * 1.13, endY * .83);
      ctx.stroke();
    }
  }

  // A narrow crescent just inside the rim describes its turning edge.
  ctx.strokeStyle = palette.fold + (layer ? '65' : '4a');
  ctx.lineWidth = layer ? 1.6 : 1.9;
  ctx.beginPath();
  ctx.moveTo(-width * .84, -length * .76);
  ctx.bezierCurveTo(-width * .78, -length * .92, -width * .55, -length * .98, -width * .4, -length * .94);
  ctx.bezierCurveTo(-width * .22, -length * 1.01, -width * .07, -length * .97, width * .04, -length * .935);
  ctx.bezierCurveTo(width * .24, -length, width * .42, -length * .96, width * .45, -length * .935);
  ctx.bezierCurveTo(width * .69, -length * .985, width * .88, -length * .85, width * .81, -length * .75);
  ctx.stroke();
  // A few irregular translucent pigment deposits, constrained to the petal.
  for (let grain = 0; grain < 90; grain++) {
    ctx.fillStyle = random() > .45 ? '#d3d3f415' : '#16266114';
    ctx.beginPath();
    ctx.ellipse((random() * 2 - 1) * width, -random() * length, .45 + random() * 1.5, .3 + random() * .9, random() * 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  ctx.strokeStyle = '#24275e42';
  ctx.lineWidth = .9;
  ctx.stroke(shape);
  ctx.restore();
}

/** Original transparent blue corollas: five-lobed, double violet, and layered cobalt. */
export function createBlueFlowerTexture(variant: number): THREE.CanvasTexture {
  const kind = ((Math.floor(variant) % 3) + 3) % 3;
  const palette = palettes[kind];
  const random = seeded(70861 + kind * 9173);
  const { canvas, context: ctx } = paper();
  ctx.save();
  // The visible throat sits below the geometric center, with shallow perspective.
  ctx.translate(256, 270);
  ctx.scale(1, .89);
  const petals = kind === 0 ? 5 : kind === 1 ? 9 : 6;
  const turn = [-.12, .13, -.32][kind];
  const mainWidth = [107, 73, 98][kind];
  const mainLength = [222, 220, 223][kind];
  for (let i = 0; i < petals; i++) {
    paintPetal(ctx, palette, mainLength * (.93 + random() * .075), mainWidth * (.94 + random() * .1), turn + i / petals * Math.PI * 2, random, 0);
  }

  // Sparse overlapping upper petals retain a recognizable broad outer silhouette.
  if (kind !== 0) {
    const innerCount = kind === 1 ? 7 : 5;
    for (let i = 0; i < innerCount; i++) {
      paintPetal(ctx, palette, (kind === 1 ? 146 : 132) * (.91 + random() * .12), kind === 1 ? 57 : 64, turn + .36 + i / innerCount * Math.PI * 2, random, 1);
    }
  } else {
    // Short basal folds preserve the five-petal flower's open face.
    for (let i = 0; i < 5; i++) {
      ctx.save();ctx.rotate(turn + i / 5 * Math.PI * 2);
      const fold = ctx.createLinearGradient(0, 0, 0, -76);
      fold.addColorStop(0, '#132265');fold.addColorStop(.55, '#698ada85');fold.addColorStop(1, '#cad5f600');
      ctx.fillStyle = fold;ctx.beginPath();ctx.moveTo(-12, 4);ctx.quadraticCurveTo(-27, -42, -6, -83);ctx.quadraticCurveTo(16, -36, 12, 4);ctx.fill();ctx.restore();
    }
  }

  const throat = ctx.createRadialGradient(0, 4, 1, 0, 4, 40);
  throat.addColorStop(0, '#182450');throat.addColorStop(.4, '#25367bae');throat.addColorStop(1, '#29377500');
  ctx.fillStyle = throat;ctx.beginPath();ctx.ellipse(0, 5, 41, 32, 0, 0, Math.PI * 2);ctx.fill();

  // White-gold filaments are curved and separate, without a central luminous disk.
  const stamens = kind === 1 ? 33 : 27;
  ctx.lineCap = 'round';
  for (let i = 0; i < stamens; i++) {
    const a = i / stamens * Math.PI * 2 + (random() - .5) * .25;
    const reach = 25 + random() * (kind === 1 ? 41 : 32);
    const x = Math.cos(a) * reach;
    const y = Math.sin(a) * reach * .82 - 6;
    ctx.strokeStyle = i % 4 ? '#eee4dcbb' : '#afc7efa6';
    ctx.lineWidth = .7 + random() * .7;
    ctx.beginPath();ctx.moveTo((random() - .5) * 10, 11 + random() * 5);ctx.quadraticCurveTo(x * .44 + 4, y * .2 - 11, x, y);ctx.stroke();
    ctx.fillStyle = i % 3 ? '#fff0cf' : '#ddbd88';
    ctx.beginPath();ctx.ellipse(x, y, 1.3 + random() * 1.3, 2.1 + random() * 1.5, a - .4, 0, Math.PI * 2);ctx.fill();
  }
  for (let i = 0; i < 10; i++) {
    const a = random() * Math.PI * 2, r = random() * 14;
    ctx.fillStyle = i % 2 ? '#dec994' : '#a1afd1';
    ctx.beginPath();ctx.ellipse(Math.cos(a) * r, 6 + Math.sin(a) * r * .65, 1.4, 2.1, a, 0, Math.PI * 2);ctx.fill();
  }
  ctx.restore();
  return texture(canvas);
}

/** One curled, translucent blue-pink petal for ribbons of airborne blossoms. */
export function createBluePetalTexture(): THREE.CanvasTexture {
  const { canvas, context: ctx } = paper();
  ctx.translate(256, 266);
  ctx.rotate(-.53);
  const shape = new Path2D();
  shape.moveTo(-22, 199);
  shape.bezierCurveTo(-31, 91, -139, -17, -92, -150);
  shape.bezierCurveTo(-68, -220, 25, -228, 74, -172);
  shape.bezierCurveTo(143, -91, 78, 76, -22, 199);
  shape.closePath();
  const wash = ctx.createLinearGradient(-102, -178, 75, 162);
  wash.addColorStop(0, '#e6bacfe8');wash.addColorStop(.23, '#afbef9ef');wash.addColorStop(.58, '#6296dedb');wash.addColorStop(1, '#324d8d73');
  ctx.fillStyle = wash;ctx.fill(shape);
  ctx.save();ctx.clip(shape);
  const fold = ctx.createLinearGradient(-96, 0, 120, 0);
  fold.addColorStop(0, '#d5d9ff80');fold.addColorStop(.5, '#647ec800');fold.addColorStop(.78, '#293e9630');fold.addColorStop(1, '#2d296678');
  ctx.fillStyle = fold;ctx.fillRect(-160, -250, 320, 500);
  for (let i = 0; i < 7; i++) {
    ctx.strokeStyle = i % 2 ? '#e8ddff32' : '#425da22b';ctx.lineWidth = .8;
    ctx.beginPath();ctx.moveTo(-22, 183);ctx.bezierCurveTo(15 + i * 6, 81, -70 + i * 24, -57, -66 + i * 21, -179);ctx.stroke();
  }
  ctx.restore();
  ctx.strokeStyle = '#e8d6ed73';ctx.lineWidth = 1.2;ctx.stroke(shape);
  ctx.strokeStyle = '#eee0f194';ctx.lineWidth = 1.8;ctx.beginPath();ctx.moveTo(-19, 171);ctx.bezierCurveTo(55, 29, 86, -63, 55, -177);ctx.stroke();
  return texture(canvas);
}
