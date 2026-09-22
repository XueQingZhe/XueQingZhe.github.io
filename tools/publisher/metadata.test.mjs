import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import sharp from 'sharp';
import { Publisher, frontmatter } from './core.mjs';

async function fixture(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'publisher-metadata-'));
  t.after(() => fs.rm(root, { recursive: true, force: true, maxRetries: 4, retryDelay: 100 }));
  const vault = path.join(root, 'vault'), site = path.join(root, 'site'), state = path.join(root, 'private');
  await fs.mkdir(vault); await fs.mkdir(site);
  const p = new Publisher({ vault, site, state }); await p.init();
  const write = async (name, body) => { const dest = path.join(vault, name); await fs.mkdir(path.dirname(dest), { recursive: true }); await fs.writeFile(dest, body); };
  return { p, vault, site, state, write };
}

test('three sections inherit source metadata and retain multi-word tags and permanent URLs', async t => {
  const { p, write, vault, site } = await fixture(t);
  const raw = '---\ntitle: 原标题\ndate: 2024-03-02\nkind: tutorial\ntags: [Real Time Rendering, Shader]\nseries: 入门\norder: 2\n---\n正文';
  await write('nested/one.md', raw);
  await write('two.md', '[[nested/one]]');
  let result = await p.scan();
  const source = result.notes.find(n => n.path === 'nested/one.md');
  assert.deepEqual(result.sections.map(s => s.value), ['notes', 'tutorials', 'work']);
  assert.equal(source.metadata.section, 'tutorials');
  assert.deepEqual(source.metadata.tags, ['Real Time Rendering', 'Shader']);
  assert.deepEqual(source.metadataOverride, {});
  assert.deepEqual(source.sourceMetadata, source.metadata);
  const slug = source.slug;
  await p.select(['nested/one.md', 'two.md']);
  let plan = await p.analyze();
  assert.deepEqual(plan.errors, []);
  assert.equal(plan.output[0].kind, 'tutorial');
  assert.match(plan.output[1].markdown, new RegExp(`/notes/${slug}/`));
  assert.deepEqual(frontmatter(plan.output[0].markdown).data.tech, ['Real Time Rendering', 'Shader']);

  await p.select(['nested/one.md', 'two.md'], {}, { 'nested/one.md': { section: 'work', title: '独立作品', summary: '作品说明', cover: 'https://example.com/cover.png', engine: ['Unreal Engine'], role: ['Technical Artist'], year: 2025, featured: true, tags: ['Screen Space', 'Shader'] } });
  result = await p.scan();
  const edited = result.notes.find(n => n.path === 'nested/one.md');
  assert.equal(edited.metadata.title, '独立作品');
  assert.equal(edited.sourceMetadata.title, '原标题');
  assert.equal(edited.metadata.date, '2024-03-02');
  assert.deepEqual(result.metadata['nested/one.md'], edited.metadataOverride);
  plan = await p.analyze();
  assert.deepEqual(plan.errors, []);
  const meta = frontmatter(plan.output[0].markdown).data;
  assert.equal(meta.section, 'work'); assert.equal(meta.kind, 'work');
  assert.equal(meta.title, '独立作品'); assert.equal(meta.year, 2025); assert.equal(meta.featured, true);
  assert.deepEqual(meta.tech, ['Screen Space', 'Shader']);
  assert.deepEqual(meta.engine, ['Unreal Engine']); assert.deepEqual(meta.role, ['Technical Artist']);
  assert.match(plan.output[1].markdown, new RegExp(`/notes/${slug}/`));
  const stage = await p.prepare(plan.id, []); await p.apply(stage.id);
  assert.equal(await fs.readFile(path.join(vault, 'nested/one.md'), 'utf8'), raw);
  assert.ok(await fs.stat(path.join(site, 'content/published/notes', slug + '.md')));
  assert.equal((await p.scan()).notes.find(n => n.path === 'nested/one.md').status, '已生成副本');

  await p.select(['nested/one.md'], {}, { 'nested/one.md': { section: 'notes' } });
  plan = await p.analyze();
  assert.equal(plan.output[0].kind, 'article'); assert.equal(plan.output[0].slug, slug);
  assert.equal(plan.output[0].metadata.title, '原标题');
  await p.select(['nested/one.md'], {}, { 'nested/one.md': null });
  assert.equal((await p.scan()).notes.find(n => n.path === 'nested/one.md').metadata.section, 'tutorials');
  assert.deepEqual(p.metadataOverrides()['nested/one.md'], {});
});

