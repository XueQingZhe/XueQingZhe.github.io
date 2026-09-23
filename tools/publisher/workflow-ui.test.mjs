import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import { once } from 'node:events';
import { chromium } from 'playwright';

// HTTP fixtures use the real workbench HTML/CSS without reading the private vault,
// changing the website or contacting GitHub.
const sections = ['notes', 'tutorials', 'work'].map(value => ({ value, label: value }));
const catalog = {
  tags: ['Shader', 'UE', 'Site Only Tag'].map(value => ({ value, label: value, count: 1 })),
  categories: [],
  series: [{ value: 'Graphics Foundations', label: 'Graphics Foundations', section: 'tutorials', count: 2 }],
  engine: [], role: [],
};
const baseMetadata = { title: '', section: 'notes', category: '', date: '2026-09-20', summary: 'Synthetic article', tags: [], series: '', order: 100, cover: '', engine: [], role: [], year: 2026, featured: false };
const fixtures = [
  ['notes:shader', 'Shader article', '/blog/shader/', { tags: ['Shader'] }],
  ['notes:learning', 'Graphics lesson', '/blog/learning/', { section: 'tutorials', series: 'Graphics Foundations', order: 2, tags: ['UE'] }],
  ['work:water', 'Water study', '/work/water/', { section: 'work', workType: 'single', cover: '/covers/water.png' }],
  ['work:engine', 'UE engine collection', '/work/engine/', { section: 'work', workType: 'collection', tags: ['UE'], cover: '/covers/engine.png', notes: ['notes:shader', 'notes:learning'] }],
].map(([key, title, url, metadata]) => ({
  key, title, url, collection: key.split(':')[0], id: key.split(':')[1], section: metadata.section || 'notes',
  metadata: { ...baseMetadata, title, ...metadata }, notes: metadata.notes || [], active: true, linkable: true,
}));

