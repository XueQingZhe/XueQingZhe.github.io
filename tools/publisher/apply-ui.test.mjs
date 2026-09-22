import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import { once } from 'node:events';
import { chromium } from 'playwright';

const sections = [{ value: 'notes', label: '渲染手记' }, { value: 'tutorials', label: '学习系列' }, { value: 'work', label: '作品与实践' }];
const catalog = { tags: [], categories: [], series: [], engine: [], role: [] };
const fixtures = ['Root', 'Other'].map(title => ({
  path: title + '.md', id: title.toLowerCase(), title: title + ' note', status: '未生成', blocked: false,
  sourceMetadata: { section: 'notes', category: '', title: title + ' note', date: '2026-09-20', summary: '', tags: [], series: '', order: 100, cover: '', engine: [], role: [], year: 2026, featured: false },
}));
const imageAsset = { path: 'Images/diagram.png', sources: ['Images/diagram.png'], referencedBy: ['Root note'], ext: '.png', bytes: 10000, digest: 'diagram', mode: 'original', key: 'diagram:original' };

async function setup(t, { withAsset = false, prepared = true } = {}) {
  const [html, css] = await Promise.all([
    fs.readFile(new URL('./index.html', import.meta.url), 'utf8'),
    fs.readFile(new URL('./publisher.css', import.meta.url), 'utf8'),
  ]);
  const source = html.replace('__TOKEN__', 'a'.repeat(64)).replace('__PREVIEW_URL__', 'http://127.0.0.1:4325/');
  const mock = { selected: ['Root.md', 'Other.md'], metadata: {}, modes: {}, calls: [], applyFailures: 0, scanFailure: false, written: false, waitForApply: null, releaseApply: null };
  const notes = () => fixtures.map(note => ({ ...note, metadataOverride: mock.metadata[note.path] || {}, metadata: { ...note.sourceMetadata, ...mock.metadata[note.path] } }));
  const assets = () => withAsset ? [{ ...imageAsset, mode: mock.modes[imageAsset.path] || 'original', key: imageAsset.digest + ':' + (mock.modes[imageAsset.path] || 'original') }] : [];
  const server = http.createServer(async (req, res) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    const send = (value, status = 200) => { res.writeHead(status); res.end(JSON.stringify(value)); };
    if (req.url === '/') { res.setHeader('Content-Type', 'text/html; charset=utf-8'); return res.end(source); }
    if (req.url === '/publisher.css') { res.setHeader('Content-Type', 'text/css; charset=utf-8'); return res.end(css); }
    if (req.url === '/favicon.ico') { res.writeHead(204); return res.end(); }
    let raw = ''; for await (const chunk of req) raw += chunk;
    const data = JSON.parse(raw || '{}'); mock.calls.push({ url: req.url, data });
    if (req.url === '/api/deploy/status') return send({ busy: false, phase: 'idle', message: '尚无发布任务。' });
    if (req.url === '/api/scan') return mock.scanFailure ? send({ error: 'Synthetic scan failed after successful write' }, 500) : send({ notes: notes(), selected: mock.selected, metadata: mock.metadata, assets: mock.modes, sections, catalog, ffmpeg: false, missingSelected: [] });
    if (req.url === '/api/select') { mock.selected = [...data.selected]; mock.modes = { ...data.assets }; Object.assign(mock.metadata, data.metadata); return send({ ok: true }); }
    if (req.url === '/api/analyze') return send({ id: 'plan', errors: [], warnings: [], assets: assets(), assetModes: mock.modes, metadata: mock.metadata, catalog, changes: { added: ['Root note'], updated: ['Other note'], removed: ['Previously public note'] } });
    if (req.url === '/api/prepare') return send({ id: 'stage', notes: mock.selected.map(file => ({ title: file, slug: file.replace('.md', '').toLowerCase() })), assets: assets().map(asset => ({ ...asset, originalBytes: asset.bytes })), changes: { added: ['Root note'], updated: ['Other note'], removed: ['Previously public note'] } });
    if (req.url.startsWith('/api/stage?')) return send({ markdown: '# Synthetic public preview' });
    if (req.url === '/api/apply') {
      if (mock.waitForApply) await mock.waitForApply;
      if (mock.applyFailures > 0) { mock.applyFailures--; return send({ error: 'Synthetic build failed: missing shader asset' }, 400); }
      mock.written = true;
      return send({ message: '网站副本与搜索索引已更新。' });
    }
    return send({ error: 'Unexpected mock request: ' + req.url }, 404);
  });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  let browser;
  t.after(async () => { mock.releaseApply?.(); await browser?.close(); server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); });
  browser = await chromium.launch({ headless: true, ...(process.env.PUBLISHER_TEST_BROWSER ? { channel: process.env.PUBLISHER_TEST_BROWSER } : {}) });
  const page = await browser.newPage({ reducedMotion: 'reduce' }); page.setDefaultTimeout(6000);
  await page.addInitScript(() => {
    window.nativeConfirmCalls = 0;
    window.confirm = () => { window.nativeConfirmCalls++; throw new Error('Native confirmation dialogs are unavailable in this browser'); };
  });
  const errors = [], dialogs = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('dialog', dialog => { dialogs.push(dialog.type()); void dialog.dismiss(); });
  await page.goto(`http://127.0.0.1:${server.address().port}/`); await settled(page);
  if (prepared) {
    await page.locator('#analyze').click(); await settled(page);
    if (withAsset) await page.locator('#assetApprove').click();
    await page.locator('#prepare').click(); await settled(page);
  }
  return { page, mock, errors, dialogs };
}

