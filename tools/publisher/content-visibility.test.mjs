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

const raw = (title, extra = '', body = 'A complete article about rendering algorithms, material passes and the implementation details that make this example unique.') => `---\ntitle: ${title}\ndate: 2025-01-01\n${extra}---\n${body}`;
async function fixture(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'publisher-visibility-'));
  t.after(() => fs.rm(root, { recursive: true, force: true, maxRetries: 4, retryDelay: 100 }));
  const site = path.join(root, 'site'), vault = path.join(root, 'vault'), state = path.join(root, 'state');
  await fs.mkdir(site); await fs.mkdir(vault);
  const write = async (base, name, value) => { const file = path.join(base, name); await fs.mkdir(path.dirname(file), { recursive: true }); await fs.writeFile(file, value); return file; };
  const p = new Publisher({ site, vault, state }); await p.init();
  const apply = async () => { const plan = await p.analyze(); assert.deepEqual(plan.errors, []); await p.apply((await p.prepare(plan.id, plan.assets.map(asset => asset.key))).id); return plan; };
  const pending = () => fs.readFile(p.contentSettings.pendingFile, 'utf8').catch(error => { if (error.code === 'ENOENT') return null; throw error; });
  const entry = key => p.siteContent.find(entry => entry.active && (entry.canonicalKey === key || entry.key === key));
  return { p, site, vault, state, write, apply, pending, entry };
}

test('website removal and restoration stage privately, preserve files, and appear in deployment review', async t => {
  const { p, site, write, apply, entry } = await fixture(t);
  const original = raw('Existing article', 'tech: [OldTag]\n'), file = await write(site, 'src/content/notes/existing.md', original);
  await p.scan();
  await p.saveVisibility({ key: 'notes:existing', withdrawn: true });
  let scan = await p.scan();
  assert.equal(scan.siteContent[0].metadata.withdrawn, true); assert.equal(scan.siteContent[0].currentMetadata.withdrawn, undefined);
  assert.equal(await fs.stat(p.contentSettings.file).catch(() => null), null);
  await assert.rejects(p.assertApplied(), /尚未写入本地预览/);
  let plan = await apply();
  assert.equal(plan.changes.contentSettings[0].visibilityAction, 'withdraw');
  assert.equal(await fs.readFile(file, 'utf8'), original);
  await p.scan(); await p.assertApplied();
  assert.equal(entry('notes:existing').currentMetadata.withdrawn, true);
  assert.equal((await p.catalog()).tags.some(tag => tag.value === 'OldTag'), false);
  assert.equal((await p.topics.scan(p.topicSources())).articles.length, 0);
  await p.saveVisibility({ key: 'notes:existing', withdrawn: false });
  plan = await apply(); assert.equal(plan.changes.contentSettings[0].visibilityAction, 'restore');
  scan = await p.scan(); assert.equal(scan.siteContent[0].metadata.withdrawn, false);
  assert.equal((await p.catalog()).tags.find(tag => tag.value === 'OldTag').count, 1);
  assert.equal(await fs.readFile(file, 'utf8'), original);
  await p.assertApplied();
});

test('cancelling removal or restoration removes only the visibility delta, leaving other edits intact', async t => {
  const { p, site, write, apply, pending } = await fixture(t);
  await write(site, 'src/content/notes/a.md', raw('Article A'));
  await write(site, 'src/content/notes/b.md', raw('Article B'));
  await p.scan(); await p.saveVisibility({ keys: ['notes:a', 'notes:b'], withdrawn: true }); await p.scan();
  await p.saveVisibility({ keys: ['notes:a', 'notes:b'], withdrawn: false });
  assert.equal(await pending(), null); assert.equal((await p.scan()).contentSettings.pending, false);
  assert.deepEqual((await p.analyze()).changes.contentSettings, []);
  await p.contentSettings.save({ key: 'notes:a', metadata: { title: 'Keep this title' } }, p.siteContent);
  await p.scan(); await p.saveVisibility({ key: 'notes:a', withdrawn: true }); await p.scan();
  await p.saveVisibility({ key: 'notes:a', withdrawn: false });
  assert.deepEqual(JSON.parse(await pending()).entries, { 'notes:a': { title: 'Keep this title' } });
  assert.equal((await p.analyze()).changes.contentSettings[0].visibilityAction, undefined);
  await p.scan(); await p.saveVisibility({ key: 'notes:a', withdrawn: true }); await apply(); await p.scan();
  await p.saveVisibility({ key: 'notes:a', withdrawn: false }); await p.scan();
  await p.saveVisibility({ key: 'notes:a', withdrawn: true });
  assert.equal(await pending(), null); assert.equal((await p.scan()).contentSettings.pending, false);
  await p.assertApplied();
});