async function setup(t, { viewport, linked = false } = {}) {
  const [html, css] = await Promise.all([
    fs.readFile(new URL('./index.html', import.meta.url), 'utf8'),
    fs.readFile(new URL('./publisher.css', import.meta.url), 'utf8'),
  ]);
  const source = html.replace('__TOKEN__', 'a'.repeat(64)).replace('__PREVIEW_URL__', 'http://127.0.0.1:4325/');
  const mock = {
    site: structuredClone(fixtures), pending: {}, appliedSettings: {}, calls: [], saveFailure: false, remoteFailure: false,
    notes: linked ? [{ path: 'Imported.md', id: 'imported', title: 'Raw vault title', status: '已生成', blocked: false, sourceMetadata: { ...baseMetadata, title: 'Raw vault title', tags: ['UE'] }, siteMatch: { state: 'linked', key: 'notes:shader', candidates: [] } }] : [],
    topics: [{ key: 'engine', title: 'UE engine collection', summary: 'Synthetic article', cover: '/covers/engine.png', workType: 'collection', url: '/work/engine/', notes: ['notes:shader', 'notes:learning'], pending: false }],
    publication: Object.fromEntries(fixtures.map(entry => [entry.key, { state: 'uploaded', label: '已上传', reason: '与 GitHub main 一致；不是 Pages 上线结果。' }])),
  };
  if (linked) mock.appliedSettings['notes:shader'] = { title: 'Website-managed title', tags: ['Site Only Tag'] };
  const siteEntries = () => mock.site.map(entry => {
    const settings = { ...mock.appliedSettings[entry.key], ...mock.pending[entry.key] }, metadata = { ...entry.metadata, ...settings };
    return { ...entry, metadata, settings, title: metadata.title, section: metadata.section, currentMetadata: entry.pending ? null : { ...entry.metadata, ...mock.appliedSettings[entry.key] }, settingsPending: Boolean(mock.pending[entry.key] || entry.pending) };
  });
  const scan = () => {
    const entries = siteEntries();
    return { notes: mock.notes, selected: [], metadata: linked ? { 'Imported.md': { title: 'Old importer title' } } : {}, assets: {}, siteContent: entries, sections, catalog, ffmpeg: false, missingSelected: [], contentSettings: {
      entries: entries.map(entry => ({ key: entry.key, title: entry.title, metadata: entry.metadata, currentMetadata: entry.currentMetadata, pending: entry.settingsPending, linkedPath: null })),
      pending: entries.some(entry => entry.settingsPending),
    } };
  };
  const topics = () => ({ topics: mock.topics.map(topic => {
    const entry = siteEntries().find(entry => entry.url === topic.url);
    return { ...topic, title: entry?.metadata.title || topic.title, summary: entry?.metadata.summary || topic.summary, cover: entry?.metadata.cover || topic.cover };
  }), articles: siteEntries().filter(entry => entry.metadata.workType !== 'collection').map(entry => ({ key: entry.key, title: entry.title, url: entry.url, section: entry.section, cover: entry.metadata.cover })), pending: mock.topics.some(topic => topic.pending) });
  const server = http.createServer(async (req, res) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    const send = (value, status = 200) => { res.writeHead(status); res.end(JSON.stringify(value)); };
    const url = new URL(req.url, 'http://127.0.0.1');
    if (url.pathname === '/') { res.setHeader('Content-Type', 'text/html; charset=utf-8'); return res.end(source); }
    if (url.pathname === '/publisher.css') { res.setHeader('Content-Type', 'text/css; charset=utf-8'); return res.end(css); }
    if (url.pathname === '/mock-cover') { res.setHeader('Content-Type', 'image/png'); return res.end(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64')); }
    if (url.pathname === '/favicon.ico') { res.writeHead(204); return res.end(); }
    let raw = ''; for await (const chunk of req) raw += chunk;
    const data = JSON.parse(raw || '{}'); mock.calls.push({ route: url.pathname, query: url.search, method: req.method, data });
    if (url.pathname === '/api/deploy/status') return send({ busy: false, phase: 'idle', message: '尚无发布任务。' });
    if (url.pathname === '/api/scan') return send(scan());
    if (url.pathname === '/api/topics' && req.method === 'GET') return send(topics());
    if (url.pathname === '/api/publication-status') {
      if (mock.remoteFailure) return send({ error: 'Synthetic GitHub unavailable' }, 503);
      return send({ entries: mock.publication, remoteCommit: 'a'.repeat(40), checkedAt: '2026-09-22T01:00:00Z', stale: false });
    }
    if (url.pathname === '/api/content-settings') {
      if (mock.saveFailure) return send({ error: 'Synthetic settings save failure' }, 500);
      mock.pending[data.key] = { ...mock.pending[data.key], ...structuredClone(data.metadata) };
      return send(scan());
    }
    if (url.pathname === '/api/collection-editor') {
      if (mock.saveFailure) return send({ error: 'Synthetic collection save failure' }, 500);
      let topic = mock.topics.find(topic => topic.key === data.key);
      if (data.key && !topic) return send({ error: 'Unknown fixture collection' }, 400);
      if (!data.key) {
        const key = 'collections:collection-fixture', metadata = { ...baseMetadata, ...data.metadata, section: 'work', workType: 'collection', notes: [] };
        mock.site.push({ key, collection: 'collections', id: 'collection-fixture', path: 'src/data/publisher-content.json', metadata, title: data.metadata.title, section: 'work', url: '/work/collection-fixture/', active: true, pending: true, notes: [] });
        topic = { key, ...data.metadata, notes: [], url: '/work/collection-fixture/', workType: 'collection', pending: true }; mock.topics.push(topic);
        mock.publication[key] = { state: 'local', label: '尚未上传', reason: '合集只在本地暂存。' };
      }
      const entry = mock.site.find(entry => entry.url === topic.url);
      mock.pending[entry.key] = { ...mock.pending[entry.key], ...structuredClone(data.metadata) };
      Object.assign(topic, structuredClone(data.metadata), { notes: [...data.notes], pending: true });
      return send({ key: topic.key, id: entry.id, metadata: { ...entry.metadata, ...mock.pending[entry.key] }, pending: true });
    }
    if (url.pathname === '/api/site-link') {
      const note = mock.notes.find(note => note.path === data.path);
      if (!note) return send({ error: 'Unknown fixture source' }, 400);
      note.siteMatch = data.key ? { state: 'linked', key: data.key, candidates: [], reason: 'Synthetic linked source' } : { state: 'candidate', key: null, candidates: ['notes:shader'], reason: 'Synthetic unlinked source' };
      return send({ ok: true });
    }
    if (url.pathname === '/api/select') return send({ ok: true });
    if (url.pathname === '/api/site-covers' && url.searchParams.get('scope')==='note') {
      const image={value:'/article/body.png',path:'/article/body.png',name:'body.png',type:'image',bytes:1000,selectable:true,referenced:true,thumbnailUrl:'/mock-cover',previewUrl:'/mock-cover'};
      const video={...image,value:'/article/poster.jpg',path:'/article/demo.mp4',name:'demo.mp4',type:'video',coverVideo:'/article/demo.mp4'};
      const poster={...image,value:'/article/poster.jpg',path:'/article/poster.jpg',name:'poster.jpg'};
      return send({items:[image,video,poster],total:3,hasMore:false,current:null,ffmpeg:true});
    }
    if (url.pathname === '/api/site-covers') { const items = ['/collection-cover.png', '/second-cover.png'].filter(value => !url.searchParams.get('q') || value.includes(url.searchParams.get('q'))).map(value => ({ value, path: value, name: value.slice(1), type: 'image', bytes: 1000, selectable: true, thumbnailUrl: '/mock-cover', previewUrl: '/mock-cover' })); return send({ items, total: items.length, hasMore: false, current: null, ffmpeg: false }); }
    return send({ error: 'Unexpected fixture request: ' + req.method + ' ' + url.pathname }, 404);
  });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  let browser;
  t.after(async () => { await browser?.close(); server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); });
  browser = await chromium.launch({ headless: true, ...(process.env.PUBLISHER_TEST_BROWSER ? { channel: process.env.PUBLISHER_TEST_BROWSER } : {}) });
  const page = await browser.newPage({ reducedMotion: 'reduce', ...(viewport ? { viewport } : {}) }); page.setDefaultTimeout(6000);
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto(`http://127.0.0.1:${server.address().port}/`); await settled(page); await publicationSettled(page);
  assert.deepEqual(errors, [], 'workbench must initialize without browser errors');
  assert.equal(await page.locator('#siteInventory').isVisible(), true, await page.locator('#message').innerText());
  return { page, mock, errors };
}