test('work metadata can be saved incrementally but analysis requires a cover and summary', async t => {
  const { p, write } = await fixture(t);
  await write('A.md', '正文'); await p.scan();
  await p.select(['A.md'], {}, { 'A.md': { section: 'work' } });
  assert.match((await p.analyze()).errors[0].message, /封面和摘要/);
  await p.select(['A.md'], {}, { 'A.md': { section: 'work', summary: '摘要', cover: 'https://example.com/image' } });
  assert.deepEqual((await p.analyze()).errors, []);
});

test('local covers participate in media review, conversion, deduplication and unchanged source checks', async t => {
  const { p, write, vault, site } = await fixture(t);
  const bytes = await sharp({ create: { width: 300, height: 200, channels: 3, background: 'red' } }).png({ compressionLevel: 0 }).toBuffer();
  await write('images/cover.png', bytes);
  await write('nested/A.md', '![[/images/cover.png]]'); await p.scan();
  await p.select(['nested/A.md'], { 'images/cover.png': 'optimized' }, { 'nested/A.md': { section: 'work', summary: '摘要', cover: '../images/cover.png' } });
  const plan = await p.analyze(); assert.deepEqual(plan.errors, []); assert.equal(plan.assets.length, 1);
  assert.deepEqual(plan.assets[0].referencedBy, ['nested/A.md']);
  await assert.rejects(p.prepare(plan.id, []), /审核/);
  const stage = await p.prepare(plan.id, plan.assets.map(a => a.key)); await p.apply(stage.id);
  const markdown = await fs.readFile(path.join(site, 'content/published/notes', plan.output[0].slug + '.md'), 'utf8');
  assert.equal(frontmatter(markdown).data.cover, '/published-assets/' + stage.assets[0].filename);
  assert.ok(stage.assets[0].bytes < stage.assets[0].originalBytes);
  assert.deepEqual(await fs.readFile(path.join(vault, 'images/cover.png')), bytes);
  assert.equal(await fs.readFile(path.join(vault, 'nested/A.md'), 'utf8'), '![[/images/cover.png]]');
});

test('invalid or unsafe covers cannot bypass reviewed attachments', async t => {
  const { p, write } = await fixture(t);
  await write('A.md', '正文'); await write('document.pdf', '%PDF'); await write('animation.gif', 'GIF89a'); await p.scan();
  for (const cover of ['http://example.com/a.png', 'javascript:alert(1)', 'C:\\secret.png', '\\\\server\\private.png']) {
    await assert.rejects(p.select(['A.md'], {}, { 'A.md': { cover } }), /封面/);
  }
  for (const cover of ['../../secret.png', '/missing.png', 'document.pdf']) {
    await p.select(['A.md'], {}, { 'A.md': { cover } });
    assert.equal((await p.analyze()).errors.length, 1);
  }
  await p.select(['A.md'], { 'animation.gif': 'video' }, { 'A.md': { cover: 'animation.gif' } });
  assert.match((await p.analyze()).errors[0].message, /封面不能转为视频/);
});

