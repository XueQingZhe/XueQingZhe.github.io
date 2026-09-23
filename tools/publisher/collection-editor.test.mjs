import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import net from 'node:net';
import { once } from 'node:events';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { Publisher } from './core.mjs';

async function fixture(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'publisher-collection-editor-'));
  t.after(() => fs.rm(root, { recursive: true, force: true, maxRetries: 4, retryDelay: 100 }));
  const site = path.join(root, 'site'), vault = path.join(root, 'vault'), state = path.join(root, 'state');
  await fs.mkdir(site); await fs.mkdir(vault);
  const write = async (name, raw) => { const file = path.join(site, name); await fs.mkdir(path.dirname(file), { recursive: true }); await fs.writeFile(file, raw); return file; };
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10" fill="red"/></svg>';
  await write('public/covers/collection.svg', svg); await write('public/covers/alternate.svg', svg);
  await write('src/content/notes/perlin.md', '---\ntitle: Perlin noise\ndate: 2025-01-01\nsummary: Noise foundation\ncover: /covers/alternate.svg\n---\nOriginal Perlin body');
  await write('src/content/work/cloud.md', '---\ntitle: Cloud article\nyear: 2025\nsummary: Cloud implementation\nworkType: single\ncover: /covers/alternate.svg\n---\nOriginal complete cloud body');
  const p = new Publisher({ site, vault, state }); await p.init(); await p.scan();
  const drafts = async () => Object.fromEntries(await Promise.all(Object.entries(p.collectionEditor.targets()).map(async ([key, file]) => [key, await fs.readFile(file, 'utf8').catch(error => { if (error.code === 'ENOENT') return null; throw error; })])));
  return { p, site, vault, state, write, drafts };
}
const input = () => ({ metadata: { title: 'Volume clouds', summary: 'Noise to final rendering', cover: '/covers/collection.svg', year: 2025, tags: ['URP'] }, notes: ['notes:perlin', 'work:cloud'] });

test('one collection save privately creates an independent cover and ordered members, then applies atomically', async t => {
  const { p, site, drafts } = await fixture(t);
  const created = await p.saveCollection(input()); assert.match(created.key, /^collections:collection-/);
  const pending = await drafts(); assert.deepEqual(JSON.parse(pending.content).collections[created.id].notes, input().notes); assert.deepEqual(JSON.parse(pending.topics).topics[created.key].notes, input().notes);
  assert.equal(await fs.stat(p.contentSettings.file).catch(() => null), null); assert.equal(await fs.stat(p.topics.file).catch(() => null), null);
  await p.scan(); const catalog = await p.topics.scan(p.topicSources());
  assert.deepEqual(catalog.topics.find(topic => topic.key === created.key).notes, input().notes);
  const child = catalog.articles.find(article => article.key === 'work:cloud'); assert.equal(child.cover, '/covers/alternate.svg'); assert.equal(child.summary, 'Cloud implementation'); assert.equal(child.section, 'work');
  const plan = await p.analyze(); assert.deepEqual(plan.errors, []); await p.apply((await p.prepare(plan.id, [])).id); await p.assertApplied();
  assert.equal(JSON.parse(await fs.readFile(p.contentSettings.file, 'utf8')).collections[created.id].cover, '/covers/collection.svg');
  assert.deepEqual(JSON.parse(await fs.readFile(p.topics.file, 'utf8')).topics[created.key].notes, input().notes);
  assert.match(await fs.readFile(path.join(site, 'src/content/work/cloud.md'), 'utf8'), /Original complete cloud body/);
  await p.scan(); await p.saveCollection({ ...input(), key: created.key, metadata: { title: 'Edited collection', cover: '/covers/alternate.svg' }, notes: ['work:cloud', 'notes:perlin'] });
  await p.scan(); assert.deepEqual((await p.topics.scan(p.topicSources())).topics.find(topic => topic.key === created.key).notes, ['work:cloud', 'notes:perlin']);
});