test('selected synchronized replacements stay removed without changing the generated article or manifest digest', async t => {
  const { p, site, vault, write, apply, entry } = await fixture(t);
  const source = raw('Rendering article', 'tech: [RenderTag]\n');
  const original = await write(site, 'src/content/notes/original.md', source);
  const vaultFile = await write(vault, 'Article.md', source);
  await p.scan(); await p.select(['Article.md']);
  assert.equal(p.db.entries['Article.md'].siteLink, 'notes:original');
  await apply(); await p.scan();
  const published = entry('notes:original'), generated = path.join(site, published.path);
  const generatedBefore = await fs.readFile(generated, 'utf8'), manifestBefore = (await p.manifest()).notes;
  const result = await p.saveVisibility({ keys: ['notes:original', published.key], withdrawn: true });
  assert.deepEqual(result.keys, ['notes:original'], 'replacement and original aliases must form one change');
  const plan = await apply(); assert.deepEqual(plan.changes.updated, []);
  assert.equal(await fs.readFile(generated, 'utf8'), generatedBefore);
  assert.deepEqual((await p.manifest()).notes, manifestBefore);
  await p.scan();
  assert.equal(entry('notes:original').metadata.withdrawn, true);
  assert.deepEqual(p.db.selected, ['Article.md']);
  assert.equal((await p.catalog()).tags.some(tag => tag.value === 'RenderTag'), false, 'linked local source cannot restore hidden tag counts');
  assert.equal((await p.topics.scan(p.topicSources())).articles.length, 0);
  assert.equal(await fs.readFile(original, 'utf8'), source); assert.equal(await fs.readFile(vaultFile, 'utf8'), source);
  await p.assertApplied();
  await fs.writeFile(vaultFile, source.replace('date: 2025-01-01', 'date: 2025-01-01\npublish: false'));
  await p.scan();
  await assert.rejects(p.saveVisibility({ key: 'notes:original', withdrawn: false }), /草稿或禁止发布/);
  await assert.rejects(p.contentSettings.save({ key: 'notes:original', metadata: { withdrawn: false } }, p.siteContent), /移除或恢复/);
  await assert.rejects(p.select([], {}, { 'Article.md': { withdrawn: false } }), /移除或恢复/);
  assert.equal(entry('notes:original').metadata.withdrawn, true);
});

