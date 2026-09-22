import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import { once } from 'node:events';
import { chromium } from 'playwright';

const sections = [{ value: 'notes', label: '渲染手记' }, { value: 'tutorials', label: '学习系列' }, { value: 'work', label: '作品与实践' }];
const fixture = [
  ['Root.md', 'root', 'Root note'],
  ['Study/Overview.md', 'overview', 'Study overview'],
  ['Study/Math/Algebra.md', 'algebra', 'Algebra'],
  ['Study/Math/Advanced/Spaces.md', 'spaces', 'Vector spaces'],
  ['Study/Math/Blocked.md', 'blocked', 'Private note', true],
  ['Study/Art/Color.md', 'color', 'Color theory'],
  ['Projects/Water.md', 'water', 'Water garden'],
].map(([file, id, title, blocked = false]) => ({
  path: file, id, title, blocked, candidate: id === 'spaces', status: '未生成',
  ...(blocked ? { error: '此笔记声明为私有' } : {}),
  sourceMetadata: { section: 'notes', title, date: '2026-09-20', summary: 'Source summary', tags: ['Inherited', 'Computer Graphics'], series: '', order: 100, cover: '', engine: [], role: [], year: 2026, featured: false },
}));

async function setup(t, { selected = [], viewport, assets = [], omittedScanFields = [] } = {}) {
  const [html, css] = await Promise.all([
    fs.readFile(new URL('./index.html', import.meta.url), 'utf8'),
    fs.readFile(new URL('./publisher.css', import.meta.url), 'utf8'),
  ]);
  const source = html.replace('__TOKEN__', 'a'.repeat(64)).replace('__PREVIEW_URL__', 'http://127.0.0.1:4325/');
  const mock = { catalog: structuredClone(fixture), selected: [...selected], metadata: {}, calls: [], plans: 0 };
  const currentNotes = () => mock.catalog.map(note => {
    const metadataOverride = mock.metadata[note.path] || {};
    const metadata = { ...note.sourceMetadata, ...metadataOverride };
    return { ...note, title: metadata.title, metadata, metadataOverride };
  });
  const server = http.createServer(async (req, res) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    const send = (value, status = 200) => { res.writeHead(status); res.end(JSON.stringify(value)); };
    if (req.url === '/') { res.setHeader('Content-Type', 'text/html; charset=utf-8'); return res.end(source); }
    if (req.url === '/publisher.css') { res.setHeader('Content-Type', 'text/css; charset=utf-8'); return res.end(css); }
    if (req.url === '/favicon.ico') { res.writeHead(204); return res.end(); }
    let raw = ''; for await (const chunk of req) raw += chunk;
    const data = JSON.parse(raw || '{}'); mock.calls.push({ url: req.url, method: req.method, data });
    if (req.url === '/api/deploy/status') return send({ busy: false, phase: 'idle', message: '尚无发布任务。' });
    if (req.url === '/api/deploy/review') return send({ id: 'deployment', canPublish: true, repository: 'example/site', branch: 'main', changes: [{ status: 'M', path: 'content/published/synthetic.md' }], commits: [], blockers: [] });
    if (req.url === '/api/scan') {
      const result = { notes: currentNotes(), selected: mock.selected, assets: {}, metadata: mock.metadata, sections, missingSelected: [], ffmpeg: false };
      for (const field of omittedScanFields) delete result[field];
      return send(result);
    }
    if (req.url === '/api/select') {
      mock.selected = [...data.selected];
      for (const [file, override] of Object.entries(data.metadata || {})) {
        if (override === null) delete mock.metadata[file]; else mock.metadata[file] = structuredClone(override);
      }
      return send({ ok: true });
    }
    if (req.url === '/api/analyze') return send({ id: 'plan-' + ++mock.plans, assets, assetModes: {}, errors: [], warnings: [], changes: { added: mock.selected.map(file => currentNotes().find(note => note.path === file)?.title || file), updated: [], removed: [] } });
    if (req.url === '/api/prepare') return send({ id: 'stage', notes: [{ title: 'Synthetic preview', slug: 'synthetic' }], assets: [], changes: { removed: [] } });
    if (req.url.startsWith('/api/stage?')) return send({ markdown: '# Synthetic public preview' });
    return send({ error: 'Unexpected mock request: ' + req.url }, 404);
  });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  let browser;
  t.after(async () => { await browser?.close(); server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); });
  browser = await chromium.launch({ headless: true, ...(process.env.PUBLISHER_TEST_BROWSER ? { channel: process.env.PUBLISHER_TEST_BROWSER } : {}) });
  const page = await browser.newPage({ reducedMotion: 'reduce', ...(viewport ? { viewport } : {}) });
  page.setDefaultTimeout(6000);
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto(`http://127.0.0.1:${server.address().port}/`); await settled(page);
  return { page, mock, errors };
}

