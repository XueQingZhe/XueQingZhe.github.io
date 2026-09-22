import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { Publisher, frontmatter } from './core.mjs';
import { readSiteContent, boundedSite } from './site-content.mjs';

async function fixture(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'publisher-site-sync-'));
  t.after(() => fs.rm(root, { recursive: true, force: true, maxRetries: 4, retryDelay: 100 }));
  const vault = path.join(root, 'vault'), site = path.join(root, 'site'), state = path.join(root, 'private');
  await fs.mkdir(vault); await fs.mkdir(site);
  const p = new Publisher({ vault, site, state }); await p.init();
  const write = async (root, name, body) => { const dest = path.join(root, name); await fs.mkdir(path.dirname(dest), { recursive: true }); await fs.writeFile(dest, body); return dest; };
  return { p, root, vault, site, state, write };
}
const note = (scan, filename = 'A.md') => scan.notes.find(item => item.path === filename);

test('site inventory reconciles unique exact bodies and preserves ambiguous title candidates', async t => {
  const { p, write, vault, site } = await fixture(t);
  const body = '完全一致的正文。这篇文章详细介绍渲染流程、深度测试、模板测试以及材质排序规则，并通过完整的源码片段解释实施过程。';
  await write(site, 'src/content/legacy/old.md', '---\ntitle: 旧文章\ndate: 2024-02-03\nlegacyUrl: /blog/2024/旧文章/\ntech: [Shader]\nwork: rendering\n---\n' + body);
  await write(site, 'src/content/notes/a.md', '---\ntitle: 重名文章\ndate: 2024-02-03\n---\n旧正文一');
  await write(site, 'src/content/notes/b.md', '---\ntitle: 重名文章\ndate: 2024-02-04\n---\n旧正文二');
  await write(site, 'src/content/work/rendering.md', '---\ntitle: 渲染专题\nyear: 2024\nnotes: [legacy:old]\ncover: /covers/rendering.svg\nsummary: 作品描述\n---\n专题正文');
  await write(vault, 'A.md', '---\ntitle: 本地名称\n---\n' + body);
  await write(vault, 'Renamed.md', '---\ntitle: 重名文章\n---\n已经修改了正文');
  const scan = await p.scan();
  assert.equal(scan.siteContent.length, 4);
  assert.equal(note(scan).siteMatch.key, 'legacy:old');
  assert.equal(note(scan).siteMatch.state, 'linked'); assert.equal(note(scan).siteMatch.automatic, true);
  assert.equal(p.db.entries['A.md'].siteLink, 'legacy:old'); assert.equal(note(scan).metadata.work, 'rendering');
  assert.deepEqual(scan.selected, []);
  assert.deepEqual(note(scan, 'Renamed.md').siteMatch.candidates, ['notes:a', 'notes:b']);
  assert.match(note(scan, 'Renamed.md').siteMatch.reason, /同名/);
  const legacy = scan.siteContent.find(item => item.key === 'legacy:old');
  assert.equal(legacy.url, '/blog/2024/旧文章/'); assert.equal(legacy.work, 'rendering');
  assert.deepEqual(scan.siteContent.find(item => item.key === 'work:rendering').notes, ['legacy:old']);
});

test('media-aware fingerprints reconcile rewritten image directories with identical filenames', async t => {
  const { p, write, vault, site } = await fixture(t);
  const body = 'A detailed shared explanation of lighting, materials and rendering with enough text to identify the same article safely.';
  await write(site, 'src/content/notes/a.md', `---\ntitle: Website\ndate: 2024-02-03\n---\n${body}\n\n![Image](/assets/pic.png)`);
  await write(vault, 'A.md', `---\ntitle: Local\n---\n${body}\n\n![Image](pic.png)`);
  const scan = await p.scan(); assert.equal(note(scan).siteMatch.key, 'notes:a'); assert.match(note(scan).siteMatch.reason, /自动核对/);
  assert.equal(p.db.entries['A.md'].siteLink, 'notes:a');
});