test('removed collection members retain relationships and can be restored, while missing references still fail review', async t => {
  const { p, site, write, apply } = await fixture(t);
  await write(site, 'public/covers/group.svg', '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"/>');
  await write(site, 'src/content/notes/a.md', raw('Member A', '', 'Member A body'));
  await write(site, 'src/content/notes/b.md', raw('Member B', '', 'Member B body'));
  await p.scan();
  const created = await p.saveCollection({ metadata: { title: 'Collection', summary: 'Ordered articles', cover: '/covers/group.svg' }, notes: ['notes:a', 'notes:b'] });
  await apply(); await p.scan();
  await p.saveVisibility({ key: 'notes:a', withdrawn: true }); await p.scan();
  let catalog = await p.topics.scan(p.topicSources()), topic = catalog.topics.find(topic => topic.key === created.key);
  assert.deepEqual(topic.notes, ['notes:a', 'notes:b']); assert.deepEqual(topic.visibleNotes, ['notes:b']);
  assert.equal(catalog.articles.some(article => article.key === 'notes:a'), false);
  assert.equal(catalog.withdrawnArticles.find(article => article.key === 'notes:a').title, 'Member A');
  await p.saveCollection({ key: created.key, metadata: { title: 'Updated collection' }, notes: ['notes:b', 'notes:a'] });
  await p.scan();
  await p.topics.save({ key: created.key, title: 'Updated collection', summary: 'Ordered articles', notes: ['notes:b', 'notes:a'] }, p.topicSources());
  await p.topics.snapshot(p.topicSources());
  await assert.rejects(p.topics.snapshot(p.topicSources().filter(entry => entry.key !== 'notes:a')), /已缺失|不再公开/);
  await assert.rejects(p.saveCollection({ metadata: { title: 'Other', summary: 'New collection', cover: '/covers/group.svg' }, notes: ['notes:a'] }), /成员无效/);
  await apply(); await p.scan();
  await p.saveVisibility({ key: 'notes:a', withdrawn: false }); await apply(); await p.scan();
  catalog = await p.topics.scan(p.topicSources()); topic = catalog.topics.find(topic => topic.key === created.key);
  assert.deepEqual(topic.notes, ['notes:b', 'notes:a']); assert.deepEqual(topic.visibleNotes, topic.notes);
  await p.saveVisibility({ key: created.key, withdrawn: true }); await apply(); await p.scan();
  catalog = await p.topics.scan(p.topicSources());
  assert.equal(catalog.topics.find(topic => topic.key === created.key).withdrawn, true);
  assert.deepEqual(catalog.articles.map(article => article.key), ['notes:a', 'notes:b'], 'removing a collection must not remove its children');
});

test('batch visibility validates all entries before writing and rejects invalid requests or source drafts', async t => {
  const { p, site, write, pending } = await fixture(t);
  await write(site, 'src/content/notes/a.md', raw('Article A'));
  await write(site, 'src/content/notes/draft.md', raw('Source draft', 'draft: true\n'));
  await p.scan();
  for (const request of [
    { keys: ['notes:a', 'notes:missing'], withdrawn: true }, { keys: ['notes:a', 'notes:draft'], withdrawn: false },
    { key: 'notes:a', keys: ['notes:a'], withdrawn: true }, { withdrawn: true }, { keys: [], withdrawn: true },
    { keys: Array(501).fill('notes:a'), withdrawn: true }, { key: 'notes:a', withdrawn: 'true' },
    { key: 'notes:a', withdrawn: true, unexpected: true }, { keys: ['notes:a', null], withdrawn: true },
  ]) { await assert.rejects(p.saveVisibility(request)); assert.equal(await pending(), null); }
  await p.contentSettings.save({ key: 'notes:a', metadata: { tags: ['Keep'] } }, p.siteContent);
  const before = await pending();
  await assert.rejects(p.saveVisibility({ keys: ['notes:a', 'notes:missing'], withdrawn: true })); assert.equal(await pending(), before);
  await p.saveVisibility({ keys: ['notes:a', 'notes:a'], withdrawn: true });
  assert.deepEqual(JSON.parse(await pending()).entries, { 'notes:a': { tags: ['Keep'], withdrawn: true } });
});

test('restoring a linked website article rechecks source publishing flags before saving and applying', async t => {
  const { p, site, vault, write, apply, pending } = await fixture(t);
  const source = raw('Linked article');
  await write(site, 'src/content/notes/linked.md', source);
  const vaultFile = await write(vault, 'Linked.md', source);
  await p.scan(); assert.equal(p.db.entries['Linked.md'].siteLink, 'notes:linked');
  await p.saveVisibility({ key: 'notes:linked', withdrawn: true }); await apply(); await p.scan();
  await fs.writeFile(vaultFile, source.replace('date: 2025-01-01', 'date: 2025-01-01\ndraft: true'));
  await assert.rejects(p.saveVisibility({ key: 'notes:linked', withdrawn: false }), /草稿或禁止发布/);
  assert.equal(await pending(), null);
  await fs.writeFile(vaultFile, source);
  await p.saveVisibility({ key: 'notes:linked', withdrawn: false });
  const plan = await p.analyze(); assert.deepEqual(plan.errors, []); assert.deepEqual(plan.selected, []);
  assert.ok(plan.sources.some(item => item.path === 'Linked.md'));
  const stage = await p.prepare(plan.id, []);
  await fs.writeFile(vaultFile, source.replace('date: 2025-01-01', 'date: 2025-01-01\npublish: false'));
  await assert.rejects(p.apply(stage.id), /源文件已变化/);
  assert.equal(JSON.parse(await fs.readFile(p.contentSettings.file, 'utf8')).entries['notes:linked'].withdrawn, true);
  const rejectedPlan = await p.analyze(); assert.ok(rejectedPlan.errors.some(error => /草稿或禁止发布/.test(error.message)));
});

