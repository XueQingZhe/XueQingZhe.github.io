/** Reading preferences stay local. A saved place is offered, never auto-opened. */
export {};
const FOCUS_KEY = 'app-reading-focus';
const MEMORY_KEY = 'app-reading-memory-v1';
const BLOCK_SELECTOR = 'h1,h2,h3,h4,h5,h6,p,pre,li,figure,table,blockquote,video';
type Place = {
  index: number; id: string; fingerprint: string; heading: string; afterHeading: number;
  fraction: number; textOffset: number | null; viewportRatio: number; percent: number; updated: number;
};
type Memory = Record<string, Place>;
const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));

function canonicalPath(value: string) {
  let path: string;
  try { path = new URL(value, location.origin).pathname; } catch { path = location.pathname; }
  try { path = decodeURIComponent(path); } catch { /* Keep malformed escapes readable. */ }
  return `${path.normalize('NFC').replace(/\/index\.html$/i, '/').replace(/\/+$/g, '') || ''}/`;
}
function readMemory(): Memory {
  try {
    const parsed = JSON.parse(localStorage.getItem(MEMORY_KEY) || '{}');
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return Object.fromEntries(Object.entries(parsed).filter(([, value]) => {
      const p = value as Place;
      return p && Number.isFinite(p.index) && Number.isFinite(p.fraction) && Number.isFinite(p.percent)
        && Number.isFinite(p.viewportRatio) && Number.isFinite(p.updated) && typeof p.fingerprint === 'string'
        && typeof p.heading === 'string' && typeof p.id === 'string'
        && Number.isFinite(p.afterHeading) && (p.textOffset === null || Number.isFinite(p.textOffset));
    })) as Memory;
  } catch { return {}; }
}
function writeMemory(path: string, place: Place | null) {
  try {
    const memory = readMemory();
    if (place) memory[path] = place;
    else delete memory[path];
    const latest = Object.entries(memory).sort((a, b) => b[1].updated - a[1].updated).slice(0, 40);
    localStorage.setItem(MEMORY_KEY, JSON.stringify(Object.fromEntries(latest)));
  } catch { /* Private browsing and full storage must not affect the reader. */ }
}
function fingerprint(element: HTMLElement) {
  const text = `${element.tagName}:${element.textContent?.replace(/\s+/g, ' ').trim().slice(0, 360)}:${element.querySelector('img')?.getAttribute('src') || ''}`;
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) hash = Math.imul(hash ^ text.charCodeAt(i), 16777619);
  return (hash >>> 0).toString(36);
}
function textRange(element: HTMLElement, offset: number) {
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  let node: Node | null;
  let remaining = Math.max(0, offset);
  while ((node = walker.nextNode())) {
    const length = node.textContent?.length || 0;
    if (remaining < length) {
      const range = document.createRange();
      range.setStart(node, remaining);
      range.setEnd(node, Math.min(remaining + 1, length));
      return range;
    }
    remaining -= length;
  }
  return null;
}