test('invalid cover or members never save part of a collection or mutate an existing private draft', async t => {
  const { p, drafts, write } = await fixture(t);
  const created = await p.saveCollection(input()); await p.scan(); const before = await drafts();
  await write('public/covers/clip.mp4', 'video'); await write('secret.png', 'private');
  for (const changes of [
    { notes: ['notes:missing'] }, { notes: ['notes:perlin', 'notes:perlin'] }, { notes: [created.key] },
    { metadata: { title: 'Changed title', cover: '/covers/missing.png' } },
    { metadata: { title: 'Changed title', cover: '/%2e%2e/secret.png' } },
    { metadata: { title: 'Changed title', cover: '/covers/clip.mp4' } },
    { metadata: { title: 'Changed title', cover: '/covers/placeholder.svg' } },
    { metadata: { coverVideo: 'https://example.invalid/clip.mp4' } },
    { metadata: { coverVideo: 42 } },
  ]) {
    await assert.rejects(p.saveCollection({ ...input(), key: created.key, ...changes }));
    assert.deepEqual(await drafts(), before);
  }
  for (const cover of ['', '/covers/placeholder.svg', undefined]) {
    const request = input(); if (cover === undefined) delete request.metadata.cover; else request.metadata.cover = cover;
    await assert.rejects(p.saveCollection(request), /独立封面/); assert.deepEqual(await drafts(), before);
  }
  const request = input(); request.notes = [created.key]; await assert.rejects(p.saveCollection(request), /其他合集/); assert.deepEqual(await drafts(), before);
});

test('ordinary content cannot be converted by the collection editor', async t => {
  const { p, drafts } = await fixture(t), before = await drafts();
  await assert.rejects(p.saveCollection({ ...input(), key: 'cloud' }), /普通文章请添加到独立新建/);
  assert.deepEqual(await drafts(), before);
});

test('legacy collections keep an untouched blank or placeholder cover during a membership edit', async t => {
  const { p, write } = await fixture(t);
  for (const [id, cover] of [['blank', ''], ['placeholder', '/covers/placeholder.svg']]) {
    await write(`src/content/work/${id}.md`, `---\ntitle: Legacy ${id}\nsummary: Legacy summary\nyear: 2025\ncover: "${cover}"\nnotes: [perlin]\n---\nLegacy landing page`);
    await p.scan(); const saved = await p.saveCollection({ key: id, metadata: {}, notes: ['work:cloud', 'notes:perlin'] }); assert.equal(saved.metadata.cover, cover);
  }
});

test('a failure installing the second private draft rolls both files back exactly', async t => {
  const { p, drafts } = await fixture(t);
  const created = await p.saveCollection(input()); await p.scan(); const before = await drafts();
  const rename = fs.rename; let failed = false;
  fs.rename = async (from, to) => {
    if (!failed && to === p.topics.pendingFile && from.endsWith('.collection-next')) { failed = true; throw Error('Synthetic second draft write failure'); }
    return rename(from, to);
  };
  try { await assert.rejects(p.saveCollection({ key: created.key, metadata: { title: 'Must roll back' }, notes: ['work:cloud'] }), /second draft write failure/); }
  finally { fs.rename = rename; }
  assert.deepEqual(await drafts(), before); assert.equal(await fs.stat(p.collectionEditor.journal).catch(() => null), null);
});

test('startup restores both private drafts after interruption between their replacements', async t => {
  const { p, site, vault, state, drafts } = await fixture(t);
  await p.saveCollection(input()); const before = await drafts();
  await fs.writeFile(p.collectionEditor.journal, JSON.stringify({ version: 1, before }));
  await fs.writeFile(p.contentSettings.pendingFile, JSON.stringify({ version: 1, entries: {}, collections: {} }));
  const restarted = new Publisher({ site, vault, state }); await restarted.init(); await restarted.init();
  assert.deepEqual(await drafts(), before); assert.equal(await fs.stat(p.collectionEditor.journal).catch(() => null), null);
});

