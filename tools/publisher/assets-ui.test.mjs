import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import { once } from 'node:events';
import { chromium } from 'playwright';

const fixtures = [
  { path: 'Assets/a-large.png', sources: ['Assets/a-large.png', 'Other/duplicate-a.png'], ext: '.png', bytes: 3e6, digest: 'large-png' },
  { path: 'Assets/b-small.png', ext: '.png', bytes: 2e5, digest: 'small-png' },
  { path: 'Assets/c-photo.jpg', ext: '.jpg', bytes: 2e6, digest: 'photo-jpg' },
  { path: 'Assets/d-animation.gif', ext: '.gif', bytes: 6e6, digest: 'animation-gif' },
  { path: 'Assets/e-recording.mp4', ext: '.mp4', bytes: 8e6, digest: 'recording-mp4' },
  { path: 'Assets/f-document.pdf', ext: '.pdf', bytes: 1.4e6, digest: 'document-pdf' },
].map(asset => ({ ...asset, sources: asset.sources || [asset.path], referencedBy: ['Synthetic note'] }));

function currentAssets(modes, catalog = fixtures) {
  return catalog.flatMap(asset => {
    const groups = new Map();
    for (const source of asset.sources) {
      const mode = modes[source] || 'original';
      if (!groups.has(mode)) groups.set(mode, []);
      groups.get(mode).push(source);
    }
    return [...groups].map(([mode, sources]) => ({ ...asset, path: sources[0], sources, mode, key: asset.digest + ':' + mode }));
  });
}

async function setup(t, { ffmpeg = false, viewport } = {}) {
  const [html, css] = await Promise.all([
    fs.readFile(new URL('./index.html', import.meta.url), 'utf8'),
    fs.readFile(new URL('./publisher.css', import.meta.url), 'utf8'),
  ]);
  const source = html.replace('__TOKEN__', 'a'.repeat(64)).replace('__PREVIEW_URL__', 'http://127.0.0.1:4325/');
  const mock = { modes: {}, calls: [], plans: 0, assets: [], catalog: structuredClone(fixtures), selected: ['Synthetic.md'], renameOnNextAnalysis: false };
  const server = http.createServer(async (req, res) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    const send = (value, status = 200) => { res.writeHead(status); res.end(JSON.stringify(value)); };
    if (req.url === '/') { res.setHeader('Content-Type', 'text/html; charset=utf-8'); return res.end(source); }
    if (req.url === '/publisher.css') { res.setHeader('Content-Type', 'text/css; charset=utf-8'); return res.end(css); }
    if (req.url === '/favicon.ico') { res.writeHead(204); return res.end(); }
    let raw = ''; for await (const chunk of req) raw += chunk;
    const data = JSON.parse(raw || '{}'); mock.calls.push({ url: req.url, method: req.method, data });
    if (req.url === '/api/deploy/status') return send({ busy: false, phase: 'idle', message: '尚无发布任务。' });
    if (req.url === '/api/scan') return send({ sections:[{value:'notes'},{value:'tutorials'},{value:'work'}],metadata:{},catalog:{tags:[],categories:[],series:[],engine:[],role:[]},notes: [{ path: 'Synthetic.md', id: 'synthetic', title: 'Synthetic note', status: '未生成', blocked: false }], selected: mock.selected, assets: mock.modes, missingSelected: [], ffmpeg });
    if (req.url === '/api/select') { mock.modes = structuredClone(data.assets); mock.selected = data.selected; return send({ ok: true }); }
    if (req.url === '/api/analyze') {
      if (mock.renameOnNextAnalysis) {
        mock.renameOnNextAnalysis = false;
        mock.catalog[0] = { ...mock.catalog[0], path: 'Assets/renamed-a.png', sources: ['Assets/renamed-a.png'] };
        mock.modes = {};
      }
      mock.plans++; mock.assets = currentAssets(mock.modes, mock.catalog);
      return send({ id: 'plan-' + mock.plans, assets: mock.assets, assetModes: structuredClone(mock.modes), errors: [], warnings: [], changes: { added: ['Synthetic note'], updated: [], removed: [] } });
    }
    if (req.url === '/api/prepare') return send({ id: 'stage', notes: [], assets: mock.assets.map(asset => ({ path: asset.path, bytes: asset.bytes, originalBytes: asset.bytes })), changes: { removed: [] } });
    return send({ error: 'Unexpected mock request: ' + req.url }, 404);
  });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  let browser;
  t.after(async () => { await browser?.close(); server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); });
  browser = await chromium.launch({ headless: true, ...(process.env.PUBLISHER_TEST_BROWSER ? { channel: process.env.PUBLISHER_TEST_BROWSER } : {}) });
  const page = await browser.newPage({ reducedMotion: 'reduce', ...(viewport ? { viewport } : {}) });
  page.setDefaultTimeout(5000);
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto(`http://127.0.0.1:${server.address().port}/`);
  await settled(page);
  await page.locator('#analyze').click(); await page.locator('#assetList').waitFor(); await settled(page);
  return { page, mock, errors };
}

