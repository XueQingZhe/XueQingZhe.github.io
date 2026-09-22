import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import { once } from 'node:events';
import { chromium } from 'playwright';

const sections = [{ value: 'notes', label: '渲染手记' }, { value: 'tutorials', label: '学习系列' }, { value: 'work', label: '作品与实践' }];
const catalog = { tags: [], categories: [], series: [], engine: [], role: [] };
const sourceMetadata = { title: 'Local article', section: 'notes', category: '', date: '2026-09-20', summary: 'Synthetic local article', tags: [], series: '', order: 100, cover: '', engine: [], role: [], year: 2026, featured: false };
const articleFixtures = [
  { key: 'notes:shader-basics', id: 'shader-basics', title: 'Shader basics', url: '/blog/shader-basics/', section: 'notes', metadata: { ...sourceMetadata, title: 'Shader basics', tags: ['Shader'] }, notes: [], work: [] },
  { key: 'notes:ue-materials', id: 'ue-materials', title: 'UE material expressions', url: '/blog/ue-materials/', section: 'notes', metadata: { ...sourceMetadata, title: 'UE material expressions', tags: ['UE'] }, notes: [], work: [] },
  { key: 'notes:ue-lighting', id: 'ue-lighting', title: 'UE lighting study', url: '/blog/ue-lighting/', section: 'notes', metadata: { ...sourceMetadata, title: 'UE lighting study', tags: ['UE'] }, notes: [], work: [] },
  { key: 'tutorials:shader-basics', id: 'shader-basics', title: 'Shader learning series', url: '/tutorials/shader-basics/', section: 'tutorials', metadata: { ...sourceMetadata, title: 'Shader learning series', section: 'tutorials', tags: ['Learning'] }, notes: [], work: [] },
  { key: 'work:water-study', id: 'water-study', title: 'Water study', url: '/work/water-study/', section: 'work', metadata: { ...sourceMetadata, title: 'Water study', section: 'work', summary: 'Synthetic water project', cover: 'https://example.invalid/water.png' }, notes: ['notes:shader-basics'], work: [] },
  { key: 'work:ue5-per-material', id: 'ue5-per-material', title: 'UE 材质专题', url: '/work/ue5-per-material/', section: 'work', metadata: { ...sourceMetadata, title: 'UE 材质专题', section: 'work', summary: 'Three existing site articles', cover: 'https://example.invalid/ue.png' }, notes: ['notes:shader-basics', 'notes:ue-materials', 'notes:ue-lighting'], work: [] },
].map(item => ({ ...item, collection: item.key.split(':')[0], linkable: true, active: true }));
const topicFixtures = [{ key: 'ue5-per-material', title: 'UE 材质专题', summary: 'Three existing site articles', notes: ['notes:shader-basics', 'notes:ue-materials', 'notes:ue-lighting'], url: '/work/ue5-per-material/' }];

