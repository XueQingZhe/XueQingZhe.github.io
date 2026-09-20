import * as THREE from 'three';

export interface BlueHourLight {
  group: THREE.Group;
  update(time: number, night: number, gust: number): void;
  resize(width: number, height: number, compact?: boolean): void;
  dispose(): void;
}

const beamVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const beamFragment = /* glsl */ `
  varying vec2 vUv;
  uniform float uTime, uNight, uGust;
  uniform vec2 uResolution, uSun;
  uniform vec4 uFace;

  float shaft(vec2 delta, float slope, float spread, float phase) {
    vec2 axis = normalize(vec2(slope, -1.0));
    float along = dot(delta, axis);
    float across = dot(delta, vec2(-axis.y, axis.x));
    float width = .008 + max(along, 0.0) * spread;
    float curl = sin(along * 4.5 - uTime * .19 + phase) * width * (.22 + uGust * .16);
    float filament = exp(-pow((across + curl) / width, 2.0));
    float begin = smoothstep(.015, .12, along);
    float end = 1.0 - smoothstep(.64, 1.55, along);
    // Two unsynchronised rhythms keep the sunlight breathing instead of flashing.
    float breath = .69 + .19 * sin(uTime * .51 + phase) + .10 * sin(uTime * .29 + phase * 1.8);
    float leaves = .82 + .18 * sin(along * 17.0 - uTime * .31 + phase);
    return filament * begin * end * breath * leaves;
  }

  void main() {
    float aspect = uResolution.x / uResolution.y;
    vec2 delta = (vUv - uSun) * vec2(aspect, 1.0);
    float rays = shaft(delta, .19, .021, .2) * .34;
    rays += shaft(delta, .37, .030, 1.7) * .60;
    rays += shaft(delta, .64, .018, 3.1) * .68;
    rays += shaft(delta, .87, .035, 4.4) * .49;
    rays += shaft(delta, 1.13, .019, 6.0) * .32;
    // Keep the painted face and the lower navigation free from light streaks.
    float faceClear = smoothstep(.55, 1.25, length((vUv - uFace.xy) / uFace.zw));
    float lowerFade = smoothstep(.14, .34, vUv.y);
    float opacity = .112 * rays * faceClear * lowerFade;
    opacity *= mix(1.0, .035, uNight) * (1.0 + uGust * .18);
    vec3 tint = mix(vec3(1.0, .82, .51), vec3(.46, .59, 1.0), uNight);
    gl_FragColor = vec4(tint, min(opacity, .088));
    #include <colorspace_fragment>
  }
`;

const dustVertex = /* glsl */ `
  attribute vec4 aDrift;
  uniform float uTime, uNight, uGust;
  uniform vec2 uResolution;
  uniform vec4 uFace;
  varying float vLight, vWarm;

  void main() {
    float phase = aDrift.z;
    vec2 p = aDrift.xy;
    p.x += sin(uTime * .13 + phase) * (.011 + uGust * .009);
    p.y += sin(uTime * .17 + phase * 1.3) * .019;
    float pulse = .5 + .5 * sin(uTime * (.38 + aDrift.w * .14) + phase);
    float faceClear = smoothstep(.6, 1.2, length((p - uFace.xy) / uFace.zw));
    vLight = mix(.24 + .36 * pulse, .14 + .68 * pulse * pulse, uNight) * faceClear;
    vWarm = step(.73, aDrift.w);
    float scale = clamp(min(uResolution.x, uResolution.y) / 850.0, .85, 1.3);
    gl_PointSize = (2.3 + aDrift.w * 3.5) * scale;
    gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
  }
`;

const dustFragment = /* glsl */ `
  uniform float uNight;
  varying float vLight, vWarm;
  void main() {
    vec2 p = gl_PointCoord - .5;
    float radius2 = dot(p, p);
    float core = exp(-radius2 * 48.0);
    float halo = exp(-radius2 * 13.0) * (1.0 - smoothstep(.16, .25, radius2));
    float opacity = (.48 * core + .08 * halo) * vLight;
    vec3 moon = mix(vec3(.49, .64, 1.0), vec3(1.0, .71, .37), vWarm);
    vec3 tint = mix(vec3(1.0, .85, .54), moon, uNight);
    gl_FragColor = vec4(tint, opacity);
    #include <colorspace_fragment>
  }
`;