function initReading(tools: HTMLElement) {
  const scope = document.querySelector<HTMLElement>(tools.dataset.scope || '.article-body,.case-body');
  if (!scope || tools.dataset.ready) return;
  tools.dataset.ready = 'true';
  const root = document.documentElement;
  const toggles = [...tools.querySelectorAll<HTMLButtonElement>('[data-reading-focus-toggle]')];
  const dock = tools.querySelector<HTMLElement>('[data-reading-dock]')!;
  const resume = tools.querySelector<HTMLElement>('[data-reading-resume]')!;
  const status = tools.querySelector<HTMLElement>('[data-reading-status]')!;
  const path = canonicalPath(tools.dataset.canonicalPath || document.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.href || location.href);
  const blocks = [...scope.querySelectorAll<HTMLElement>(BLOCK_SELECTOR)].filter(element => {
    if (element.parentElement?.closest('pre,figure,table')) return false;
    return !element.matches('li,blockquote') || !element.querySelector('p,pre,figure,table,li');
  });
  const fingerprints = blocks.map(fingerprint);
  const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
  let saved: Place | undefined = readMemory()[path];
  let pending = !!saved && saved.percent >= 2 && saved.percent < 98 && !location.hash && navigation?.type !== 'back_forward';
  let engaged = false;
  let readingSince = 0;
  let saveTimer = 0;
  let frame = 0;
  let anchored: { place: Place; until: number } | null = null;
  let correctionFrame = 0;

  function readingLine() {
    const nav = document.querySelector('.site-nav')?.getBoundingClientRect().bottom || 90;
    return Math.min(innerHeight * .45, Math.max(nav + 35, innerHeight * .22));
  }
  function percent() {
    const box = scope!.getBoundingClientRect();
    return Math.round(clamp((readingLine() - box.top) / Math.max(1, box.height - innerHeight * .65)) * 100);
  }
  function capture(): Place | null {
    if (!blocks.length) return null;
    const line = readingLine();
    const bodyBox = scope!.getBoundingClientRect();
    if (bodyBox.top > line || bodyBox.bottom < line) return null;
    let index = 0;
    let best = Infinity;
    for (let i = 0; i < blocks.length; i++) {
      const box = blocks[i].getBoundingClientRect();
      if (box.height <= 0) continue;
      const distance = box.top <= line && box.bottom >= line ? 0 : Math.min(Math.abs(box.top - line), Math.abs(box.bottom - line));
      if (distance < best) { best = distance; index = i; }
      if (!distance) break;
    }
    const block = blocks[index];
    const box = block.getBoundingClientRect();
    const y = clamp(line, box.top, box.bottom - 1);
    const point: Place = { index, id: block.id, fingerprint: fingerprints[index], heading: '', afterHeading: 0,
      fraction: clamp((y - box.top) / Math.max(1, box.height)), textOffset: null, viewportRatio: y / innerHeight,
      percent: percent(), updated: Date.now() };
    for (let i = index; i >= 0; i--) {
      if (/^H[1-6]$/.test(blocks[i].tagName) && blocks[i].id) {
        point.heading = blocks[i].id; point.afterHeading = index - i; break;
      }
    }
    // Keep the same character on the same line when a larger type size reflows a paragraph.
    const caretDocument = document as Document & {
      caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null;
      caretRangeFromPoint?: (x: number, y: number) => Range | null;
    };
    const x = clamp(box.left + Math.min(24, box.width * .1), 1, innerWidth - 1);
    const caret = caretDocument.caretPositionFromPoint?.(x, y);
    const range = !caret ? caretDocument.caretRangeFromPoint?.(x, y) : null;
    const node = caret?.offsetNode || range?.startContainer;
    const offset = caret?.offset ?? range?.startOffset ?? 0;
    if (node?.nodeType === Node.TEXT_NODE && block.contains(node) && !block.querySelector('img,video')) {
      const before = document.createRange();
      before.selectNodeContents(block); before.setEnd(node, offset);
      const textOffset = before.toString().length;
      const rect = textRange(block, textOffset)?.getBoundingClientRect();
      if (rect?.height) { point.textOffset = textOffset; point.viewportRatio = rect.top / innerHeight; }
    }
    return point;
  }
  function resolve(place: Place) {
    if (place.id) {
      const own = blocks.find(block => block.id === place.id);
      if (own) return own;
    }
    const matches = blocks.map((block, index) => ({ block, index })).filter(({ index }) => fingerprints[index] === place.fingerprint);
    if (matches.length) return matches.sort((a, b) => Math.abs(a.index - place.index) - Math.abs(b.index - place.index))[0].block;
    const headingIndex = blocks.findIndex(block => block.id && block.id === place.heading);
    const index = headingIndex >= 0 ? headingIndex + place.afterHeading : place.index;
    return blocks[Math.round(clamp(index, 0, blocks.length - 1))];
  }
  function restore(place: Place) {
    const block = resolve(place);
    if (!block) return;
    const box = block.getBoundingClientRect();
    const textBox = place.textOffset === null ? null : textRange(block, place.textOffset)?.getBoundingClientRect();
    const y = textBox?.height ? textBox.top : box.top + box.height * clamp(place.fraction);
    const change = y - innerHeight * clamp(place.viewportRatio, .08, .8);
    if (Math.abs(change) > .5) scrollTo({ top: scrollY + change, behavior: 'instant' as ScrollBehavior });
  }
  function holdPlace(place: Place, duration: number) {
    anchored = { place, until: performance.now() + duration };
    restore(place);
    cancelAnimationFrame(correctionFrame);
    correctionFrame = requestAnimationFrame(() => { correctionFrame = 0; if (anchored) restore(anchored.place); });
  }
  function syncFocus() {
    const active = root.dataset.readingFocus === 'true';
    toggles.forEach(button => {
      button.setAttribute('aria-pressed', String(active));
      button.setAttribute('aria-label', active ? '退出静读模式' : '开启静读模式');
      button.querySelector('[data-reading-focus-label]')!.textContent = active ? '静读中' : '静读';
    });
    tools.querySelector('[data-reading-focus-note]')!.textContent = active ? '此刻，只与文字相伴。' : '让周围轻一点，文字近一点。';
  }
  function toggleFocus() {
    const place = capture();
    const active = root.dataset.readingFocus !== 'true';
    root.dataset.readingFocus = String(active);
    try { localStorage.setItem(FOCUS_KEY, String(active)); } catch { /* Still apply for this visit. */ }
    syncFocus();
    if (place) holdPlace(place, 500);
    status.textContent = active ? '已开启静读，文字稍大，庭院动效暂停。' : '已退出静读。';
    schedule();
  }
  function hideResume() { pending = false; resume.hidden = true; }
  function save() {
    clearTimeout(saveTimer);
    if (!engaged || !readingSince || performance.now() - readingSince < 2500 || document.querySelector('#lb:not([hidden])')) return;
    const progress = percent();
    if (progress >= 98) { hideResume(); writeMemory(path, null); return; }
    const place = capture();
    if (place && place.percent >= 2 && readingLine() - scope!.getBoundingClientRect().top > 120) {
      // Deliberately reading further is also a choice to replace the old place.
      // Merely opening the page, or waiting at its title, never makes that choice.
      if (pending) { hideResume(); holdPlace(place, 350); }
      writeMemory(path, place);
    }
  }
  function update() {
    frame = 0;
    const box = scope!.getBoundingClientRect();
    dock.hidden = box.top > readingLine() - 80 || box.bottom < innerHeight * .35;
    if (engaged) {
      clearTimeout(saveTimer);
      const meaningful = percent() >= 2 && readingLine() - box.top > 120;
      if (meaningful) {
        if (!readingSince) readingSince = performance.now();
        saveTimer = window.setTimeout(save, Math.max(850, 2550 - (performance.now() - readingSince)));
      } else readingSince = 0;
    }
  }
  function schedule() { if (!frame) frame = requestAnimationFrame(update); }
  function intent() {
    anchored = null;
    if (!engaged) { engaged = true; readingSince = 0; }
  }

  try {
    const preference = localStorage.getItem(FOCUS_KEY);
    if (preference === 'true' || preference === 'false') root.dataset.readingFocus = preference;
  } catch { /* The head boot may already have supplied the preference. */ }
  syncFocus();
  toggles.forEach(button => button.addEventListener('click', toggleFocus));
  resume.hidden = !pending;
  if (pending) tools.querySelector('[data-reading-saved-percent]')!.textContent = String(Math.round(saved.percent));
  tools.querySelector('[data-reading-resume-action]')!.addEventListener('click', () => {
    if (!saved || location.hash) return;
    hideResume();
    engaged = true; readingSince = performance.now() - 2500;
    holdPlace(saved, 1800);
    status.textContent = '已回到上次阅读的位置。';
    // Move keyboard focus with the reading position, without an extra scroll.
    const block = resolve(saved);
    if (block) {
      const previous = block.getAttribute('tabindex');
      block.setAttribute('tabindex', '-1'); block.focus({ preventScroll: true });
      block.addEventListener('blur', () => { if (previous === null) block.removeAttribute('tabindex'); else block.setAttribute('tabindex', previous); }, { once: true });
    }
    schedule();
  });
  tools.querySelector('[data-reading-resume-dismiss]')!.addEventListener('click', () => {
    hideResume(); writeMemory(path, null); saved = undefined;
    toggles[0].focus({ preventScroll: true });
    status.textContent = '已清除上次阅读的位置。';
  });
  addEventListener('wheel', intent, { passive: true });
  addEventListener('touchmove', intent, { passive: true });
  addEventListener('keydown', event => {
    if (['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End', ' '].includes(event.key)
      && !(event.target as Element)?.closest('input,textarea,select,button,[contenteditable="true"]')) intent();
  });
  addEventListener('pointerdown', event => { if (event.clientX >= document.documentElement.clientWidth) intent(); }, { passive: true });
  document.querySelector('.reading-outline')?.addEventListener('click', event => {
    if ((event.target as Element).closest('a[href*="#"]')) intent();
  });
  addEventListener('scroll', schedule, { passive: true });
  addEventListener('resize', schedule, { passive: true });
  addEventListener('hashchange', () => { anchored = null; hideResume(); });
  addEventListener('pagehide', () => { save(); cancelAnimationFrame(frame); cancelAnimationFrame(correctionFrame); frame = 0; correctionFrame = 0; clearTimeout(saveTimer); anchored = null; });
  addEventListener('pageshow', event => { if (event.persisted) { hideResume(); anchored = null; } schedule(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });
  addEventListener('storage', event => {
    if (event.key !== FOCUS_KEY) return;
    const place = capture(); root.dataset.readingFocus = event.newValue === 'true' ? 'true' : 'false';
    syncFocus(); if (place) holdPlace(place, 500);
  });
  const resizeObserver = new ResizeObserver(() => {
    if (anchored && performance.now() < anchored.until) restore(anchored.place);
    else anchored = null;
    schedule();
  });
  resizeObserver.observe(scope);
  document.fonts?.ready.then(() => { if (anchored && performance.now() < anchored.until) restore(anchored.place); });
  schedule();
}

document.querySelectorAll<HTMLElement>('[data-reading-tools]').forEach(initReading);