async function settled(page) { await page.waitForFunction(() => !document.querySelector('main').hasAttribute('aria-busy')); }
async function publicationSettled(page) { await page.waitForFunction(() => !document.querySelector('#publicationRefresh').disabled); }
const calls = (mock, route) => mock.calls.filter(call => call.route === '/api/' + route);
const row = (page, key) => page.locator('[data-site-key="' + key + '"]');
async function edit(page, key) { await page.locator('[data-edit-site="' + key + '"]').click(); await page.locator('#noteEditor').waitFor({ state: 'visible' }); }
async function save(page) { await page.locator('#noteMetaApply').click(); await settled(page); }

test('the workbench starts with the full site inventory and keeps imports separate', async t => {
  const { page, mock, errors } = await setup(t);
  assert.equal(await page.locator('#siteInventory').isVisible(), true);
  assert.equal(await page.locator('#vaultPanel').evaluate(element => element.open), false);
  assert.equal(await page.locator('#siteItems [data-site-key]').count(), 4);
  assert.equal(await page.locator('.publication-badge[data-state="uploaded"]').count(), 4);
  await page.locator('#siteSection').selectOption('work');
  assert.equal(await page.locator('#siteItems [data-site-key]').count(), 2);
  await page.locator('#siteSearch').fill('engine');
  assert.equal(await page.locator('#siteItems [data-site-key]').count(), 1);
  assert.match(await row(page, 'work:engine').innerText(), /作品合集 · 2 篇/);
  await page.locator('#importNotes').click();
  assert.equal(await page.locator('#vaultPanel').evaluate(element => element.open), true);
  assert.equal(mock.calls.some(call => call.method === 'POST'), false);
  assert.deepEqual(errors, []);
});