test('metadata changes invalidate analyzed and reviewed stages and update the manifest', async t => {
  const { p, write, site } = await fixture(t);
  await write('A.md', '正文'); await p.scan(); await p.select(['A.md']);
  let plan = await p.analyze(), stage = await p.prepare(plan.id, []); await p.apply(stage.id);
  const original = await p.manifest(), id = p.db.entries['A.md'].id, slug = p.db.entries['A.md'].slug;
  plan = await p.analyze(); stage = await p.prepare(plan.id, []);
  await p.select(['A.md'], {}, { 'A.md': { tags: ['Deferred Shading'] } });
  await assert.rejects(p.prepare(plan.id, []), /发布设置已改变/);
  await assert.rejects(p.apply(stage.id), /发布设置已改变/);
  assert.deepEqual(await p.manifest(), original);
  assert.deepEqual(frontmatter(await fs.readFile(path.join(site, 'content/published/notes', slug + '.md'), 'utf8')).data.tech, []);
  assert.equal((await p.scan()).notes[0].status, '有更新');
  plan = await p.analyze(); assert.equal(plan.changes.updated.length, 1);
  stage = await p.prepare(plan.id, []); await p.apply(stage.id);
  assert.notEqual((await p.manifest()).notes[id].metadataDigest, original.notes[id].metadataDigest);
  assert.equal((await p.scan()).notes[0].status, '已生成副本');
});

test('metadata and selections save atomically and persist through restart', async t => {
  const { p, write, state, vault, site } = await fixture(t);
  await write('A.md', '正文'); await write('B.md', '其它'); await write('image.png', 'fixture'); await p.scan();
  await p.select(['A.md'], {}, { 'A.md': { tags: ['A tag'], date: '2025-08-09' } });
  const original = await fs.readFile(path.join(state, 'selection.json'), 'utf8');
  await assert.rejects(p.select(['B.md'], { 'image.png': 'original' }, { 'A.md': { title: '新标题' }, 'B.md': { tags: [null] } }), /tags/);
  assert.equal(await fs.readFile(path.join(state, 'selection.json'), 'utf8'), original);
  assert.deepEqual(p.db.selected, ['A.md']); assert.equal(p.db.assets['image.png'], undefined);
  for (const override of [{ unknown: true }, { section: 'missing' }, { title: '' }, { date: '2025-02-29' }, { featured: 'yes' }]) {
    await assert.rejects(p.select(['A.md'], {}, { 'A.md': override }));
  }
  const restarted = new Publisher({ vault, site, state }); await restarted.init();
  const scan = await restarted.scan();
  assert.deepEqual(scan.metadata['A.md'], { date: '2025-08-09', tags: ['A tag'] });
  assert.deepEqual(scan.notes.find(n => n.path === 'A.md').metadata.tags, ['A tag']);
});

test('overrides follow unique renames and explicit relinks with stable content identities', async t => {
  const { p, write, vault } = await fixture(t);
  await write('Old.md', '正文'); await p.scan(); await p.select(['Old.md'], {}, { 'Old.md': { title: '网站标题', section: 'tutorials', tags: ['Linear Algebra'] } });
  const identity = p.db.entries['Old.md'].id, slug = p.db.entries['Old.md'].slug;
  await fs.rename(path.join(vault, 'Old.md'), path.join(vault, 'Renamed.md'));
  let scan = await p.scan();
  assert.equal(scan.notes[0].id, identity); assert.equal(scan.notes[0].slug, slug);
  assert.equal(scan.notes[0].metadata.title, '网站标题');
  assert.equal(scan.metadata['Old.md'], undefined); assert.deepEqual(scan.selected, ['Renamed.md']);
  await fs.unlink(path.join(vault, 'Renamed.md')); await write('new/Edited.md', '修改后正文'); await p.scan();
  await p.relink('Renamed.md', 'new/Edited.md'); scan = await p.scan();
  assert.deepEqual(scan.selected, ['new/Edited.md']);
  assert.equal(scan.notes[0].id, identity); assert.equal(scan.notes[0].metadata.section, 'tutorials');
  assert.deepEqual(scan.metadata['new/Edited.md'].tags, ['Linear Algebra']);
  const plan = await p.analyze(); assert.deepEqual(plan.errors, []); assert.equal(plan.output[0].slug, slug);
});