test('Wiki image exports reconcile exact revised body while a different old version stays a candidate', async t => {
  const { p, write, vault, site } = await fixture(t);
  const first = '逐材质半透明排序允许材质以不同顺序绘制。这里记录具体渲染流程以及使用时需要检查的深度测试条件。';
  const second = '调整绘制顺序之前，需要先观察场景中的混合结果，再比较各个材质对应的输出。';
  await write(site, 'src/content/notes/ue5-translucency-sort.md', `---\ntitle: UE5.5 逐材质半透明排序\n---\n${first}\n\n![材质](/assets/material.png)\n\n${second}`);
  await write(vault, '逐材质半透明排序(修订).md', `${first.slice(0, 20)}\n${first.slice(20)}\n\n![[图片/material.png|640]]\n\n${second}`);
  await write(vault, '逐材质半透明排序(旧版).md', '旧版保留不同的实验过程，正文尚未整理。');
  await write(vault, '逐材质OverlayMaterial.md', '这是另外一篇材质实验。');
  const scan = await p.scan();
  assert.equal(note(scan, '逐材质半透明排序(修订).md').siteMatch.key, 'notes:ue5-translucency-sort');
  assert.equal(note(scan, '逐材质半透明排序(修订).md').siteMatch.automatic, true);
  assert.deepEqual(note(scan, '逐材质半透明排序(旧版).md').siteMatch.candidates, ['notes:ue5-translucency-sort']);
  assert.equal(p.db.entries['逐材质半透明排序(旧版).md'].siteLink, undefined);
  assert.match(note(scan, '逐材质半透明排序(旧版).md').siteMatch.reason, /版本标记/);
  assert.equal(note(scan, '逐材质OverlayMaterial.md').siteMatch.state, 'none');
});

test('explicit links inherit website defaults, preserve private priority and export a stable replacing route', async t => {
  const { p, write, vault, site, state } = await fixture(t);
  const original = '---\ntitle: Website Title\ndate: 2024-02-03\nsummary: 网站摘要\ntech: [Real Time Rendering]\nseries: 学习系列\nkind: tutorial\nlegacyUrl: /blog/2024/existing/\nwork: rendering\n---\n旧正文';
  await write(site, 'src/content/legacy/existing.md', original);
  const raw = '---\ntitle: Local Title\n---\n更新正文'; await write(vault, 'A.md', raw); await p.scan();
  const identity = p.db.entries['A.md'].id, slug = p.db.entries['A.md'].slug;
  let scan = await p.linkSite('A.md', 'legacy:existing');
  assert.equal(note(scan).metadata.title, 'Local Title'); assert.equal(note(scan).metadata.section, 'tutorials');
  assert.deepEqual(note(scan).metadata.tags, ['Real Time Rendering']); assert.equal(note(scan).metadata.work, 'rendering');
  assert.equal(note(scan).metadata.date, '2024-02-03'); assert.equal(note(scan).status, '已关联网站文章');
  await p.select(['A.md'], {}, { 'A.md': { summary: '私有覆盖' } });
  const plan = await p.analyze(); assert.deepEqual(plan.errors, []);
  assert.deepEqual(plan.changes.added, []); assert.deepEqual(plan.changes.updated, ['Local Title']);
  assert.equal(plan.warnings.some(warning => /首次登记日期/.test(warning)), false);
  const meta = frontmatter(plan.output[0].markdown).data;
  assert.equal(meta.replaces, 'legacy:existing'); assert.equal(meta.legacyUrl, '/blog/2024/existing/'); assert.equal(meta.summary, '私有覆盖');
  assert.equal(plan.output[0].id, identity); assert.equal(plan.output[0].slug, slug);
  const stage = await p.prepare(plan.id, []); await p.apply(stage.id);
  scan = await p.scan(); assert.equal(note(scan).status, '已生成副本');
  assert.equal(scan.siteContent.find(item => item.key === 'legacy:existing').replacedBy, 'published:' + slug);
  assert.equal(await fs.readFile(path.join(vault, 'A.md'), 'utf8'), raw); assert.equal(await fs.readFile(path.join(site, 'src/content/legacy/existing.md'), 'utf8'), original);
  const restarted = new Publisher({ vault, site, state }); await restarted.init();
  assert.equal(note(await restarted.scan()).siteMatch.key, 'legacy:existing');
  await fs.rename(path.join(vault, 'A.md'), path.join(vault, 'Moved.md')); scan = await restarted.scan();
  assert.equal(note(scan, 'Moved.md').id, identity); assert.equal(note(scan, 'Moved.md').siteMatch.key, 'legacy:existing');
});

test('links reject duplicate claims and invalidate already reviewed stages when changed or source changes', async t => {
  const { p, write, vault, site, state } = await fixture(t);
  const siteFile = await write(site, 'src/content/notes/source.md', '---\ntitle: Source\ndate: 2024-02-03\n---\n正文');
  await write(vault, 'A.md', 'A'); await write(vault, 'B.md', 'B'); await p.scan(); await p.linkSite('A.md', 'notes:source');
  const saved = await fs.readFile(path.join(state, 'selection.json'), 'utf8');
  await assert.rejects(p.linkSite('B.md', 'notes:source'), /已关联另一篇/);
  assert.equal(await fs.readFile(path.join(state, 'selection.json'), 'utf8'), saved);
  await p.select(['A.md']); let plan = await p.analyze(), stage = await p.prepare(plan.id, []);
  await p.linkSite('A.md', null); await assert.rejects(p.apply(stage.id), /关联已改变/);
  await p.linkSite('A.md', 'notes:source'); plan = await p.analyze(); stage = await p.prepare(plan.id, []);
  await fs.appendFile(siteFile, '\n网站侧有更新'); await assert.rejects(p.apply(stage.id), /网站文章已改变/);
  await fs.unlink(siteFile); const scan = await p.scan(); assert.equal(note(scan).siteMatch.state, 'missing');
  assert.match((await p.analyze()).errors[0].message, /缺失/);
});

