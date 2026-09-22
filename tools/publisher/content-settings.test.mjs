import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { Publisher, frontmatter } from './core.mjs';

async function fixture(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'publisher-settings-'));
  t.after(() => fs.rm(root, { recursive: true, force: true, maxRetries: 4, retryDelay: 100 }));
  const site = path.join(root, 'site'), vault = path.join(root, 'vault'), state = path.join(root, 'state');
  await fs.mkdir(site); await fs.mkdir(vault);
  const p = new Publisher({ site, vault, state }); await p.init();
  const write = async (root, name, body) => { const file = path.join(root, name); await fs.mkdir(path.dirname(file), { recursive: true }); await fs.writeFile(file, body); return file; };
  return { root, site, vault, state, p, write };
}
const raw = (title, body, extra = '') => `---\ntitle: ${title}\ndate: 2025-03-04\n${extra}---\n${body}`;
const body = 'This article explains material sorting, depth testing and rendering passes with a complete account of the implementation.';

test('website-only settings stage privately, publish without a vault match, preserve source and roll back failed builds', async t => {
  const { p, site, write } = await fixture(t);
  const original = raw('Existing', body, 'tags: [Old]\n');
  const file = await write(site, 'src/content/notes/existing.md', original);
  let scan = await p.scan(); assert.equal(scan.notes.length, 0);
  await p.contentSettings.save({ key: 'notes:existing', metadata: { title: 'New title', section: 'tutorials', series: 'Rendering', order: 2, tags: ['Shader'] } }, p.siteContent);
  scan = await p.scan();
  assert.equal(scan.siteContent[0].metadata.title, 'New title'); assert.equal(scan.siteContent[0].currentMetadata.title, 'Existing');
  assert.equal(scan.contentSettings.pending, true); assert.equal(scan.contentSettings.entries[0].pending, true);
  assert.ok(scan.catalog.tags.some(tag => tag.value === 'Shader'));
  assert.equal(await fs.stat(p.contentSettings.file).catch(() => null), null);
  const plan = await p.analyze(); assert.deepEqual(plan.errors, []); assert.equal(plan.changes.contentSettings.length, 1);
  assert.deepEqual(plan.changes.added, []); assert.deepEqual(plan.selected, []);
  let stage = await p.prepare(plan.id, []);
  await assert.rejects(p.apply(stage.id, async () => { throw Error('Synthetic failed build'); }), /failed build/);
  assert.equal(await fs.stat(p.contentSettings.file).catch(() => null), null);
  assert.ok(await fs.stat(p.contentSettings.pendingFile));
  stage = await p.prepare(plan.id, []); await p.apply(stage.id);
  assert.equal((await p.scan()).contentSettings.pending, false);
  assert.equal(JSON.parse(await fs.readFile(p.contentSettings.file, 'utf8')).entries['notes:existing'].series, 'Rendering');
  assert.equal(await fs.readFile(file, 'utf8'), original);
});

test('unified settings win over inherited source and legacy private overrides through replacement and restart', async t => {
  const { p, site, vault, state, write } = await fixture(t);
  await write(site, 'src/content/notes/existing.md', raw('Website title', body, 'tags: [Site]\n'));
  const source = raw('Local title', body, 'tags: [Local]\n'); await write(vault, 'A.md', source);
  await p.scan(); await p.select(['A.md'], {}, { 'A.md': { title: 'Old private title', tags: ['Private'] } });
  await p.contentSettings.save({ key: 'notes:existing', metadata: { title: 'Unified title', tags: ['Unified'], section: 'tutorials', series: 'Study' } }, p.siteContent);
  let scan = await p.scan(); assert.equal(scan.notes[0].metadata.title, 'Unified title'); assert.deepEqual(scan.notes[0].metadata.tags, ['Unified']);
  assert.deepEqual(scan.selected, ['A.md']);
  const plan = await p.analyze(); assert.deepEqual(plan.errors, []);
  const meta = frontmatter(plan.output[0].markdown).data;
  assert.equal(meta.title, 'Unified title'); assert.equal(meta.replaces, 'notes:existing'); assert.equal(meta.legacyUrl, '/notes/existing/');
  await p.apply((await p.prepare(plan.id, [])).id);
  const restarted = new Publisher({ site, vault, state }); await restarted.init(); scan = await restarted.scan();
  const replacement = scan.siteContent.find(entry => entry.collection === 'published');
  assert.equal(replacement.canonicalKey, 'notes:existing'); assert.equal(replacement.metadata.title, 'Unified title');
  assert.equal(scan.notes[0].status, '已生成副本'); assert.deepEqual(scan.selected, ['A.md']);
  assert.equal(await fs.readFile(path.join(vault, 'A.md'), 'utf8'), source);
});

