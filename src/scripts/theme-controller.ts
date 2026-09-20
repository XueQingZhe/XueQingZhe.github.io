type Theme = 'light' | 'dark';
type Preference = Theme | 'system';

const root = document.documentElement;
const darkQuery = matchMedia('(prefers-color-scheme: dark)');
const motionQuery = matchMedia('(prefers-reduced-motion: reduce)');
const button = document.querySelector<HTMLButtonElement>('#theme-toggle');
const duration = 1000;
let completionTimer = 0;
let sequence = 0;

function preference(): Preference {
  try {
    const saved = localStorage.getItem('app-theme');
    return saved === 'dark' || saved === 'system' ? saved : 'light';
  } catch {
    return root.dataset.preference === 'dark' || root.dataset.preference === 'system'
      ? root.dataset.preference : 'light';
  }
}

function resolve(value: Preference): Theme {
  return value === 'system' ? (darkQuery.matches ? 'dark' : 'light') : value;
}

function settle() {
  clearTimeout(completionTimer);
  completionTimer = 0;
  root.dataset.themeTransition = 'instant';
  delete root.dataset.themeDirection;
}

function apply(value: Preference, manual = false) {
  const theme = resolve(value);
  const previous = root.dataset.theme;
  const animate = manual && theme !== previous && !motionQuery.matches
    && root.dataset.motion !== 'paused' && !document.hidden;
  clearTimeout(completionTimer);
  root.dataset.preference = value;
  if (animate) {
    // Commit the current interpolated palette before reversing a running transition.
    getComputedStyle(root).getPropertyValue('--ground');
    root.dataset.themeTransition = 'manual';
    root.dataset.themeDirection = theme === 'dark' ? 'dusk' : 'dawn';
    root.dataset.themeTransitionId = String(++sequence);
    root.dataset.themeStarted = String(performance.now());
  } else {
    settle();
  }
  root.dataset.theme = theme;
  root.style.colorScheme = theme;
  button?.setAttribute('aria-pressed', String(theme === 'dark'));
  button?.setAttribute('aria-label', theme === 'dark' ? '切换到日间模式' : '切换到夜间模式');
  const label = button?.querySelector('.theme-label');
  if (label) label.textContent = theme === 'dark' ? '夜间' : '日间';
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#181c27' : '#f5f0e7');
  if (animate) completionTimer = window.setTimeout(settle, duration);
}

function reconcile() {
  try { root.dataset.motion = localStorage.getItem('app-motion') === 'paused' ? 'paused' : 'running'; } catch {}
  apply(preference());
}

button?.addEventListener('click', () => {
  const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
  try { localStorage.setItem('app-theme', next); } catch {}
  apply(next, true);
});
darkQuery.addEventListener('change', () => {
  if (preference() === 'system') apply('system');
});
motionQuery.addEventListener('change', () => {
  if (motionQuery.matches) settle();
});
new MutationObserver(() => {
  if (root.dataset.motion === 'paused') settle();
}).observe(root, { attributes: true, attributeFilter: ['data-motion'] });
window.addEventListener('storage', event => {
  if (event.key === 'app-theme' || event.key === 'app-motion' || event.key === null) reconcile();
});
window.addEventListener('pageshow', event => { if (event.persisted) reconcile(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) settle(); });
apply(preference());