async function settled(page) { await page.waitForFunction(() => !document.querySelector('main').hasAttribute('aria-busy')); }
const noteCheck = (page, title) => page.getByLabel('选择 ' + title, { exact: true });
const folderCheck = (page, folder) => page.getByLabel('选择目录 ' + folder, { exact: true });
const editButton = (page, file) => page.getByRole('button', { name: '编辑发布设置 ' + file, exact: true });
const lastSave = mock => mock.calls.filter(call => call.url === '/api/select').at(-1)?.data;
async function save(page) { await page.locator('#save').click(); await settled(page); }
async function expand(page, folder) {
  const segments = folder.split('/');
  for (let length = 1; length <= segments.length; length++) {
    const button = page.getByRole('button', { name: '展开目录 ' + segments.slice(0, length).join('/'), exact: true });
    if (await button.isVisible()) await button.click();
  }
}
async function edit(page, file) {
  if (file.includes('/')) await expand(page, file.slice(0, file.lastIndexOf('/')));
  await editButton(page, file).click(); await page.locator('#noteEditor').waitFor({ state: 'visible' });
}
async function closeEditor(page) { if (await page.locator('#noteEditor').isVisible()) await page.locator('#noteMetaClose').click(); }
async function openBatch(page) { if (!(await page.locator('.batch-metadata').evaluate(element => element.open))) await page.locator('.batch-metadata summary').click(); }

test('nested directory tree preserves hierarchy, tri-state selection and private-note exclusion', async t => {
  const { page, mock, errors } = await setup(t);
  assert.deepEqual(await page.locator('#folder option').evaluateAll(options => options.map(option => option.value)).then(values => values.filter(Boolean).sort()), ['__root__', 'Projects', 'Study', 'Study/Art', 'Study/Math', 'Study/Math/Advanced'].sort());
  assert.equal(await noteCheck(page, 'Root note').isVisible(), true);
  assert.equal(await noteCheck(page, 'Vector spaces').isVisible(), false, 'deep files are collapsed until the directory opens');
  await expand(page, 'Study/Math/Advanced');
  assert.equal(await noteCheck(page, 'Vector spaces').isVisible(), true);
  assert.equal(await noteCheck(page, 'Private note').isDisabled(), true);
  await noteCheck(page, 'Algebra').check();
  assert.equal(await folderCheck(page, 'Study').evaluate(input => input.indeterminate), true);
  assert.equal(await folderCheck(page, 'Study/Math').evaluate(input => input.indeterminate), true);
  await folderCheck(page, 'Study').check();
  assert.equal(await folderCheck(page, 'Study').isChecked(), true);
  assert.equal(await folderCheck(page, 'Study').evaluate(input => input.indeterminate), false);
  await save(page);
  assert.deepEqual([...mock.selected].sort(), ['Study/Overview.md', 'Study/Math/Algebra.md', 'Study/Math/Advanced/Spaces.md', 'Study/Art/Color.md'].sort(), 'directory selection skips a blocked unselected note');
  await folderCheck(page, 'Study').uncheck(); await save(page);
  assert.deepEqual(mock.selected, []);
  await page.locator('#search').fill('Vector spaces');
  assert.equal(await noteCheck(page, 'Vector spaces').isVisible(), true, 'search opens all ancestor directories');
  await folderCheck(page, 'Study').check(); await save(page);
  assert.deepEqual(mock.selected, ['Study/Math/Advanced/Spaces.md'], 'selecting a directory respects the active search');
  await page.locator('#search').fill('');
  assert.equal(await noteCheck(page, 'Root note').isChecked(), false);
  assert.deepEqual(errors, []);
});

