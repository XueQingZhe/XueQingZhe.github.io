import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import { once } from 'node:events';
import { chromium } from 'playwright';

const sections = [{ value: 'notes', label: '渲染手记' }, { value: 'tutorials', label: '学习系列' }, { value: 'work', label: '作品与实践' }];
const fixtureCatalog = {
  tags: [{ value: 'Inherited', label: 'Inherited', count: 3 }, { value: 'Computer Graphics', label: 'Computer Graphics', count: 2 }, { value: 'Site Only Tag', label: 'Site Only Tag', count: 7 }],
  categories: [
    { value: 'Rendering Notes', label: 'Rendering Notes', section: 'notes', count: 2 },
    { value: 'Personal', label: 'Personal', section: 'notes', count: 1 },
    { value: 'Site Only Category', label: 'Site Only Category', section: 'notes', count: 6 },
    { value: 'Linear Algebra', label: 'Linear Algebra', section: 'tutorials', count: 5 },
    { value: 'Procedural Art', label: 'Procedural Art', section: 'work', count: 4 },
  ],
  series: [
    { value: 'Field Notes', label: 'Field Notes', section: 'notes', count: 2 },
    { value: 'Site Only Series', label: 'Site Only Series', section: 'notes', count: 8 },
    { value: 'Site Only Series', label: 'Site Only Series', section: 'tutorials', count: 8 },
    { value: 'Graphics Foundations', label: 'Graphics Foundations', section: 'tutorials', count: 4 },
    { value: 'Water Studies', label: 'Water Studies', section: 'work', count: 1 },
  ],
  engine: [{ value: 'Unreal Engine', label: 'Unreal Engine', count: 3 }],
  role: [{ value: 'Technical Art', label: 'Technical Art', count: 3 }],
};
const fixtures = [
  ['Root.md', 'Root article', 'notes', 'Rendering Notes', 'Field Notes'],
  ['Other.md', 'Other article', 'notes', 'Rendering Notes', 'Field Notes'],
  ['Hidden.md', 'Hidden note', 'notes', 'Personal', ''],
  ['Tutorial.md', 'Learning journal', 'tutorials', 'Linear Algebra', 'Graphics Foundations'],
].map(([file, title, section, category, series]) => ({
  path: file, id: file, title, blocked: false, status: '未生成', sourceYearExplicit: false,
  sourceMetadata: { title, section, category, series, date: '2026-09-20', summary: 'Synthetic article summary', tags: ['Inherited', 'Computer Graphics'], order: 100, cover: '', engine: [], role: [], year: 2026, featured: false },
}));

async function setup(t, { selected = [], viewport } = {}) {
  const [html, css] = await Promise.all([
    fs.readFile(new URL('./index.html', import.meta.url), 'utf8'),
    fs.readFile(new URL('./publisher.css', import.meta.url), 'utf8'),
  ]);
  const source = html.replace('__TOKEN__', 'a'.repeat(64)).replace('__PREVIEW_URL__', 'http://127.0.0.1:4325/');
  const mock = { notes: structuredClone(fixtures), catalog: structuredClone(fixtureCatalog), metadata: {}, selected: [...selected], calls: [] };
  const currentNotes = () => mock.notes.map(note => {
    const metadataOverride = mock.metadata[note.path] || {}, metadata = { ...note.sourceMetadata, ...metadataOverride };
    return { ...note, title: metadata.title, metadata, metadataOverride };
  });
  const server = http.createServer(async (req, res) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    const send = (value, status = 200) => { res.writeHead(status); res.end(JSON.stringify(value)); };
    if (req.url === '/') { res.setHeader('Content-Type', 'text/html; charset=utf-8'); return res.end(source); }
    if (req.url === '/publisher.css') { res.setHeader('Content-Type', 'text/css; charset=utf-8'); return res.end(css); }
    if (req.url === '/favicon.ico') { res.writeHead(204); return res.end(); }
    let raw = ''; for await (const chunk of req) raw += chunk;
    const data = JSON.parse(raw || '{}'); mock.calls.push({ url: req.url, data });
    if (req.url === '/api/deploy/status') return send({ busy: false, phase: 'idle', message: '尚无发布任务。' });
    if (req.url === '/api/scan') return send({ notes: currentNotes(), selected: mock.selected, metadata: mock.metadata, catalog: mock.catalog, sections, assets: {}, ffmpeg: false, missingSelected: [] });
    if (req.url === '/api/select') {
      mock.selected = [...data.selected];
      for (const [file, value] of Object.entries(data.metadata || {})) {
        if (value === null) delete mock.metadata[file]; else mock.metadata[file] = structuredClone(value);
      }
      return send({ ok: true });
    }
    if (req.url === '/api/catalog') {
      const group = { tag: 'tags', category: 'categories', series: 'series' }[data.kind];
      if (!group || !data.value?.trim()) return send({ error: '名称不能为空' }, 400);
      const value = data.value.trim();
      const existing = mock.catalog[group].find(item => item.value === value && (data.kind === 'tag' || item.section === data.section));
      if (!existing) mock.catalog[group].push({ value, label: value, count: 0, ...(data.kind === 'tag' ? {} : { section: data.section }) });
      return send({ catalog: mock.catalog });
    }
    if (req.url === '/api/analyze') return send({ id: 'plan', assets: [], assetModes: {}, metadata: mock.metadata, catalog: mock.catalog, scannedNotes: currentNotes(), selected: mock.selected, errors: [], warnings: [], changes: { added: mock.selected, updated: [], removed: [] } });
    return send({ error: 'Unexpected request: ' + req.url }, 404);
  });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  let browser;
  t.after(async () => { await browser?.close(); server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); });
  browser = await chromium.launch({ headless: true, ...(process.env.PUBLISHER_TEST_BROWSER ? { channel: process.env.PUBLISHER_TEST_BROWSER } : {}) });
  const page = await browser.newPage({ reducedMotion: 'reduce', ...(viewport ? { viewport } : {}) });
  page.setDefaultTimeout(6000);
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto(`http://127.0.0.1:${server.address().port}/`); await settled(page);
  await page.locator('#vaultPanel > summary').click();
  return { page, mock, errors };
}