test('invalid inherited fields remain visible and can be corrected without editing sources', async t => {
  const { p, write, vault } = await fixture(t);
  const raw = '---\ntitle: Source\ndate: bad-date\nsummary: 源文件摘要\ntags: [Real Time Rendering]\nseries: 保留系列\n---\n正文'; await write('A.md', raw);
  const scan = await p.scan(); assert.match(scan.notes[0].metadataError, /date/);
  assert.equal(scan.notes[0].blocked, false);
  assert.equal(scan.notes[0].metadata.title, 'Source');
  assert.equal(scan.notes[0].sourceMetadata.title, 'Source');
  assert.equal(scan.notes[0].sourceMetadata.summary, '源文件摘要');
  assert.equal(scan.notes[0].sourceMetadata.series, '保留系列');
  assert.deepEqual(scan.notes[0].sourceMetadata.tags, ['Real Time Rendering']);
  await p.select(['A.md'], {}, { 'A.md': { date: '2026-01-02' } });
  const plan = await p.analyze(); assert.deepEqual(plan.errors, []);
  assert.equal(plan.output[0].metadata.title, 'Source');
  assert.equal(plan.output[0].metadata.summary, '源文件摘要');
  assert.deepEqual(plan.output[0].metadata.tags, ['Real Time Rendering']);
  assert.equal(p.notes[0].metadataError, '');
  assert.equal(await fs.readFile(path.join(vault, 'A.md'), 'utf8'), raw);
});

test('historical articles and tutorials omit work-only fields; works require a valid year', async t => {
  const { p, write } = await fixture(t);
  await write('A.md', '---\ndate: 1980-02-03\n---\n正文'); await p.scan();
  for (const section of ['notes', 'tutorials']) {
    await p.select(['A.md'], {}, { 'A.md': { section, engine: ['Unreal Engine'], role: ['Technical Artist'], featured: true } });
    const plan = await p.analyze(); assert.deepEqual(plan.errors, []);
    const meta = frontmatter(plan.output[0].markdown).data;
    assert.equal(meta.date, '1980-02-03'); assert.equal(meta.section, section);
    for (const field of ['engine', 'role', 'year', 'featured']) assert.equal(Object.hasOwn(meta, field), false);
    assert.deepEqual(p.db.entries['A.md'].metadata.engine, ['Unreal Engine']);
  }
  await p.select(['A.md'], {}, { 'A.md': { section: 'work', summary: '介绍', cover: 'https://example.com/cover.png' } });
  assert.match((await p.analyze()).errors[0].message, /作品年份必须在 2000 至 2100/);
  await p.select(['A.md'], {}, { 'A.md': { section: 'work', summary: '介绍', cover: 'https://example.com/cover.png', year: 2020 } });
  const plan = await p.analyze(); assert.deepEqual(plan.errors, []);
  assert.equal(frontmatter(plan.output[0].markdown).data.year, 2020);
});

test('source year provenance distinguishes inherited publication years from explicit project years', async t => {
  const { p, write } = await fixture(t);
  await write('A.md', '---\ndate: 2024-02-03\n---\n正文');
  await write('B.md', '---\ndate: 2024-02-03\nyear: 2023\n---\n正文');
  let scan = await p.scan();
  assert.equal(scan.notes.find(n => n.path === 'A.md').sourceYearExplicit, false);
  assert.equal(scan.notes.find(n => n.path === 'B.md').sourceYearExplicit, true);
  await p.select(['A.md', 'B.md'], {}, { 'A.md': { date: '2025-08-09' }, 'B.md': { date: '2025-08-09' } });
  scan = await p.scan();
  assert.equal(scan.notes.find(n => n.path === 'A.md').metadata.year, 2025);
  assert.equal(scan.notes.find(n => n.path === 'A.md').sourceMetadata.year, 2024);
  assert.equal(scan.notes.find(n => n.path === 'B.md').metadata.year, 2023);
});