test('new collection participates in topic editing and atomically installs both relationship and metadata configs', async t => {
  const { p, site, write } = await fixture(t);
  await write(site, 'src/content/notes/article.md', raw('Child article', body)); await p.scan();
  const created = await p.contentSettings.createCollection({ title: 'Rendering project', summary: 'A collection of implementation articles', year: 2025 });
  const scan = await p.scan(), collection = scan.siteContent.find(entry => entry.key === created.key);
  assert.equal(collection.collection, 'collections'); assert.equal(collection.pending, true); assert.equal(collection.linkable, false);
  assert.equal(collection.metadata.workType, 'collection'); assert.match(collection.url, /^\/work\/collection-/);
  await p.topics.save({ key: created.key, title: collection.title, summary: collection.metadata.summary, notes: ['notes:article'] }, p.topicSources());
  const plan = await p.analyze(); assert.deepEqual(plan.errors, []); assert.equal(plan.changes.contentSettings[0].added, true);
  await p.apply((await p.prepare(plan.id, [])).id);
  assert.equal((await p.topics.scan(p.topicSources())).topics[0].key, created.key);
  assert.deepEqual(JSON.parse(await fs.readFile(p.topics.file, 'utf8')).topics[created.key].notes, ['notes:article']);
  assert.equal(JSON.parse(await fs.readFile(p.contentSettings.file, 'utf8')).collections[created.id].title, 'Rendering project');
});

test('a reviewed website-only edit rejects source or settings changes and preserves external config on rollback', async t => {
  const { p, site, write, state } = await fixture(t);
  const file = await write(site, 'src/content/notes/article.md', raw('Article', body)); await p.scan();
  await p.contentSettings.save({ key: 'notes:article', metadata: { title: 'Reviewed title' } }, p.siteContent);
  const plan = await p.analyze(), stage = await p.prepare(plan.id, []);
  await fs.appendFile(file, '\nExternal content change'); await assert.rejects(p.apply(stage.id), /网站文章已改变/);
  await fs.writeFile(file, raw('Article', body));
  const external = JSON.stringify({ version: 1, entries: { 'notes:article': { title: 'External title' } }, collections: {} });
  await assert.rejects(p.apply(stage.id, async () => { await fs.writeFile(p.contentSettings.file, external); }), /内容设置已改变.*contentSettings-conflict/s);
  assert.equal(await fs.stat(p.contentSettings.file).catch(() => null), null);
  const backups = await fs.readdir(path.join(state, 'backups'));
  const preserved = await fs.readFile(path.join(state, 'backups', backups[0], 'contentSettings-conflict.json'), 'utf8');
  assert.equal(preserved, external);
  await p.contentSettings.save({ key: 'notes:article', metadata: { title: 'Later title' } }, p.siteContent);
  await assert.rejects(p.prepare(plan.id, []), /内容设置已改变/);
});