async function settled(page) { await page.waitForFunction(() => !document.querySelector('main').hasAttribute('aria-busy')); }
const applyCalls = mock => mock.calls.filter(call => call.url === '/api/apply');
async function openConfirmation(page) { await page.locator('#apply').click(); await page.locator('#applyReview').waitFor({ state: 'visible' }); }
async function assertNoNativeDialogs(page, errors, dialogs) {
  assert.equal(await page.evaluate(() => window.nativeConfirmCalls), 0);
  assert.deepEqual(dialogs, []); assert.deepEqual(errors, []);
}

test('local-write controls explain why a prepared copy is needed', async t => {
  const { page, errors, dialogs } = await setup(t, { prepared: false });
  assert.equal(await page.locator('#apply').isDisabled(), true);
  assert.equal(await page.locator('#applyReview').isVisible(), false);
  assert.match(await page.locator('#applyStatus').innerText(), /生成|副本|分析|选择/);
  await assertNoNativeDialogs(page, errors, dialogs);
});

test('the on-page confirmation lists changes, cancels without a request, and writes only on a second explicit click', async t => {
  const { page, mock, errors, dialogs } = await setup(t);
  await openConfirmation(page);
  assert.match(await page.locator('#applySummary').innerText(), /2/);
  assert.match(await page.locator('#applySummary').innerText(), /撤回[^\d]*1/);
  assert.equal(applyCalls(mock).length, 0, 'opening a confirmation is not authorization to execute its request');
  await page.locator('#applyCancel').click();
  assert.equal(await page.locator('#applyReview').isVisible(), false);
  assert.equal(applyCalls(mock).length, 0);
  assert.equal(await page.locator('#apply').isEnabled(), true, 'cancel keeps the reviewed stage available');
  await openConfirmation(page); await page.locator('#applyConfirm').click(); await settled(page);
  assert.deepEqual(applyCalls(mock).map(call => call.data), [{ id: 'stage' }]);
  assert.equal(mock.written, true);
  assert.equal(await page.locator('#applyReview').isVisible(), false);
  assert.equal(await page.locator('#apply').isDisabled(), true);
  assert.equal(await page.locator('#prepare').isDisabled(), true);
  assert.match(await page.locator('#applyStatus').innerText(), /已更新|已写入|成功/);
  await assertNoNativeDialogs(page, errors, dialogs);
});

