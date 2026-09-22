import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import { once } from 'node:events';
import { chromium } from 'playwright';

const sections = [{ value: 'notes', label: '渲染手记' }, { value: 'tutorials', label: '学习系列' }, { value: 'work', label: '作品与实践' }];
const catalog = { tags: [], categories: [], series: [], engine: [], role: [] };
const rootValue = file => '/' + file.split('/').map(encodeURIComponent).join('/');
const imageBytes = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l8UAAAAASUVORK5CYII=', 'base64');
const mediaFixtures = [
  { path: 'Notes/Images/封面.png', type: 'image', referencedBy: ['Root.md'] },
  { path: 'Other/Images/封面.png', type: 'image', referencedBy: ['Other.md'] },
  { path: 'Clips/preview.mp4', type: 'video', referencedBy: ['Root.md'] },
  { path: 'Clips/loop.webm', type: 'video', referencedBy: ['Root.md'] },
  { path: 'Clips/raw.mov', type: 'video', referencedBy: ['Root.md'] },
  { path: 'Clips/raw.m4v', type: 'video', referencedBy: ['Root.md'] },
  { path: 'Search/Slow.png', type: 'image', referencedBy: [] },
  { path: 'Search/Fast.png', type: 'image', referencedBy: [] },
  ...Array.from({ length: 26 }, (_, index) => ({ path: `Gallery/Frame-${String(index + 1).padStart(2, '0')}.jpg`, type: 'image', referencedBy: [] })),
].map((item, index) => ({ ...item, value: rootValue(item.path), name: item.path.split('/').at(-1), bytes: (index + 1) * 10000 }));
const fixtures = ['Root', 'Other'].map(title => ({
  path: title + '.md', id: title.toLowerCase(), title: title + ' work', status: '未生成', blocked: false,
  sourceMetadata: { title: title + ' work', section: 'work', category: '', summary: 'Synthetic work summary', date: '2026-09-20', tags: [], series: '', order: 100, cover: rootValue(title === 'Root' ? 'Notes/Images/封面.png' : 'Other/Images/封面.png'), engine: [], role: [], year: 2026, featured: false },
}));

async function setup(t, { ffmpeg = true, viewport, modes = {} } = {}) {
  const [html, css] = await Promise.all([
    fs.readFile(new URL('./index.html', import.meta.url), 'utf8'),
    fs.readFile(new URL('./publisher.css', import.meta.url), 'utf8'),
  ]);
  const source = html.replace('__TOKEN__', 'a'.repeat(64)).replace('__PREVIEW_URL__', 'http://127.0.0.1:4325/');
  const mock = { selected: ['Root.md'], metadata: {}, modes: { ...modes }, calls: [], notes: structuredClone(fixtures), pending: [], holdQuery: null, holdNote: null };
  const currentNotes = () => mock.notes.map(note => ({ ...note, metadata: { ...note.sourceMetadata, ...mock.metadata[note.path] }, metadataOverride: mock.metadata[note.path] || {} }));
  const server = http.createServer(async (req, res) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    const url = new URL(req.url, 'http://127.0.0.1');
    const send = (value, status = 200) => { res.writeHead(status); res.end(JSON.stringify(value)); };
    if (url.pathname === '/') { res.setHeader('Content-Type', 'text/html; charset=utf-8'); return res.end(source); }
    if (url.pathname === '/publisher.css') { res.setHeader('Content-Type', 'text/css; charset=utf-8'); return res.end(css); }
    if (url.pathname === '/favicon.ico') { res.writeHead(204); return res.end(); }
    if (url.pathname === '/mock-thumbnail') { res.setHeader('Content-Type', 'image/png'); return res.end(imageBytes); }
    if (url.pathname === '/mock-preview') { res.setHeader('Content-Type', 'video/mp4'); return res.end(); }
    let raw = ''; for await (const chunk of req) raw += chunk;
    const data = JSON.parse(raw || '{}'); mock.calls.push({ route: url.pathname, query: Object.fromEntries(url.searchParams), data });
    if (url.pathname === '/api/deploy/status') return send({ busy: false, phase: 'idle', message: '尚无发布任务。' });
    if (url.pathname === '/api/scan') return send({ notes: currentNotes(), selected: mock.selected, metadata: mock.metadata, assets: mock.modes, sections, catalog, ffmpeg, missingSelected: [] });
    if (url.pathname === '/api/select') { mock.selected = [...data.selected]; mock.modes = { ...data.assets }; Object.assign(mock.metadata, data.metadata); return send({ ok: true }); }
    if (url.pathname === '/api/analyze') return send({ id: 'plan', errors: [], warnings: [], assets: [], assetModes: mock.modes, metadata: mock.metadata, catalog, changes: { added: ['Root work'], updated: [], removed: [] } });
    if (url.pathname === '/api/cover-media') {
      const note = url.searchParams.get('note'), scope = url.searchParams.get('scope') || 'note', type = url.searchParams.get('type') || 'all', q = (url.searchParams.get('q') || '').toLowerCase(), offset = Number(url.searchParams.get('offset') || 0), limit = Number(url.searchParams.get('limit') || 24);
      const matches = mediaFixtures.filter(item => (scope === 'all' || item.referencedBy.includes(note)) && (type === 'all' || item.type === type) && (!q || item.path.toLowerCase().includes(q)));
      const describe = item => {
        const selectable = ffmpeg || !/\.(mov|m4v)$/i.test(item.path);
        return { ...item, referenced: item.referencedBy.includes(note), selectable, ...(selectable ? {} : { reason: '需要 FFmpeg 才能转换此视频' }), thumbnailUrl: '/mock-thumbnail?path=' + encodeURIComponent(item.path), previewUrl: (item.type === 'image' ? '/mock-thumbnail' : '/mock-preview') + '?path=' + encodeURIComponent(item.path) };
      };
      const items = matches.slice(offset, offset + limit).map(describe);
      const current = mediaFixtures.find(item => item.value === url.searchParams.get('cover'));
      if ((mock.holdQuery !== null && q === mock.holdQuery.toLowerCase()) || (mock.holdNote !== null && note === mock.holdNote)) await new Promise(resolve => mock.pending.push({ note, q, release: resolve }));
      return send({ items, current: current ? describe(current) : null, total: matches.length, offset, limit, hasMore: offset + items.length < matches.length, ffmpeg });
    }
    return send({ error: 'Unexpected mock request: ' + url.pathname }, 404);
  });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  let browser;
  t.after(async () => { mock.pending.forEach(item => item.release()); await browser?.close(); server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); });
  browser = await chromium.launch({ headless: true, ...(process.env.PUBLISHER_TEST_BROWSER ? { channel: process.env.PUBLISHER_TEST_BROWSER } : {}) });
  const page = await browser.newPage({ reducedMotion: 'reduce', ...(viewport ? { viewport } : {}) }); page.setDefaultTimeout(6000);
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto(`http://127.0.0.1:${server.address().port}/`); await settled(page);
  await page.locator('#vaultPanel > summary').click();
  await edit(page, 'Root.md');
  await page.locator('#coverSelected img').waitFor();
  return { page, mock, errors };
}

