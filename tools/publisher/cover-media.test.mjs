import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import http from 'node:http';
import net from 'node:net';
import { once } from 'node:events';
import { spawn, execFile } from 'node:child_process';
import { promisify } from 'node:util';
import sharp from 'sharp';
import { Publisher, frontmatter } from './core.mjs';
import { CoverMedia, mediaValue } from './cover-media.mjs';

async function fixture(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'publisher-cover-'));
  t.after(() => fs.rm(root, { recursive: true, force: true, maxRetries: 4, retryDelay: 100 }));
  const vault = path.join(root, 'vault'), site = path.join(root, 'site'), state = path.join(root, 'private');
  await fs.mkdir(vault); await fs.mkdir(site);
  const p = new Publisher({ vault, site, state }); await p.init();
  const write = async (name, body) => { const dest = path.join(vault, name); await fs.mkdir(path.dirname(dest), { recursive: true }); await fs.writeFile(dest, body); return dest; };
  const service = new CoverMedia({ publisher: p, parseFrontmatter: frontmatter });
  const list = input => service.list(new URLSearchParams({ note: 'folder/A.md', ...input }));
  return { p, root, vault, site, state, write, service, list };
}

test('note media identifies used Wiki, Markdown references and HTML while preserving private files', async t => {
  const { p, write, state, vault, list } = await fixture(t);
  const files = ['wiki.png', 'markdown.jpg', 'referenced.webp', 'html.png', 'movie.mp4', 'poster.png', 'current.png', 'outside.png', 'code.png', 'unused.png'];
  for (const name of files) await write(name, 'synthetic ' + name);
  const raw = '---\ncover: /current.png\n---\n![[/wiki.png]]\n\n![图](/markdown.jpg)\n\n![引用][ref]\n\n[ref]: /referenced.webp\n[unused]: /unused.png\n\n<img src="/html.png">\n\n<video poster="/poster.png"><source src="/movie.mp4"></video>\n\n`![[/code.png]]`\n\n```text\n![[/code.png]]\n```\n\n%% ![[/outside.png]] %%\n\n![外链](https://example.com/outside.png)';
  await write('folder/A.md', raw); await p.scan();
  const before = await fs.readFile(path.join(state, 'selection.json'), 'utf8');
  const result = await list();
  assert.deepEqual(result.items.map(item => item.path).sort(), ['current.png', 'html.png', 'markdown.jpg', 'movie.mp4', 'poster.png', 'referenced.webp', 'wiki.png'].sort());
  assert.equal(result.current.path, 'current.png'); assert.equal(result.total, 7);
  assert.ok(result.items.every(item => item.referenced));
  assert.equal(await fs.readFile(path.join(state, 'selection.json'), 'utf8'), before);
  assert.equal(await fs.readFile(path.join(vault, 'folder/A.md'), 'utf8'), raw);
});

test('all-media filtering paginates and safely round-trips Chinese, hash and percent filenames', async t => {
  const { p, write, list } = await fixture(t);
  await write('folder/A.md', '正文');
  const special = '图片/春日 #100% 光.png';
  await write(special, 'image'); await write('clip.mp4', 'video'); await write('other.png', 'image'); await write('no.pdf', 'pdf'); await p.scan();
  const all = await list({ scope: 'all', limit: '1' });
  assert.equal(all.total, 3); assert.equal(all.items.length, 1); assert.equal(all.hasMore, true);
  const next = await list({ scope: 'all', offset: '1', limit: '1' }); assert.notEqual(next.items[0].path, all.items[0].path);
  const filtered = await list({ scope: 'all', type: 'image', q: '春日' }); assert.equal(filtered.total, 1);
  assert.equal(filtered.items[0].value, '/%E5%9B%BE%E7%89%87/%E6%98%A5%E6%97%A5%20%23100%25%20%E5%85%89.png');
  assert.equal(await p.resolve(filtered.items[0].value, 'folder/A.md'), special);
  const current = await list({ cover: mediaValue(special) }); assert.equal(current.current.path, special); assert.equal(current.items[0].referenced, true);
  assert.equal((await list({ scope: 'all', type: 'video' })).items[0].path, 'clip.mp4');
  for (const query of [{ offset: '-1' }, { offset: '1.2' }, { limit: '0' }, { limit: '61' }, { type: 'pdf' }, { scope: 'external' }, { note: '../private.md' }]) await assert.rejects(list(query));
  p.ffmpeg = async () => null;
  const unsupported = (await list({ scope: 'all', type: 'video' })).items[0];
  assert.equal(unsupported.selectable, false); assert.match(unsupported.reason, /FFmpeg/); assert.equal(unsupported.thumbnailUrl, '');
});