test('full-path folder filters distinguish direct children, descendants, and root notes', async t => {
  const { page, mock, errors } = await setup(t);
  assert.equal(await page.locator('#includeSubfolders').isChecked(), true);
  await page.locator('#folder').selectOption('Study/Math'); await expand(page, 'Study/Math/Advanced');
  await page.locator('#selectVisible').click(); await save(page);
  assert.deepEqual([...mock.selected].sort(), ['Study/Math/Algebra.md', 'Study/Math/Advanced/Spaces.md'].sort());
  await page.locator('#clearVisible').click();
  await page.locator('#includeSubfolders').uncheck();
  await page.locator('#selectVisible').click(); await save(page);
  assert.deepEqual(mock.selected, ['Study/Math/Algebra.md']);
  assert.equal(await noteCheck(page, 'Vector spaces').isVisible(), false);
  await page.locator('#folder').selectOption('__root__');
  assert.equal(await page.locator('#notes .note:visible').count(), 1);
  assert.equal(await noteCheck(page, 'Root note').isVisible(), true);
  await page.locator('#selectVisible').click(); await save(page);
  assert.deepEqual([...mock.selected].sort(), ['Root.md', 'Study/Math/Algebra.md'].sort());
  await page.locator('#folder').selectOption(''); await page.locator('#candidate').check();
  await expand(page, 'Study/Math/Advanced');
  assert.equal(await noteCheck(page, 'Vector spaces').isVisible(), true);
  assert.equal(await page.locator('#notes .note:visible').count(), 1);
  assert.deepEqual(errors, []);
});

test('per-note publish metadata supports sections, spaced tags, local changes and restoring source properties', async t => {
  const { page, mock, errors } = await setup(t);
  await edit(page, 'Root.md');
  assert.equal(await page.locator('#editTitle').inputValue(), 'Root note');
  assert.equal(await page.locator('#editTags').inputValue(), 'Inherited, Computer Graphics');
  await page.locator('#editSection').selectOption('tutorials');
  await page.locator('#editTitle').fill('Matrix tutorial');
  await page.locator('#editSummary').fill('A readable public summary');
  await page.locator('#editDate').fill('2026-09-22');
  await page.locator('#editTags').fill('Linear Algebra, WebGL, Linear Algebra，Computer Graphics');
  await page.locator('#editSeries').fill('Rendering basics'); await page.locator('#editOrder').fill('2');
  for (const id of ['save', 'analyze', 'rescan']) assert.equal(await page.locator('#' + id).isDisabled(), true, 'an uncommitted editor draft must not be discarded');
  await page.locator('#noteMetaApply').click();
  assert.equal(mock.calls.filter(call => call.url === '/api/select').length, 0, 'applying the editor only changes pending local settings');
  await save(page);
  assert.deepEqual(lastSave(mock).metadata['Root.md'], {
    section: 'tutorials', title: 'Matrix tutorial', summary: 'A readable public summary', date: '2026-09-22', tags: ['Linear Algebra', 'WebGL', 'Computer Graphics'], series: 'Rendering basics', order: 2,
  });
  await page.locator('#rescan').click(); await settled(page);
  await edit(page, 'Root.md');
  assert.equal(await page.locator('#editSection').inputValue(), 'tutorials');
  assert.equal(await page.locator('#editTitle').inputValue(), 'Matrix tutorial');
  await page.locator('#noteMetaReset').click(); await save(page);
  assert.equal(lastSave(mock).metadata['Root.md'], null, 'reset persists removal of the override');
  await edit(page, 'Root.md');
  assert.equal(await page.locator('#editTitle').inputValue(), 'Root note');
  assert.equal(await page.locator('#editSection').inputValue(), 'notes');
  assert.equal(await page.locator('#editTags').inputValue(), 'Inherited, Computer Graphics');
  await closeEditor(page);
  assert.deepEqual(errors, []);
});