test('a failed build reports its reason beside the action and retains the same reviewed stage for retry', async t => {
  const { page, mock, errors, dialogs } = await setup(t);
  mock.applyFailures = 1;
  await openConfirmation(page); await page.locator('#applyConfirm').click(); await settled(page);
  assert.equal(mock.written, false);
  assert.equal(applyCalls(mock).length, 1);
  assert.match(await page.locator('#applyStatus').innerText(), /Synthetic build failed: missing shader asset/);
  assert.equal(await page.locator('#applyConfirm').isEnabled(), true, 'the failed request must not strand a prepared copy behind a disabled control');
  assert.equal(await page.locator('#applyReview').isVisible(), true);
  await page.locator('#applyConfirm').click(); await settled(page);
  assert.deepEqual(applyCalls(mock).map(call => call.data), [{ id: 'stage' }, { id: 'stage' }]);
  assert.equal(mock.written, true);
  assert.match(await page.locator('#applyStatus').innerText(), /已更新|已写入|成功/);
  await assertNoNativeDialogs(page, errors, dialogs);
});

test('a running local build shows progress and disables repeated confirmation requests', async t => {
  const { page, mock, errors, dialogs } = await setup(t);
  mock.waitForApply = new Promise(resolve => { mock.releaseApply = resolve; });
  await openConfirmation(page);
  const request = page.waitForRequest(request => new URL(request.url()).pathname === '/api/apply');
  await page.locator('#applyConfirm').click(); await request;
  assert.equal(await page.locator('#applyConfirm').isDisabled(), true);
  assert.equal(await page.locator('#apply').isDisabled(), true);
  assert.equal(await page.locator('#applyCancel').isDisabled(), true);
  assert.equal(await page.locator('main').getAttribute('aria-busy'), 'true');
  assert.match(await page.locator('#applyStatus').innerText(), /正在|构建|校验|写入/);
  assert.equal(applyCalls(mock).length, 1);
  mock.releaseApply(); await settled(page);
  assert.equal(applyCalls(mock).length, 1);
  assert.match(await page.locator('#applyStatus').innerText(), /已更新|已写入|成功/);
  await assertNoNativeDialogs(page, errors, dialogs);
});

test('selection, publication metadata and attachment changes invalidate an open local-write confirmation', async t => {
  const mutations = [
    ['selection', async page => { await page.getByLabel('选择 Root note', { exact: true }).uncheck(); }],
    ['metadata', async page => { await page.getByRole('button', { name: '编辑发布设置 Root.md', exact: true }).click(); await page.locator('#editTitle').fill('Changed public title'); await page.locator('#noteMetaApply').click(); }],
    ['attachment review', async page => { await page.getByLabel('确认附件 Images/diagram.png', { exact: true }).uncheck(); }],
    ['attachment compression', async page => { await page.getByLabel('压缩策略 Images/diagram.png', { exact: true }).selectOption('optimized'); await settled(page); }],
  ];
  for (const [name, mutate] of mutations) await t.test(name, async child => {
    const { page, mock, errors, dialogs } = await setup(child, { withAsset: name.startsWith('attachment') });
    await openConfirmation(page); await mutate(page);
    assert.equal(await page.locator('#applyReview').isVisible(), false);
    assert.equal(await page.locator('#apply').isDisabled(), true);
    assert.equal(applyCalls(mock).length, 0, 'a stale confirmation must never submit a stage');
    await assertNoNativeDialogs(page, errors, dialogs);
  });
});

test('a successful write remains successful when the following directory scan fails', async t => {
  const { page, mock, errors, dialogs } = await setup(t);
  mock.scanFailure = true;
  await openConfirmation(page); await page.locator('#applyConfirm').click(); await settled(page);
  assert.equal(mock.written, true);
  assert.equal(applyCalls(mock).length, 1);
  assert.equal(await page.locator('#apply').isDisabled(), true, 'a completed stage must not become retryable because a later scan failed');
  assert.equal(await page.locator('#applyReview').isVisible(), false);
  assert.match(await page.locator('#applyStatus').innerText(), /已更新|已写入|成功/);
  assert.match(await page.locator('#applyStatus').innerText(), /重新扫描|扫描失败|扫描未/);
  assert.match(await page.locator('#message').innerText(), /已更新|已写入|成功/);
  assert.equal(await page.locator('#sitePreview').isVisible(), true);
  await assertNoNativeDialogs(page, errors, dialogs);
});
