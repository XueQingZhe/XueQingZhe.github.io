/** Native document navigation, with a single shared cover and a remembered index. */
export {};

type Origin = { key: string; listUrl: string; detailPath: string; scrollX: number; scrollY: number; width: number; cardTop: number; entryKey?: string };
type Pending = { origin: Origin; direction: 'enter' | 'return'; from: string; to: string; startedAt: number };
type NavigationEntry = { key: string; url: string; index: number };
type NavigationAPI = { currentEntry?: NavigationEntry; entries(): NavigationEntry[] };
type WorkWindow = Window & { navigation?: NavigationAPI; __gardenWorkIncoming?: Pending };
type SwapEvent = Event & { activation?: { entry?: NavigationEntry }; viewTransition?: { skipTransition(): void } };
const win = window as WorkWindow;
const root = document.documentElement;
const storageKey = 'garden:work-navigation';
const stateKey = 'gardenWorkOrigin';
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
let outgoing: Pending | undefined;
let returnedTimer = 0;
let restoration = 0;
let lastRestore = 0;

function localURL(value: string): URL | undefined {
  try { const url = new URL(value, location.origin); return url.origin === location.origin ? url : undefined; } catch { return undefined; }
}
function validOrigin(value: unknown): value is Origin {
  const origin = value as Origin | null;
  return !!origin && typeof origin.key === 'string' && typeof origin.detailPath === 'string'
    && localURL(origin.listUrl)?.pathname === '/work/' && /^\/(?:work|notes)\/.+\/$/.test(origin.detailPath)
    && Number.isFinite(origin.scrollY) && origin.scrollY >= 0 && Number.isFinite(origin.scrollX) && Number.isFinite(origin.width);
}
function readPending(): Pending | undefined {
  try {
    const value = JSON.parse(sessionStorage.getItem(storageKey) || 'null') as Pending | null;
    return value && validOrigin(value.origin) && Date.now() - value.startedAt < 30000 ? value : undefined;
  } catch { return undefined; }
}
function matchesPage(value: Pending | undefined) {
  const url = value && localURL(value.to);
  return !!url && url.pathname + url.search === location.pathname + location.search;
}
function moving() { return !reduced.matches && root.dataset.motion !== 'paused'; }
function plainClick(event: MouseEvent, anchor: HTMLAnchorElement) {
  return !event.defaultPrevented && event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey
    && !anchor.hasAttribute('download') && (!anchor.target || anchor.target === '_self');
}
function remember(value: Pending) {
  outgoing = value;
  try { sessionStorage.setItem(storageKey, JSON.stringify(value)); } catch { /* Native links remain functional with storage blocked. */ }
}
function clearNames(removeNavigation = true) {
  document.querySelectorAll<HTMLElement>('[data-work-cover]').forEach(cover => { cover.style.removeProperty('view-transition-name'); });
  if (removeNavigation) delete root.dataset.workNavigation;
}
function selectCover(origin: Origin, direction: Pending['direction']) {
  clearNames();
  if (!moving()) return;
  const cover = [...document.querySelectorAll<HTMLElement>('[data-work-cover]')].find(element => element.dataset.workKey === origin.key);
  if (!cover) return;
  const box = cover.getBoundingClientRect();
  if (box.bottom <= 0 || box.top >= innerHeight) return;
  root.dataset.workNavigation = direction;
  cover.style.viewTransitionName = 'work-cover';
}
function currentOrigin(): Origin | undefined {
  const value = history.state?.[stateKey] as Origin | undefined;
  return validOrigin(value) && value.detailPath === location.pathname ? value : undefined;
}
function commitOrigin(pending: Pending | undefined) {
  if (!pending || pending.direction !== 'enter' || !matchesPage(pending) || !document.querySelector('[data-work-detail]')) return;
  const oldState = history.state && typeof history.state === 'object' ? history.state : {};
  history.replaceState({ ...oldState, [stateKey]: pending.origin }, '', location.href);
}
function updateReturnLink() {
  const origin = currentOrigin();
  const link = document.querySelector<HTMLAnchorElement>('[data-work-return]');
  if (link) link.href = origin?.listUrl || '/work/';
}
function restoreIndex(pending: Pending | undefined) {
  if (!pending || pending.direction !== 'return' || !matchesPage(pending) || !document.querySelector('[data-work-index]')) return;
  if (lastRestore === pending.startedAt) return;
  lastRestore = pending.startedAt;
  const { origin } = pending;
  const tile = [...document.querySelectorAll<HTMLAnchorElement>('[data-artwork][data-work-key]')].find(item => item.dataset.workKey === origin.key);
  scrollTo({ left: origin.scrollX, top: origin.scrollY, behavior: 'instant' });
  cancelAnimationFrame(restoration);
  restoration = requestAnimationFrame(() => {
    restoration = requestAnimationFrame(() => {
      if (!tile || tile.closest<HTMLElement>('.work-cell')?.hidden) return;
      const position = tile.getBoundingClientRect();
      const changedWidth = Math.abs(innerWidth - origin.width) > 80;
      const top = changedWidth ? scrollY + position.top - 135 : origin.scrollY;
      scrollTo({ left: origin.scrollX, top, behavior: 'instant' });
      tile.focus({ preventScroll: true });
      tile.setAttribute('data-work-returned', '');
      clearTimeout(returnedTimer);
      returnedTimer = window.setTimeout(() => tile.removeAttribute('data-work-returned'), 1400);
    });
  });
}
function arrive() {
  outgoing = undefined;
  clearNames(false);
  const pending = matchesPage(readPending()) ? readPending() : win.__gardenWorkIncoming;
  commitOrigin(pending);
  updateReturnLink();
  restoreIndex(pending);
}