test('scan checks generated files rather than trusting a stale private manifest', async t => {
  const { p, write, vault, site } = await fixture(t);
  await write(vault, 'A.md', '公开正文'); await p.scan(); await p.select(['A.md']);
  const plan = await p.analyze(), stage = await p.prepare(plan.id, []); await p.apply(stage.id);
  assert.equal(note(await p.scan()).status, '已生成副本');
  const file = path.join(site, 'content/published/notes', plan.output[0].slug + '.md'), raw = await fs.readFile(file, 'utf8');
  await fs.appendFile(file, '\n外部修改'); let scan = await p.scan(); assert.equal(note(scan).status, '有更新'); assert.match(note(scan).statusReason, /不一致/);
  await fs.writeFile(file, raw); assert.equal(note(await p.scan()).status, '已生成副本');
  await fs.unlink(file); scan = await p.scan(); assert.equal(note(scan).status, '有更新'); assert.match(note(scan).statusReason, /缺失/);
});

test('old manifests distinguish existing copies awaiting verification from changed or missing copies', async t => {
  const { p, write, vault, site, state } = await fixture(t);
  await write(vault, 'A.md', '公开正文'); await p.scan(); await p.select(['A.md']);
  const plan = await p.analyze(), stage = await p.prepare(plan.id, []); await p.apply(stage.id);
  const manifestFile = path.join(state, 'current.json');
  const manifest = await p.manifest(), old = manifest.notes[plan.output[0].id];
  delete old.fileDigest;
  const { work, notes, workType, ...previousMetadata } = plan.output[0].metadata;
  old.metadataDigest = crypto.createHash('sha256').update(JSON.stringify(previousMetadata)).digest('hex');
  await fs.writeFile(manifestFile, JSON.stringify(manifest));
  let scan = await p.scan(); assert.equal(note(scan).status, '已有副本·待校验'); assert.match(note(scan).statusReason, /旧发布记录/);
  await p.select(['A.md'], {}, { 'A.md': { tags: ['Changed'] } });
  assert.equal(note(await p.scan()).status, '有更新');
  await p.select(['A.md'], {}, { 'A.md': null });
  await fs.appendFile(path.join(vault, 'A.md'), '\n新增内容'); assert.equal(note(await p.scan()).status, '有更新');
  await fs.unlink(path.join(site, 'content/published/notes', plan.output[0].slug + '.md'));
  scan = await p.scan(); assert.equal(note(scan).status, '有更新'); assert.match(note(scan).statusReason, /缺失/);
});

test('withdrawing a replacement restores the original rather than reporting an article removed', async t => {
  const { p, write, vault, site } = await fixture(t);
  await write(site, 'src/content/notes/source.md', '---\ntitle: 网站原文\ndate: 2024-02-03\n---\n原正文');
  await write(vault, 'A.md', '新正文'); await p.scan(); await p.linkSite('A.md', 'notes:source'); await p.select(['A.md']);
  let plan = await p.analyze(), stage = await p.prepare(plan.id, []); await p.apply(stage.id);
  await p.scan(); await p.select([]); plan = await p.analyze();
  assert.deepEqual(plan.changes.removed, []); assert.deepEqual(plan.changes.restored, ['网站原文']);
  stage = await p.prepare(plan.id, []); await p.apply(stage.id);
  assert.equal((await p.scan()).siteContent.find(item => item.key === 'notes:source').active, true);
});

test('linked work keeps website media and relational fields, while local overrides stay explicit', async t => {
  const { p, write, vault, site } = await fixture(t);
  await write(site, 'src/content/work/project.md', '---\ntitle: Project\nyear: 2025\nsummary: Existing work\ncover: /covers/project.svg\nnotes: [legacy:first, notes:second, bare-slug]\nmedia: [{type: image, src: /assets/image.png}]\nrepo: https://example.com/project\n---\nExisting body');
  await write(vault, 'A.md', 'New project description'); await p.scan(); await p.linkSite('A.md', 'work:project'); await p.select(['A.md']);
  let plan = await p.analyze(); assert.deepEqual(plan.errors, []);
  const meta = frontmatter(plan.output[0].markdown).data;
  assert.equal(meta.cover, '/covers/project.svg'); assert.equal(meta.legacyUrl, '/work/project/'); assert.equal(meta.replaces, 'work:project');
  assert.deepEqual(meta.notes, ['legacy:first', 'notes:second', 'bare-slug']); assert.equal(meta.media[0].src, '/assets/image.png');
  await p.select(['A.md'], {}, { 'A.md': { notes: ['notes:other'], work: 'published:another-project' } });
  plan = await p.analyze(); assert.equal(plan.output[0].metadata.work, 'published:another-project'); assert.deepEqual(plan.output[0].metadata.notes, ['notes:other']);
});