async function settled(page) { await page.waitForFunction(() => !document.querySelector('main').hasAttribute('aria-busy')); }
async function edit(page, file = 'Root.md') { await page.getByRole('button', { name: '编辑发布设置 ' + file, exact: true }).click(); if (!(await page.locator('#categoryAdvanced').evaluate(element => element.open))) await page.locator('#categoryAdvanced > summary').click(); }
async function applyAndSave(page) { await page.locator('#noteMetaApply').click(); await settled(page); }
const chosenTags = (page, prefix = 'edit') => page.locator('#' + prefix + 'Tags').inputValue().then(value => value.split(/[,，]/).map(item => item.trim()).filter(Boolean));
const apiCalls = (mock, route) => mock.calls.filter(call => call.url === '/api/' + route);
async function openBatch(page) { if (!(await page.locator('.batch-metadata').evaluate(element => element.open))) await page.locator('.batch-metadata summary').click(); }

test('publisher offers site-only tags, categories and series without requiring typed frontmatter names', async t => {
  const { page, mock, errors } = await setup(t);
  await edit(page);
  await page.locator('#editTagSearch').fill('Site Only');
  await page.locator('#noteEditor').getByRole('button', { name: '添加 Tag Site Only Tag', exact: true }).click();
  assert.deepEqual(await chosenTags(page), ['Inherited', 'Computer Graphics', 'Site Only Tag']);
  await page.locator('#editCategorySearch').fill('Site Only');
  await page.locator('#noteEditor').getByRole('button', { name: '选择内容分类 Site Only Category', exact: true }).click();
  assert.equal(await page.locator('#editCategory').inputValue(), 'Site Only Category');
  await applyAndSave(page);
  assert.deepEqual(mock.metadata['Root.md'], { tags: ['Inherited', 'Computer Graphics', 'Site Only Tag'], category: 'Site Only Category' });
  await edit(page, 'Tutorial.md');
  await page.locator('#editSeriesSearch').fill('Site Only');
  await page.locator('#noteEditor').getByRole('button', { name: '选择系列 Site Only Series', exact: true }).click();
  assert.equal(await page.locator('#editSeries').inputValue(), 'Site Only Series');
  assert.equal(apiCalls(mock, 'catalog').length, 0, 'choosing existing catalog values does not create duplicates');
  assert.equal(apiCalls(mock, 'select').length, 1, 'choosing the tutorial series does not save until explicitly requested');
  await applyAndSave(page);
  assert.deepEqual(mock.metadata['Tutorial.md'], { series: 'Site Only Series' });
  assert.deepEqual(errors, []);
});