async function settled(page) { await page.waitForFunction(() => !document.querySelector('main').hasAttribute('aria-busy')); }
async function paths(page) { return page.locator('#assetList .asset').evaluateAll(rows => rows.map(row => row.dataset.path)); }
const approval = (page, assetPath) => page.getByLabel('确认附件 ' + assetPath, { exact: true });
const mode = (page, assetPath) => page.getByLabel('压缩策略 ' + assetPath, { exact: true });

test('attachment filters combine type, inclusive MB range, alias search and sorting', async t => {
  const { page, errors } = await setup(t);
  assert.deepEqual(await paths(page), [fixtures[4].path, fixtures[3].path, fixtures[0].path, fixtures[2].path, fixtures[5].path, fixtures[1].path]);
  await page.locator('#assetType').selectOption('image');
  await page.locator('#assetMin').fill('2'); await page.locator('#assetMax').fill('3');
  assert.deepEqual(await paths(page), [fixtures[0].path, fixtures[2].path]);
  await page.locator('#assetSort').selectOption('size-asc');
  assert.deepEqual(await paths(page), [fixtures[2].path, fixtures[0].path]);
  await page.locator('#assetSearch').fill('DUPLICATE-a');
  assert.deepEqual(await paths(page), [fixtures[0].path], 'search also matches a deduplicated attachment source');
  await page.locator('#assetReset').click(); await page.locator('#assetSort').selectOption('name');
  assert.deepEqual(await paths(page), fixtures.map(asset => asset.path));
  await page.locator('#assetLargeImages').click();
  assert.deepEqual(await paths(page), [fixtures[3].path, fixtures[0].path, fixtures[2].path]);
  assert.equal(await page.locator('#assetMin').inputValue(), '1');
  assert.deepEqual(errors, []);
});

test('bulk compression updates filtered duplicate sources and preserves filters and unchanged approvals after reanalysis', async t => {
  const { page, mock, errors } = await setup(t);
  await page.locator('#assetApprove').click();
  assert.equal(await page.locator('#prepare').isEnabled(), true);
  await page.locator('#assetType').selectOption('.png'); await page.locator('#assetMin').fill('1');
  await page.locator('#assetApproval').selectOption('approved');
  await page.locator('#assetBulkMode').selectOption('optimized');
  await page.locator('#assetApplyMode').click(); await settled(page);
  assert.equal(mock.plans, 2, 'changing compression reanalyzes the saved source modes');
  assert.deepEqual(mock.modes, { 'Assets/a-large.png': 'optimized', 'Other/duplicate-a.png': 'optimized' });
  assert.equal(await page.locator('#assetType').inputValue(), '.png');
  assert.equal(await page.locator('#assetMin').inputValue(), '1');
  assert.equal(await page.locator('#assetApproval').inputValue(), 'pending', 'changed assets remain visible for another review');
  assert.equal(await mode(page, fixtures[0].path).inputValue(), 'optimized');
  assert.equal(await approval(page, fixtures[0].path).isChecked(), false, 'changed output requires a new review');
  assert.equal(await page.locator('#prepare').isDisabled(), true);
  await page.locator('#assetReset').click();
  assert.equal(await page.locator('#assetList .approve:checked').count(), 5, 'unchanged attachments retain their review');
  for (const asset of fixtures.slice(1)) {
    assert.equal(await approval(page, asset.path).isChecked(), true);
    assert.equal(await mode(page, asset.path).inputValue(), 'original');
  }
  assert.deepEqual(errors, []);
});