const petalVertex = /* glsl */ `
  attribute vec4 aPetal;
  uniform float uTime, uGust;
  uniform vec2 uResolution;
  uniform vec4 uFace;
  varying vec2 vUv;
  varying float vOpacity, vDepth;

  void main() {
    vUv = uv;
    float depth = aPetal.z;
    float phase = aPetal.w;
    // Different virtual depths control falling speed, scale, and tumbling together.
    float speed = mix(.007, .021, depth);
    vec2 p = vec2(aPetal.x, fract(aPetal.y - uTime * speed) * 1.2 - .1);
    p.x += sin(uTime * .17 + phase + p.y * 3.0) * (.021 + depth * .038);
    p.x += sin(uTime * .31 + phase) * uGust * .065;
    float angle = phase + uTime * mix(.12, .29, depth) + sin(uTime * .27 + phase) * .4;
    float fold = max(.16, abs(cos(uTime * .36 + phase)));
    vec2 local = position.xy * vec2(fold, 1.0);
    local = mat2(cos(angle), -sin(angle), sin(angle), cos(angle)) * local;
    float size = mix(6.0, 23.0, depth * depth);
    local *= size / uResolution;
    float faceClear = smoothstep(.6, 1.25, length((p - uFace.xy) / uFace.zw));
    float edges = smoothstep(-.04, .08, p.y) * (1.0 - smoothstep(.95, 1.06, p.y));
    vOpacity = mix(.28, .68, depth) * faceClear * edges;
    vDepth = depth;
    gl_Position = vec4((p + local) * 2.0 - 1.0, 0.0, 1.0);
  }
`;

const petalFragment = /* glsl */ `
  uniform float uNight;
  varying vec2 vUv;
  varying float vOpacity, vDepth;
  void main() {
    vec2 p = vUv - .5;
    p.x += .14 * sin(p.y * 3.2);
    float shape = length(p * vec2(1.45, 1.0));
    float edge = mix(.08, .025, vDepth);
    float alpha = 1.0 - smoothstep(.40 - edge, .40 + edge, shape);
    float notch = exp(-dot((p - vec2(0.0, .39)) * vec2(1.6, 1.0), (p - vec2(0.0, .39)) * vec2(1.6, 1.0)) * 1100.0);
    alpha *= 1.0 - notch * .85;
    float foldShade = smoothstep(-.18, .16, p.x) * .14;
    vec3 day = mix(vec3(1.0, .97, .88), vec3(.81, .77, .83), foldShade);
    vec3 night = mix(vec3(.84, .85, 1.0), vec3(.50, .57, .84), foldShade);
    gl_FragColor = vec4(mix(day, night, uNight), alpha * vOpacity);
    #include <colorspace_fragment>
  }
`;