test('choosing an independent image clears inherited hero video without changing the source article', async t => {
  const { p, site, write } = await fixture(t);
  const raw = '---\ntitle: Existing cloud collection\nsummary: Learning notes\nyear: 2025\nworkType: collection\ncover: /covers/old-poster.jpg\ncoverVideo: /assets/cloud.mp4\nnotes: [perlin]\n---\nKeep original video metadata';
  await write('src/content/work/video-collection.md', raw); await p.scan();
  await p.saveCollection({ key: 'video-collection', metadata: { cover: '/covers/collection.svg' }, notes: ['notes:perlin'] });
  const scan = await p.scan(), collection = scan.siteContent.find(entry => entry.key === 'work:video-collection');
  assert.equal(collection.metadata.coverVideo, ''); assert.equal(collection.currentMetadata.coverVideo, '/assets/cloud.mp4');
  assert.equal(await fs.readFile(path.join(site, 'src/content/work/video-collection.md'), 'utf8'), raw);
});

test('collection video pairing survives draft edits and apply, and the same poster can become static', async t => {
  const { p, write } = await fixture(t);
  await write('public/assets/cloud.mp4', 'synthetic video');
  await write('src/content/work/cloud.md', '---\ntitle: Cloud article\nyear: 2025\nsummary: Cloud implementation\nworkType: single\ncover: /covers/collection.svg\ncoverVideo: /assets/cloud.mp4\n---\nOriginal complete cloud body');
  await p.scan();
  const request = input(); request.metadata.coverVideo = '/assets/cloud.mp4';
  const created = await p.saveCollection(request); await p.scan();
  let catalog = await p.topics.scan(p.topicSources());
  assert.equal(catalog.topics.find(topic => topic.key === created.key).coverVideo, '/assets/cloud.mp4');
  assert.equal(catalog.articles.find(article => article.key === 'work:cloud').coverVideo, '/assets/cloud.mp4');
  const renamed = await p.saveCollection({ key: created.key, metadata: { title: 'Renamed clouds' }, notes: ['work:cloud'] });
  assert.equal(renamed.metadata.coverVideo, '/assets/cloud.mp4');
  const plan = await p.analyze(); assert.deepEqual(plan.errors, []); await p.apply((await p.prepare(plan.id, [])).id);
  const current = JSON.parse(await fs.readFile(p.contentSettings.file, 'utf8'));
  assert.equal(current.collections[created.id].coverVideo, '/assets/cloud.mp4');
  assert.equal(current.entries[created.key].coverVideo, '/assets/cloud.mp4');
  await p.scan();
  await p.saveCollection({ key: created.key, metadata: { cover: request.metadata.cover, coverVideo: '' }, notes: ['work:cloud'] });
  await p.scan();
  catalog = await p.topics.scan(p.topicSources());
  assert.equal(catalog.topics.find(topic => topic.key === created.key).coverVideo, '', 'explicit static selection suppresses member-video inference');
  assert.equal(catalog.articles.find(article => article.key === 'work:cloud').coverVideo, '/assets/cloud.mp4', 'choosing a still collection cover must preserve the child video');
});