test('new tags require explicit creation, select immediately and remain separate from applying note settings', async t => {
  const { page, mock, errors } = await setup(t);
  await edit(page); await page.locator('#editTagSearch').fill('My New Tag');
  assert.equal(apiCalls(mock, 'catalog').length, 0);
  assert.equal(apiCalls(mock, 'select').length, 0);
  await page.locator('#editTagCreate').click(); await settled(page);
  assert.deepEqual(apiCalls(mock, 'catalog').at(-1).data, { kind: 'tag', value: 'My New Tag' });
  assert.equal((await chosenTags(page)).includes('My New Tag'), true);
  assert.equal(apiCalls(mock, 'select').length, 0);
  await page.locator('#noteEditor').getByRole('button', { name: '移除 Tag Inherited', exact: true }).click();
  await applyAndSave(page);
  assert.deepEqual(mock.metadata['Root.md'].tags, ['Computer Graphics', 'My New Tag']);
  await page.locator('#rescan').click(); await settled(page); await edit(page, 'Other.md');
  await page.locator('#editTagSearch').fill('My New Tag');
  assert.equal(await page.locator('#noteEditor').getByRole('button', { name: '添加 Tag My New Tag', exact: true }).isVisible(), true, 'a new vocabulary item is available to another note');
  assert.equal(Object.keys(mock.metadata['Other.md'] || {}).length, 0);
  assert.deepEqual(errors, []);
});

test('created and existing tags preserve a leading hash as part of the exact catalog value', async t => {
  const { page, mock, errors } = await setup(t);
  mock.catalog.tags.push({ value: '#既有标签', label: '#既有标签', count: 3 });
  await page.locator('#rescan').click(); await settled(page); await edit(page);
  await page.locator('#editTagSearch').fill('#图形学');
  await page.locator('#editTagCreate').click(); await settled(page);
  assert.deepEqual(apiCalls(mock, 'catalog').at(-1).data, { kind: 'tag', value: '#图形学' });
  await page.locator('#editTagSearch').fill('#既有标签');
  await page.locator('#editTagsPicker').getByRole('button', { name: '添加 Tag #既有标签', exact: true }).click();
  assert.deepEqual(await chosenTags(page), ['Inherited', 'Computer Graphics', '#图形学', '#既有标签']);
  for (const value of ['#图形学', '#既有标签']) assert.equal(await page.locator('#editTagsPicker').getByRole('button', { name: '移除 Tag ' + value, exact: true }).isVisible(), true);
  await applyAndSave(page);
  assert.deepEqual(mock.metadata['Root.md'].tags, ['Inherited', 'Computer Graphics', '#图形学', '#既有标签']);
  await page.locator('#rescan').click(); await settled(page); await edit(page, 'Other.md');
  await page.locator('#editTagSearch').fill('#图形学');
  await page.locator('#editTagsPicker').getByRole('button', { name: '添加 Tag #图形学', exact: true }).click();
  assert.equal(apiCalls(mock, 'catalog').length, 1, 'reusing the exact created value must not create a second normalized tag');
  await applyAndSave(page);
  assert.deepEqual(mock.metadata['Other.md'].tags, ['Inherited', 'Computer Graphics', '#图形学']);
  assert.equal(mock.catalog.tags.some(item => item.value === '图形学' || item.value === '既有标签'), false);
  assert.deepEqual(errors, []);
});

test('categories and series are scoped to their parent section and can be explicitly created', async t => {
  const { page, mock, errors } = await setup(t);
  await edit(page);
  await page.locator('#editSection').selectOption('tutorials');
  assert.equal(await page.locator('#editCategory').inputValue(), '', 'switching parent sections clears the incompatible category');
  assert.equal(await page.locator('#editSeries').inputValue(), '', 'switching parent sections clears the incompatible series');
  assert.equal(await page.locator('#noteEditor').getByRole('button', { name: '选择内容分类 Site Only Category', exact: true }).count(), 0);
  await page.locator('#editCategorySearch').fill('Rendering Course'); await page.locator('#editCategoryCreate').click(); await settled(page);
  assert.deepEqual(apiCalls(mock, 'catalog').at(-1).data, { kind: 'category', value: 'Rendering Course', section: 'tutorials' });
  assert.equal(await page.locator('#editCategory').inputValue(), 'Rendering Course');
  await page.locator('#editSeriesSearch').fill('Practical Shaders'); await page.locator('#editSeriesCreate').click(); await settled(page);
  assert.deepEqual(apiCalls(mock, 'catalog').at(-1).data, { kind: 'series', value: 'Practical Shaders', section: 'tutorials' });
  assert.equal(await page.locator('#editSeries').inputValue(), 'Practical Shaders');
  assert.equal(apiCalls(mock, 'select').length, 0);
  await applyAndSave(page);
  assert.deepEqual(mock.metadata['Root.md'], { section: 'tutorials', category: 'Rendering Course', series: 'Practical Shaders' });
  assert.deepEqual(errors, []);
});