document.addEventListener('click', event => {
  const element = event.target instanceof Element ? event.target : null;
  const anchor = element?.closest<HTMLAnchorElement>('a');
  if (!anchor || !plainClick(event, anchor)) return;
  const destination = localURL(anchor.href);
  if (!destination) return;
  if (anchor.matches('[data-artwork][data-work-key]') && document.querySelector('[data-work-index]')) {
    const origin: Origin = {
      key: anchor.dataset.workKey!, listUrl: location.pathname + location.search + location.hash,
      detailPath: destination.pathname, scrollX, scrollY, width: innerWidth,
      cardTop: anchor.getBoundingClientRect().top, entryKey: win.navigation?.currentEntry?.key,
    };
    remember({ origin, direction: 'enter', from: location.pathname + location.search, to: destination.pathname + destination.search, startedAt: Date.now() });
    selectCover(origin, 'enter');
  } else if (anchor.matches('[data-work-return]')) {
    const origin = currentOrigin();
    if (!origin) return;
    remember({ origin, direction: 'return', from: location.pathname + location.search, to: origin.listUrl, startedAt: Date.now() });
    selectCover(origin, 'return');
    const entry = win.navigation?.currentEntry;
    const previous = entry && win.navigation?.entries().find(item => item.index === entry.index - 1);
    if (previous?.key && previous.key === origin.entryKey) {
      event.preventDefault();
      history.back();
    }
  }
});

addEventListener('pageswap', raw => {
  const event = raw as SwapEvent;
  const destination = event.activation?.entry?.url ? localURL(event.activation.entry.url) : undefined;
  const origin = currentOrigin();
  if (origin && destination && destination.pathname + destination.search === new URL(origin.listUrl, location.origin).pathname + new URL(origin.listUrl, location.origin).search) {
    remember({ origin, direction: 'return', from: location.pathname + location.search, to: origin.listUrl, startedAt: Date.now() });
  }
  const returnMemory = win.__gardenWorkIncoming;
  if (!outgoing && document.querySelector('[data-work-index]') && returnMemory && validOrigin(returnMemory.origin) && destination?.pathname === returnMemory.origin.detailPath) {
    const origin = { ...returnMemory.origin, scrollX, scrollY, width: innerWidth };
    remember({ origin, direction: 'enter', from: location.pathname + location.search, to: destination.pathname + destination.search, startedAt: Date.now() });
  }
  if (!moving()) { clearNames(); event.viewTransition?.skipTransition(); return; }
  if (outgoing) selectCover(outgoing.origin, outgoing.direction);
});
addEventListener('pageshow', arrive);
addEventListener('pagehide', () => { cancelAnimationFrame(restoration); clearTimeout(returnedTimer); });
document.addEventListener('work:transition', event => {
  if ((event as CustomEvent).detail?.phase === 'finished') clearNames();
});
arrive();