test('work metadata fields save typed values and all three sections are available', async t => {
  const { page, mock, errors } = await setup(t);
  await edit(page, 'Projects/Water.md');
  assert.deepEqual(await page.locator('#editSection option').evaluateAll(options => options.map(option => option.value)), ['notes', 'tutorials', 'work']);
  await page.locator('#editSection').selectOption('work');
  for (const id of ['editCover', 'editEngine', 'editRole', 'editYear', 'editFeatured']) assert.equal(await page.locator('#' + id).isVisible(), true);
  await page.locator('#editCover').fill('Assets/water.png');
  await page.locator('#editEngine').fill('Unreal Engine, WebGL');
  await page.locator('#editRole').fill('Technical Art, Rendering');
  await page.locator('#editYear').fill('2025'); await page.locator('#editFeatured').check();
  await page.locator('#noteMetaApply').click(); await save(page);
  assert.deepEqual(lastSave(mock).metadata['Projects/Water.md'], { section: 'work', cover: 'Assets/water.png', engine: ['Unreal Engine', 'WebGL'], role: ['Technical Art', 'Rendering'], year: 2025, featured: true });
  assert.deepEqual(errors, []);
});

test('bulk metadata affects only selected search results and preserves or removes inherited tags intentionally', async t => {
  const selected = ['Root.md', 'Study/Overview.md', 'Study/Math/Algebra.md', 'Study/Math/Advanced/Spaces.md'];
  const { page, mock, errors } = await setup(t, { selected });
  await page.locator('#folder').selectOption('Study/Math');
  await openBatch(page);
  await page.locator('#batchSection').selectOption('tutorials');
  await page.locator('#batchTags').fill('WebGL, Computer Graphics');
  await page.locator('#batchTagMode').selectOption('add');
  await page.locator('#batchSetSeries').check(); await page.locator('#batchSeries').fill('Math for graphics');
  await page.locator('#batchMetadataApply').click(); await save(page);
  for (const file of ['Study/Math/Algebra.md', 'Study/Math/Advanced/Spaces.md']) {
    assert.deepEqual(mock.metadata[file], { section: 'tutorials', tags: ['Inherited', 'Computer Graphics', 'WebGL'], series: 'Math for graphics' });
  }
  for (const file of ['Root.md', 'Study/Overview.md', 'Study/Math/Blocked.md', 'Study/Art/Color.md']) assert.equal(Object.keys(mock.metadata[file] || {}).length, 0, file + ' must remain untouched');
  await page.locator('#search').fill('Algebra');
  await page.locator('#batchSection').selectOption(''); await page.locator('#batchSetSeries').uncheck();
  await page.locator('#batchTagMode').selectOption('remove'); await page.locator('#batchTags').fill('Inherited');
  await page.locator('#batchMetadataApply').click(); await save(page);
  assert.deepEqual(mock.metadata['Study/Math/Algebra.md'].tags, ['Computer Graphics', 'WebGL']);
  assert.deepEqual(mock.metadata['Study/Math/Advanced/Spaces.md'].tags, ['Inherited', 'Computer Graphics', 'WebGL']);
  await page.locator('#batchTagMode').selectOption('replace'); await page.locator('#batchTags').fill('');
  await page.locator('#batchMetadataApply').click(); await save(page);
  assert.deepEqual(mock.metadata['Study/Math/Algebra.md'].tags, [], 'replace with an empty value deliberately clears tags');
  assert.deepEqual(errors, []);
});

test('rescan follows note identity after a move while retaining unsaved selections and metadata', async t => {
  const { page, mock, errors } = await setup(t);
  await noteCheck(page, 'Root note').check(); await edit(page, 'Root.md');
  await page.locator('#editTitle').fill('Pending renamed article');
  await page.locator('#editTags').fill('Pending, Computer Graphics');
  await page.locator('#noteMetaApply').click();
  mock.catalog[0].path = 'Imported/Renamed.md';
  await page.locator('#rescan').click(); await settled(page); await expand(page, 'Imported');
  assert.equal(await noteCheck(page, 'Pending renamed article').isChecked(), true);
  await edit(page, 'Imported/Renamed.md');
  assert.equal(await page.locator('#editTitle').inputValue(), 'Pending renamed article');
  assert.equal(await page.locator('#editTags').inputValue(), 'Pending, Computer Graphics');
  await closeEditor(page); await save(page);
  assert.deepEqual(mock.selected, ['Imported/Renamed.md']);
  assert.deepEqual(mock.metadata['Imported/Renamed.md'], { title: 'Pending renamed article', tags: ['Pending', 'Computer Graphics'] });
  assert.equal(Object.hasOwn(lastSave(mock).metadata, 'Root.md'), false, 'a removed old path must not poison a later save');
  assert.deepEqual(errors, []);
});