test('typing a search without choosing a result does not clear existing category, series or tags', async t => {
  const { page, mock, errors } = await setup(t);
  await edit(page, 'Tutorial.md');
  await page.locator('#editTagSearch').fill('unmatched tag');
  await page.locator('#editCategorySearch').fill('unmatched category');
  await page.locator('#editSeriesSearch').fill('unmatched series');
  await page.locator('#editSummary').fill('Only the summary changed');
  await applyAndSave(page);
  assert.deepEqual(mock.metadata['Tutorial.md'], { summary: 'Only the summary changed' });
  assert.equal(apiCalls(mock, 'catalog').length, 0);
  assert.deepEqual(errors, []);
});

test('an explicit no-category choice removes inherited grouping without exposing series on ordinary notes', async t => {
  const { page, mock, errors } = await setup(t);
  await edit(page);
  await page.locator('#editCategoryPicker').getByRole('button', { name: '不设内容分类', exact: true }).click();
  assert.equal(await page.locator('#editCategory').inputValue(), '');
  assert.equal(await page.locator('#seriesField').isVisible(), false);
  await applyAndSave(page);
  assert.deepEqual(mock.metadata['Root.md'], { category: '' });
  assert.deepEqual(errors, []);
});

test('batch tag choices affect only selected matching notes while preserving their untouched groupings', async t => {
  const { page, mock, errors } = await setup(t, { selected: ['Root.md', 'Hidden.md'] });
  await page.locator('#search').fill('article'); await openBatch(page);
  await page.locator('#batchTagSearch').fill('Site Only');
  await page.locator('.batch-metadata').getByRole('button', { name: '添加 Tag Site Only Tag', exact: true }).click();
  await page.locator('#batchMetadataApply').click(); await page.locator('#save').click(); await settled(page);
  assert.deepEqual(mock.metadata['Root.md'], { tags: ['Inherited', 'Computer Graphics', 'Site Only Tag'] });
  for (const file of ['Other.md', 'Hidden.md', 'Tutorial.md']) assert.equal(Object.keys(mock.metadata[file] || {}).length, 0, file + ' must not be touched');
  assert.equal(apiCalls(mock, 'catalog').length, 0);
  assert.deepEqual(errors, []);
});

test('batch grouping creation selects its explicit setting and applies only to matching selected notes', async t => {
  const { page, mock, errors } = await setup(t, { selected: ['Root.md', 'Hidden.md'] });
  await page.locator('#search').fill('article'); await openBatch(page);
  assert.equal(await page.locator('#batchSetCategory').isChecked(), false);
  assert.equal(await page.locator('#batchSetSeries').isChecked(), false);
  await page.locator('#batchCategorySearch').fill('Fresh notes group'); await page.locator('#batchCategoryCreate').click(); await settled(page);
  assert.equal(await page.locator('#batchSetCategory').isChecked(), true);
  assert.equal(await page.locator('#batchCategory').inputValue(), 'Fresh notes group');
  await page.locator('#batchSeriesSearch').fill('Fresh notes series'); await page.locator('#batchSeriesCreate').click(); await settled(page);
  assert.equal(await page.locator('#batchSetSeries').isChecked(), true);
  assert.equal(await page.locator('#batchSeries').inputValue(), 'Fresh notes series');
  assert.deepEqual(apiCalls(mock, 'catalog').map(call => call.data), [
    { kind: 'category', value: 'Fresh notes group', section: 'notes' },
    { kind: 'series', value: 'Fresh notes series', section: 'notes' },
  ]);
  assert.equal(apiCalls(mock, 'select').length, 0);
  await page.locator('#batchMetadataApply').click(); await page.locator('#save').click(); await settled(page);
  assert.deepEqual(mock.metadata['Root.md'], { category: 'Fresh notes group', series: 'Fresh notes series' });
  for (const file of ['Other.md', 'Hidden.md', 'Tutorial.md']) assert.equal(Object.keys(mock.metadata[file] || {}).length, 0);
  assert.deepEqual(errors, []);
});

