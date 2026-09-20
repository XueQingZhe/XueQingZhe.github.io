const surfaceVertex = `
  attribute vec2 a_position;
  varying vec2 v_uv;
  void main() {
    v_uv = a_position * 0.5 + 0.5;
    gl_Position = vec4(a_position, 0.0, 1.0);
  }
`;

const surfaceFragment = `
  precision mediump float;
  varying vec2 v_uv;
  uniform float u_time;
  uniform float u_night;
  uniform float u_aspect;
  uniform vec2 u_pointer;
  uniform float u_interaction;

  void main() {
    vec2 uv = v_uv;
    float t = u_time * 0.14;
    // Stretch waves toward the horizon; keep them in the painting's lower half.
    vec2 water = vec2(uv.x * u_aspect, uv.y * 1.85);
    float a = sin(water.x * 16.0 + sin(water.y * 12.0 + t) * 1.6 + t);
    float b = sin(water.y * 18.0 + sin(water.x * 9.0 - t * 0.7) * 1.5 - t);
    float veins = pow(max(0.0, 1.0 - abs(a + b) * 1.6), 9.0);
    float waterMask = (1.0 - smoothstep(0.19, 0.58, uv.y))
      * smoothstep(0.0, 0.13, uv.y)
      * smoothstep(0.0, 0.17, uv.x)
      * (1.0 - smoothstep(0.82, 1.0, uv.x));
    float caustic = veins * waterMask * mix(0.082, 0.040, u_night);

    // A few broad shafts, much dimmer than the original illustration's highlights.
    vec2 source = uv - vec2(0.24, 1.18);
    float angle = atan(source.x, -source.y);
    float shaftA = exp(-pow((angle - 0.29) * 22.0, 2.0));
    float shaftB = exp(-pow((angle - 0.54) * 31.0, 2.0));
    float shaftC = exp(-pow((angle + 0.05) * 24.0, 2.0));
    float shafts = (shaftA + shaftB * 0.55 + shaftC * 0.4)
      * smoothstep(0.12, 0.94, uv.y)
      * (0.75 + sin(t * 0.55) * 0.12)
      * mix(0.047, 0.012, u_night);

    vec2 pointerDelta = (uv - u_pointer) * vec2(u_aspect, 1.0);
    float distanceToPointer = length(pointerDelta);
    float ripple = pow(max(0.0, sin(distanceToPointer * 48.0 - u_time * 1.7)), 10.0)
      * exp(-distanceToPointer * 9.0) * waterMask * u_interaction * 0.062;

    vec3 lightColor = mix(vec3(0.99, 0.87, 0.57), vec3(0.40, 0.70, 0.79), u_night);
    gl_FragColor = vec4(lightColor, clamp(caustic + shafts + ripple, 0.0, 0.13));
  }
`;

const particleVertex = `
  attribute vec4 a_seed;
  uniform float u_time;
  uniform float u_night;
  uniform float u_dpr;
  varying float v_opacity;
  varying float v_night;

  void main() {
    float speed = mix(0.009, 0.003, u_night);
    float y = fract(a_seed.y + u_time * speed * (0.4 + a_seed.z));
    float x = a_seed.x + sin(u_time * 0.14 + a_seed.w * 6.283) * 0.022
      + sin(y * 6.0 + a_seed.w * 9.0) * 0.013;
    float fade = smoothstep(0.0, 0.13, y) * (1.0 - smoothstep(0.82, 1.0, y));
    float sparkle = 0.60 + 0.40 * sin(u_time * 0.58 + a_seed.w * 28.0);
    // Only eight quiet fireflies remain after sunset.
    float keepAtNight = step(0.70, a_seed.w);
    v_opacity = fade * mix(0.34, 0.5 * sparkle, u_night)
      * mix(1.0, keepAtNight, u_night);
    v_night = u_night;
    gl_Position = vec4(vec2(x, y) * 2.0 - 1.0, 0.0, 1.0);
    gl_PointSize = (2.2 + a_seed.z * 3.5) * u_dpr;
  }
`;