test('editing publication metadata invalidates an existing review and prepared stage', async t => {
  const { page, errors } = await setup(t, { selected: ['Root.md'] });
  await page.locator('#analyze').click(); await settled(page);
  assert.equal(await page.locator('#prepare').isEnabled(), true);
  await page.locator('#prepare').click(); await settled(page);
  assert.equal(await page.locator('#apply').isEnabled(), true);
  await edit(page, 'Root.md'); await page.locator('#editSection').selectOption('tutorials'); await page.locator('#noteMetaApply').click();
  assert.equal(await page.locator('#prepare').isDisabled(), true);
  assert.equal(await page.locator('#apply').isDisabled(), true);
  assert.equal(await page.locator('#staged').isVisible(), false);
  await page.locator('#analyze').click(); await settled(page);
  await openBatch(page);
  await page.locator('#batchTags').fill('Updated'); await page.locator('#batchMetadataApply').click();
  assert.equal(await page.locator('#prepare').isDisabled(), true, 'batch changes also invalidate the plan');
  assert.deepEqual(errors, []);
});

test('nested tree and complete publication editor fit a dark 390px layout', async t => {
  const { page, errors } = await setup(t, { viewport: { width: 390, height: 844 }, selected: ['Study/Math/Advanced/Spaces.md'] });
  await expand(page, 'Study/Math/Advanced'); await edit(page, 'Projects/Water.md');
  await page.locator('#editSection').selectOption('work');
  const visual = await page.evaluate(() => ({ overflow: document.documentElement.scrollWidth > innerWidth, scheme: getComputedStyle(document.documentElement).colorScheme }));
  assert.equal(visual.overflow, false, 'folder paths and metadata controls do not cause horizontal overflow');
  assert.equal(visual.scheme, 'dark');
  if (process.env.PUBLISHER_UI_SCREENSHOT_DIR) {
    const directory = path.resolve(process.env.PUBLISHER_UI_SCREENSHOT_DIR); await fs.mkdir(directory, { recursive: true });
    await page.locator('#noteEditor').evaluate(element => element.scrollIntoView({ block: 'start' }));
    await page.screenshot({ path: path.join(directory, 'publisher-tree-mobile.png') });
    await page.setViewportSize({ width: 1440, height: 1000 }); await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: path.join(directory, 'publisher-tree-desktop.png') });
  }
  assert.deepEqual(errors, []);
});

test('historical notes can edit tags without hidden work-year validation blocking their form', async t => {
  const { page, mock, errors } = await setup(t);
  Object.assign(mock.catalog[0].sourceMetadata, { date: '1980-06-01', year: 1980 });
  mock.catalog[0].sourceYearExplicit = false;
  await page.locator('#rescan').click(); await settled(page); await edit(page, 'Root.md');
  assert.equal(await page.locator('#editYear').inputValue(), '1980');
  for (const id of ['editCover', 'editEngine', 'editRole', 'editYear', 'editFeatured']) assert.equal(await page.locator('#' + id).isDisabled(), true);
  await page.locator('#editTags').fill('History, Personal Notes');
  await page.locator('#noteMetaApply').click();
  assert.equal(await page.locator('#save').isEnabled(), true, 'a notes form must apply even if its derived year is outside the work-only range');
  await save(page);
  assert.deepEqual(mock.metadata['Root.md'], { tags: ['History', 'Personal Notes'] });
  assert.deepEqual(errors, []);
});