test('batch approval is limited to filtered assets while preparation requires and sends all reviewed keys', async t => {
  const { page, mock, errors } = await setup(t);
  await page.locator('#assetType').selectOption('.png'); await page.locator('#assetApprove').click();
  assert.equal(await page.locator('#assetList .approve:checked').count(), 2);
  assert.equal(await page.locator('#prepare').isDisabled(), true, 'hidden unreviewed assets still block preparation');
  await page.locator('#assetType').selectOption('.jpg');
  assert.equal(await approval(page, fixtures[2].path).isChecked(), false);
  await page.locator('#assetReset').click();
  assert.equal(await page.locator('#assetList .approve:checked').count(), 2, 'switching filters does not reset reviews');
  await page.locator('#assetApproval').selectOption('pending'); await page.locator('#assetApprove').click();
  assert.equal((await paths(page)).length, 0, 'reviewed assets leave the pending filter');
  assert.equal(await page.locator('#prepare').isEnabled(), true);
  await page.locator('#assetReset').click(); await page.locator('#assetType').selectOption('video');
  await page.locator('#assetUnapprove').click();
  assert.equal(await page.locator('#prepare').isDisabled(), true);
  await page.locator('#assetReset').click();
  assert.equal(await page.locator('#assetList .approve:checked').count(), 5, 'unapprove only affects its visible group');
  await page.locator('#assetType').selectOption('video'); await page.locator('#assetApprove').click();
  await page.locator('#assetType').selectOption('.png');
  await page.locator('#prepare').click(); await settled(page);
  const prepared = mock.calls.find(call => call.url === '/api/prepare');
  assert.equal(prepared.data.id, 'plan-1');
  assert.deepEqual(prepared.data.approved.sort(), fixtures.map(asset => asset.digest + ':original').sort(), 'prepare includes approved keys beyond the visible PNG group');
  await page.locator('#assetResults summary').click();
  assert.equal(await page.locator('#assetResults p').count(), 6);
  assert.match(await page.locator('#assetResults').innerText(), /Assets\/a-large\.png · 3.00 MB → 3.00 MB · 保留原体积/);
  assert.deepEqual(errors, []);
});

test('without FFmpeg batch image optimization skips GIF, video and PDF and disables unsupported choices', async t => {
  const { page, mock, errors } = await setup(t);
  assert.equal(await page.locator('#assetBulkMode option[value="video"]').evaluate(option => option.disabled), true);
  for (const asset of fixtures.slice(3)) {
    for (const option of ['lossless', 'optimized', 'video']) assert.equal(await mode(page, asset.path).locator('option[value="' + option + '"]').isDisabled(), true);
  }
  assert.match(await page.locator('#assetApplyMode').innerText(), /（3）/);
  await page.locator('#assetApplyMode').click(); await settled(page);
  assert.equal(mock.plans, 2);
  assert.deepEqual(mock.modes, {
    'Assets/a-large.png': 'optimized', 'Other/duplicate-a.png': 'optimized',
    'Assets/b-small.png': 'optimized', 'Assets/c-photo.jpg': 'optimized',
  });
  for (const asset of fixtures.slice(3)) assert.equal(await mode(page, asset.path).inputValue(), 'original');
  assert.match(await page.locator('#message').innerText(), /另外 3 项类型不适用/);
  assert.deepEqual(errors, []);
});