const particleFragment = `
  precision mediump float;
  varying float v_opacity;
  varying float v_night;
  void main() {
    float distanceToCenter = length(gl_PointCoord - vec2(0.5));
    float softDot = exp(-distanceToCenter * distanceToCenter * 21.0);
    float edge = 1.0 - smoothstep(0.36, 0.5, distanceToCenter);
    vec3 color = mix(vec3(1.0, 0.90, 0.64), vec3(0.93, 0.78, 0.45), v_night);
    gl_FragColor = vec4(color, softDot * edge * v_opacity);
  }
`;

interface RenderPass {
  program: WebGLProgram;
  buffer: WebGLBuffer;
  attribute: number;
  uniforms: Record<string, WebGLUniformLocation | null>;
}

class SiteAtmosphere extends HTMLElement {
  private gl: WebGLRenderingContext | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private surface: RenderPass | null = null;
  private particles: RenderPass | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private intersectionObserver: IntersectionObserver | null = null;
  private mutationObserver: MutationObserver | null = null;
  private motionQuery = matchMedia('(prefers-reduced-motion: reduce)');
  private themeQuery = matchMedia('(prefers-color-scheme: dark)');
  private hero: Element | null = null;
  private frame = 0;
  private lastFrame = 0;
  private sceneTime = 21;
  private theme = 0;
  private targetTheme = 0;
  private pointer = { x: 0.5, y: 0.25 };
  private pointerTarget = { x: 0.5, y: 0.25 };
  private interaction = 0;
  private interactionTarget = 0;
  private inView = true;
  private paused = false;
  private contextLost = false;
  private dpr = 1;

  connectedCallback() {
    this.canvas = this.querySelector('canvas');
    if (!this.canvas) return;
    this.gl = this.canvas.getContext('webgl', {
      alpha: true,
      antialias: false,
      depth: false,
      stencil: false,
      premultipliedAlpha: true,
      powerPreference: 'low-power',
    });
    if (!this.gl) return;
    this.targetTheme = this.readTheme();
    this.theme = this.targetTheme;
    this.paused = document.documentElement.dataset.motion === 'paused';
    if (!this.createResources()) return;

    this.hero = this.closest('.hero-art');
    this.hero?.addEventListener('pointermove', this.onPointerMove as EventListener, { passive: true });
    this.hero?.addEventListener('pointerleave', this.onPointerLeave);
    this.canvas.addEventListener('webglcontextlost', this.onContextLost);
    this.canvas.addEventListener('webglcontextrestored', this.onContextRestored);
    this.motionQuery.addEventListener('change', this.onSettingsChange);
    this.themeQuery.addEventListener('change', this.onSettingsChange);
    document.addEventListener('visibilitychange', this.onVisibilityChange);

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(this);
    this.intersectionObserver = new IntersectionObserver(([entry]) => {
      this.inView = entry.isIntersecting;
      this.schedule();
    }, { rootMargin: '60px' });
    this.intersectionObserver.observe(this);
    this.mutationObserver = new MutationObserver(this.onSettingsChange);
    this.mutationObserver.observe(document.documentElement, {
      attributes: true, attributeFilter: ['data-theme', 'data-motion'],
    });
    this.resize();
  }

  disconnectedCallback() {
    cancelAnimationFrame(this.frame);
    this.frame = 0;
    this.resizeObserver?.disconnect();
    this.intersectionObserver?.disconnect();
    this.mutationObserver?.disconnect();
    this.hero?.removeEventListener('pointermove', this.onPointerMove as EventListener);
    this.hero?.removeEventListener('pointerleave', this.onPointerLeave);
    this.canvas?.removeEventListener('webglcontextlost', this.onContextLost);
    this.canvas?.removeEventListener('webglcontextrestored', this.onContextRestored);
    this.motionQuery.removeEventListener('change', this.onSettingsChange);
    this.themeQuery.removeEventListener('change', this.onSettingsChange);
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
    this.deleteResources();
  }

