import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { Publisher, frontmatter } from './core.mjs';

async function fixture(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'publisher-catalog-'));
  t.after(() => fs.rm(root, { recursive: true, force: true, maxRetries: 4, retryDelay: 100 }));
  const vault = path.join(root, 'vault'), site = path.join(root, 'site'), state = path.join(root, 'private');
  await fs.mkdir(vault); await fs.mkdir(site);
  const p = new Publisher({ vault, site, state }); await p.init();
  const write = async (root, name, body) => { const dest = path.join(root, name); await fs.mkdir(path.dirname(dest), { recursive: true }); await fs.writeFile(dest, body); return dest; };
  return { p, root, vault, site, state, write };
}
const item = (catalog, kind, value, section) => catalog[kind].find(entry => entry.value === value && entry.section === section);

test('catalog aggregates nested public sources, safe labels and local effective metadata with exact terms', async t => {
  const { p, write, site, vault } = await fixture(t);
  const originals = new Map();
  for (const [filename, body] of [
    ['src/content/notes/nested/note.md', '---\ntags: [Real Time Rendering, Real Time Rendering]\ntech: [Real Time Rendering, Shader]\ncategory: 图形学\nseries: 阅读笔记\n---\n公开手记'],
    ['src/content/legacy/tutorial.md', '---\nkind: tutorial\nseries: 我独自升级\ncategory: 数学\ntech: [Shader, Linear Algebra]\n---\n公开教程'],
    ['src/content/work/project.mdx', '---\ntech: [Shader]\nengine: [UE5, UE5]\nrole: [Tooling]\ncategory: 图形学\nseries: 实践\n---\n作品'],
    ['content/published/notes/site.md', '---\nsection: tutorials\ncategory: 数学\nseries: 我独自升级\ntags: [Linear Algebra]\n---\n生成的教程'],
    ['src/content/notes/draft.md', '---\ndraft: true\ntags: [DRAFT_PUBLIC_SOURCE]\n---\n草稿'],
    ['src/content/notes/broken.md', '---\nbroken: [\n---\n无效属性'],
    ['src/data/taxonomy.ts', 'export const TAXONOMY: Record<Facet, Term[]> = {\n  engine: [{ key: "UE5", label: "Unreal 5" }],\n  tech: [{ key: "Shader", label: "着色器" }, { key: "PostProcess", label: "后处理" }],\n  role: [{ key: "Tooling", label: "工具" }],\n};\nthrow new Error("This code must never execute");']
  ]) { const file = await write(site, filename, body); originals.set(file, body); }
  const local = '---\ntitle: 本地笔记\ntags: [Private Local Tag]\nseries: 我独自升级\nkind: tutorial\ncategory: 数学\n---\n本地正文';
  originals.set(await write(vault, 'folder/A.md', local), local);
  let scan = await p.scan(), catalog = scan.catalog;
  assert.deepEqual(item(catalog, 'tags', 'Real Time Rendering'), { value: 'Real Time Rendering', label: 'Real Time Rendering', count: 1 });
  assert.equal(item(catalog, 'tags', 'Shader').count, 3);
  assert.equal(item(catalog, 'tags', 'Shader').label, '着色器');
  assert.equal(item(catalog, 'tags', 'PostProcess').count, 0);
  assert.equal(item(catalog, 'engine', 'UE5').label, 'Unreal 5');
  assert.equal(item(catalog, 'engine', 'UE5').count, 1);
  assert.equal(item(catalog, 'role', 'Tooling').label, '工具');
  assert.equal(item(catalog, 'series', '我独自升级', 'tutorials').count, 3);
  assert.equal(item(catalog, 'categories', '数学', 'tutorials').count, 3);
  assert.equal(item(catalog, 'categories', '图形学', 'notes').count, 1);
  assert.equal(item(catalog, 'categories', '图形学', 'work').count, 1);
  assert.equal(item(catalog, 'tags', 'DRAFT_PUBLIC_SOURCE'), undefined);
  await p.select([], {}, { 'folder/A.md': { tags: ['Changed Local Tag'], category: '物理', section: 'notes' } });
  catalog = await p.catalog();
  assert.equal(item(catalog, 'tags', 'Private Local Tag'), undefined);
  assert.equal(item(catalog, 'tags', 'Changed Local Tag').count, 1);
  assert.equal(item(catalog, 'categories', '物理', 'notes').count, 1);
  for (const [file, body] of originals) assert.equal(await fs.readFile(file, 'utf8'), body);
});