test('legacy inferred collection video survives metadata-only edits and clears after a cover replacement', async t => {
  const { p, write } = await fixture(t);
  await write('public/assets/cloud.mp4', 'synthetic video');
  await write('src/content/work/cloud.md', '---\ntitle: Cloud article\nyear: 2025\nsummary: Cloud implementation\nworkType: single\ncover: /covers/collection.svg\ncoverVideo: /assets/cloud.mp4\n---\nOriginal complete cloud body');
  await write('src/content/work/legacy-video.md', '---\ntitle: Legacy video collection\nsummary: Collection summary\nyear: 2025\nworkType: collection\ncover: /covers/collection.svg\nnotes: ["work:cloud"]\n---\nOriginal collection');
  await p.scan();
  const saved = await p.saveCollection({ key: 'legacy-video', metadata: { title: 'New title' }, notes: ['work:cloud'] });
  assert.equal(saved.metadata.coverVideo, '/assets/cloud.mp4');
  await p.scan();
  const staticCover = await p.saveCollection({ key: 'legacy-video', metadata: { cover: '/covers/alternate.svg' }, notes: ['work:cloud'] });
  assert.equal(staticCover.metadata.coverVideo, '');
  await p.scan();
  assert.equal((await p.topics.scan(p.topicSources())).topics.find(topic => topic.key === 'legacy-video').coverVideo, '');
});

test('collection HTTP save validates poster/video pairs before writing either private draft', { timeout: 15000 }, async t => {
  const { p, site, vault, state, write, drafts } = await fixture(t);
  await write('public/assets/cloud.mp4', 'synthetic video');
  await write('src/content/work/cloud.md', '---\ntitle: Cloud article\nyear: 2025\nsummary: Cloud implementation\nworkType: single\ncover: /covers/collection.svg\ncoverVideo: /assets/cloud.mp4\n---\nOriginal complete cloud body');
  const probe = net.createServer(); probe.listen(0, '127.0.0.1'); await once(probe, 'listening');
  const port = probe.address().port; await new Promise(resolve => probe.close(resolve));
  const child = spawn(process.execPath, [fileURLToPath(new URL('./server.mjs', import.meta.url))], { windowsHide: true, env: { ...process.env, PUBLISHER_SITE: site, PUBLISHER_VAULT: vault, PUBLISHER_STATE: state, PUBLISHER_PORT: String(port) }, stdio: ['ignore', 'pipe', 'pipe'] });
  let logs = ''; child.stderr.on('data', data => { logs += data; });
  t.after(async () => { if (child.exitCode === null) { const stopped = once(child, 'exit'); child.kill(); await stopped; } });
  await Promise.race([once(child.stdout, 'data'), once(child, 'exit').then(() => { throw Error(logs); })]);
  const base = `http://127.0.0.1:${port}`, html = await fetch(base).then(response => response.text()), token = html.match(/const token='([a-f0-9]+)'/)[1];
  const headers = { 'X-Publisher-Token': token, Origin: base, 'Content-Type': 'application/json' };
  assert.equal((await fetch(base + '/api/scan', { headers })).status, 200);
  const post = value => fetch(base + '/api/collection-editor', { method: 'POST', headers, body: JSON.stringify(value) });
  const before = await drafts(), invalid = input(); invalid.metadata.cover = '/covers/alternate.svg'; invalid.metadata.coverVideo = '/assets/cloud.mp4';
  const rejected = await post(invalid); assert.equal(rejected.status, 400); assert.match((await rejected.json()).error, /不匹配/);
  assert.deepEqual(await drafts(), before);
  const valid = input(); valid.metadata.coverVideo = '/assets/cloud.mp4';
  const response = await post(valid); assert.equal(response.status, 200); const saved = await response.json();
  assert.equal(saved.metadata.coverVideo, '/assets/cloud.mp4');
  assert.equal(JSON.parse((await drafts()).content).collections[saved.id].coverVideo, '/assets/cloud.mp4');
  const catalog = await fetch(base + '/api/topics', { headers }).then(response => response.json());
  assert.equal(catalog.topics.find(topic => topic.key === saved.key).coverVideo, '/assets/cloud.mp4');
  const cleared = await post({ key: saved.key, metadata: { cover: valid.metadata.cover, coverVideo: '' }, notes: valid.notes });
  assert.equal(cleared.status, 200); assert.equal((await cleared.json()).metadata.coverVideo, '');
  assert.equal(JSON.parse((await drafts()).content).entries[saved.key].coverVideo, '');
});
