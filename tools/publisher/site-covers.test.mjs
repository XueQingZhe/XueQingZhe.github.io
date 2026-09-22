import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import sharp from 'sharp';
import { SiteCovers } from './site-covers.mjs';

async function fixture(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'publisher-site-covers-')), site = path.join(root, 'site');
  t.after(() => fs.rm(root, { recursive: true, force: true, maxRetries: 4, retryDelay: 100 }));
  await fs.mkdir(path.join(site, 'public'), { recursive: true });
  const service = new SiteCovers({ site });
  const png = await sharp({ create: { width: 800, height: 400, channels: 3, background: '#558899' } }).png().toBuffer();
  const write = async (relative, data = png) => { const file = path.join(site, relative); await fs.mkdir(path.dirname(file), { recursive: true }); await fs.writeFile(file, data); return file; };
  const serve = async (url, method = 'GET') => {
    let status, headers, body;
    const res = { writeHead(code, values) { status = code; headers = values; }, end(value) { body = value; } };
    await service.serve({ method }, res, new URL(url, 'http://local'));
    return { status, headers, body };
  };
  return { root, site, service, write, serve };
}

test('website covers filter and paginate encoded names, retain current selection and skip hidden/non-image entries', async t => {
  const { site, service, write } = await fixture(t);
  await write('public/covers/A.png'); await write('public/covers/B.png'); await write('public/图片/春日 #100% 光.png');
  await write('public/covers/.hidden.png'); await write('public/.secret/private.png'); await write('public/file.pdf', 'pdf'); await write('public/movie.mp4', 'video');
  await fs.mkdir(path.join(site, 'public/covers/directory.png'));
  const first = await service.list(new URLSearchParams({ limit: '1' })); assert.equal(first.total, 3); assert.equal(first.items.length, 1); assert.equal(first.hasMore, true);
  const second = await service.list(new URLSearchParams({ offset: '1', limit: '1' })); assert.notEqual(first.items[0].value, second.items[0].value);
  const filtered = await service.list(new URLSearchParams({ q: '春日', cover: '/covers/A.png', type: 'image' }));
  assert.equal(filtered.total, 1); assert.equal(filtered.items[0].path, '/图片/春日 #100% 光.png'); assert.equal(filtered.current.value, '/covers/A.png');
  assert.equal(path.relative(site, await service.file(filtered.items[0].value)).replaceAll('\\', '/'), 'public/图片/春日 #100% 光.png');
  assert.equal((await service.list(new URLSearchParams({ type: 'video' }))).total, 0);
  for (const params of [{ limit: '0' }, { limit: '61' }, { offset: '-1' }, { offset: '1.5' }, { type: 'pdf' }, { q: 'a'.repeat(201) }]) await assert.rejects(service.list(new URLSearchParams(params)), /筛选条件/);
});

test('website image paths reject traversal, encoded traversal, private files and image-named directories', async t => {
  const { site, service, write } = await fixture(t);
  await write('secret.png'); await write('public/safe.png'); await fs.mkdir(path.join(site, 'public/folder.png'));
  for (const value of ['../secret.png', '//server/image.png', '/%2e%2e/secret.png', '/%2e%2e%5csecret.png', '/safe.png/../../secret.png', '/C:/secret.png', '/folder.png', '/safe.png%00', '/safe.png?private', '/%ZZ.png']) await assert.rejects(service.file(value));
  assert.equal(await service.file('/safe.png'), path.join(site, 'public/safe.png'));
});

test('signed thumbnails decode real pixels, bind one image and reject malformed signatures', async t => {
  const { service, write, serve } = await fixture(t);
  await write('public/a.png'); await write('public/b.png');
  const item = await service.item('/a.png'), output = await serve(item.thumbnailUrl);
  assert.equal(output.status, 200); assert.equal(output.headers['Content-Type'], 'image/webp');
  const meta = await sharp(output.body).metadata(); assert.equal(meta.width, 420); assert.equal(meta.height, 210);
  assert.equal(output.headers['Content-Length'], output.body.length);
  const switched = new URL(item.thumbnailUrl, 'http://local'); switched.searchParams.set('file', '/b.png'); await assert.rejects(serve(switched.href), /凭证无效/);
  for (const ticket of ['', 'x'.repeat(64), '汉'.repeat(64), 'a'.repeat(63)]) { const url = new URL(item.thumbnailUrl, 'http://local'); url.searchParams.set('ticket', ticket); await assert.rejects(serve(url.href), /凭证无效/); }
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="20"><rect width="40" height="20" fill="red"/></svg>';
  await write('public/icon.svg', svg); const svgOutput = await serve((await service.item('/icon.svg')).thumbnailUrl); assert.equal((await sharp(svgOutput.body).metadata()).width, 40);
});

test('cached listings recover after a public file is removed by a fresh website build', async t => {
  const { service, write } = await fixture(t);
  const first = await write('public/a.png'); await write('public/b.png');
  assert.equal((await service.list(new URLSearchParams())).total, 2);
  await fs.unlink(first);
  const refreshed = await service.list(new URLSearchParams()); assert.equal(refreshed.total, 1); assert.equal(refreshed.items[0].value, '/b.png');
});

test('preview rechecks filesystem boundaries when a scanned image directory becomes a junction', async t => {
  const { root, site, service, write, serve } = await fixture(t);
  await write('public/images/cover.png'); const item = await service.item('/images/cover.png');
  const outside = path.join(root, 'private'); await fs.mkdir(outside); await fs.writeFile(path.join(outside, 'cover.png'), 'private bytes');
  await fs.rename(path.join(site, 'public/images'), path.join(site, 'public/images-original'));
  try { await fs.symlink(outside, path.join(site, 'public/images'), 'junction'); } catch { t.skip('symlinks unavailable'); return; }
  await assert.rejects(serve(item.thumbnailUrl), /符号链接/);
  assert.equal((await service.list(new URLSearchParams())).items.some(image => image.value === '/images/cover.png'), false);
});