test('source-less article settings save immediately, persist after rescan and reload, and remain distinct from uploaded content', async t => {
  const { page, mock, errors } = await setup(t);
  await edit(page, 'notes:shader');
  assert.equal(await page.locator('#siteLinkPanel').isVisible(), false);
  assert.equal(await page.locator('#noteMetaReset').isVisible(), false);
  assert.equal(await page.locator('#categoryAdvanced').evaluate(element => element.open), false);
  assert.equal(await page.locator('#seriesField').isVisible(), false);
  await page.locator('#editTitle').fill('A saved website title');
  await page.getByRole('button', { name: '添加 Tag Site Only Tag', exact: true }).click();
  await save(page);
  assert.deepEqual(calls(mock, 'content-settings').at(-1).data, { key: 'notes:shader', metadata: { title: 'A saved website title', tags: ['Shader', 'Site Only Tag'] } });
  assert.equal(mock.site[0].metadata.title, 'Shader article', 'saving settings must not silently apply public content');
  assert.match(await row(page, 'notes:shader').innerText(), /设置已保存，待写入预览/);
  assert.equal(await row(page, 'notes:shader').locator('.publication-badge').getAttribute('data-state'), 'uploaded');
  await page.locator('#noteMetaClose').click(); await page.locator('#rescan').click(); await settled(page);
  await edit(page, 'notes:shader'); assert.equal(await page.locator('#editTitle').inputValue(), 'A saved website title');
  await page.reload(); await settled(page); await publicationSettled(page); await edit(page, 'notes:shader');
  assert.equal(await page.locator('#editTitle').inputValue(), 'A saved website title');
  assert.equal(await page.locator('#editTags').inputValue(), 'Shader, Site Only Tag');
  await page.locator('#noteMetaClose').click(); await page.locator('#siteStatus').selectOption('pending');
  assert.equal(await page.locator('#siteItems [data-site-key]').count(), 1);
  assert.deepEqual(errors, []);
});

test('only learning articles expose series, and changing to a work clears its old series', async t => {
  const { page, mock, errors } = await setup(t);
  await edit(page, 'notes:learning');
  assert.equal(await page.locator('#seriesField').isVisible(), true);
  assert.equal(await page.locator('#orderField').isVisible(), true);
  assert.equal(await page.locator('#workMetadata').isVisible(), false);
  assert.equal(await page.locator('#editSeries').inputValue(), 'Graphics Foundations');
  await page.locator('#editSection').selectOption('work');
  assert.equal(await page.locator('#seriesField').isVisible(), false);
  assert.equal(await page.locator('#orderField').isVisible(), false);
  assert.equal(await page.locator('#workMetadata').isVisible(), true);
  assert.equal(await page.locator('#editCover').evaluate(input => input.required), true);
  await page.locator('#editCover').fill('/covers/new-work.png'); await save(page);
  assert.equal(calls(mock, 'content-settings').at(-1).data.metadata.section, 'work');
  assert.equal(calls(mock, 'content-settings').at(-1).data.metadata.series, '');
  assert.equal(await page.locator('#editWorkType').inputValue(), 'single');
  assert.equal(await page.locator('#editWorkType option[value=collection]').count(), 0, 'a single article cannot be repurposed as a collection');
  await page.locator('#noteMetaClose').click(); await page.locator('[data-edit-topic=engine]').click();
  assert.equal(await page.locator('#noteEditor').isVisible(), false);
  assert.equal(await page.locator('#topicEditor').isVisible(), true);
  assert.equal(await page.locator('#topicCover').inputValue(), '/covers/engine.png');
  assert.deepEqual(errors, []);
});

test('ordinary articles cannot save as learning articles until an existing or new series is chosen', async t => {
  const { page, mock, errors } = await setup(t);
  await edit(page, 'notes:shader'); await page.locator('#editSection').selectOption('tutorials'); await save(page);
  assert.equal(calls(mock, 'content-settings').length, 0);
  assert.match(await page.locator('#editorHint').innerText(), /系列/);
  await page.getByRole('button', { name: '选择系列 Graphics Foundations', exact: true }).click(); await save(page);
  assert.deepEqual(calls(mock, 'content-settings').at(-1).data.metadata, { section: 'tutorials', series: 'Graphics Foundations' });
  await page.locator('#noteMetaClose').click(); await edit(page, 'notes:shader');
  assert.equal(await page.locator('#editSeries').inputValue(), 'Graphics Foundations');
  assert.deepEqual(errors, []);
});

