import fs from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import { pipeline } from 'node:stream/promises';
import sharp from 'sharp';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import { parseFragment } from 'parse5';

const parser = unified().use(remarkParse).use(remarkGfm).use(remarkMath);
const images = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.avif']);
const videos = new Set(['.mp4', '.webm', '.mov', '.m4v']);
const typeOf = file => images.has(path.extname(file).toLowerCase()) ? 'image' : videos.has(path.extname(file).toLowerCase()) ? 'video' : null;
const mime = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.avif': 'image/avif', '.mp4': 'video/mp4', '.webm': 'video/webm', '.mov': 'video/quicktime', '.m4v': 'video/mp4' };
const fail = (status, message) => Object.assign(Error(message), { status });
export const mediaValue = file => '/' + file.split('/').map(encodeURIComponent).join('/');

function references(body) {
  const tree = parser.parse(body.replace(/%%[\s\S]*?%%/g, ''));
  const targets = new Set(), definitions = new Map();
  const walk = (node, visit) => { visit(node); if (!['code', 'inlineCode', 'math', 'inlineMath'].includes(node.type)) for (const child of node.children ?? []) walk(child, visit); };
  walk(tree, node => { if (node.type === 'definition') definitions.set(node.identifier.toLowerCase(), node.url); });
  walk(tree, node => {
    if (['image', 'link'].includes(node.type)) targets.add(node.url);
    if (['imageReference', 'linkReference'].includes(node.type)) { const url = definitions.get(node.identifier.toLowerCase()); if (url) targets.add(url); }
    if (node.type === 'text') for (const match of node.value.matchAll(/!?\[\[([^\]]+)\]\]/g)) targets.add(match[1].split('|')[0]);
    if (node.type === 'html') {
      const visit = element => {
        if (['img', 'video', 'source'].includes(element.nodeName)) for (const attr of element.attrs ?? []) if (attr.name === 'src' || element.nodeName === 'video' && attr.name === 'poster') targets.add(attr.value);
        for (const child of element.childNodes ?? []) visit(child);
      };
      visit(parseFragment(node.value));
    }
  });
  return [...targets].filter(target => typeof target === 'string' && !/^(?:[a-z]+:|\/\/)/i.test(target));
}