async function setup(t, { selected = [], viewport } = {}) {
  const [html, css] = await Promise.all([
    fs.readFile(new URL('./index.html', import.meta.url), 'utf8'),
    fs.readFile(new URL('./publisher.css', import.meta.url), 'utf8'),
  ]);
  const source = html.replace('__TOKEN__', 'a'.repeat(64)).replace('__PREVIEW_URL__', 'http://127.0.0.1:4325/');
  const mock = {
    selected: [...selected], metadata: {}, links: {}, calls: [],
    siteContent: structuredClone(articleFixtures), topics: structuredClone(topicFixtures), appliedTopics: structuredClone(topicFixtures), pending: false,
    notes: [{ path: 'Local.md', id: 'local', slug: 'n-local', title: 'Local article', blocked: false, status: '未生成', sourceMetadata: { ...sourceMetadata } }],
  };
  const currentNotes = () => mock.notes.map(note => ({ ...note, metadata: { ...note.sourceMetadata, ...mock.metadata[note.path] }, metadataOverride: mock.metadata[note.path] || {}, siteMatch: mock.links[note.path] ? { state: 'linked', key: mock.links[note.path], candidates: [], reason: '已关联网站文章，保留原网址。' } : { state: 'candidate', key: null, candidates: ['notes:shader-basics', 'tutorials:shader-basics'], reason: '请选择要更新的网站文章。' } }));
  const topicArticles = () => [...mock.siteContent.filter(item => item.section !== 'work').map(({ key, title, url, section }) => ({ key, title, url, section })), ...currentNotes().filter(note => mock.selected.includes(note.path) && !mock.links[note.path]).map(note => ({ key: 'published:' + note.slug, title: note.metadata.title, url: '/notes/' + note.slug + '/', section: note.metadata.section, pending: true }))];
  const topicResponse = () => ({ topics: mock.topics.map(topic => ({ ...topic, pending: mock.pending })), articles: topicArticles(), pending: mock.pending });
  const changes = () => ({ added: [...mock.selected], updated: [], removed: [], topics: mock.pending ? mock.topics.map(topic => ({ ...topic, notes: topic.notes.map(key => ({ key, title: mock.siteContent.find(item => item.key === key)?.title || key })) })) : [] });
  const server = http.createServer(async (req, res) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    const send = (value, status = 200) => { res.writeHead(status); res.end(JSON.stringify(value)); };
    const url = new URL(req.url, 'http://127.0.0.1');
    if (url.pathname === '/') { res.setHeader('Content-Type', 'text/html; charset=utf-8'); return res.end(source); }
    if (url.pathname === '/publisher.css') { res.setHeader('Content-Type', 'text/css; charset=utf-8'); return res.end(css); }
    if (url.pathname === '/favicon.ico') { res.writeHead(204); return res.end(); }
    let raw = ''; for await (const chunk of req) raw += chunk;
    const data = JSON.parse(raw || '{}'); mock.calls.push({ route: url.pathname, method: req.method, data });
    if (url.pathname === '/api/deploy/status') return send({ busy: false, phase: 'idle', message: '尚无发布任务。' });
    if (url.pathname === '/api/publication-status') return send({ entries: Object.fromEntries(mock.siteContent.map(entry => [entry.key, { state: 'uploaded', label: '已上传', reason: 'Synthetic remote equality' }])), checkedAt: '2026-09-22T01:00:00Z', stale: false });
    if (url.pathname === '/api/scan') return send({ notes: currentNotes(), selected: mock.selected, metadata: mock.metadata, assets: {}, siteContent: mock.siteContent, sections, catalog, ffmpeg: false, missingSelected: [] });
    if (url.pathname === '/api/topics' && req.method === 'GET') return send(topicResponse());
    if (url.pathname === '/api/topics' && req.method === 'POST') {
      const index = mock.topics.findIndex(topic => topic.key === data.key);
      if (index < 0) return send({ error: 'Unknown synthetic topic' }, 400);
      mock.topics[index] = { ...mock.topics[index], ...structuredClone(data) }; mock.pending = true;
      return send(topicResponse());
    }
    if (url.pathname === '/api/site-link') { if (data.key) mock.links[data.path] = data.key; else delete mock.links[data.path]; return send({ ok: true }); }
    if (url.pathname === '/api/select') { mock.selected = [...data.selected]; Object.assign(mock.metadata, data.metadata); return send({ ok: true }); }
    if (url.pathname === '/api/analyze') return send({ id: 'plan', errors: [], warnings: [], assets: [], assetModes: {}, metadata: mock.metadata, catalog, siteContent: mock.siteContent, changes: changes() });
    if (url.pathname === '/api/prepare') return send({ id: 'stage', notes: [], assets: [], changes: changes() });
    if (url.pathname === '/api/apply') { mock.appliedTopics = structuredClone(mock.topics); mock.pending = false; return send({ message: '网站副本与专题已更新。' }); }
    return send({ error: 'Unexpected mock request: ' + req.method + ' ' + url.pathname }, 404);
  });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  let browser;
  t.after(async () => { await browser?.close(); server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); });
  browser = await chromium.launch({ headless: true, ...(process.env.PUBLISHER_TEST_BROWSER ? { channel: process.env.PUBLISHER_TEST_BROWSER } : {}) });
  const page = await browser.newPage({ reducedMotion: 'reduce', ...(viewport ? { viewport } : {}) }); page.setDefaultTimeout(6000);
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto(`http://127.0.0.1:${server.address().port}/`); await settled(page);
  await page.locator('#vaultPanel > summary').click();
  return { page, mock, errors };
}

async function settled(page) { await page.waitForFunction(() => !document.querySelector('main').hasAttribute('aria-busy')); }
const calls = (mock, route, method) => mock.calls.filter(call => call.route === '/api/' + route && (!method || call.method === method));
async function openInventory(page) { await page.locator('#siteInventory').waitFor({ state: 'visible' }); }
async function editLocal(page) { await page.getByRole('button', { name: '编辑发布设置 Local.md', exact: true }).click(); }
async function openTopic(page) { await openInventory(page); await page.locator('[data-edit-topic="ue5-per-material"]').click(); await page.locator('#topicEditor').waitFor({ state: 'visible' }); }
const topicNotes = page => page.locator('#topicNotes [data-article-key]').evaluateAll(rows => rows.map(row => row.dataset.articleKey));