test('topic drafts stage and rollback with content; selected future articles are selectable and withdrawals are excluded', async t => {
  const { p, write, vault, site, state } = await fixture(t);
  await write(site, 'src/content/work/project.md', '---\ntitle: Project\nyear: 2025\nsummary: Existing work\ncover: /covers/project.svg\n---\nWork');
  await write(site, 'src/data/publisher-topics.json', JSON.stringify({ version: 1, topics: {} }) + '\n');
  await write(vault, 'A.md', 'New article'); await p.scan(); await p.select(['A.md']);
  const key = 'published:' + p.db.entries['A.md'].slug;
  assert.ok(p.topicSources().some(item => item.key === key && item.pending));
  await p.topics.save({ key: 'project', title: '专题新标题', summary: '专题摘要', notes: [key] }, p.topicSources());
  let plan = await p.analyze(); assert.deepEqual(plan.errors, []); assert.equal(plan.changes.topics[0].title, '专题新标题');
  let stage = await p.prepare(plan.id, []);
  const original = await fs.readFile(p.topics.file, 'utf8');
  await assert.rejects(p.apply(stage.id, async () => { throw Error('synthetic build failure'); }), /synthetic/);
  assert.equal(await fs.readFile(p.topics.file, 'utf8'), original); assert.ok(await fs.stat(path.join(state, 'topics-draft.json')));
  stage = await p.prepare(plan.id, []); await p.apply(stage.id);
  assert.deepEqual(JSON.parse(await fs.readFile(p.topics.file, 'utf8')).topics.project.notes, [key]);
  assert.equal(await fs.stat(path.join(state, 'topics-draft.json')).catch(() => null), null);
  await p.scan(); await p.select([]); assert.equal(p.topicSources().some(item => item.key === key), false);
});

test('topic edits made externally during a build survive rollback in a private conflict copy', async t => {
  const { p, write, site, state } = await fixture(t);
  await write(site, 'src/content/work/project.md', '---\ntitle: Project\nyear: 2025\nsummary: Work\ncover: /covers/project.svg\n---\nWork');
  const original = JSON.stringify({ version: 1, topics: {} }) + '\n';
  await write(site, 'src/data/publisher-topics.json', original); await p.scan();
  await p.topics.save({ key: 'project', title: '暂存专题', summary: '暂存摘要', notes: [] }, p.topicSources());
  const plan = await p.analyze(), stage = await p.prepare(plan.id, []);
  const external = JSON.stringify({ version: 1, topics: { project: { title: '构建期间的外部修改', summary: '需要保留的内容', notes: [] } } }, null, 4).replaceAll('\n', '\r\n');
  let failure;
  await assert.rejects(p.apply(stage.id, async () => { await fs.writeFile(p.topics.file, external); }), error => {
    failure = error; return /专题设置已改变/.test(error.message) && /topics-conflict\.json/.test(error.message);
  });
  assert.equal(await fs.readFile(p.topics.file, 'utf8'), original);
  const backups = await fs.readdir(path.join(state, 'backups'));
  assert.equal(backups.length, 1);
  const conflict = path.join(state, 'backups', backups[0], 'topics-conflict.json');
  assert.equal(await fs.readFile(conflict, 'utf8'), external); assert.ok(failure.message.includes(conflict));
  assert.ok(await fs.stat(path.join(state, 'topics-draft.json')));
  assert.equal(await fs.stat(path.join(state, 'transaction.json')).catch(() => null), null);
});

test('site scan follows Astro slugs and refuses source links escaping the website', async t => {
  const { p, write, site, root } = await fixture(t);
  await write(site, 'src/content/notes/Folder/My Name.md', '---\ntitle: Article\ndate: 2024-02-03\n---\n正文');
  await write(site, 'src/content/notes/custom.md', '---\nslug: custom-id\ntitle: Custom\n---\n正文');
  const list = await readSiteContent(site, frontmatter);
  assert.ok(list.some(item => item.key === 'notes:folder/my-name'));
  assert.ok(list.some(item => item.key === 'notes:custom-id'));
  await assert.rejects(boundedSite(site, '../private.md'), /越界/);
  await write(root, 'outside/private.md', 'private');
  try { await fs.symlink(path.join(root, 'outside'), path.join(site, 'src/content/notes/jump'), 'junction'); } catch { return; }
  assert.equal((await p.scan()).siteContent.length, 2);
});