test('matching local and generated public identities count once per term', async t => {
  const { p, write, vault } = await fixture(t);
  await write(vault, 'A.md', '---\ntags: [Shared Tag, Shared Tag]\ncategory: 数学\nseries: 同一系列\n---\n正文');
  await p.scan(); await p.select(['A.md']);
  const plan = await p.analyze(); assert.equal(item(plan.catalog, 'tags', 'Shared Tag').count, 1);
  const stage = await p.prepare(plan.id, []); await p.apply(stage.id);
  const catalog = (await p.scan()).catalog;
  assert.equal(item(catalog, 'tags', 'Shared Tag').count, 1);
  assert.equal(item(catalog, 'series', '同一系列', 'notes').count, 1);
  assert.equal(item(catalog, 'categories', '数学', 'notes').count, 1);
});

test('new terms remain private, survive restart and do not invalidate a reviewed plan', async t => {
  const { p, write, vault, site, state } = await fixture(t);
  await write(vault, 'A.md', '正文'); await p.scan(); await p.select(['A.md']);
  const plan = await p.analyze(), stage = await p.prepare(plan.id, []);
  await p.addCatalog({ kind: 'tag', value: ' Real Time Rendering ' });
  await p.addCatalog({ kind: 'series', value: '新系列', section: 'tutorials' });
  await p.addCatalog({ kind: 'category', value: '数学', section: 'tutorials' });
  await p.addCatalog({ kind: 'category', value: '数学', section: 'notes' });
  const originalState = await fs.readFile(path.join(state, 'selection.json'), 'utf8');
  const duplicate = await p.addCatalog({ kind: 'tag', value: 'Real Time Rendering', section: 'notes' });
  assert.equal(item(duplicate, 'tags', 'Real Time Rendering').count, 0);
  assert.equal(await fs.readFile(path.join(state, 'selection.json'), 'utf8'), originalState);
  assert.equal(p.db.catalogPresets.length, 4);
  assert.deepEqual(p.db.selected, ['A.md']); assert.deepEqual(p.metadataOverrides()['A.md'], {});
  await p.verify(plan); await p.apply(stage.id);
  const restarted = new Publisher({ site, vault, state }); await restarted.init();
  const scan = await restarted.scan();
  assert.equal(item(scan.catalog, 'series', '新系列', 'tutorials').count, 0);
  assert.equal(scan.catalog.categories.filter(entry => entry.value === '数学').length, 2);
  assert.equal(await fs.readFile(path.join(vault, 'A.md'), 'utf8'), '正文');
  const published = await fs.readFile(path.join(site, 'content/published/notes', plan.output[0].slug + '.md'), 'utf8');
  assert.doesNotMatch(published, /Real Time Rendering|新系列|数学/);
});

test('existing terms, invalid requests and preset limits cannot mutate private settings', async t => {
  const { p, write, site, vault, state } = await fixture(t);
  await write(site, 'src/content/notes/A.md', '---\ntags: [Existing Tag]\n---\n正文');
  await write(vault, 'A.md', '正文'); await p.scan();
  const snapshot = () => fs.readFile(path.join(state, 'selection.json'), 'utf8');
  let original = await snapshot();
  await p.addCatalog({ kind: 'tag', value: 'Existing Tag' }); assert.equal(await snapshot(), original);
  for (const request of [
    null, [], { kind: 'navigation', value: 'bad' }, { kind: 'tag', value: ' ' }, { kind: 'tag', value: 'x'.repeat(101) },
    { kind: 'category', value: 'x'.repeat(201), section: 'work' }, { kind: 'tag', value: 'a\nb' },
    { kind: 'series', value: 'ok', section: 'unknown' }, { kind: 'tag', value: 'ok', section: 'unknown' }, { kind: 'tag', value: 'ok', extra: true }
  ]) { await assert.rejects(p.addCatalog(request)); assert.equal(await snapshot(), original); }
  p.db.catalogPresets = Array.from({ length: 500 }, (_, i) => ({ kind: 'tag', value: 'tag ' + i })); await p.save(); original = await snapshot();
  await assert.rejects(p.addCatalog({ kind: 'tag', value: 'one too many' }), /500/);
  assert.equal(await snapshot(), original);
  await p.addCatalog({ kind: 'tag', value: 'tag 0' }); assert.equal(await snapshot(), original);
});

