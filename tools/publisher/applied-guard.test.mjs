import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { Publisher } from './core.mjs';

async function fixture(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'publisher-applied-guard-'));
  t.after(() => fs.rm(root, { recursive: true, force: true, maxRetries: 4, retryDelay: 100 }));
  const site = path.join(root, 'site'), vault = path.join(root, 'vault'), state = path.join(root, 'state');
  await fs.mkdir(site); await fs.mkdir(vault);
  const p = new Publisher({ site, vault, state }); await p.init();
  const write = async (base, name, value) => { const file = path.join(base, name); await fs.mkdir(path.dirname(file), { recursive: true }); await fs.writeFile(file, value); return file; };
  const apply = async () => { const plan = await p.analyze(); assert.deepEqual(plan.errors, []); return p.apply((await p.prepare(plan.id, plan.assets.map(asset => asset.key))).id); };
  const guard = async reject => {
    const plans = p.plans.size;
    if (reject) await assert.rejects(p.assertApplied(), reject); else assert.deepEqual(await p.assertApplied(), { ok: true });
    assert.equal(p.plans.size, plans, 'Deployment checks must remove their temporary analysis plans');
  };
  return { p, site, vault, state, write, apply, guard };
}

test('deployment guard rejects saved source, metadata, media and selection changes until local apply', async t => {
  const { p, site, vault, write, apply, guard } = await fixture(t);
  await write(vault, 'A.md', '---\ntitle: A\n---\nOriginal body'); await write(vault, 'B.md', 'Independent body');
  await p.scan(); await guard();
  await p.select(['A.md']); await guard(/尚未写入本地预览/);
  await apply(); await guard(); await guard();
  await fs.appendFile(path.join(vault, 'A.md'), '\nSource changed'); await guard(/尚未写入本地预览/); await apply(); await guard();
  await p.select(['A.md'], {}, { 'A.md': { tags: ['Shader'] } }); await guard(/尚未写入本地预览/); await apply(); await guard();
  const image = color => sharp({ create: { width: 20, height: 20, channels: 3, background: color } }).png().toBuffer();
  await write(vault, 'cover.png', await image('red'));
  await p.select(['A.md'], {}, { 'A.md': { cover: '/cover.png' } }); await guard(/尚未写入本地预览/); await apply(); await guard();
  await write(vault, 'cover.png', await image('blue')); await guard(/尚未写入本地预览/); await apply(); await guard();
  await fs.unlink(path.join(site, 'public/published-assets', (await p.manifest()).assets[0])); await guard(/尚未写入本地预览/); await apply(); await guard();
  await p.select(['A.md', 'B.md']); await guard(/尚未写入本地预览/); await apply(); await guard();
  await p.select(['A.md']); await guard(/尚未写入本地预览/); await apply(); await guard();
  const generated = path.join(site, 'content/published/notes', p.db.entries['A.md'].slug + '.md');
  await fs.appendFile(generated, '\nExternal edit'); await guard(/尚未写入本地预览/); await apply(); await guard();
});

test('deployment guard includes website-only settings and collection relationships with no vault selection', async t => {
  const { p, site, write, apply, guard } = await fixture(t);
  await write(site, 'src/content/notes/article.md', '---\ntitle: Article\ndate: 2025-01-01\n---\nPublic source');
  await p.scan(); await guard();
  await p.contentSettings.save({ key: 'notes:article', metadata: { title: 'Edited title', tags: ['Edited'] } }, p.siteContent);
  await guard(/尚未写入本地预览/); await apply(); await guard();
  const collection = await p.contentSettings.createCollection({ title: 'Project collection', summary: 'A study collection' });
  await guard(/尚未写入本地预览/); await apply(); await guard();
  await p.scan(); await p.topics.save({ key: collection.key, title: 'Project collection', summary: 'A study collection', notes: ['notes:article'] }, p.topicSources());
  await guard(/尚未写入本地预览/); await apply(); await guard();
});

test('invalid settings and failed local writes cannot clear deployment guard', async t => {
  const { p, vault, write, apply, guard } = await fixture(t);
  await write(vault, 'A.md', 'An article'); await p.scan(); await p.select(['A.md']); await apply(); await guard();
  await p.select(['A.md'], {}, { 'A.md': { section: 'tutorials' } }); await guard(/尚未通过检查.*选择或创建一个系列/);
  await p.select(['A.md'], {}, { 'A.md': { section: 'tutorials', series: 'New series' } });
  const plan = await p.analyze(), stage = await p.prepare(plan.id, []);
  await assert.rejects(p.apply(stage.id, async () => { throw Error('Synthetic build failed'); }), /build failed/);
  await guard(/尚未写入本地预览/); await apply(); await guard();
});

test('canonical linked settings do not leave a false deployment change after successful apply', async t => {
  const { p, site, vault, write, apply, guard } = await fixture(t);
  const body = 'This rendering article contains a unique, complete explanation of material sorting, depth testing and raster passes.';
  await write(site, 'src/content/notes/source.md', '---\ntitle: Website title\ndate: 2024-01-01\nsummary: Website summary\ntech: [Shader]\n---\n' + body);
  await write(vault, 'Source.md', body); await p.scan(); assert.equal(p.notes[0].siteMatch.automatic, true);
  await p.select(['Source.md']); await guard(/尚未写入本地预览/); await apply(); await guard();
  await p.contentSettings.save({ key: 'notes:source', metadata: { title: 'Canonical title', section: 'tutorials', series: 'Rendering study', tags: ['Pipeline'] } }, p.siteContent);
  await guard(/尚未写入本地预览/); await apply(); await guard(); await guard();
  assert.equal(p.notes[0].metadata.title, 'Canonical title');
});