function ffmpegFrame(executable, input) {
  return new Promise((resolve, reject) => {
    const child = spawn(executable, ['-nostdin', '-v', 'error', '-i', input, '-frames:v', '1', '-vf', 'scale=400:250:force_original_aspect_ratio=decrease', '-f', 'image2pipe', '-vcodec', 'mjpeg', 'pipe:1'], { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    const chunks = []; let size = 0, log = '', timeout = false;
    const timer = setTimeout(() => { timeout = true; child.kill(); }, 30_000);
    child.stdout.on('data', chunk => { size += chunk.length; if (size > 5_000_000) child.kill(); else chunks.push(chunk); });
    child.stderr.on('data', chunk => { log = (log + chunk).slice(-1000); });
    child.on('error', error => { clearTimeout(timer); reject(error); });
    child.on('close', code => { clearTimeout(timer); if (code === 0 && size > 0 && size <= 5_000_000) resolve(Buffer.concat(chunks)); else reject(Error(timeout ? '视频缩略图读取超时' : '无法生成视频缩略图：' + log)); });
  });
}

export class CoverMedia {
  constructor({ publisher, parseFrontmatter, ticketLifetime = 15 * 60_000, clock = Date.now }) {
    this.publisher = publisher; this.parseFrontmatter = parseFrontmatter;
    this.secret = crypto.randomBytes(32); this.ticketLifetime = ticketLifetime; this.clock = clock;
    this.cache = new Map(); this.cacheBytes = 0; this.pending = new Map(); this.active = 0; this.queue = [];
  }
  sign(file, kind) {
    const payload = Buffer.from(JSON.stringify({ path: file, kind, expires: this.clock() + this.ticketLifetime })).toString('base64url');
    const signature = crypto.createHmac('sha256', this.secret).update(payload).digest('base64url');
    return `/api/cover-media/${kind}?ticket=${payload}.${signature}`;
  }
  validate(ticket, kind) {
    if (typeof ticket !== 'string' || ticket.length > 8192) throw fail(403, '素材预览凭证无效');
    const pieces = ticket.split('.');
    if (pieces.length !== 2) throw fail(403, '素材预览凭证无效');
    const expected = crypto.createHmac('sha256', this.secret).update(pieces[0]).digest();
    const signature = Buffer.from(pieces[1], 'base64url');
    if (signature.length !== expected.length || !crypto.timingSafeEqual(signature, expected)) throw fail(403, '素材预览凭证无效');
    let payload; try { payload = JSON.parse(Buffer.from(pieces[0], 'base64url').toString('utf8')); } catch { throw fail(403, '素材预览凭证无效'); }
    if (payload.kind !== kind || !Number.isFinite(payload.expires) || payload.expires <= this.clock() || !this.publisher.fileSet?.has(payload.path) || !typeOf(payload.path)) throw fail(403, '素材预览已过期，请重新打开素材列表');
    return payload.path;
  }
  async list(params) {
    const note = params.get('note'), scope = params.get('scope') ?? 'note', type = params.get('type') ?? 'all', q = (params.get('q') ?? '').trim().toLocaleLowerCase();
    const number = (name, fallback, max) => { const raw = params.get(name); if (raw !== null && !/^\d+$/.test(raw)) throw fail(400, '分页参数无效'); const value = raw === null ? fallback : Number(raw); if (!Number.isSafeInteger(value) || value < 0 || value > max) throw fail(400, '分页参数无效'); return value; };
    const offset = number('offset', 0, 1_000_000), limit = number('limit', 24, 60);
    if (!limit || !['note', 'all'].includes(scope) || !['all', 'image', 'video'].includes(type) || q.length > 200) throw fail(400, '素材筛选条件无效');
    if (!this.publisher.fileSet?.has(note) || !/\.md$/i.test(note) || !this.publisher.db.entries[note]) throw fail(400, '请先选择已扫描的笔记');
    const raw = await fs.readFile(await this.publisher.bounded(note), 'utf8');
    const parsed = this.parseFrontmatter(raw), used = new Set();
    for (const target of references(parsed.body)) {
      try { const file = await this.publisher.resolve(target, note); if (typeOf(file)) used.add(file); } catch { /* Missing/ambiguous media will be reported by publication analysis. */ }
    }
    const cover = params.has('cover') ? params.get('cover') : this.publisher.db.entries[note].metadata?.cover ?? parsed.data.cover ?? '';
    let currentPath = null;
    if (typeof cover === 'string' && cover && !/^(?:[a-z]+:|\/\/)/i.test(cover)) try { const file = await this.publisher.resolve(cover, note); if (typeOf(file)) { currentPath = file; used.add(file); } } catch { /* Keep an unresolved manually typed cover visible in its input. */ }
    const ffmpeg = !!await this.publisher.ffmpeg();
    const candidates = (scope === 'note' ? [...used] : this.publisher.files.filter(file => typeOf(file))).filter(file => (type === 'all' || typeOf(file) === type) && (!q || file.toLocaleLowerCase().includes(q))).sort((a, b) => Number(used.has(b)) - Number(used.has(a)) || a.localeCompare(b, 'zh-CN'));
    const item = async file => {
      const info = await fs.stat(await this.publisher.bounded(file));
      if (!info.isFile()) throw fail(404, '素材不是文件');
      const type = typeOf(file), selectable = type !== 'video' || ffmpeg;
      return { path: file, value: mediaValue(file), name: path.posix.basename(file), type, bytes: info.size, referenced: used.has(file), selectable, ...(selectable ? {} : { reason: 'FFmpeg 不可用，暂时不能使用视频封面；可选择图片。' }), thumbnailUrl: type === 'image' || ffmpeg ? this.sign(file, 'thumbnail') : '', previewUrl: this.sign(file, 'preview') };
    };
    const items = await Promise.all(candidates.slice(offset, offset + limit).map(item));
    const current = currentPath ? items.find(item => item.path === currentPath) ?? await item(currentPath) : null;
    return { items, current, total: candidates.length, offset, limit, hasMore: offset + limit < candidates.length, ffmpeg };
  }
  async limited(fn) {
    if (this.active >= 2) await new Promise(resolve => this.queue.push(resolve));
    else this.active++;
    try { return await fn(); } finally { const next = this.queue.shift(); if (next) next(); else this.active--; }
  }
  async thumbnail(file) {
    const input = await this.publisher.bounded(file), info = await fs.stat(input);
    const key = file + ':' + info.size + ':' + info.mtimeMs;
    if (this.cache.has(key)) { const data = this.cache.get(key); this.cache.delete(key); this.cache.set(key, data); return data; }
    if (this.pending.has(key)) return this.pending.get(key);
    const promise = this.limited(async () => {
      let image = input;
      if (typeOf(file) === 'video') { const executable = await this.publisher.ffmpeg(); if (!executable) throw fail(422, 'FFmpeg 不可用，无法预览视频封面'); image = await ffmpegFrame(executable, input); }
      const buffer = await sharp(image, { limitInputPixels: 80_000_000 }).rotate().resize({ width: 400, height: 250, fit: 'inside', withoutEnlargement: true }).webp({ quality: 75 }).toBuffer();
      this.cache.set(key, buffer); this.cacheBytes += buffer.length;
      while (this.cache.size > 96 || this.cacheBytes > 16_000_000) { const oldest = this.cache.keys().next().value; this.cacheBytes -= this.cache.get(oldest).length; this.cache.delete(oldest); }
      return buffer;
    });
    this.pending.set(key, promise);
    try { return await promise; } finally { this.pending.delete(key); }
  }
  async serve(req, res, url) {
    const kind = url.pathname.split('/').at(-1), file = this.validate(url.searchParams.get('ticket'), kind);
    const input = await this.publisher.bounded(file);
    if (kind === 'thumbnail') {
      const buffer = await this.thumbnail(file); res.writeHead(200, { 'Content-Type': 'image/webp', 'Content-Length': buffer.length }); res.end(req.method === 'HEAD' ? undefined : buffer); return;
    }
    const info = await fs.stat(input), headers = { 'Content-Type': mime[path.extname(file).toLowerCase()], 'Accept-Ranges': 'bytes', 'Content-Length': info.size };
    let start = 0, end = info.size - 1, status = 200;
    if (req.headers.range) {
      const match = req.headers.range.match(/^bytes=(\d*)-(\d*)$/);
      if (match && (match[1] || match[2])) {
        if (!match[1]) start = Math.max(0, info.size - Number(match[2]));
        else { start = Number(match[1]); if (match[2]) end = Math.min(end, Number(match[2])); }
      }
      if (!match || (!match[1] && !match[2]) || !Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || start > end || start >= info.size) { res.writeHead(416, { 'Content-Range': `bytes */${info.size}` }); res.end(); return; }
      status = 206; headers['Content-Length'] = end - start + 1; headers['Content-Range'] = `bytes ${start}-${end}/${info.size}`;
    }
    res.writeHead(status, headers);
    if (req.method === 'HEAD' || info.size === 0) { res.end(); return; }
    await pipeline(createReadStream(input, { start, end }), res);
  }
}