test('the existing-site inventory lists site-only content and filters by section and title without changing publication state', async t => {
  const { page, mock, errors } = await setup(t);
  await openInventory(page);
  assert.deepEqual(await page.locator('#siteItems [data-site-key]').evaluateAll(rows => rows.map(row => row.dataset.siteKey).sort()), articleFixtures.map(item => item.key).sort());
  await page.locator('#siteSection').selectOption('work');
  assert.deepEqual(await page.locator('#siteItems [data-site-key]').evaluateAll(rows => rows.map(row => row.dataset.siteKey).sort()), ['work:ue5-per-material', 'work:water-study']);
  await page.locator('#siteSearch').fill('UE 材质');
  assert.equal(await page.locator('#siteItems [data-site-key]').count(), 1);
  assert.match(await page.locator('#siteCount').innerText(), /1/);
  assert.equal(await page.locator('#siteItems a').first().getAttribute('href'), 'http://127.0.0.1:4325/work/ue5-per-material/');
  assert.equal(mock.calls.some(call => call.method === 'POST'), false, 'browsing the site inventory is read only');
  assert.deepEqual(errors, []);
});

test('linking a local note selects the namespaced site identity and can be explicitly cleared', async t => {
  const { page, mock, errors } = await setup(t);
  await editLocal(page);
  const values = await page.locator('#siteLinkSelect option').evaluateAll(options => options.map(option => option.value));
  assert.equal(values.includes('notes:shader-basics'), true);
  assert.equal(values.includes('tutorials:shader-basics'), true, 'identical slugs in different content sections remain distinct choices');
  await page.locator('#siteLinkSelect').selectOption('notes:shader-basics');
  await page.locator('#siteLinkSave').click(); await settled(page);
  assert.deepEqual(calls(mock, 'site-link').at(-1).data, { path: 'Local.md', key: 'notes:shader-basics' });
  assert.equal(await page.locator('#siteLinkSelect').inputValue(), 'notes:shader-basics');
  assert.match(await page.locator('#siteLinkStatus').innerText(), /关联|原网址/);
  assert.equal(calls(mock, 'apply').length, 0); assert.deepEqual(mock.selected, []);
  await page.locator('#siteLinkClear').click(); await settled(page);
  assert.equal(calls(mock, 'site-link').at(-1).data.path, 'Local.md');
  assert.equal(Boolean(calls(mock, 'site-link').at(-1).data.key), false);
  assert.deepEqual(mock.links, {});
  assert.equal(await page.locator('#siteLinkSelect').inputValue(), '');
  assert.deepEqual(errors, []);
});

test('an unapplied article draft blocks association until its metadata is applied and saved', async t => {
  const { page, mock, errors } = await setup(t);
  await editLocal(page); await page.locator('#editTitle').fill('Pending title');
  assert.equal(await page.locator('#siteLinkSave').isDisabled(), true);
  assert.equal(calls(mock, 'site-link').length, 0);
  await page.locator('#noteMetaApply').click(); await settled(page);
  await page.locator('#siteLinkSelect').selectOption('notes:shader-basics');
  await page.locator('#siteLinkSave').click(); await settled(page);
  assert.equal(calls(mock, 'site-link').length, 1);
  assert.equal(mock.metadata['Local.md'].title, 'Pending title');
  assert.deepEqual(errors, []);
});

test('existing topic relationships can be removed, reordered and extended without confusing article namespaces', async t => {
  const { page, mock, errors } = await setup(t);
  await openTopic(page);
  assert.equal(await page.locator('#topicTitle').inputValue(), 'UE 材质专题');
  assert.deepEqual(await topicNotes(page), ['notes:shader-basics', 'notes:ue-materials', 'notes:ue-lighting']);
  await page.getByRole('button', { name: '移除 UE lighting study', exact: true }).click();
  await page.getByRole('button', { name: '下移 Shader basics', exact: true }).click();
  await page.locator('#topicArticleSearch').fill('Shader');
  await page.locator('#topicArticle').selectOption('tutorials:shader-basics'); await page.locator('#topicAdd').click();
  assert.deepEqual(await topicNotes(page), ['notes:ue-materials', 'notes:shader-basics', 'tutorials:shader-basics']);
  assert.equal(calls(mock, 'topics', 'POST').length, 0);
  assert.deepEqual(mock.appliedTopics, topicFixtures);
  await page.locator('#topicSave').click(); await settled(page);
  assert.deepEqual(calls(mock, 'topics', 'POST').at(-1).data, { key: 'ue5-per-material', title: 'UE 材质专题', summary: 'Three existing site articles', notes: ['notes:ue-materials', 'notes:shader-basics', 'tutorials:shader-basics'] });
  assert.equal(mock.pending, true);
  assert.deepEqual(mock.appliedTopics, topicFixtures, 'saving a topic draft must not update website content immediately');
  assert.match(await page.locator('#topicStatus').innerText(), /草稿|待|尚未|未写入|已暂存|已保存/);
  assert.deepEqual(errors, []);
});