test('mixed-entry bulk selections require a parent section before choosing scoped grouping', async t => {
  const { page, mock, errors } = await setup(t, { selected: ['Root.md', 'Tutorial.md'] });
  await openBatch(page);
  assert.equal(await page.locator('#batchCategorySearch').isDisabled(), true);
  assert.equal(await page.locator('#batchSeriesSearch').isDisabled(), true);
  await page.locator('#batchSection').selectOption('tutorials');
  assert.equal(await page.locator('#batchCategorySearch').isEnabled(), true);
  await page.locator('#batchCategoryPicker').getByRole('button', { name: '选择内容分类 Linear Algebra', exact: true }).click();
  await page.locator('#batchSeriesPicker').getByRole('button', { name: '选择系列 Graphics Foundations', exact: true }).click();
  assert.equal(await page.locator('#batchSetCategory').isChecked(), true);
  assert.equal(await page.locator('#batchSetSeries').isChecked(), true);
  await page.locator('#batchMetadataApply').click(); await page.locator('#save').click(); await settled(page);
  for (const file of ['Root.md', 'Tutorial.md']) {
    assert.equal(mock.metadata[file].section, 'tutorials');
    assert.equal(mock.metadata[file].category, 'Linear Algebra');
    assert.equal(mock.metadata[file].series, 'Graphics Foundations');
    assert.equal(Object.hasOwn(mock.metadata[file], 'tags'), false);
  }
  for (const file of ['Other.md', 'Hidden.md']) assert.equal(Object.keys(mock.metadata[file] || {}).length, 0);
  assert.deepEqual(errors, []);
});

test('changing the filtered implicit parent clears stale bulk grouping before applying to another section', async t => {
  const { page, mock, errors } = await setup(t, { selected: ['Root.md', 'Tutorial.md'] });
  await page.locator('#noteSection').selectOption('notes'); await openBatch(page);
  assert.equal(await page.locator('#batchSection').inputValue(), '', 'the parent is inferred from the selected filtered notes');
  await page.locator('#batchCategoryPicker').getByRole('button', { name: '选择内容分类 Site Only Category', exact: true }).click();
  await page.locator('#batchSeriesPicker').getByRole('button', { name: '选择系列 Site Only Series', exact: true }).click();
  assert.equal(await page.locator('#batchSetCategory').isChecked(), true);
  assert.equal(await page.locator('#batchSetSeries').isChecked(), true);
  await page.locator('#noteSection').selectOption('tutorials');
  for (const field of ['Category', 'Series']) {
    assert.equal(await page.locator('#batch' + field).inputValue(), '', 'a notes ' + field + ' must not carry into tutorials');
    assert.equal(await page.locator('#batchSet' + field).isChecked(), false);
    assert.equal(await page.locator('#batchSet' + field).isEnabled(), true, 'a single new inferred parent may choose its own grouping');
  }
  await page.locator('#batchTagsPicker').getByRole('button', { name: '添加 Tag Site Only Tag', exact: true }).click();
  await page.locator('#batchMetadataApply').click(); await page.locator('#save').click(); await settled(page);
  assert.deepEqual(mock.metadata['Tutorial.md'], { tags: ['Inherited', 'Computer Graphics', 'Site Only Tag'] }, 'applying another bulk field must preserve the tutorial source category and series');
  assert.equal(Object.keys(mock.metadata['Root.md'] || {}).length, 0);
  await page.locator('#noteSection').selectOption('notes');
  for (const field of ['Category', 'Series']) {
    assert.equal(await page.locator('#batch' + field).inputValue(), '', 'returning to the original scope does not revive a discarded choice');
    assert.equal(await page.locator('#batchSet' + field).isChecked(), false);
  }
  assert.deepEqual(errors, []);
});