test('FFmpeg enables GIF and video conversion but leaves static images and PDF unchanged', async t => {
  const { page, mock, errors } = await setup(t, { ffmpeg: true });
  assert.equal(await page.locator('#assetBulkMode option[value="video"]').isEnabled(), true);
  for (const asset of [fixtures[3], fixtures[4]]) assert.equal(await mode(page, asset.path).locator('option[value="video"]').isEnabled(), true);
  for (const asset of [fixtures[0], fixtures[5]]) assert.equal(await mode(page, asset.path).locator('option[value="video"]').isDisabled(), true);
  await page.locator('#assetBulkMode').selectOption('video');
  assert.match(await page.locator('#assetApplyMode').innerText(), /（2）/);
  await page.locator('#assetApplyMode').click(); await settled(page);
  assert.deepEqual(mock.modes, { 'Assets/d-animation.gif': 'video', 'Assets/e-recording.mp4': 'video' });
  for (const asset of [fixtures[3], fixtures[4]]) assert.equal(await mode(page, asset.path).inputValue(), 'video');
  assert.equal(await mode(page, fixtures[5].path).inputValue(), 'original');
  await page.locator('#assetBulkMode').selectOption('original');
  await page.locator('#assetApplyMode').click(); await settled(page);
  for (const asset of fixtures) assert.equal(await mode(page, asset.path).inputValue(), 'original');
  assert.equal(mock.plans, 3);
  assert.deepEqual(errors, []);
});

test('reanalyzing a renamed attachment drops obsolete source modes before the next edit', async t => {
  const { page, mock, errors } = await setup(t);
  mock.renameOnNextAnalysis = true;
  await mode(page, fixtures[0].path).selectOption('optimized'); await settled(page);
  assert.equal(mock.plans, 2);
  assert.equal((await paths(page)).includes(fixtures[0].path), false);
  assert.equal(await mode(page, 'Assets/renamed-a.png').inputValue(), 'original');
  await mode(page, 'Assets/renamed-a.png').selectOption('lossless'); await settled(page);
  const lastSave = mock.calls.filter(call => call.url === '/api/select').at(-1);
  assert.deepEqual(lastSave.data.assets, { 'Assets/renamed-a.png': 'lossless' }, 'the authoritative server mode map removes both obsolete deduplicated sources');
  assert.equal(mock.plans, 3);
  assert.deepEqual(errors, []);
});

test('invalid size ranges disable batch actions and dark controls fit a 390px viewport', async t => {
  const { page, errors } = await setup(t, { viewport: { width: 390, height: 844 } });
  await page.locator('#assetMin').fill('-1');
  assert.equal(await page.locator('#assetFilterError').isVisible(), true);
  for (const id of ['assetApplyMode', 'assetApprove', 'assetUnapprove']) assert.equal(await page.locator('#' + id).isDisabled(), true);
  await page.locator('#assetMin').fill('4'); await page.locator('#assetMax').fill('2');
  assert.equal(await page.locator('#assetApplyMode').isDisabled(), true);
  assert.equal((await paths(page)).length, 0);
  await page.locator('#assetReset').click();
  assert.equal(await page.locator('#assetFilterError').isVisible(), false);
  assert.equal(await page.locator('#assetApprove').isEnabled(), true);
  assert.equal((await paths(page)).length, 6);
  const visual = await page.evaluate(() => ({
    overflow: document.documentElement.scrollWidth > innerWidth,
    background: getComputedStyle(document.body).backgroundColor,
    inputBackground: getComputedStyle(document.querySelector('#assetMin')).backgroundColor,
    colorScheme: getComputedStyle(document.documentElement).colorScheme,
  }));
  assert.equal(visual.overflow, false, 'attachment controls do not cause horizontal scrolling');
  assert.equal(visual.background, 'rgb(20, 23, 25)');
  assert.equal(visual.inputBackground, 'rgb(18, 22, 24)');
  assert.equal(visual.colorScheme, 'dark');
  if (process.env.PUBLISHER_UI_SCREENSHOT_DIR) {
    const directory = path.resolve(process.env.PUBLISHER_UI_SCREENSHOT_DIR);
    await fs.mkdir(directory, { recursive: true });
    await page.locator('.asset-tools').evaluate(element => element.scrollIntoView({ block: 'start' }));
    await page.screenshot({ path: path.join(directory, 'publisher-assets-mobile.png') });
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: path.join(directory, 'publisher-assets-desktop.png') });
  }
  assert.deepEqual(errors, []);
});