test('virtual collections retain their content type while ordinary metadata remains editable', async t => {
  const {p}=await fixture(t);
  const created=await p.contentSettings.createCollection({title:'Collection',summary:'Collection summary'});
  await p.scan();
  const before=await fs.readFile(p.contentSettings.pendingFile,'utf8');
  for(const metadata of [{section:'notes'},{section:'tutorials',series:'Study'},{workType:'single'},{workType:''}]){
    await assert.rejects(p.contentSettings.save({key:created.key,metadata},p.siteContent),/不能改为/);
    assert.equal(await fs.readFile(p.contentSettings.pendingFile,'utf8'),before,'Invalid conversions cannot change the saved draft');
  }
  await p.contentSettings.save({key:created.key,metadata:{title:'Edited collection',section:'work',workType:'collection'}},p.siteContent);
  const entry=(await p.scan()).siteContent.find(entry=>entry.key===created.key);
  assert.equal(entry.title,'Edited collection');assert.equal(entry.section,'work');assert.equal(entry.metadata.workType,'collection');
});

test('settings validate series membership, cover paths and content identities', async t => {
  const { p, site, write } = await fixture(t);
  await write(site, 'src/content/notes/article.md', raw('Article', body)); await p.scan();
  await assert.rejects(p.contentSettings.save({ key: 'notes:missing', metadata: {} }, p.siteContent), /找不到/);
  await assert.rejects(p.contentSettings.save({ key: 'notes:article', metadata: { section: 'tutorials' } }, p.siteContent), /选择或创建/);
  await assert.rejects(p.contentSettings.save({ key: 'notes:article', metadata: { cover: 'private/picture.png' } }, p.siteContent), /网站内图片/);
  await assert.rejects(p.contentSettings.save({ key: 'notes:article', metadata: { workType: 'invalid' } }, p.siteContent), /作品类型/);
  await assert.rejects(p.contentSettings.createCollection({ title: 'Blank', summary: '' }), /摘要/);
  await assert.rejects(p.contentSettings.createCollection({ title: 'Work', summary: 'Valid', cover: '//invalid' }), /封面/);
});

test('reconciliation leaves duplicate bodies, changed media, tiny boilerplate and explicit unlinking unresolved', async t => {
  const { p, site, vault, write } = await fixture(t);
  await write(site, 'src/content/notes/article.md', raw('Article', body + '\n\n![](/assets/same.png)'));
  await write(vault, 'A.md', raw('Local A', body + '\n\n![](same.png)'));
  await write(vault, 'B.md', raw('Local B', body + '\n\n![](same.png)'));
  let scan = await p.scan(); assert.equal(scan.notes.every(note => note.siteMatch.state === 'candidate'), true);
  await fs.unlink(path.join(vault, 'B.md')); scan = await p.scan(); assert.equal(scan.notes[0].siteMatch.automatic, true);
  await p.linkSite('A.md', null); assert.equal((await p.scan()).notes[0].siteMatch.state, 'candidate');
  await write(vault, 'A.md', raw('Local A', body + '\n\n![](different.png)')); delete p.db.entries['A.md'].siteLinkIgnored;
  assert.equal((await p.scan()).notes[0].siteMatch.state, 'candidate');
  await write(site, 'src/content/notes/tiny.md', raw('Short', 'Work in progress')); await write(vault, 'Tiny.md', raw('Short', 'Work in progress'));
  scan = await p.scan(); assert.equal(scan.notes.find(note => note.path === 'Tiny.md').siteMatch.state, 'candidate');
});

test('an imported collection can use the existing website placeholder without treating it as a vault attachment', async t => {
  const { p, site, vault, write } = await fixture(t);
  await write(site, 'public/covers/placeholder.svg', '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><rect width="20" height="20" fill="green"/></svg>');
  await write(vault, 'A.md', body); await p.scan();
  await p.select(['A.md'], {}, { 'A.md': { section: 'work', workType: 'collection', title: 'Collection', summary: 'Existing public illustration', cover: '/covers/placeholder.svg' } });
  const plan = await p.analyze(); assert.deepEqual(plan.errors, []); assert.deepEqual(plan.assets, []);
  assert.equal(frontmatter(plan.output[0].markdown).data.cover, '/covers/placeholder.svg');
  assert.equal(frontmatter(plan.output[0].markdown).data.workType, 'collection');
});