test('tickets bind one file and operation, expire and reject path or signature substitution', async t => {
  const { p, write, service } = await fixture(t);
  await write('folder/A.md', '正文'); await write('a.png', 'image'); await write('b.png', 'image'); await p.scan();
  let now = 1000; service.clock = () => now; service.ticketLifetime = 100;
  const url = new URL(service.sign('a.png', 'preview'), 'http://local'), ticket = url.searchParams.get('ticket');
  assert.equal(service.validate(ticket, 'preview'), 'a.png');
  assert.throws(() => service.validate(ticket, 'thumbnail'), /过期/);
  const [payload, signature] = ticket.split('.'), forged = Buffer.from(JSON.stringify({ ...JSON.parse(Buffer.from(payload, 'base64url')), path: 'b.png' })).toString('base64url') + '.' + signature;
  assert.throws(() => service.validate(forged, 'preview'), /无效/);
  assert.throws(() => service.validate(ticket + 'x', 'preview'), /无效/);
  now = 1101; assert.throws(() => service.validate(ticket, 'preview'), /过期/);
  assert.throws(() => service.validate(new URL(service.sign('../secret.png', 'preview'), 'http://local').searchParams.get('ticket'), 'preview'), /过期/);
});

test('media tickets recheck filesystem bounds instead of trusting an old scan', async t => {
  const { p, root, write, service, vault } = await fixture(t);
  await write('folder/A.md', '正文'); await write('images/cover.png', 'image'); await p.scan();
  const signed = new URL(service.sign('images/cover.png', 'thumbnail'), 'http://local');
  await fs.rename(path.join(vault, 'images'), path.join(vault, 'images-backup'));
  await fs.mkdir(path.join(root, 'outside')); await fs.writeFile(path.join(root, 'outside/cover.png'), 'private');
  try { await fs.symlink(path.join(root, 'outside'), path.join(vault, 'images'), 'junction'); } catch { t.skip('symlinks unavailable'); return; }
  const file = service.validate(signed.searchParams.get('ticket'), 'thumbnail');
  await assert.rejects(service.thumbnail(file), /符号链接/);
});

test('video covers enter attachment review even when encoding strategy or codec is unavailable', async t => {
  const { p, write } = await fixture(t);
  await write('folder/A.md', '正文'); await write('clip.mov', 'movie'); await p.scan();
  p.ffmpeg = async () => '/synthetic/ffmpeg';
  await p.select(['folder/A.md'], { 'clip.mov': 'original' }, { 'folder/A.md': { cover: '/clip.mov' } });
  let plan = await p.analyze(); assert.equal(plan.assets[0].path, 'clip.mov'); assert.match(plan.errors[0].message, /转为 MP4/);
  p.ffmpeg = async () => null; plan = await p.analyze(); assert.equal(plan.assets.length, 1); assert.match(plan.errors[0].message, /FFmpeg/);
});

test('reviewed video covers generate a poster and public video, preserve sources and reject later changes', async t => {
  const exe = process.env.PUBLISHER_TEST_FFMPEG;
  if (!exe) { t.skip('Set PUBLISHER_TEST_FFMPEG to exercise actual cover encoding'); return; }
  const { p, write, vault, site } = await fixture(t); p.ffmpeg = async () => exe;
  await promisify(execFile)(exe, ['-nostdin', '-y', '-f', 'lavfi', '-i', 'testsrc2=size=160x90:rate=10', '-t', '0.5', '-c:v', 'libx264', path.join(vault, 'clip.mov')], { windowsHide: true });
  const original = await fs.readFile(path.join(vault, 'clip.mov'));
  const raw = '测试视频封面'; await write('folder/A.md', raw); await p.scan();
  await p.select(['folder/A.md'], {}, { 'folder/A.md': { cover: '/clip.mov', section: 'work', summary: '动态封面' } });
  let plan = await p.analyze(); assert.deepEqual(plan.errors, []); assert.equal(plan.assets[0].mode, 'video');
  await assert.rejects(p.prepare(plan.id, []), /审核/);
  const stage = await p.prepare(plan.id, plan.assets.map(asset => asset.key));
  const staged = p.stages.get(stage.id), markdown = await fs.readFile(path.join(staged.dir, 'notes', plan.output[0].slug + '.md'), 'utf8'), meta = frontmatter(markdown).data;
  assert.match(meta.cover, /^\/published-assets\/.+-poster\.jpg$/); assert.match(meta.coverVideo, /^\/published-assets\/.+\.mp4$/);
  assert.doesNotMatch(markdown, /publisher-(asset|poster):/);
  assert.ok((await sharp(path.join(staged.dir, 'assets', path.posix.basename(meta.cover))).metadata()).width > 0);
  await p.apply(stage.id); assert.ok((await p.manifest()).assets.includes(path.posix.basename(meta.cover)));
  assert.ok(await fs.stat(path.join(site, 'public', meta.coverVideo)));
  assert.deepEqual(await fs.readFile(path.join(vault, 'clip.mov')), original); assert.equal(await fs.readFile(path.join(vault, 'folder/A.md'), 'utf8'), raw);
  plan = await p.analyze(); const reviewed = await p.prepare(plan.id, plan.assets.map(asset => asset.key));
  await fs.appendFile(path.join(vault, 'clip.mov'), 'changed');
  await assert.rejects(p.apply(reviewed.id), /源文件已变化/);
});

