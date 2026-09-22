import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
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
  assert.equal(collection.metadata.coverVideo, undefined); assert.equal(collection.currentMetadata.coverVideo, '/assets/cloud.mp4');
  assert.equal(await fs.readFile(path.join(site, 'src/content/work/video-collection.md'), 'utf8'), raw);
});