test('unapplied topic edits block publication actions and can be cancelled without saving a draft', async t => {
  const { page, mock, errors } = await setup(t);
  await openTopic(page); await page.getByRole('button', { name: '移除 UE lighting study', exact: true }).click();
  for (const id of ['analyze', 'rescan', 'prepare', 'apply', 'publishReview', 'topicSelect']) assert.equal(await page.locator('#' + id).isDisabled(), true, id + ' cannot bypass an unapplied topic edit');
  await page.locator('#topicCancel').click();
  assert.equal(calls(mock, 'topics', 'POST').length, 0);
  assert.deepEqual(mock.topics, topicFixtures);
  assert.equal(await page.locator('#analyze').isEnabled(), true);
  await openTopic(page);
  assert.equal(await page.locator('#topicTitle').inputValue(), 'UE 材质专题');
  assert.deepEqual(errors, []);
});

test('saving a newly selected vault article refreshes topic choices with its applied title without a rescan', async t => {
  const { page, mock, errors } = await setup(t);
  await openTopic(page);
  assert.equal(await page.locator('#topicArticle option[value="published:n-local"]').count(), 0);
  await page.getByLabel('选择 Local article', { exact: true }).check();
  await editLocal(page); await page.locator('#editTitle').fill('New public shader note');
  await page.locator('#noteMetaApply').click(); await settled(page);
  assert.equal(calls(mock, 'scan').length, 1, 'saving selection and metadata should refresh choices directly');
  assert.equal(await page.locator('#topicArticle option[value="published:n-local"]').count(), 1);
  assert.match(await page.locator('#topicArticle option[value="published:n-local"]').innerText(), /New public shader note/);
  await page.locator('#topicArticle').selectOption('published:n-local'); await page.locator('#topicAdd').click();
  await page.locator('#topicSave').click(); await settled(page);
  assert.deepEqual(calls(mock, 'topics', 'POST').at(-1).data.notes, ['notes:shader-basics', 'notes:ue-materials', 'notes:ue-lighting', 'published:n-local']);
  assert.equal(mock.metadata['Local.md'].title, 'New public shader note');
  assert.deepEqual(mock.appliedTopics, topicFixtures);
  assert.deepEqual(errors, []);
});

test('topic-only changes follow analysis, preparation and the on-page local-write confirmation', async t => {
  const { page, mock, errors } = await setup(t, { selected: [] });
  await openTopic(page); await page.getByRole('button', { name: '移除 UE lighting study', exact: true }).click();
  await page.locator('#topicSave').click(); await settled(page);
  await page.locator('#analyze').click(); await settled(page);
  assert.match(await page.locator('#review').innerText(), /UE 材质专题/);
  assert.equal(await page.locator('#prepare').isEnabled(), true, 'topic changes do not require selecting a new local note');
  await page.locator('#prepare').click(); await settled(page);
  assert.equal(await page.locator('#apply').isEnabled(), true);
  await page.locator('#apply').click();
  assert.match(await page.locator('#applySummary').innerText(), /(?:专题|合集)[^\d]*1|1[^\d]*(?:专题|合集)/);
  assert.equal(calls(mock, 'apply').length, 0);
  await page.locator('#applyConfirm').click(); await settled(page);
  assert.deepEqual(calls(mock, 'apply').map(call => call.data), [{ id: 'stage' }]);
  assert.deepEqual(mock.selected, []);
  assert.deepEqual(mock.appliedTopics[0].notes, ['notes:shader-basics', 'notes:ue-materials']); assert.equal(mock.pending, false);
  assert.match(await page.locator('#applyStatus').innerText(), /成功|已更新|已写入/);
  assert.deepEqual(errors, []);
});

test('site inventory and topic relationship editing fit a dark 390px viewport', async t => {
  const { page, errors } = await setup(t, { viewport: { width: 390, height: 844 } });
  await openTopic(page);
  const visual = await page.evaluate(() => ({ overflow: document.documentElement.scrollWidth > innerWidth, scheme: getComputedStyle(document.documentElement).colorScheme }));
  assert.equal(visual.overflow, false); assert.equal(visual.scheme, 'dark');
  if (process.env.PUBLISHER_UI_SCREENSHOT_DIR) {
    const directory = path.resolve(process.env.PUBLISHER_UI_SCREENSHOT_DIR); await fs.mkdir(directory, { recursive: true });
    await page.locator('#topicEditor').evaluate(element => element.scrollIntoView({ block: 'start' }));
    await page.screenshot({ path: path.join(directory, 'publisher-topic-mobile.png') });
    await page.setViewportSize({ width: 1440, height: 1100 }); await page.locator('#topicEditor').evaluate(element => element.scrollIntoView({ block: 'start' }));
    await page.screenshot({ path: path.join(directory, 'publisher-topic-desktop.png') });
  }
  assert.deepEqual(errors, []);
});