test('cancelling an unapplied removal remains possible after the linked source becomes a draft', async t => {
  const { p, site, vault, write, pending } = await fixture(t);
  const source = raw('Existing linked article');
  const websiteFile = await write(site, 'src/content/notes/linked.md', source);
  const vaultFile = await write(vault, 'Linked.md', source);
  await p.scan(); assert.equal(p.db.entries['Linked.md'].siteLink, 'notes:linked');
  await p.saveVisibility({ key: 'notes:linked', withdrawn: true });
  await fs.writeFile(vaultFile, source.replace('date: 2025-01-01', 'date: 2025-01-01\ndraft: true'));
  await p.saveVisibility({ key: 'notes:linked', withdrawn: false });
  assert.equal(await pending(), null);
  const scan = await p.scan(); assert.equal(scan.contentSettings.pending, false);
  assert.equal(scan.siteContent[0].metadata.withdrawn, undefined);
  assert.deepEqual((await p.analyze()).changes.contentSettings, []);
  assert.equal(await fs.stat(p.contentSettings.file).catch(() => null), null);
  assert.equal(await fs.readFile(websiteFile, 'utf8'), source);
  assert.deepEqual(p.db.selected, []);
});

test('content visibility HTTP endpoint supports atomic batch changes and cancellation with a complete inventory', { timeout: 15000 }, async t => {
  const { site, vault, state, write, pending } = await fixture(t);
  await write(site, 'src/content/notes/a.md', raw('Article A'));
  await write(site, 'src/content/notes/b.md', raw('Article B'));
  const probe = net.createServer(); probe.listen(0, '127.0.0.1'); await once(probe, 'listening');
  const port = probe.address().port; await new Promise(resolve => probe.close(resolve));
  const child = spawn(process.execPath, [fileURLToPath(new URL('./server.mjs', import.meta.url))], { windowsHide: true, env: { ...process.env, PUBLISHER_SITE: site, PUBLISHER_VAULT: vault, PUBLISHER_STATE: state, PUBLISHER_PORT: String(port) }, stdio: ['ignore', 'pipe', 'pipe'] });
  let logs = ''; child.stderr.on('data', data => { logs += data; });
  t.after(async () => { if (child.exitCode === null) { const stopped = once(child, 'exit'); child.kill(); await stopped; } });
  await Promise.race([once(child.stdout, 'data'), once(child, 'exit').then(() => { throw Error(logs); })]);
  const base = `http://127.0.0.1:${port}`, html = await fetch(base).then(response => response.text()), token = html.match(/const token='([a-f0-9]+)'/)[1];
  const headers = { 'X-Publisher-Token': token, Origin: base, 'Content-Type': 'application/json' };
  assert.equal((await fetch(base + '/api/scan', { headers })).status, 200);
  const post = value => fetch(base + '/api/content-visibility', { method: 'POST', headers, body: JSON.stringify(value) });
  const invalid = await post({ keys: ['notes:a', 'notes:missing'], withdrawn: true }); assert.equal(invalid.status, 400); assert.equal(await pending(), null);
  const response = await post({ keys: ['notes:a', 'notes:b'], withdrawn: true }); assert.equal(response.status, 200);
  const scan = await response.json(); assert.equal(scan.siteContent.length, 2); assert.ok(scan.siteContent.every(entry => entry.metadata.withdrawn === true));
  assert.equal(scan.contentSettings.pending, true); assert.deepEqual(scan.selected, []);
  const cancelled = await post({ keys: ['notes:a', 'notes:b'], withdrawn: false }); assert.equal(cancelled.status, 200);
  assert.equal((await cancelled.json()).contentSettings.pending, false); assert.equal(await pending(), null);
});
