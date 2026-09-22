import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { Publisher, frontmatter } from './core.mjs';
import { CoverMedia } from './cover-media.mjs';
import { GitPublisher } from './deploy.mjs';
import { publisherVersion } from './version.mjs';
import { spawn } from 'node:child_process';
import sharp from 'sharp';

const here = path.dirname(fileURLToPath(import.meta.url));
const site = path.resolve(process.env.PUBLISHER_SITE || path.resolve(here, '../..'));
const token = crypto.randomBytes(32).toString('hex');
const port = Number(process.env.PUBLISHER_PORT || 4875);
const origin = `http://127.0.0.1:${port}`;
const previewUrl = process.env.PUBLISHER_PREVIEW_URL || 'http://127.0.0.1:4325/';
const publisher = new Publisher({ site, vault: process.env.PUBLISHER_VAULT || 'F:/我的笔记/MyNote', state: process.env.PUBLISHER_STATE || path.resolve(site, '../private-publisher') });
await publisher.init();
const coverMedia = new CoverMedia({ publisher, parseFrontmatter: frontmatter });
let locked = false;
async function command(script,args){await new Promise((resolve,reject)=>{const p=spawn(process.execPath,[path.join(site,script),...args],{cwd:site,windowsHide:true,env:{...process.env,ASTRO_TELEMETRY_DISABLED:'1'},stdio:['ignore','pipe','pipe']});let log='';for(const stream of [p.stdout,p.stderr])stream.on('data',d=>log=(log+d).slice(-6000));p.on('error',reject);p.on('exit',code=>code===0?resolve():reject(Error('网站构建失败，已保留原副本：'+log)))})}
async function rebuild(dir){await command('node_modules/astro/astro.js',['build','--force','--outDir',dir]);await command('node_modules/pagefind/lib/runner/bin.cjs',['--site',dir]);}
const deployment = await new GitPublisher({
  site, state: publisher.state, proxy: process.env.PUBLISHER_GIT_PROXY,
  validate: async () => {
    const dir = path.join(site, '.publisher-build-' + crypto.randomUUID());
    try {
      await rebuild(dir);
      await command('tools/check-site.mjs', [dir, '--no-report']);
      await command('tools/check-release.mjs', [dir]);
    } finally { await fs.rm(dir, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 }); }
  }
}).init();
const server = http.createServer(async (req, res) => {
  res.setHeader('Cache-Control', 'no-store'); res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY'); res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; media-src 'self' blob:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'");
  const json = (status, body) => { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(body)); };
  try {
    if (req.headers.host !== `127.0.0.1:${port}`) return json(403, { error: '仅接受本机地址' });
    const url = new URL(req.url, origin);
    if (req.method === 'GET' && url.pathname === '/publisher.css') {
      res.writeHead(200, { 'Content-Type': 'text/css; charset=utf-8' });
      return res.end(await fs.readFile(path.join(here, 'publisher.css'), 'utf8'));
    }
    if (req.method === 'GET' && url.pathname === '/api/health') return json(200, { service: 'garden-publisher', site, previewUrl, version: publisherVersion });
    if (req.method === 'GET' && url.pathname === '/') {
      const html = (await fs.readFile(path.join(here, 'index.html'), 'utf8')).replace('__TOKEN__', token).replace('__PREVIEW_URL__', previewUrl.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;'));
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); return res.end(html);
    }
    if (url.pathname === '/favicon.ico') { res.writeHead(204); return res.end(); }
    if (['GET', 'HEAD'].includes(req.method) && ['/api/cover-media/thumbnail', '/api/cover-media/preview'].includes(url.pathname)) {
      if (req.headers.origin && req.headers.origin !== origin || req.headers['sec-fetch-site'] === 'cross-site') return json(403, { error: '素材预览仅接受本机同源页面' });
      await coverMedia.serve(req, res, url); return;
    }
    if (req.headers['x-publisher-token'] !== token || (req.headers.origin && req.headers.origin !== origin)) return json(403, { error: '本地会话验证失败，请刷新页面' });
    if (req.method === 'GET' && url.pathname === '/api/deploy/status') return json(200, deployment.status());
    if (req.method === 'GET' && url.pathname === '/api/cover-media') return json(200, await coverMedia.list(url.searchParams));
    if (locked || deployment.busy) return json(409, { error: '正在处理，请稍候；可继续查看发布进度。' });
    locked = true;
    try {
      if (req.method === 'GET' && url.pathname === '/api/scan') return json(200, await publisher.scan());
      if(req.method==='GET'&&url.pathname==='/api/thumbnail'){
        const asset=publisher.plans.get(url.searchParams.get('id'))?.assets.find(a=>a.key===url.searchParams.get('key'));
        if(!asset||!['.png','.jpg','.jpeg','.gif','.webp','.avif'].includes(asset.ext))return json(404,{error:'没有图片预览'});
        const data=await sharp(await publisher.bounded(asset.path)).resize({width:400,height:250,fit:'inside',withoutEnlargement:true}).png().toBuffer();
        res.writeHead(200,{'Content-Type':'image/png'});return res.end(data);
      }
      if (req.method === 'GET' && url.pathname === '/api/stage') {
        const stage = publisher.stages.get(url.searchParams.get('id'));
        const note = stage?.plan.output.find(n => n.slug === url.searchParams.get('slug'));
        if (!note) return json(404, { error: '预览不存在' });
        return json(200, { markdown: await fs.readFile(path.join(stage.dir, 'notes', note.slug + '.md'), 'utf8') });
      }
      if (req.method !== 'POST') return json(404, { error: '接口不存在' });
      if (req.headers.origin !== origin || !req.headers['content-type']?.startsWith('application/json')) return json(403, { error: '请求来源无效' });
      let body = ''; for await (const chunk of req) { body += chunk; if (body.length > 2_000_000) throw Error('请求过大'); }
      const data = JSON.parse(body || '{}');
      if (url.pathname === '/api/deploy/review') return json(200, await deployment.review());
      if (url.pathname === '/api/deploy/start') return json(202, await deployment.start(data.id));
      if (url.pathname === '/api/select') { await publisher.select(data.selected, data.assets, data.metadata); return json(200, { ok: true, metadata: publisher.metadataOverrides() }); }
      if (url.pathname === '/api/catalog') return json(200, { catalog: await publisher.addCatalog(data) });
      if(url.pathname==='/api/relink'){await publisher.relink(data.oldPath,data.newPath);return json(200,{ok:true})}
      if (url.pathname === '/api/analyze') {
        const p = await publisher.analyze();
        return json(200, { id: p.id, notes: p.output.map(({ markdown, ...n }) => n), scannedNotes: publisher.notes, selected: publisher.db.selected, assets: p.assets, assetModes: publisher.db.assets, metadata: publisher.metadataOverrides(), catalog: p.catalog, errors: p.errors, warnings: p.warnings, changes: p.changes });
      }
      if (url.pathname === '/api/prepare') return json(200, await publisher.prepare(data.id, data.approved));
      if (url.pathname === '/api/apply') {
        const dir=path.join(site,'.publisher-build-'+crypto.randomUUID());
        const result=await publisher.apply(data.id,()=>rebuild(dir),{previewDirectory:dir});
        return json(200,{...result,message:'网站副本与搜索索引已更新，可以打开本地预览。尚未上传或上线。'});
      }
      return json(404, { error: '接口不存在' });
    } finally { locked = false; }
  } catch (e) { if (res.headersSent) { res.destroy(); return; } return json(e.status ?? 400, { error: e.message }); }
});
server.listen(port, '127.0.0.1', () => console.log(`本地发布管理器：${origin}\n默认零选择。写入本地副本后，点击“发布到 GitHub Pages”才会上传并部署。`));