test('a collection saves its independent cover, identity and ordered members in one transaction', async t => {
  const { page, mock, errors } = await setup(t);
  await page.locator('#newCollection').click();
  await page.locator('#topicTitle').fill('UE source modifications');
  await page.locator('#topicSummary').fill('A group of engine modification articles');
  await page.locator('#topicEditor .collection-details > summary').click();
  await page.locator('#topicTagsPicker').getByRole('button', { name: '添加 Tag Site Only Tag', exact: true }).click();
  assert.equal(await page.locator('#topicEditor').isVisible(), true);
  assert.equal(calls(mock, 'collection-editor').length, 0, 'opening the editor must not create a placeholder collection');
  await page.locator('#topicArticle').selectOption('work:water'); await page.locator('#topicAdd').click();
  await page.locator('#topicCoverFromMember').click();
  assert.equal(await page.locator('#topicCover').inputValue(), '/covers/water.png');
  await page.locator('#topicArticle').selectOption('notes:shader'); await page.locator('#topicAdd').click();
  await page.getByRole('button', { name: '上移 Shader article', exact: true }).click();
  assert.equal(await page.locator('#topicCover').inputValue(), '/covers/water.png', 'cover copying is explicit and does not track the first member');
  await page.locator('#topicCoverBrowse').click();
  await page.locator('[data-topic-cover="/collection-cover.png"]').click();
  assert.equal(await page.locator('#topicCover').inputValue(), '/collection-cover.png');
  await page.locator('#topicArticle').selectOption('notes:learning'); await page.locator('#topicAdd').click();
  await page.getByRole('button', { name: '移除 Graphics lesson', exact: true }).click();
  await page.locator('#topicSave').click(); await settled(page); await publicationSettled(page);
  assert.deepEqual(calls(mock, 'collection-editor').map(call => call.data), [{ metadata: { title: 'UE source modifications', summary: 'A group of engine modification articles', cover: '/collection-cover.png', tags: ['Site Only Tag'], engine: [], role: [], category: '', year: new Date().getFullYear(), featured: false }, notes: ['notes:shader', 'work:water'] }]);
  assert.equal(calls(mock, 'collections').length, 0); assert.equal(calls(mock, 'topics').filter(call => call.method === 'POST').length, 0);
  assert.equal(mock.site.find(entry => entry.key === 'work:water').metadata.workType, 'single');
  assert.equal(mock.site.find(entry => entry.key === 'work:water').metadata.cover, '/covers/water.png');
  assert.deepEqual(mock.site.find(entry => entry.key === 'work:water').metadata.tags, [], 'collection tags do not leak into member metadata');
  assert.equal(await row(page, 'collections:collection-fixture').locator('.publication-badge').getAttribute('data-state'), 'local');
  await page.reload(); await settled(page); await publicationSettled(page);
  await page.locator('[data-edit-topic="collections:collection-fixture"]').click();
  assert.equal(await page.locator('#topicTitle').inputValue(), 'UE source modifications');
  assert.equal(await page.locator('#topicSummary').inputValue(), 'A group of engine modification articles');
  assert.equal(await page.locator('#topicTags').inputValue(), 'Site Only Tag');
  assert.equal(await page.locator('#topicCover').inputValue(), '/collection-cover.png');
  assert.deepEqual(await page.locator('#topicNotes [data-article-key]').evaluateAll(rows => rows.map(row => row.dataset.articleKey)), ['notes:shader', 'work:water']);
  assert.equal(await page.locator('#noteEditor').isVisible(), false);
  assert.deepEqual(errors, []);
});

test('a cancelled new collection creates no orphan and a failed combined save preserves all editable fields', async t => {
  const { page, mock, errors } = await setup(t);
  await page.locator('#newCollection').click(); await page.locator('#topicTitle').fill('Cancelled collection');
  await page.locator('#topicCancel').click();
  assert.equal(calls(mock, 'collection-editor').length, 0);
  assert.equal(mock.site.length, fixtures.length);
  await page.locator('[data-edit-topic=engine]').click();
  await page.locator('#topicTitle').fill('Recoverable collection title'); await page.locator('#topicSummary').fill('Recoverable collection summary');
  await page.locator('#topicCover').fill('/second-cover.png');
  await page.getByRole('button', { name: '上移 Graphics lesson', exact: true }).click();
  mock.saveFailure = true; await page.locator('#topicSave').click(); await settled(page);
  assert.match(await page.locator('#message').innerText(), /Synthetic collection save failure/);
  assert.equal(await page.locator('#topicTitle').inputValue(), 'Recoverable collection title');
  assert.equal(await page.locator('#topicCover').inputValue(), '/second-cover.png');
  assert.equal(await page.locator('#rescan').isDisabled(), true);
  assert.deepEqual(mock.pending, {}); assert.deepEqual(mock.topics[0].notes, ['notes:shader', 'notes:learning']);
  mock.saveFailure = false; await page.locator('#topicSave').click(); await settled(page);
  assert.deepEqual(calls(mock, 'collection-editor').at(-1).data, { key: 'engine', metadata: { title: 'Recoverable collection title', summary: 'Recoverable collection summary', cover: '/second-cover.png', tags: ['UE'], engine: [], role: [], category: '', year: 2026, featured: false }, notes: ['notes:learning', 'notes:shader'] });
  await page.locator('#topicCancel').click(); await page.locator('[data-edit-topic=engine]').click();
  assert.equal(await page.locator('#topicTitle').inputValue(), 'Recoverable collection title');
  assert.equal(await page.locator('#topicCover').inputValue(), '/second-cover.png');
  assert.equal(await page.locator('#topicTags').inputValue(), 'UE', 'existing collection tags survive cover and order edits');
  assert.deepEqual(errors, []);
});