async function settled(page) { await page.waitForFunction(() => !document.querySelector('main').hasAttribute('aria-busy')); }
async function edit(page, file) { await page.getByRole('button', { name: '编辑发布设置 ' + file, exact: true }).click(); }
const item = (page, file) => page.locator('#coverItems button[data-cover-path=' + JSON.stringify(file) + ']');
const coverPaths = page => page.locator('#coverItems button[data-cover-path]').evaluateAll(items => items.map(item => item.dataset.coverPath));
const selectionCalls = mock => mock.calls.filter(call => call.route === '/api/select');
async function openPicker(page) { await page.locator('#coverBrowse').click(); await page.locator('#coverPicker').waitFor({ state: 'visible' }); await page.locator('#coverItems button[data-cover-path]').first().waitFor(); }
async function applyAndSave(page) { if (await page.locator('#coverPicker').isVisible()) await page.locator('#coverClose').click(); await page.locator('#noteMetaApply').click(); await settled(page); }
async function changeFilter(page, id, value) {
  const response = page.waitForResponse(response => new URL(response.url()).pathname === '/api/cover-media');
  await page.locator('#' + id).selectOption(value); await (await response).finished(); await paint(page);
}
async function search(page, value) {
  const response = page.waitForResponse(response => { const url = new URL(response.url()); return url.pathname === '/api/cover-media' && url.searchParams.get('q') === value; });
  await page.locator('#coverSearch').fill(value); await (await response).finished(); await paint(page);
}
async function paint(page) { await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))); }

