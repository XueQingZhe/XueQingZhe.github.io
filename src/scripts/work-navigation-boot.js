/* Inline in <head>: native pagereveal runs before deferred module listeners. */
(() => {
  const root = document.documentElement;
  const key = 'garden:work-navigation';
  let style;
  let titleTimer;
  function incoming() {
    try {
      const value = JSON.parse(sessionStorage.getItem(key) || 'null');
      if (!value || Date.now() - value.startedAt > 30000) return null;
      const target = new URL(value.to, location.origin);
      const list = new URL(value.origin.listUrl, location.origin);
      if (target.origin !== location.origin || list.origin !== location.origin || list.pathname !== '/work/' || typeof value.origin.key !== 'string') return null;
      return target.pathname + target.search === location.pathname + location.search ? value : null;
    } catch { return null; }
  }
  function moving() { return !matchMedia('(prefers-reduced-motion: reduce)').matches && root.dataset.motion !== 'paused'; }
  function prepare(value) {
    style?.remove();
    if (value) window.__gardenWorkIncoming = value;
    if (!value || !moving() || !('onpagereveal' in window)) return;
    root.dataset.workNavigation = value.direction;
    style = document.createElement('style');
    style.textContent = `[data-work-cover][data-work-key="${CSS.escape(value.origin.key)}"]{view-transition-name:work-cover}`;
    document.head.append(style);
  }
  function finish(value, animated) {
    style?.remove(); style = null;
    delete root.dataset.workNavigation;
    if (value?.direction === 'enter' && animated && moving()) {
      root.dataset.workTitle = 'arrive';
      clearTimeout(titleTimer);
      titleTimer = setTimeout(() => { delete root.dataset.workTitle; }, 650);
    }
    document.dispatchEvent(new CustomEvent('work:transition', { detail: { phase: 'finished', direction: value?.direction, animated } }));
    try { if (value && JSON.parse(sessionStorage.getItem(key) || 'null')?.startedAt === value.startedAt) sessionStorage.removeItem(key); } catch {}
  }
  prepare(incoming());
  addEventListener('pagereveal', event => {
    const value = incoming();
    if (!value) { finish(null, false); return; }
    prepare(value);
    if (value.direction === 'return') scrollTo({ left: value.origin.scrollX, top: value.origin.scrollY, behavior: 'instant' });
    const transition = event.viewTransition;
    if (!transition || !moving()) { transition?.skipTransition(); finish(value, false); return; }
    transition.ready.then(() => {
      document.dispatchEvent(new CustomEvent('work:transition', { detail: { phase: 'ready', direction: value.direction, animated: true } }));
    }).catch(() => {});
    transition.finished.then(() => finish(value, true), () => finish(value, false));
  });
  addEventListener('pageshow', () => { if (!('onpagereveal' in window)) finish(null, false); });
})();