test('linked vault settings use website overrides and open the same persistent website editor', async t => {
  const { page, mock, errors } = await setup(t, { linked: true });
  await page.locator('#importNotes').click();
  assert.equal(await page.getByLabel('选择 Website-managed title', { exact: true }).count(), 1);
  assert.match(await page.locator('#notes .note').innerText(), /Site Only Tag/);
  await page.getByRole('button', { name: '编辑发布设置 Imported.md', exact: true }).click();
  assert.equal(await page.locator('#editTitle').inputValue(), 'Website-managed title');
  assert.equal(await page.locator('#editorPath').innerText(), '/blog/shader/');
  assert.equal(await page.locator('#siteLinkPanel').isVisible(), true);
  await page.locator('#editTitle').fill('A unified published title'); await save(page);
  assert.equal(calls(mock, 'content-settings').at(-1).data.key, 'notes:shader');
  assert.equal(calls(mock, 'select').length, 0, 'website edits do not create conflicting importer overrides');
  assert.equal(await page.getByLabel('选择 A unified published title', { exact: true }).count(), 1);
  await page.locator('#noteMetaClose').click(); await edit(page, 'notes:shader');
  assert.equal(await page.locator('#siteLinkSelect').inputValue(), 'notes:shader');
  assert.equal(await page.locator('#siteLinkClear').isEnabled(), true);
  await page.locator('#siteLinkClear').click(); await settled(page);
  assert.deepEqual(calls(mock, 'site-link').at(-1).data, { path: 'Imported.md', key: null });
  assert.equal(mock.notes[0].siteMatch.state, 'candidate');
  assert.equal(await page.locator('#siteLinkPanel').isVisible(), false);
  await page.locator('#noteMetaClose').click();
  await page.getByRole('button', { name: '编辑发布设置 Imported.md', exact: true }).click();
  await page.locator('#siteLinkSelect').selectOption('notes:shader'); await page.locator('#siteLinkSave').click(); await settled(page);
  assert.deepEqual(calls(mock, 'site-link').at(-1).data, { path: 'Imported.md', key: 'notes:shader' });
  assert.equal(mock.notes[0].siteMatch.state, 'linked');
  await page.locator('#noteMetaClose').click();
  await page.getByRole('button', { name: '编辑发布设置 Imported.md', exact: true }).click();
  assert.equal(await page.locator('#editorPath').innerText(), '/blog/shader/');
  assert.equal(await page.locator('#editTitle').inputValue(), 'A unified published title');
  assert.deepEqual(errors, []);
});

test('saved metadata and collection member drafts cannot skip the local-write review before GitHub upload', async t => {
  const { page, mock, errors } = await setup(t);
  await edit(page, 'notes:shader'); await page.locator('#editTitle').fill('Still pending locally'); await save(page);
  await page.locator('#publishReview').click(); await settled(page);
  assert.match(await page.locator('#message').innerText(), /未写入|待写入|本地/);
  assert.equal(calls(mock, 'deploy/review').length, 0);
  assert.equal(calls(mock, 'deploy/start').length, 0);
  mock.pending = {}; await page.locator('#rescan').click(); await settled(page);
  await page.locator('[data-edit-topic="engine"]').click();
  for (const title of ['Shader article', 'Graphics lesson']) await page.getByRole('button', { name: '移除 ' + title, exact: true }).click();
  await page.locator('#topicSave').click(); await settled(page);
  assert.match(await row(page, 'work:engine').innerText(), /作品合集 · 0 篇/);
  assert.match(await row(page, 'work:engine').innerText(), /合集成员已保存，待写入预览/);
  assert.equal(await row(page, 'work:engine').locator('.publication-badge').getAttribute('data-state'), 'uploaded');
  assert.equal(await page.locator('[data-edit-topic="engine"]').count(), 1, 'an empty collection remains manageable');
  await page.locator('#publishReview').click(); await settled(page);
  assert.match(await page.locator('#message').innerText(), /未写入|待写入|本地/);
  assert.equal(calls(mock, 'deploy/review').length, 0);
  assert.deepEqual(errors, []);
});