test('HTTP media routes require scoped tickets, support Range, and allow parallel thumbnails', async t => {
  const { vault, site, state, write } = await fixture(t);
  const raw = '# 正文\n\n![[/image.png]]\n\n[Video](/clip.mp4)'; await write('folder/A.md', raw);
  await write('image.png', await sharp({ create: { width: 800, height: 600, channels: 3, background: 'green' } }).png().toBuffer());
  const movie = Buffer.from('0123456789abcdef'); await write('clip.mp4', movie);
  const probe = net.createServer(); probe.listen(0, '127.0.0.1'); await once(probe, 'listening'); const port = probe.address().port; await new Promise(resolve => probe.close(resolve));
  const child = spawn(process.execPath, [new URL('./server.mjs', import.meta.url).pathname.replace(/^\/(?=[A-Za-z]:)/, '')], { windowsHide: true, env: { ...process.env, PUBLISHER_SITE: site, PUBLISHER_VAULT: vault, PUBLISHER_STATE: state, PUBLISHER_PORT: String(port) }, stdio: ['ignore', 'pipe', 'pipe'] });
  let logs = ''; child.stderr.on('data', data => { logs += data; });
  t.after(async () => { if (child.exitCode === null) { const stopped = once(child, 'exit'); child.kill(); await stopped; } });
  await Promise.race([once(child.stdout, 'data'), once(child, 'exit').then(() => { throw Error(logs); })]);
  const base = `http://127.0.0.1:${port}`, page = await fetch(base).then(response => response.text()), token = page.match(/const token='([a-f0-9]+)'/)[1];
  const headers = { 'X-Publisher-Token': token }, query = '/api/cover-media?note=folder%2FA.md&scope=all';
  assert.equal((await fetch(base + query)).status, 403);
  assert.equal((await fetch(base + query, { headers: { ...headers, Origin: 'https://evil.invalid' } })).status, 403);
  await fetch(base + '/api/scan', { headers });
  const before = await fs.readFile(path.join(state, 'selection.json'), 'utf8');
  const response = await fetch(base + query, { headers }); assert.equal(response.status, 200);
  const list = await response.json(), image = list.items.find(item => item.type === 'image'), video = list.items.find(item => item.type === 'video');
  assert.equal(list.items.length, 2); assert.doesNotMatch(JSON.stringify(list), new RegExp(token));
  assert.equal(await fs.readFile(path.join(state, 'selection.json'), 'utf8'), before);
  const thumbnails = await Promise.all(Array.from({ length: 8 }, () => fetch(base + image.thumbnailUrl)));
  assert.ok(thumbnails.every(response => response.status === 200));
  const info = await sharp(Buffer.from(await thumbnails[0].arrayBuffer())).metadata(); assert.ok(info.width <= 400 && info.height <= 250);
  assert.equal((await fetch(base + image.thumbnailUrl, { headers: { Origin: 'https://evil.invalid' } })).status, 403);
  assert.equal((await fetch(base + image.thumbnailUrl, { headers: { 'Sec-Fetch-Site': 'cross-site' } })).status, 403);
  assert.equal((await fetch(base + image.thumbnailUrl + 'x')).status, 403);
  assert.equal((await fetch(base + image.thumbnailUrl.replace('/thumbnail?', '/preview?'))).status, 403);
  const partial = await fetch(base + video.previewUrl, { headers: { Range: 'bytes=2-5' } });
  assert.equal(partial.status, 206); assert.equal(partial.headers.get('content-range'), 'bytes 2-5/16'); assert.equal(await partial.text(), '2345');
  const suffix = await fetch(base + video.previewUrl, { headers: { Range: 'bytes=-3' } }); assert.equal(suffix.status, 206); assert.equal(await suffix.text(), 'def');
  for (const range of ['bytes=20-', 'bytes=6-2', 'bytes=0-1,3-4', 'bytes=-0']) assert.equal((await fetch(base + video.previewUrl, { headers: { Range: range } })).status, 416);
  const head = await fetch(base + video.previewUrl, { method: 'HEAD' }); assert.equal(head.headers.get('content-length'), '16'); assert.equal(await head.text(), '');
  const foreignHost = await new Promise((resolve, reject) => { const req = http.get(base + video.previewUrl, { headers: { Host: `localhost:${port}` } }, response => { response.resume(); resolve(response.statusCode); }); req.on('error', reject); });
  assert.equal(foreignHost, 403);
  assert.equal(await fs.readFile(path.join(vault, 'folder/A.md'), 'utf8'), raw); assert.deepEqual(await fs.readFile(path.join(vault, 'clip.mp4')), movie);
});
