/** Small gallery gestures. Captions and document geometry remain stationary. */
export {};
const root = document.documentElement;
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
type FrameState = { tile: HTMLElement; frame: HTMLElement; x: number; y: number; targetX: number; targetY: number; active: boolean; visible: boolean; width: number; height: number };
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
let cleanup: (() => void) | undefined;

function initialize() {
  cleanup?.();
  const scope = document.querySelector<HTMLElement>('[data-work-index]');
  if (!scope) return;
  const abort = new AbortController();
  const options = { signal: abort.signal };
  const states: FrameState[] = [];
  let animation = 0;
  const canMove = () => finePointer.matches && !reduced.matches && root.dataset.motion !== 'paused' && !document.hidden;

  function paint(state: FrameState) {
    const { tile, x, y, width, height } = state;
    tile.style.setProperty('--frame-rx', `${(-y * 1.65).toFixed(3)}deg`);
    tile.style.setProperty('--frame-ry', `${(x * 1.65).toFixed(3)}deg`);
    tile.style.setProperty('--light-x', `${50 + x * 48}%`);
    tile.style.setProperty('--light-y', `${50 + y * 48}%`);
    // A continuous offset clamps smoothly at the edge: no side-switch jump.
    const badgeX = clamp((x + 1) * width / 2 + 80, 76, width - 76);
    const badgeY = clamp((y + 1) * height / 2 + 51, 49, height - 49);
    tile.style.setProperty('--inspect-x', `${width ? badgeX / width * 100 : 77}%`);
    tile.style.setProperty('--inspect-y', `${height ? badgeY / height * 100 : 76}%`);
  }

  function tick() {
    animation = 0;
    if (!canMove()) return;
    let unsettled = false;
    for (const state of states) {
      if (!state.visible) continue;
      const dx = state.targetX - state.x;
      const dy = state.targetY - state.y;
      if (Math.abs(dx) + Math.abs(dy) < .001) continue;
      state.x += dx * .17;
      state.y += dy * .17;
      paint(state);
      unsettled = true;
    }
    if (unsettled) animation = requestAnimationFrame(tick);
  }
  function wake() { if (!animation && canMove()) animation = requestAnimationFrame(tick); }
  function reset(state: FrameState, immediate = false) {
    state.active = false;
    state.tile.removeAttribute('data-frame-active');
    state.targetX = state.targetY = 0;
    if (immediate || !canMove()) { state.x = state.y = 0; paint(state); }
    else wake();
  }
  function stopAll() {
    cancelAnimationFrame(animation); animation = 0;
    for (const state of states) reset(state, true);
  }

  for (const tile of scope.querySelectorAll<HTMLElement>('[data-artwork]')) {
    const frame = tile.querySelector<HTMLElement>('[data-gallery-frame]');
    if (!frame) continue;
    const state: FrameState = { tile, frame, x: 0, y: 0, targetX: 0, targetY: 0, active: false, visible: false, width: frame.clientWidth, height: frame.clientHeight };
    states.push(state);
    frame.addEventListener('pointermove', event => {
      if (!finePointer.matches || event.pointerType === 'touch' || !state.visible) return;
      state.active = true;
      tile.setAttribute('data-frame-active', '');
      if (!canMove()) return;
      const rect = frame.getBoundingClientRect();
      state.width = frame.clientWidth; state.height = frame.clientHeight;
      state.targetX = clamp((event.clientX - rect.left) / rect.width * 2 - 1, -1, 1);
      state.targetY = clamp((event.clientY - rect.top) / rect.height * 2 - 1, -1, 1);
      wake();
    }, options);
    frame.addEventListener('pointerleave', () => reset(state), options);
    tile.addEventListener('focus', () => { reset(state, true); }, options);
    tile.addEventListener('blur', () => reset(state), options);
  }
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      const state = states.find(item => item.tile === entry.target);
      if (!state) continue;
      state.visible = entry.isIntersecting;
      if (!state.visible) reset(state, true);
    }
  }, { threshold: 0 });
  states.forEach(state => observer.observe(state.tile));
  const motionObserver = new MutationObserver(stopAll);
  motionObserver.observe(root, { attributes: true, attributeFilter: ['data-motion'] });
  reduced.addEventListener('change', stopAll, options);
  finePointer.addEventListener('change', stopAll, options);
  document.addEventListener('visibilitychange', stopAll, options);
  document.addEventListener('site:layout', stopAll, options);

  const hero = document.querySelector<HTMLElement>('.work-stage');
  const type = hero?.querySelector<HTMLElement>('[data-work-letterpress]');
  if (hero && type) {
    hero.addEventListener('pointermove', event => {
      if (!canMove() || event.pointerType === 'touch') return;
      const rect = type.getBoundingClientRect();
      type.style.setProperty('--type-light-x', `${clamp(event.clientX - rect.left, 0, rect.width)}px`);
      type.style.setProperty('--type-light-y', `${clamp(event.clientY - rect.top, 0, rect.height)}px`);
      type.dataset.typeActive = 'true';
    }, options);
    hero.addEventListener('pointerleave', () => { delete type.dataset.typeActive; }, options);
  }
  cleanup = () => { stopAll(); observer.disconnect(); motionObserver.disconnect(); abort.abort(); if (type) delete type.dataset.typeActive; };
}

initialize();
addEventListener('pagehide', () => cleanup?.());
addEventListener('pageshow', event => { if (event.persisted) initialize(); });