test('unsaved metadata and member edits block conflicting actions and can be abandoned', async t => {
  const { page, mock, errors } = await setup(t);
  await edit(page, 'notes:shader'); await page.locator('#editTitle').fill('Do not save');
  for (const id of ['analyze', 'rescan', 'publishReview', 'newCollection']) assert.equal(await page.locator('#' + id).isDisabled(), true, id);
  assert.equal(await page.locator('[data-edit-site="work:water"]').isDisabled(), true);
  await page.locator('#noteMetaClose').click();
  await page.locator('[data-edit-topic="engine"]').click();
  await page.getByRole('button', { name: '移除 Graphics lesson', exact: true }).click();
  for (const id of ['analyze', 'rescan', 'publishReview', 'newCollection', 'topicSelect']) assert.equal(await page.locator('#' + id).isDisabled(), true, id);
  await page.locator('#topicCancel').click();
  assert.equal(await page.locator('#analyze').isEnabled(), true);
  assert.equal(calls(mock, 'content-settings').length, 0);
  assert.equal(calls(mock, 'collection-editor').length, 0);
  await edit(page, 'notes:shader'); assert.equal(await page.locator('#editTitle').inputValue(), 'Shader article');
  assert.deepEqual(errors, []);
});

test('a failed metadata save retains the unsaved draft and permits a successful retry', async t => {
  const { page, mock, errors } = await setup(t); mock.saveFailure = true;
  await edit(page, 'notes:shader'); await page.locator('#editTitle').fill('Recoverable title'); await save(page);
  assert.match(await page.locator('#message').innerText(), /Synthetic settings save failure/);
  assert.equal(await page.locator('#editTitle').inputValue(), 'Recoverable title');
  assert.equal(await page.locator('#rescan').isDisabled(), true);
  assert.deepEqual(mock.pending, {});
  mock.saveFailure = false; await save(page);
  assert.equal(mock.pending['notes:shader'].title, 'Recoverable title');
  assert.equal(await page.locator('#rescan').isEnabled(), true);
  assert.deepEqual(errors, []);
});

test('an unavailable remote becomes unknown instead of retaining a misleading uploaded badge', async t => {
  const { page, mock, errors } = await setup(t); mock.remoteFailure = true;
  await page.locator('#publicationRefresh').click(); await publicationSettled(page);
  assert.equal(await page.locator('.publication-badge[data-state="uploaded"]').count(), 0);
  assert.equal(await page.locator('.publication-badge[data-state="unknown"]').count(), 4);
  assert.match(await page.locator('#publicationHint').innerText(), /无法核对/);
  assert.equal(calls(mock, 'publication-status').at(-1).query, '?refresh=1');
  assert.equal(await page.locator('#analyze').isEnabled(), true, 'remote failure does not prevent local work');
  assert.deepEqual(errors, []);
});

test('the dark workbench and collection editor fit a 390px viewport', async t => {
  const { page, errors } = await setup(t, { viewport: { width: 390, height: 844 } });
  await page.locator('[data-edit-topic=engine]').click();
  const geometry = await page.evaluate(() => ({ width: innerWidth, content: document.documentElement.scrollWidth, scheme: getComputedStyle(document.documentElement).colorScheme }));
  assert.ok(geometry.content <= geometry.width + 1, JSON.stringify(geometry));
  assert.equal(geometry.scheme, 'dark');
  assert.equal(await page.locator('#topicEditor').isVisible(), true);
  assert.equal(await page.locator('#noteEditor').isVisible(), false);
  if (process.env.PUBLISHER_UI_SCREENSHOT_DIR) {
    const directory = path.resolve(process.env.PUBLISHER_UI_SCREENSHOT_DIR); await fs.mkdir(directory, { recursive: true });
    await page.screenshot({ path: path.join(directory, 'workflow-mobile.png'), fullPage: true });
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: path.join(directory, 'workflow-desktop.png'), fullPage: true });
  }
  assert.deepEqual(errors, []);
});


