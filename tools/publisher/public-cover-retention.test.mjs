import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import sharp from 'sharp';
import { Publisher, frontmatter } from './core.mjs';

async function fixture(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'publisher-public-cover-'));
  t.after(() => fs.rm(root, { recursive: true, force: true, maxRetries: 4, retryDelay: 100 }));
  const site = path.join(root, 'site'), vault = path.join(root, 'vault'), state = path.join(root, 'state');
  await fs.mkdir(site); await fs.mkdir(vault);
  const p = new Publisher({ site, vault, state }); await p.init();
  const write = async (base, name, data) => { const file = path.join(base, name); await fs.mkdir(path.dirname(file), { recursive: true }); await fs.writeFile(file, data); return file; };
  await write(vault, 'A.md', 'This original article body deliberately contains no media references.');
  const image = color => sharp({ create: { width: 20, height: 20, channels: 3, background: color } }).png().toBuffer();
  await write(vault, 'original.png', await image('red')); await write(vault, 'replacement.png', await image('blue'));
  await p.scan(); await p.select(['A.md'], {}, { 'A.md': { section: 'work', summary: 'Cover-only media', cover: '/original.png' } });
  const prepare = async () => { const plan = await p.analyze(); assert.deepEqual(plan.errors, []); const stage = await p.prepare(plan.id, plan.assets.map(asset => asset.key)); return { plan, stage }; };
  const apply = async () => { const result = await prepare(); await p.apply(result.stage.id); await p.scan(); return result.plan; };
  const meta = async () => frontmatter(await fs.readFile(path.join(site, 'content/published/notes', p.db.entries['A.md'].slug + '.md'), 'utf8')).data;
  const publicFile = url => path.join(site, 'public', decodeURIComponent(url));
  return { p, site, vault, state, write, prepare, apply, meta, publicFile };
}

test('selecting a generated cover-only image preserves it through rebuild and removes unrelated files', async t => {
  const { p, site, write, apply, meta, publicFile } = await fixture(t);
  await apply(); const cover = (await meta()).cover, original = await fs.readFile(publicFile(cover));
  await write(site, 'public/published-assets/unreferenced.png', 'not referenced');
  const key = 'published:' + p.db.entries['A.md'].slug;
  await p.contentSettings.save({ key, metadata: { cover } }, p.siteContent);
  const plan = await apply(); assert.equal(plan.assets.length, 0); assert.deepEqual(plan.retainedPublicAssets.map(asset => asset.filename), [path.posix.basename(cover)]);
  assert.deepEqual(await fs.readFile(publicFile(cover)), original); assert.ok((await p.manifest()).assets.includes(path.posix.basename(cover)));
  assert.equal(await fs.stat(publicFile('/published-assets/unreferenced.png')).catch(() => null), null);
  await p.assertApplied();
  await p.select([]); await apply(); assert.equal(await fs.stat(publicFile(cover)).catch(() => null), null, 'Withdrawal removes media with no surviving public cover reference');
});

test('a collection keeps its chosen cover when its source article changes cover or is withdrawn', async t => {
  const { p, site, write, apply, meta, publicFile } = await fixture(t);
  await apply(); const oldCover = (await meta()).cover, original = await fs.readFile(publicFile(oldCover));
  const articleKey = 'published:' + p.db.entries['A.md'].slug;
  const collection = await p.saveCollection({ metadata: { title: 'Independent collection', summary: 'A persistent independent cover', cover: oldCover }, notes: [articleKey] });
  await p.select(['A.md'], {}, { 'A.md': { section: 'work', summary: 'New cover', cover: '/replacement.png' } });
  await apply(); const newCover = (await meta()).cover; assert.notEqual(newCover, oldCover); assert.deepEqual(await fs.readFile(publicFile(oldCover)), original);
  await p.saveCollection({ key: collection.key, metadata: {}, notes: [] }); await p.select([]); await apply();
  assert.deepEqual(await fs.readFile(publicFile(oldCover)), original); assert.equal(await fs.stat(publicFile(newCover)).catch(() => null), null);
  await write(site, 'public/covers/final.svg', '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"/>');
  await p.saveCollection({ key: collection.key, metadata: { cover: '/covers/final.svg' }, notes: [] }); await apply();
  assert.equal(await fs.stat(publicFile(oldCover)).catch(() => null), null); assert.deepEqual((await p.manifest()).assets, []);
});

test('reviewed retained covers reject external edits and restore prior bytes after failed builds', async t => {
  const { p, apply, prepare, meta, publicFile } = await fixture(t);
  await apply(); const cover = (await meta()).cover, file = publicFile(cover), original = await fs.readFile(file);
  await p.contentSettings.save({ key: 'published:' + p.db.entries['A.md'].slug, metadata: { cover } }, p.siteContent);
  let reviewed = await prepare(); await fs.appendFile(file, 'Changed after review');
  await assert.rejects(p.apply(reviewed.stage.id), /已公开封面素材已变化/); await fs.writeFile(file, original);
  reviewed = await prepare();
  await assert.rejects(p.apply(reviewed.stage.id, async () => { await fs.appendFile(file, 'Changed during build'); }), /已公开封面素材已变化/);
  assert.deepEqual(await fs.readFile(file), original); await apply(); await p.assertApplied();
});

test('a generated cover-only video and poster survive canonical selection without retranscoding', async t => {
  const exe = process.env.PUBLISHER_TEST_FFMPEG;
  if (!exe) { t.skip('Set PUBLISHER_TEST_FFMPEG to generate a real MP4'); return; }
  const { p, vault, apply, meta, publicFile } = await fixture(t); p.ffmpeg = async () => exe;
  await promisify(execFile)(exe, ['-nostdin', '-y', '-f', 'lavfi', '-i', 'color=c=blue:s=160x90:r=5', '-t', '0.4', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', path.join(vault, 'clip.mp4')], { windowsHide: true });
  await p.scan(); await p.select(['A.md'], {}, { 'A.md': { section: 'work', summary: 'Video cover only', cover: '/clip.mp4' } }); await apply();
  const { cover, coverVideo } = await meta(), posterBytes = await fs.readFile(publicFile(cover)), videoBytes = await fs.readFile(publicFile(coverVideo));
  await p.contentSettings.save({ key: 'published:' + p.db.entries['A.md'].slug, metadata: { cover, coverVideo } }, p.siteContent);
  const plan = await apply(); assert.equal(plan.assets.length, 0); assert.equal(plan.retainedPublicAssets.length, 2);
  assert.equal((await meta()).coverVideo, coverVideo); assert.deepEqual(await fs.readFile(publicFile(cover)), posterBytes); assert.deepEqual(await fs.readFile(publicFile(coverVideo)), videoBytes);
  assert.equal((await p.manifest()).assets.length, 2); await p.assertApplied();
});