test('adding a differently scoped selection clears bulk grouping and disables its switches until the scope is unambiguous', async t => {
  const { page, mock, errors } = await setup(t, { selected: ['Root.md'] });
  await openBatch(page);
  await page.locator('#batchCategoryPicker').getByRole('button', { name: '选择内容分类 Site Only Category', exact: true }).click();
  await page.locator('#batchSeriesPicker').getByRole('button', { name: '选择系列 Site Only Series', exact: true }).click();
  await page.getByLabel('选择 Learning journal', { exact: true }).check();
  assert.equal(await page.locator('#batchSection').inputValue(), '');
  for (const field of ['Category', 'Series']) {
    assert.equal(await page.locator('#batch' + field).inputValue(), '');
    assert.equal(await page.locator('#batchSet' + field).isChecked(), false);
    assert.equal(await page.locator('#batchSet' + field).isDisabled(), true, 'mixed sections must not be able to reactivate a stale ' + field);
    assert.equal(await page.locator('#batch' + field + 'Search').isDisabled(), true);
  }
  await page.locator('#batchTagsPicker').getByRole('button', { name: '添加 Tag Site Only Tag', exact: true }).click();
  await page.locator('#batchMetadataApply').click(); await page.locator('#save').click(); await settled(page);
  for (const file of ['Root.md', 'Tutorial.md']) assert.deepEqual(mock.metadata[file], { tags: ['Inherited', 'Computer Graphics', 'Site Only Tag'] }, 'a cross-section tag update must preserve each source grouping');
  await page.getByLabel('选择 Root article', { exact: true }).uncheck();
  for (const field of ['Category', 'Series']) {
    assert.equal(await page.locator('#batch' + field).inputValue(), '');
    assert.equal(await page.locator('#batchSet' + field).isChecked(), false);
    assert.equal(await page.locator('#batchSet' + field).isEnabled(), true);
  }
  assert.equal(await page.locator('#batchCategoryPicker').getByRole('button', { name: '选择内容分类 Linear Algebra', exact: true }).isVisible(), true);
  assert.equal(await page.locator('#batchSeriesPicker').getByRole('button', { name: '选择系列 Graphics Foundations', exact: true }).isVisible(), true);
  assert.deepEqual(errors, []);
});

test('category filtering uses the catalog and stays within the chosen parent section', async t => {
  const { page, errors } = await setup(t);
  await page.locator('#noteSection').selectOption('notes');
  const noteOptions = await page.locator('#noteCategory option').evaluateAll(options => options.map(option => option.value));
  assert.equal(noteOptions.includes(JSON.stringify(['notes', 'Site Only Category'])), true, 'site-only categories remain discoverable even without local notes');
  assert.equal(noteOptions.includes(JSON.stringify(['tutorials', 'Linear Algebra'])), false);
  await page.locator('#noteCategory').selectOption(JSON.stringify(['notes', 'Rendering Notes']));
  assert.deepEqual(await page.locator('#notes .note').evaluateAll(rows => rows.map(row => row.dataset.path).sort()), ['Other.md', 'Root.md']);
  await page.locator('#noteSection').selectOption('tutorials');
  assert.equal(await page.locator('#noteCategory').inputValue(), '', 'switching entry clears an incompatible category filter');
  await page.locator('#noteCategory').selectOption(JSON.stringify(['tutorials', 'Linear Algebra']));
  assert.deepEqual(await page.locator('#notes .note').evaluateAll(rows => rows.map(row => row.dataset.path)), ['Tutorial.md']);
  assert.deepEqual(errors, []);
});

test('picker controls fit a 390px viewport and retain the dark theme', async t => {
  const { page, errors } = await setup(t, { viewport: { width: 390, height: 844 } });
  await edit(page); await page.locator('#editTagSearch').fill('Site');
  await page.locator('#noteEditor').getByRole('button', { name: '添加 Tag Site Only Tag', exact: true }).click();
  const visual = await page.evaluate(() => ({ overflow: document.documentElement.scrollWidth > innerWidth, scheme: getComputedStyle(document.documentElement).colorScheme }));
  assert.equal(visual.overflow, false);
  assert.equal(visual.scheme, 'dark');
  if (process.env.PUBLISHER_UI_SCREENSHOT_DIR) {
    const directory = path.resolve(process.env.PUBLISHER_UI_SCREENSHOT_DIR); await fs.mkdir(directory, { recursive: true });
    await page.locator('#noteEditor').evaluate(element => element.scrollIntoView({ block: 'start' }));
    await page.screenshot({ path: path.join(directory, 'publisher-catalog-mobile.png'), fullPage: true });
    await page.setViewportSize({ width: 1440, height: 1100 });
    await page.locator('#noteEditor').evaluate(element => element.scrollIntoView({ block: 'start' }));
    await page.screenshot({ path: path.join(directory, 'publisher-catalog-desktop.png') });
  }
  assert.deepEqual(errors, []);
});