test('website cover picker starts in current article, saves public video pairs and clears video for its static poster', async t => {
  const {page,mock,errors}=await setup(t);
  await edit(page,'work:water');await page.locator('#coverBrowse').click();
  await page.locator('[data-cover-path="/article/body.png"]').waitFor();
  assert.equal(await page.locator('#coverScope').inputValue(),'note');
  assert.equal(await page.locator('#coverScope').isVisible(),true);
  const query=new URLSearchParams(calls(mock,'site-covers').at(-1).query);
  assert.equal(query.get('note'),'work:water');assert.equal(query.get('scope'),'note');
  await page.locator('[data-cover-path="/article/demo.mp4"]').click();assert.equal(await page.locator('#coverItems [aria-pressed="true"]').count(),1);assert.equal(await page.locator('[data-cover-path="/article/demo.mp4"]').getAttribute('aria-pressed'),'true');await save(page);
  assert.equal(calls(mock,'content-settings').at(-1).data.metadata.cover,'/article/poster.jpg');
  assert.equal(calls(mock,'content-settings').at(-1).data.metadata.coverVideo,'/article/demo.mp4');
  await page.locator('#coverBrowse').click();await page.locator('[data-cover-path="/article/poster.jpg"]').click();assert.equal(await page.locator('#coverItems [aria-pressed="true"]').count(),1);assert.equal(await page.locator('[data-cover-path="/article/poster.jpg"]').getAttribute('aria-pressed'),'true');await save(page);
  assert.equal(calls(mock,'content-settings').at(-1).data.metadata.coverVideo,'');
  await page.locator('#coverBrowse').click();await page.locator('#coverScope').selectOption('all');
  await page.locator('[data-cover-path="/collection-cover.png"]').waitFor();
  assert.equal(new URLSearchParams(calls(mock,'site-covers').at(-1).query).get('scope'),'all');
  assert.deepEqual(errors,[]);
});

test('collection cover picker defaults to current member media and keeps full-site assets an explicit option', async t => {
  const {page,mock}=await setup(t);
  await page.locator('[data-edit-topic="engine"]').click();await page.locator('#topicCoverBrowse').click();
  await page.locator('[data-topic-cover="/collection-cover.png"]').waitFor();
  assert.equal(await page.locator('#topicCoverScope').inputValue(),'members');
  const query=new URLSearchParams(calls(mock,'site-covers').at(-1).query);
  assert.equal(query.get('scope'),'members');assert.deepEqual(query.getAll('member'),['notes:shader','notes:learning']);
  await page.locator('#topicCoverScope').selectOption('all');
  await page.waitForTimeout(50);
  assert.equal(new URLSearchParams(calls(mock,'site-covers').at(-1).query).get('scope'),'all');
});


test('a slow collection-cover response cannot restore images from a removed member', async t => {
  const {page}=await setup(t);
  let releaseOld,startedOld;
  const oldStarted=new Promise(resolve=>{startedOld=resolve});
  const oldRelease=new Promise(resolve=>{releaseOld=resolve});
  await page.route('**/api/site-covers?**',async route=>{
    const query=new URL(route.request().url()).searchParams;
    if(query.get('scope')!=='members')return route.continue();
    const old=query.getAll('member').includes('notes:shader');
    if(old){startedOld();await oldRelease;}
    const value=old?'/old-member.png':'/remaining-member.png';
    return route.fulfill({contentType:'application/json',body:JSON.stringify({items:[{value,path:value,name:value,type:'image',bytes:100,selectable:true,thumbnailUrl:'/mock-cover'}],total:1,hasMore:false,current:null,ffmpeg:true})});
  });
  await page.locator('[data-edit-topic="engine"]').click();await page.locator('#topicCoverBrowse').click();await oldStarted;
  await page.getByRole('button',{name:'移除 Shader article',exact:true}).click();
  await page.locator('[data-topic-cover="/remaining-member.png"]').waitFor();
  releaseOld();await page.waitForTimeout(100);
  assert.equal(await page.locator('[data-topic-cover="/old-member.png"]').count(),0);
  assert.equal(await page.locator('[data-topic-cover="/remaining-member.png"]').count(),1);
});