test('category metadata is scoped, inherited, follows renames and invalidates prior analysis', async t => {
  const { p, write, vault } = await fixture(t);
  const raw = '---\ncategory: 源子栏目\n---\n正文'; await write(vault, 'A.md', raw); await p.scan();
  assert.equal(p.notes[0].sourceMetadata.category, '源子栏目');
  await p.select(['A.md']); let plan = await p.analyze(); const stage = await p.prepare(plan.id, []);
  await p.select(['A.md'], {}, { 'A.md': { category: '物理 模拟', section: 'tutorials' } });
  await assert.rejects(p.apply(stage.id), /发布设置已改变/);
  await fs.rename(path.join(vault, 'A.md'), path.join(vault, 'Moved.md')); await p.scan();
  assert.equal(p.metadataOverrides()['Moved.md'].category, '物理 模拟');
  plan = await p.analyze(); assert.equal(frontmatter(plan.output[0].markdown).data.category, '物理 模拟');
  assert.equal(item(plan.catalog, 'categories', '物理 模拟', 'tutorials').count, 1);
  assert.equal(await fs.readFile(path.join(vault, 'Moved.md'), 'utf8'), raw);
  await assert.rejects(p.select(['Moved.md'], {}, { 'Moved.md': { category: 'bad\nname' } }), /单行/);
});

test('catalog ignores symbolic links to content outside the site', async t => {
  const { p, write, root, site } = await fixture(t);
  await write(root, 'external/secret.md', '---\ntags: [DO_NOT_READ_EXTERNAL]\n---\n秘密');
  await fs.mkdir(path.join(site, 'src/content'), { recursive: true });
  try { await fs.symlink(path.join(root, 'external'), path.join(site, 'src/content/notes'), 'junction'); } catch { t.skip('symlinks unavailable'); return; }
  const catalog = (await p.scan()).catalog;
  assert.equal(item(catalog, 'tags', 'DO_NOT_READ_EXTERNAL'), undefined);
});

test('legacy learning journal appears in both site scopes without counting its tags twice', async t => {
  const { p, write, site } = await fixture(t);
  await write(site, 'src/content/legacy/public.md', '---\nkind: article\nseries: 我独自升级\ncategory: 数学\ntech: [线性代数]\n---\n公开旧文');
  await write(site, 'src/content/legacy/private.md', '---\nkind: article\nseries: 我独自升级\ncategory: 草稿分类\ntech: [草稿标签]\ndraft: true\n---\n草稿');
  await write(site, 'src/content/legacy/work.md', '---\nsection: work\nseries: 我独自升级\ncategory: 作品分类\ntech: [作品标签]\n---\n作品');
  await write(site, 'src/content/notes/local.md', '---\nseries: 我独自升级\ncategory: 普通笔记分类\ntech: [笔记标签]\n---\n普通笔记');
  await write(site, 'content/published/notes/public.md', '---\nsection: notes\nseries: 我独自升级\ncategory: 新笔记分类\ntech: [新笔记标签]\n---\n生成笔记');
  const catalog = (await p.scan()).catalog;
  assert.equal(item(catalog, 'series', '我独自升级', 'tutorials').count, 1);
  assert.equal(item(catalog, 'series', '我独自升级', 'notes').count, 3);
  assert.equal(item(catalog, 'series', '我独自升级', 'work').count, 1);
  assert.equal(item(catalog, 'categories', '数学', 'notes').count, 1);
  assert.equal(item(catalog, 'categories', '数学', 'tutorials').count, 1);
  assert.equal(item(catalog, 'tags', '线性代数').count, 1);
  for (const value of ['草稿分类', '作品分类', '普通笔记分类', '新笔记分类']) assert.equal(item(catalog, 'categories', value, 'tutorials'), undefined);
  assert.equal(item(catalog, 'tags', '草稿标签'), undefined);
});