  private readTheme() {
    const theme = document.documentElement.dataset.theme;
    return theme === 'dark' || (!theme && this.themeQuery.matches) ? 1 : 0;
  }

  private createPass(vertexSource: string, fragmentSource: string, values: Float32Array, attribute: string, uniforms: string[]): RenderPass | null {
    const gl = this.gl!;
    const shaders: WebGLShader[] = [];
    for (const [type, source] of [[gl.VERTEX_SHADER, vertexSource], [gl.FRAGMENT_SHADER, fragmentSource]] as const) {
      const shader = gl.createShader(type);
      if (!shader) { shaders.forEach(item => gl.deleteShader(item)); return null; }
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        gl.deleteShader(shader);
        shaders.forEach(item => gl.deleteShader(item));
        return null;
      }
      shaders.push(shader);
    }
    const program = gl.createProgram();
    if (!program) { shaders.forEach(item => gl.deleteShader(item)); return null; }
    shaders.forEach(shader => gl.attachShader(program, shader));
    gl.linkProgram(program);
    shaders.forEach(shader => gl.deleteShader(shader));
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) { gl.deleteProgram(program); return null; }
    const buffer = gl.createBuffer();
    if (!buffer) { gl.deleteProgram(program); return null; }
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, values, gl.STATIC_DRAW);
    return {
      program,
      buffer,
      attribute: gl.getAttribLocation(program, attribute),
      uniforms: Object.fromEntries(uniforms.map(name => [name, gl.getUniformLocation(program, name)])),
    };
  }

  private createResources() {
    const gl = this.gl!;
    this.surface = this.createPass(surfaceVertex, surfaceFragment,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), 'a_position',
      ['u_time', 'u_night', 'u_aspect', 'u_pointer', 'u_interaction']);
    const seeds = new Float32Array(28 * 4);
    for (let i = 0; i < 28; i++) {
      seeds[i * 4] = ((i * 0.61803398875 + 0.12) % 1) * 0.88 + 0.06;
      seeds[i * 4 + 1] = (i * 0.7548776662 + 0.07) % 1;
      seeds[i * 4 + 2] = (i * 0.569840291 + 0.15) % 1;
      seeds[i * 4 + 3] = i / 28;
    }
    this.particles = this.createPass(particleVertex, particleFragment, seeds, 'a_seed',
      ['u_time', 'u_night', 'u_dpr']);
    if (!this.surface || !this.particles) { this.deleteResources(); return false; }
    gl.enable(gl.BLEND);
    gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.clearColor(0, 0, 0, 0);
    this.parentElement?.setAttribute('data-renderer', 'webgl');
    return true;
  }

  private deleteResources() {
    for (const pass of [this.surface, this.particles]) {
      if (!pass) continue;
      this.gl?.deleteBuffer(pass.buffer);
      this.gl?.deleteProgram(pass.program);
    }
    this.surface = null;
    this.particles = null;
    this.parentElement?.removeAttribute('data-renderer');
  }

  private resize() {
    if (!this.gl || !this.canvas || this.contextLost) return;
    const { width, height } = this.getBoundingClientRect();
    this.dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    this.canvas.width = Math.max(1, Math.round(width * this.dpr));
    this.canvas.height = Math.max(1, Math.round(height * this.dpr));
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    this.draw();
    this.schedule();
  }

  private onPointerMove = (event: PointerEvent) => {
    if (event.pointerType === 'touch' || this.motionQuery.matches || this.paused) return;
    const bounds = this.getBoundingClientRect();
    this.pointerTarget.x = Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width));
    this.pointerTarget.y = Math.max(0, Math.min(1, 1 - (event.clientY - bounds.top) / bounds.height));
    this.interactionTarget = 1;
  };

  private onPointerLeave = () => { this.interactionTarget = 0; };

  private onSettingsChange = () => {
    this.targetTheme = this.readTheme();
    this.paused = document.documentElement.dataset.motion === 'paused';
    if (this.motionQuery.matches) {
      this.theme = this.targetTheme;
      this.interaction = 0;
      this.interactionTarget = 0;
    }
    this.draw();
    this.schedule();
  };

  private onVisibilityChange = () => { this.schedule(); };

  private onContextLost = (event: Event) => {
    event.preventDefault();
    this.contextLost = true;
    cancelAnimationFrame(this.frame);
    this.frame = 0;
    this.parentElement?.removeAttribute('data-renderer');
  };

  private onContextRestored = () => {
    this.contextLost = false;
    if (this.createResources()) this.resize();
  };

  private schedule() {
    const hasThemeTransition = Math.abs(this.targetTheme - this.theme) > 0.002;
    const shouldRun = this.isConnected && this.inView && !document.hidden && !this.contextLost
      && !!this.surface && !!this.particles
      && ((!this.paused && !this.motionQuery.matches) || hasThemeTransition);
    if (!shouldRun) {
      cancelAnimationFrame(this.frame);
      this.frame = 0;
      this.lastFrame = 0;
      return;
    }
    if (!this.frame) this.frame = requestAnimationFrame(this.tick);
  }

  private tick = (now: number) => {
    this.frame = 0;
    if (this.lastFrame && now - this.lastFrame < 1000 / 30) {
      this.schedule();
      return;
    }
    const delta = this.lastFrame ? Math.min((now - this.lastFrame) / 1000, 0.08) : 1 / 30;
    this.lastFrame = now;
    if (!this.paused && !this.motionQuery.matches) this.sceneTime += delta;
    const ease = 1 - Math.exp(-delta * 3.5);
    this.theme += (this.targetTheme - this.theme) * ease;
    if (Math.abs(this.targetTheme - this.theme) < 0.002) this.theme = this.targetTheme;
    if (!this.paused) {
      this.pointer.x += (this.pointerTarget.x - this.pointer.x) * ease;
      this.pointer.y += (this.pointerTarget.y - this.pointer.y) * ease;
      this.interaction += (this.interactionTarget - this.interaction) * ease;
    }
    this.draw();
    this.schedule();
  };

  private draw() {
    const gl = this.gl;
    const surface = this.surface;
    const particles = this.particles;
    if (!gl || !this.canvas || !surface || !particles || this.contextLost) return;
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(surface.program);
    gl.bindBuffer(gl.ARRAY_BUFFER, surface.buffer);
    gl.enableVertexAttribArray(surface.attribute);
    gl.vertexAttribPointer(surface.attribute, 2, gl.FLOAT, false, 0, 0);
    gl.uniform1f(surface.uniforms.u_time, this.sceneTime);
    gl.uniform1f(surface.uniforms.u_night, this.theme);
    gl.uniform1f(surface.uniforms.u_aspect, this.canvas.width / this.canvas.height);
    gl.uniform2f(surface.uniforms.u_pointer, this.pointer.x, this.pointer.y);
    gl.uniform1f(surface.uniforms.u_interaction, this.interaction);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    gl.disableVertexAttribArray(surface.attribute);

    gl.useProgram(particles.program);
    gl.bindBuffer(gl.ARRAY_BUFFER, particles.buffer);
    gl.enableVertexAttribArray(particles.attribute);
    gl.vertexAttribPointer(particles.attribute, 4, gl.FLOAT, false, 0, 0);
    gl.uniform1f(particles.uniforms.u_time, this.sceneTime);
    gl.uniform1f(particles.uniforms.u_night, this.theme);
    gl.uniform1f(particles.uniforms.u_dpr, this.dpr);
    gl.drawArrays(gl.POINTS, 0, 28);
    gl.disableVertexAttribArray(particles.attribute);
  }
}

if (!customElements.get('site-atmosphere')) {
  customElements.define('site-atmosphere', SiteAtmosphere);
}