/** Three lightweight passes; all movement uses the scene clock, including petal wraps. */
export function createBlueHourLight(): BlueHourLight {
  const group = new THREE.Group();
  group.name = 'blue-hour-light';
  group.renderOrder = 100;

  const uniforms = {
    uTime: { value: 0 },
    uNight: { value: 0 },
    uGust: { value: 0 },
    uResolution: { value: new THREE.Vector2(1440, 1000) },
    uSun: { value: new THREE.Vector2(.12, 1.04) },
    uFace: { value: new THREE.Vector4(.76, .73, .12, .15) },
  };

  const beamGeometry = new THREE.PlaneGeometry(2, 2);
  const beamMaterial = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: beamVertex,
    fragmentShader: beamFragment,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
    fog: false,
  });
  const beams = new THREE.Mesh(beamGeometry, beamMaterial);
  beams.name = 'blue-hour-backlight';
  beams.renderOrder = 100;
  beams.frustumCulled = false;
  group.add(beams);

  const seeds = new Float32Array([
    .08, .68, .4, .23, .21, .89, 2.4, .54,
    .42, .78, 4.1, .35, .76, .91, 1.2, .62,
    .94, .76, 5.6, .24, .88, .51, 3.4, .47,
    .19, .32, 4.9, .88, .38, .24, 1.7, .38,
    .58, .35, 6.1, .79, .80, .29, 3.0, .93,
    .95, .38, 2.0, .56, .66, .43, 5.1, .33,
    .12, .42, 6.7, .61, .44, .53, 7.3, .28,
    .06, .92, 3.6, .52, .31, .68, 5.5, .68,
    .58, .86, 2.8, .44, .93, .61, 6.4, .81,
    .14, .54, 4.6, .32, .26, .39, 1.9, .76,
  ]);
  const dustGeometry = new THREE.BufferGeometry();
  dustGeometry.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(seeds.length / 4 * 3), 3));
  dustGeometry.setAttribute('aDrift', new THREE.Float32BufferAttribute(seeds, 4));
  const dustMaterial = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: dustVertex,
    fragmentShader: dustFragment,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
    fog: false,
  });
  const dust = new THREE.Points(dustGeometry, dustMaterial);
  dust.name = 'blue-hour-light-motes';
  dust.renderOrder = 101;
  dust.frustumCulled = false;
  group.add(dust);

  const petalSeeds = new Float32Array([
    .07, .13, .91, 1.8, .21, .62, .36, 3.7,
    .39, .83, .62, 5.2, .57, .33, .23, .4,
    .88, .74, .77, 2.1, .94, .22, .48, 4.6,
    .11, .47, .18, 3.0, .46, .06, .43, 6.1,
    .73, .55, .29, 1.2, .31, .94, .84, 4.2,
    .96, .92, .67, 5.6, .64, .15, .53, 2.8,
  ]);
  const quad = new THREE.PlaneGeometry(1, 1);
  const petalGeometry = new THREE.InstancedBufferGeometry();
  petalGeometry.setIndex(quad.index!.clone());
  petalGeometry.setAttribute('position', quad.getAttribute('position').clone());
  petalGeometry.setAttribute('uv', quad.getAttribute('uv').clone());
  petalGeometry.setAttribute('aPetal', new THREE.InstancedBufferAttribute(petalSeeds, 4));
  petalGeometry.instanceCount = petalSeeds.length / 4;
  quad.dispose();
  const petalMaterial = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: petalVertex,
    fragmentShader: petalFragment,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
    fog: false,
  });
  const petals = new THREE.Mesh(petalGeometry, petalMaterial);
  petals.name = 'blue-hour-floating-petals';
  petals.renderOrder = 102;
  petals.frustumCulled = false;
  group.add(petals);

  let disposed = false;
  return {
    group,
    update(time, night, gust) {
      if (disposed) return;
      uniforms.uTime.value = Number.isFinite(time) ? time : 0;
      uniforms.uNight.value = Number.isFinite(night) ? THREE.MathUtils.clamp(night, 0, 1) : 0;
      uniforms.uGust.value = Number.isFinite(gust) ? THREE.MathUtils.clamp(gust, 0, 1) : 0;
    },
    resize(width, height, compact = false) {
      if (disposed) return;
      const w = Number.isFinite(width) ? Math.max(1, width) : 1;
      const h = Number.isFinite(height) ? Math.max(1, height) : 1;
      uniforms.uResolution.value.set(w, h);
      {
        const scale = Math.max(w / 1672, h / 941) * 1.012;
        const left = (w - 1672 * scale) * (compact ? .75 : .54);
        const top = (h - 941 * scale) * .40;
        uniforms.uSun.value.set((left + 250 * scale) / w, 1 - (top - 40 * scale) / h);
        uniforms.uFace.value.set((left + 1220 * scale) / w, 1 - (top + 230 * scale) / h, 165 * scale / w, 145 * scale / h);
      }
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      group.removeFromParent();
      group.clear();
      beamGeometry.dispose();
      beamMaterial.dispose();
      dustGeometry.dispose();
      dustMaterial.dispose();
      petalGeometry.dispose();
      petalMaterial.dispose();
    },
  };
}