test('changing a publication date updates an implicit work year while preserving explicit source years', async t => {
  const { page, mock, errors } = await setup(t);
  mock.catalog[0].sourceYearExplicit = false;
  mock.catalog[1].sourceYearExplicit = true;
  mock.catalog[1].sourceMetadata.year = 2022;
  await page.locator('#rescan').click(); await settled(page);
  await edit(page, 'Root.md'); await page.locator('#editDate').fill('2024-02-12');
  await page.locator('#noteMetaApply').click(); await page.locator('#editSection').selectOption('work');
  assert.equal(await page.locator('#editYear').inputValue(), '2024', 'implicit work years follow the newly applied publication date');
  await closeEditor(page); await save(page);
  assert.deepEqual(mock.metadata['Root.md'], { date: '2024-02-12' }, 'deriving the display year must not freeze it as an override');
  await edit(page, 'Study/Overview.md'); await page.locator('#editDate').fill('2024-02-12');
  await page.locator('#noteMetaApply').click(); await page.locator('#editSection').selectOption('work');
  assert.equal(await page.locator('#editYear').inputValue(), '2022', 'a source-specified work year is independent of the publication date');
  await closeEditor(page); await save(page);
  assert.deepEqual(mock.metadata['Study/Overview.md'], { date: '2024-02-12' });
  assert.deepEqual(errors, []);
});

test('an unapplied note draft blocks deployment confirmation and attachment actions that could replace the draft', async t => {
  const assets = [{ path: 'Assets/diagram.png', sources: ['Assets/diagram.png'], referencedBy: ['Root note'], ext: '.png', bytes: 2e6, digest: 'diagram', key: 'diagram:original', mode: 'original' }];
  const { page, mock, errors } = await setup(t, { selected: ['Root.md'], assets });
  await page.locator('#publishReview').click(); await settled(page);
  assert.equal(await page.locator('#deployConfirm').isEnabled(), true);
  await edit(page, 'Root.md'); await page.locator('#editTitle').fill('Unapplied deployment draft');
  assert.equal(await page.locator('#deployConfirm').isDisabled(), true, 'a ready deployment cannot ignore pending note edits');
  await closeEditor(page);
  await page.locator('#analyze').click(); await settled(page);
  await edit(page, 'Root.md'); await page.locator('#editTitle').fill('Keep this unpublished draft');
  for (const id of ['assetApplyMode', 'assetApprove', 'assetUnapprove']) assert.equal(await page.locator('#' + id).isDisabled(), true);
  for (const control of await page.locator('#assetList button,#assetList select,#assetList input').all()) assert.equal(await control.isDisabled(), true);
  await page.locator('#assetType').selectOption('.png');
  await page.locator('#assetReset').click();
  await page.locator('#assetLargeImages').click();
  assert.equal(await page.locator('#assetApplyMode').isDisabled(), true, 'rerendering the attachment controls must preserve the editor lock');
  assert.equal(await page.getByLabel('压缩策略 Assets/diagram.png', { exact: true }).isDisabled(), true);
  assert.equal(await page.locator('#editTitle').inputValue(), 'Keep this unpublished draft');
  assert.equal(mock.plans, 1, 'filtering attachments must not save settings or trigger a new analysis');
  await closeEditor(page);
  assert.equal(await page.locator('#assetApplyMode').isEnabled(), true);
  assert.deepEqual(errors, []);
});

test('an older local API cannot silently discard section and tag settings', async t => {
  for (const field of ['sections', 'metadata']) await t.test('missing ' + field, async child => {
    const { page, mock, errors } = await setup(child, { omittedScanFields: [field] });
    assert.match(await page.locator('#message').innerText(), /旧版发布服务/);
    assert.match(await page.locator('#message').innerText(), /重新双击 F:\\MyWeb\\文章发布管理器\.cmd/);
    for (const id of ['save', 'analyze', 'prepare', 'publishReview']) assert.equal(await page.locator('#' + id).isDisabled(), true, id + ' must remain blocked with an incompatible server');
    assert.equal(await page.locator('#notes .note').count(), 0, 'incompatible scan results are not offered for editing');
    assert.equal(mock.calls.some(call => call.url === '/api/select'), false);
    assert.deepEqual(errors, []);
  });
});