test('cover browsing shows thumbnails without making note settings dirty and distinguishes duplicate filenames by path', async t => {
  const { page, mock, errors } = await setup(t);
  await openPicker(page);
  assert.equal(await page.locator('#coverScope').inputValue(), 'note');
  assert.equal(await item(page, 'Notes/Images/封面.png').locator('img').count(), 1);
  assert.equal(await page.locator('#save').isEnabled(), true, 'opening the picker is not a pending metadata edit');
  await changeFilter(page, 'coverScope', 'all'); await search(page, '封面.png');
  assert.deepEqual(await coverPaths(page), ['Notes/Images/封面.png', 'Other/Images/封面.png']);
  for (const file of ['Notes/Images/封面.png', 'Other/Images/封面.png']) assert.match(await item(page, file).innerText(), new RegExp(file.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.equal(await page.locator('#save').isEnabled(), true, 'scope and search changes do not mark the article edited');
  await item(page, 'Other/Images/封面.png').click();
  assert.equal(await page.locator('#editCover').inputValue(), rootValue('Other/Images/封面.png'));
  assert.equal(await page.locator('#coverSelected img').count(), 1);
  assert.equal(await page.locator('#save').isDisabled(), true, 'choosing a cover must be applied before saving');
  assert.equal(selectionCalls(mock).length, 0);
  await applyAndSave(page);
  assert.deepEqual(mock.metadata['Root.md'], { cover: rootValue('Other/Images/封面.png') });
  assert.deepEqual(mock.notes[0].sourceMetadata, fixtures[0].sourceMetadata, 'cover selection never mutates source metadata');
  assert.deepEqual(errors, []);
});

test('cover media search, type filters and pagination replace or append only their matching results', async t => {
  const { page, errors } = await setup(t);
  await openPicker(page); await changeFilter(page, 'coverScope', 'all');
  assert.equal((await coverPaths(page)).length, 24);
  const more = page.waitForResponse(response => { const url = new URL(response.url()); return url.pathname === '/api/cover-media' && url.searchParams.get('offset') === '24'; });
  await page.locator('#coverMore').click(); await (await more).finished(); await paint(page);
  const all = await coverPaths(page); assert.equal(all.length, mediaFixtures.length); assert.equal(new Set(all).size, all.length);
  await changeFilter(page, 'coverType', 'video');
  assert.deepEqual(await coverPaths(page), ['Clips/preview.mp4', 'Clips/loop.webm', 'Clips/raw.mov', 'Clips/raw.m4v']);
  await changeFilter(page, 'coverType', 'image'); await search(page, 'Gallery/Frame-0');
  assert.equal((await coverPaths(page)).length, 9);
  assert.equal((await coverPaths(page)).every(file => file.startsWith('Gallery/Frame-0')), true);
  assert.deepEqual(errors, []);
});

test('video covers expose native playback controls and choose compatible attachment processing', async t => {
  for (const [file, expectedMode] of [['Clips/preview.mp4', 'original'], ['Clips/loop.webm', 'original'], ['Clips/raw.mov', 'video'], ['Clips/raw.m4v', 'video']]) await t.test(file, async child => {
    const { page, mock, errors } = await setup(child);
    await openPicker(page); await changeFilter(page, 'coverType', 'video'); await item(page, file).click();
    assert.equal(await page.locator('#editCover').inputValue(), rootValue(file));
    const video = page.locator('#coverSelected video');
    assert.equal(await video.count(), 1); assert.equal(await video.evaluate(element => element.controls), true);
    assert.equal(await video.evaluate(element => element.autoplay), false, 'preview playback is chosen by the author');
    await applyAndSave(page);
    assert.equal(mock.metadata['Root.md'].cover, rootValue(file));
    assert.equal(mock.modes[file], expectedMode);
    assert.deepEqual(errors, []);
  });
});

test('selecting an MP4 cover preserves an explicit existing conversion setting', async t => {
  const { page, mock, errors } = await setup(t, { modes: { 'Clips/preview.mp4': 'video' } });
  await openPicker(page); await item(page, 'Clips/preview.mp4').click(); await applyAndSave(page);
  assert.equal(mock.modes['Clips/preview.mp4'], 'video');
  assert.deepEqual(errors, []);
});

test('discarding an unapplied video cover leaves attachment modes and note settings unchanged', async t => {
  const { page, mock, errors } = await setup(t);
  await openPicker(page); await item(page, 'Clips/raw.mov').click();
  assert.equal(await page.locator('#editCover').inputValue(), rootValue('Clips/raw.mov'));
  await page.locator('#coverClose').click(); await page.locator('#noteMetaClose').click();
  await page.locator('#save').click(); await settled(page);
  assert.deepEqual(mock.modes, {});
  assert.deepEqual(mock.metadata, {});
  await edit(page, 'Root.md');
  assert.equal(await page.locator('#editCover').inputValue(), fixtures[0].sourceMetadata.cover);
  assert.deepEqual(errors, []);
});

test('unsupported source videos explain their missing converter while browser-ready videos remain selectable', async t => {
  const { page, mock, errors } = await setup(t, { ffmpeg: false });
  await openPicker(page); await changeFilter(page, 'coverType', 'video');
  for (const file of ['Clips/raw.mov', 'Clips/raw.m4v']) {
    assert.equal(await item(page, file).isDisabled(), true);
    assert.match(await item(page, file).innerText(), /FFmpeg/);
  }
  for (const file of ['Clips/preview.mp4', 'Clips/loop.webm']) assert.equal(await item(page, file).isEnabled(), true);
  assert.equal(await page.locator('#editCover').inputValue(), fixtures[0].sourceMetadata.cover);
  assert.equal(selectionCalls(mock).length, 0);
  assert.deepEqual(errors, []);
});

test('the picker reopens with the current cover selected and supports explicit removal and advanced path entry', async t => {
  const { page, mock, errors } = await setup(t);
  await openPicker(page);
  assert.equal(await item(page, 'Notes/Images/封面.png').getAttribute('aria-pressed'), 'true');
  await item(page, 'Clips/preview.mp4').click();
  if (await page.locator('#coverPicker').isVisible()) await page.locator('#coverClose').click();
  await openPicker(page);
  assert.equal(await item(page, 'Clips/preview.mp4').getAttribute('aria-pressed'), 'true');
  await page.locator('#coverClose').click(); await page.locator('#coverClear').click();
  assert.equal(await page.locator('#editCover').inputValue(), '');
  assert.equal(await page.locator('#coverSelected img,#coverSelected video').count(), 0);
  assert.equal(await page.locator('#editCover').isVisible(), true, 'the existing manual path field remains available');
  await page.locator('#editCover').fill('https://example.invalid/custom-cover.png');
  await applyAndSave(page);
  assert.equal(mock.metadata['Root.md'].cover, 'https://example.invalid/custom-cover.png');
  assert.deepEqual(errors, []);
});

test('a slower old search cannot overwrite a newer cover result', async t => {
  const { page, mock, errors } = await setup(t);
  await openPicker(page); await changeFilter(page, 'coverScope', 'all'); mock.holdQuery = 'Slow';
  const slowRequest = page.waitForRequest(request => { const url = new URL(request.url()); return url.pathname === '/api/cover-media' && url.searchParams.get('q') === 'Slow'; });
  await page.locator('#coverSearch').fill('Slow'); const pendingRequest = await slowRequest;
  await search(page, 'Fast');
  assert.deepEqual(await coverPaths(page), ['Search/Fast.png']);
  mock.pending.find(item => item.q === 'slow').release(); await (await pendingRequest.response())?.finished(); await paint(page);
  assert.deepEqual(await coverPaths(page), ['Search/Fast.png']);
  assert.deepEqual(errors, []);
});

test('closing the cover picker and changing articles prevents an old media response from reopening or populating it', async t => {
  const { page, mock, errors } = await setup(t); mock.holdNote = 'Root.md';
  const oldRequest = page.waitForRequest(request => { const url = new URL(request.url()); return url.pathname === '/api/cover-media' && url.searchParams.get('note') === 'Root.md'; });
  await page.locator('#coverBrowse').click(); const pendingRequest = await oldRequest;
  await page.locator('#coverClose').click(); await page.locator('#noteMetaClose').click();
  await edit(page, 'Other.md'); mock.holdNote = null; await openPicker(page);
  assert.deepEqual(await coverPaths(page), ['Other/Images/封面.png']);
  mock.pending.find(item => item.note === 'Root.md').release(); await (await pendingRequest.response())?.finished(); await paint(page);
  assert.deepEqual(await coverPaths(page), ['Other/Images/封面.png']);
  await page.locator('#coverClose').click(); assert.equal(await page.locator('#coverPicker').isVisible(), false);
  assert.equal(await page.locator('#editCover').inputValue(), fixtures[1].sourceMetadata.cover);
  assert.deepEqual(errors, []);
});

test('cover selection retains another pending field and the gallery fits a 390px dark layout', async t => {
  const { page, mock, errors } = await setup(t, { viewport: { width: 390, height: 844 } });
  await page.locator('#editTitle').fill('Unapplied title'); await openPicker(page);
  await changeFilter(page, 'coverType', 'image');
  assert.equal(await page.locator('#editTitle').inputValue(), 'Unapplied title');
  assert.equal(await page.locator('#save').isDisabled(), true);
  const visual = await page.evaluate(() => ({ overflow: document.documentElement.scrollWidth > innerWidth, scheme: getComputedStyle(document.documentElement).colorScheme }));
  assert.equal(visual.overflow, false); assert.equal(visual.scheme, 'dark');
  if (process.env.PUBLISHER_UI_SCREENSHOT_DIR) {
    const directory = path.resolve(process.env.PUBLISHER_UI_SCREENSHOT_DIR); await fs.mkdir(directory, { recursive: true });
    await page.locator('#coverPicker').evaluate(element => element.scrollIntoView({ block: 'start' }));
    await page.screenshot({ path: path.join(directory, 'publisher-cover-mobile.png') });
  }
  await item(page, 'Notes/Images/封面.png').click(); await applyAndSave(page);
  assert.equal(mock.metadata['Root.md'].title, 'Unapplied title');
  assert.deepEqual(errors, []);
});
