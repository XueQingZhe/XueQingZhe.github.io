import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { parse } from 'parse5';
import { chromium } from 'playwright';
import sharp from 'sharp';
import { Publisher, frontmatter } from './core.mjs';

const run = promisify(execFile);
const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const attrs = node => Object.fromEntries((node.attrs ?? []).map(a => [a.name, a.value]));
const text = node => node.value ?? (node.childNodes ?? []).map(text).join('');
function elements(html, predicate) {
  const found = [];
  function visit(node) { if (node.tagName && predicate(attrs(node), node)) found.push(node); for (const child of node.childNodes ?? []) visit(child); }
  visit(typeof html === 'string' ? parse(html) : html);
  return found;
}

test('published sections build into real lists, stable detail pages, exact tags and the search index', { timeout: 300000 }, async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'publisher-sections-'));
  const site = path.join(root, 'site'), vault = path.join(root, 'vault'), state = path.join(root, 'private');
  const junctions = [];
  let browser, server;
  t.after(async () => {
    await browser?.close();
    if (server) await new Promise(resolve => { server.close(resolve); server.closeAllConnections(); });
    // Remove junctions themselves before recursive cleanup; their targets belong to the real project.
    for (const junction of junctions) await fs.unlink(junction).catch(error => { if (error.code !== 'ENOENT') throw error; });
    assert.equal(path.dirname(root), os.tmpdir());
    assert.ok(path.basename(root).startsWith('publisher-sections-'));
    await fs.rm(root, { recursive: true, force: true, maxRetries: 4, retryDelay: 200 });
  });
  await fs.mkdir(site); await fs.mkdir(vault); await fs.mkdir(path.join(site, 'public'));
  await fs.cp(path.join(project, 'src'), path.join(site, 'src'), { recursive: true });
  for (const name of ['astro.config.mjs', 'package.json']) await fs.copyFile(path.join(project, name), path.join(site, name));
  // Never copy or enumerate the real content/ or public/published-assets/. Only established static asset folders are shared.
  for (const name of ['node_modules', 'public/art', 'public/assets', 'public/covers', 'public/fonts']) {
    const dest = path.join(site, name);
    await fs.symlink(path.join(project, name), dest, 'junction'); junctions.push(dest);
  }
  for (const name of ['favicon.svg', 'og.png', 'robots.txt', '.nojekyll']) await fs.copyFile(path.join(project, 'public', name), path.join(site, 'public', name));
  const config = path.join(site, 'astro.config.mjs');
  await fs.writeFile(config, (await fs.readFile(config, 'utf8')).replace('export default defineConfig({', 'export default defineConfig({\n  vite: { cacheDir: ".vite-section-test" },'));

  const sources = {
    'Journal/Deep/Journal.md': '# journalfixtureword\n\nPublished journal body.',
    'Lessons/Custom/Second.md': '# tutorialsecondfixtureword\n\nSecond chapter body.',
    'Lessons/Custom/First.md': '# tutorialfirstfixtureword\n\nRead [[Second]] after this lesson.',
    'Lessons/Standalone.md': '# standalonefixtureword\n\nAn independent lesson.',
    'Portfolio/Project.md': '# workfixtureword\n\nProject implementation details.',
    'Moving.md': '# movingfixtureword\n\nThis entry changes sections without changing its public URL.',
    'Private/Secret.md': '# DO_NOT_EXPORT_SECTION_TEST_SECRET\n\nvaultsecretexclusionqazword',
  };
  for (const [name, body] of Object.entries(sources)) { await fs.mkdir(path.dirname(path.join(vault, name)), { recursive: true }); await fs.writeFile(path.join(vault, name), body); }
  const image = await sharp({ create: { width: 512, height: 288, channels: 3, background: '#416f98' } }).png({ compressionLevel: 0 }).toBuffer();
  await fs.writeFile(path.join(vault, 'Portfolio/cover.png'), image);
  const p = new Publisher({ vault, site, state }); await p.init();
  const scanned = await p.scan();
  assert.equal(scanned.notes.length, 7);
  assert.equal(scanned.notes.some(n => n.path === 'Journal/Deep/Journal.md'), true);
  const selected = Object.keys(sources).filter(name => !name.startsWith('Private/'));
  const metadata = {
    'Journal/Deep/Journal.md': { section: 'notes', category: '图形学基础', series:'我独自升级', title: 'Fixture Journal', summary: 'Journal summary', tags: ['Technical Art', 'Journal Test', '算法笔记'], date: '2026-01-01' },
    'Lessons/Custom/Second.md': { section: 'tutorials', category: '渲染 实验', title: 'Fixture Second Lesson', series: '自定义合成系列', tags: ['Technical', '算法笔记'], order: 2, date: '2026-01-02' },
    'Lessons/Custom/First.md': { section: 'tutorials', category: '图形学基础', title: 'Fixture First Lesson', series: '自定义合成系列', tags: ['Technical Art', '算法笔记'], order: 1, date: '2026-01-03' },
    'Lessons/Standalone.md': { section: 'tutorials', title: 'Fixture Standalone Lesson', tags: ['Independent Study'], date: '2026-01-04' },
    'Portfolio/Project.md': { section: 'work', category: '图形学基础', title: 'Fixture Portfolio Project', summary: 'A generated project summary', cover: 'cover.png', tags: ['Technical Art', '算法笔记'], engine: ['Unreal Engine'], role: ['Technical Artist'], year: 2026, featured: true, date: '2026-01-05' },
    'Moving.md': { section: 'notes', category: '算法笔记', title: 'Fixture Moved Lesson', tags: ['Moving Entry'], date: '2026-01-06' },
    'Private/Secret.md': { section: 'notes', category: '未发布分类', tags: ['私人标签'] },
  };
  await p.select(selected, { 'Portfolio/cover.png': 'lossless' }, metadata);
  let plan = await p.analyze(); assert.deepEqual(plan.errors, []); assert.equal(plan.assets.length, 1);
  assert.equal(plan.assets[0].sources[0], 'Portfolio/cover.png');
  await assert.rejects(p.prepare(plan.id, []), /审核/);
  let stage = await p.prepare(plan.id, plan.assets.map(a => a.key));
  assert.match(stage.assets[0].filename, /\.webp$/);
  const coverUrl = '/published-assets/' + stage.assets[0].filename;
  await p.apply(stage.id);
  const slug = name => p.db.entries[name].slug;
  const url = name => '/notes/' + slug(name) + '/';
  const movedSlug = slug('Moving.md');
  const movedFile = path.join(site, 'content/published/notes', movedSlug + '.md');
  assert.equal(frontmatter(await fs.readFile(movedFile, 'utf8')).data.section, 'notes');
  await p.select(selected, {}, { 'Moving.md': { ...metadata['Moving.md'], section: 'tutorials' } });
  plan = await p.analyze(); assert.deepEqual(plan.errors, []);
  stage = await p.prepare(plan.id, plan.assets.map(a => a.key)); await p.apply(stage.id);
  assert.equal(slug('Moving.md'), movedSlug);
  assert.equal(frontmatter(await fs.readFile(movedFile, 'utf8')).data.section, 'tutorials');
  assert.equal((await fs.readdir(path.join(site, 'content/published/notes'))).length, selected.length);
  assert.deepEqual((await fs.readdir(path.join(site, 'public/published-assets'))), [path.basename(coverUrl)]);
  const projectMd = frontmatter(await fs.readFile(path.join(site, 'content/published/notes', slug('Portfolio/Project.md') + '.md'), 'utf8'));
  assert.equal(projectMd.data.cover, coverUrl); assert.deepEqual(projectMd.data.tech, ['Technical Art','算法笔记']);
  assert.equal(projectMd.data.category, '图形学基础');
  assert.deepEqual(projectMd.data.engine, ['Unreal Engine']); assert.deepEqual(projectMd.data.role, ['Technical Artist']);

  const env = { ...process.env, ASTRO_TELEMETRY_DISABLED: '1' };
  try {
    await run(process.execPath, [path.join(project, 'node_modules/astro/astro.js'), 'build', '--force'], { cwd: site, env, windowsHide: true, timeout: 180000, maxBuffer: 8 * 1024 * 1024 });
    await run(process.execPath, [path.join(project, 'node_modules/pagefind/lib/runner/bin.cjs'), '--site', 'dist'], { cwd: site, env, windowsHide: true, timeout: 60000, maxBuffer: 4 * 1024 * 1024 });
  } catch (error) { throw new Error('Isolated section build failed:\n' + (error.stdout ?? '') + '\n' + (error.stderr ?? ''), { cause: error }); }
  const dist = path.join(site, 'dist');
  const html = route => fs.readFile(path.join(dist, route, 'index.html'), 'utf8');
  const [journal, study, work, home, rss, feed] = await Promise.all([html('notes'), html('tutorials'), html('work'), html(''), fs.readFile(path.join(dist, 'rss.xml'), 'utf8'), fs.readFile(path.join(dist, 'feed.xml'), 'utf8')]);
  for (const source of [journal,study,work]) {
    const categories=elements(source,(a,n)=>n.tagName==='button'&&Object.hasOwn(a,'data-category')).map(n=>attrs(n)['data-category']);
    assert.ok(categories.includes('图形学基础'));
    assert.ok(!categories.includes('未发布分类'));
    assert.ok(!source.includes('私人标签'));
    assert.ok(elements(source,(a,n)=>n.tagName==='button'&&text(n).includes('算法笔记')).length,'New Chinese tag missing from public controls');
  }
  assert.ok(!elements(journal,(a,n)=>n.tagName==='button'&&a['data-category']==='算法笔记').length,'Moved category must disappear from notes');
  assert.ok(elements(study,(a,n)=>n.tagName==='button'&&a['data-category']==='算法笔记').length,'Moved category must be discovered in study');
  const listLinks = (source, marker) => elements(source, a => Object.hasOwn(a, marker)).flatMap(node => elements(node, (a,n) => n.tagName === 'a').map(n => attrs(n).href));
  const noteLinks = elements(journal, a => a.class?.split(' ').includes('note-item')).flatMap(node => elements(node, (a,n) => n.tagName === 'a').map(n => attrs(n).href));
  const studyLinks = listLinks(study, 'data-study-entry');
  const workLinks = elements(work, a => Object.hasOwn(a, 'data-artwork')).map(n => attrs(n).href);
  assert.ok(noteLinks.includes(url('Journal/Deep/Journal.md')));
  for (const name of selected.filter(name => name !== 'Journal/Deep/Journal.md')) assert.ok(!noteLinks.includes(url(name)), name + ' must not appear as a journal');
  for (const name of ['Lessons/Custom/First.md', 'Lessons/Custom/Second.md', 'Lessons/Standalone.md', 'Moving.md']) assert.ok(studyLinks.includes(url(name)), name + ' missing from study');
  assert.ok(!studyLinks.includes(url('Portfolio/Project.md')));
  assert.ok(!studyLinks.includes(url('Journal/Deep/Journal.md')),'A journal series must not move its category into study');
  assert.ok(workLinks.includes(url('Portfolio/Project.md'))); assert.ok(!workLinks.includes(url('Journal/Deep/Journal.md')));
  assert.ok(studyLinks.indexOf(url('Lessons/Custom/First.md')) < studyLinks.indexOf(url('Lessons/Custom/Second.md')));
  const customSeries = elements(study, a => a.id === 'series-自定义合成系列')[0];
  assert.ok(customSeries); assert.match(text(customSeries), /STUDY SERIES/); assert.doesNotMatch(text(customSeries), /BLENDER/);
  const independent = elements(study, a => a.id === 'independent-study')[0];
  assert.ok(text(independent).includes('Fixture Standalone Lesson'));
  assert.ok(text(independent).includes('Fixture Moved Lesson'));
  const satellites = elements(study, a => a.class === 'orbit-point');
  assert.ok(satellites.length <= 4);
  assert.equal(new Set(satellites.map(n => { const a=attrs(elements(n, (_,node)=>node.tagName==='rect')[0]); return a.x+':'+a.y; })).size, satellites.length);
  const projectTile = elements(work, a => a.href === url('Portfolio/Project.md') && Object.hasOwn(a, 'data-artwork'))[0];
  assert.equal(attrs(elements(projectTile, a => Object.hasOwn(a, 'data-work-cover'))[0]).src, coverUrl);
  for (const name of selected) {
    const page = await html('notes/' + slug(name));
    assert.ok(elements(page, a => a.rel === 'canonical' && a.href === 'https://xueqingzhe.github.io' + url(name)).length);
    assert.ok(!page.includes('DO_NOT_EXPORT_SECTION_TEST_SECRET'));
    assert.ok(!page.includes('publisher-asset:'));
  }
  const workDetail = await html('notes/' + slug('Portfolio/Project.md'));
  assert.ok(elements(workDetail,a=>Object.hasOwn(a,'data-category-link')&&a.href==='/work/?category='+encodeURIComponent('图形学基础')).length);
  assert.ok(elements(workDetail, a => a['data-work-detail'] === 'published:' + slug('Portfolio/Project.md')).length);
  assert.ok(elements(workDetail, a => a['data-work-return'] !== undefined && a.href === '/work/').length);
  assert.ok(elements(workDetail, a => a.href === '/work/' && a['aria-current'] === 'page').length);
  assert.ok(elements(workDetail, a => a.src === coverUrl && Object.hasOwn(a, 'data-work-cover')).length);
  const firstDetail = await html('notes/' + slug('Lessons/Custom/First.md'));
  assert.ok(elements(firstDetail,a=>Object.hasOwn(a,'data-category-link')&&a.href==='/tutorials/?category='+encodeURIComponent('图形学基础')).length);
  assert.ok(elements(await html('notes/'+slug('Journal/Deep/Journal.md')),a=>Object.hasOwn(a,'data-category-link')&&a.href==='/notes/?category='+encodeURIComponent('图形学基础')).length);
  assert.ok(elements(firstDetail, a => a.href === '/tutorials/' && a['aria-current'] === 'page').length);
  assert.ok(elements(firstDetail, a => a.class === 'article-pager').some(node => elements(node, a => a.href === url('Lessons/Custom/Second.md')).length));
  assert.ok(elements(await html('notes/' + slug('Lessons/Custom/Second.md')), a => a.class === 'article-pager').some(node => elements(node, a => a.href === url('Lessons/Custom/First.md')).length));
  const workCell = elements(work, a => a.class === 'work-cell').find(n => elements(n, a => a.href === url('Portfolio/Project.md')).length);
  assert.deepEqual(JSON.parse(attrs(workCell)['data-tech']), ['Technical Art','算法笔记']);
  assert.deepEqual(JSON.parse(attrs(workCell)['data-engine']), ['Unreal Engine']);
  assert.deepEqual(JSON.parse(attrs(workCell)['data-role']), ['Technical Artist']);
  const noteCell = elements(journal, a => a.class === 'note-item').find(n => elements(n, a => a.href === url('Journal/Deep/Journal.md')).length);
  assert.deepEqual(JSON.parse(attrs(noteCell)['data-tags']), ['Technical Art', 'Journal Test','算法笔记']);
  for (const name of selected.filter(name => name !== 'Portfolio/Project.md')) assert.ok(rss.includes(url(name)), name + ' missing from RSS');
  assert.ok(!rss.includes(url('Portfolio/Project.md'))); assert.equal(rss, feed);
  assert.ok(elements(home, a => a['data-room'] === 'work').some(node => text(node).includes(workLinks.length + ' 件作品')));
  assert.ok(elements(home, a => a['data-room'] === 'notes').some(node => text(node).includes(noteLinks.length + ' 篇手记')));
  assert.ok(elements(home, a => a['data-room'] === 'study').some(node => text(node).includes(studyLinks.length + ' 个章节')));
  // Established source collections still produce their original addresses and visuals.
  assert.ok(workLinks.includes('/work/urp-pbr/')); assert.ok(noteLinks.includes('/notes/urp-bloom/'));
  assert.match(await html('work/urp-pbr'), /URP 手写 PBR 管线/);
  assert.match(await html('notes/urp-bloom'), /Bloom/);

  await fs.writeFile(path.join(dist, 'section-test.html'), '<!doctype html><html lang="zh-CN"><title>Search fixture</title><body></body></html>');
  const types = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.json':'application/json', '.wasm':'application/wasm', '.svg':'image/svg+xml', '.webp':'image/webp', '.png':'image/png' };
  server = http.createServer(async (req,res) => {
    try {
      const route = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
      const file = path.resolve(dist, '.' + route + (route.endsWith('/') ? 'index.html' : ''));
      if (!file.startsWith(dist + path.sep)) { res.writeHead(403); res.end(); return; }
      const bytes = await fs.readFile(file); res.writeHead(200, { 'Content-Type':types[path.extname(file)] ?? 'application/octet-stream' }); res.end(bytes);
    } catch { res.writeHead(404); res.end(); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = 'http://127.0.0.1:' + server.address().port;
  browser = await chromium.launch({ headless:true, ...(process.env.PUBLISHER_TEST_BROWSER ? {channel:process.env.PUBLISHER_TEST_BROWSER} : {}) });
  const page = await browser.newPage({ reducedMotion:'reduce' });
  await page.goto(base + '/section-test.html');
  const expectedSearch = [
    ['journalfixtureword', url('Journal/Deep/Journal.md')], ['tutorialfirstfixtureword', url('Lessons/Custom/First.md')],
    ['tutorialsecondfixtureword', url('Lessons/Custom/Second.md')], ['standalonefixtureword', url('Lessons/Standalone.md')],
    ['workfixtureword', url('Portfolio/Project.md')], ['movingfixtureword', url('Moving.md')],
  ];
  for (const [term, expected] of expectedSearch) {
    const urls = await page.evaluate(async query => { const pf=await import('/pagefind/pagefind.js'); const results=await pf.search(JSON.stringify(query)); return await Promise.all(results.results.map(async r=>(await r.data()).url)); }, term);
    assert.ok(urls.includes(expected), term + ' missing from Pagefind: ' + JSON.stringify(urls));
  }
  const tagResults = await page.evaluate(async () => { const results=await (await import('/pagefind/pagefind.js')).search('"Technical Art"'); return Promise.all(results.results.map(async r=>(await r.data()).url)); });
  for (const name of ['Journal/Deep/Journal.md','Lessons/Custom/First.md','Portfolio/Project.md']) assert.ok(tagResults.includes(url(name)), 'Metadata tag is not searchable: ' + name);
  const chineseTagResults = await page.evaluate(async () => { const results=await (await import('/pagefind/pagefind.js')).search('"算法笔记"'); return Promise.all(results.results.map(async r=>(await r.data()).url)); });
  for (const name of ['Journal/Deep/Journal.md','Lessons/Custom/First.md','Lessons/Custom/Second.md','Portfolio/Project.md']) assert.ok(chineseTagResults.includes(url(name)), 'New Chinese tag is not searchable: ' + name);
  const secretResults = await page.evaluate(async () => { const results=await (await import('/pagefind/pagefind.js')).search('"vaultsecretexclusionqazword"'); return Promise.all(results.results.map(r=>r.data())); });
  assert.equal(secretResults.length, 0);
  const filters = await page.evaluate(async () => (await import('/pagefind/pagefind.js')).filters());
  assert.ok(filters['栏目']['手记']); assert.ok(filters['栏目']['研习']); assert.ok(filters['栏目']['作品']);
  assert.ok(filters['子栏目']['图形学基础']); assert.ok(!filters['子栏目']['未发布分类']);
  const visibleNotes=()=>page.locator('.note-item:not([hidden]) a').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('href')));
  const visibleStudy=()=>page.locator('[data-study-entry]:not([hidden]) a').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('href')));
  await page.goto(base+'/notes/?'+new URLSearchParams({category:'图形学基础',tag:'算法笔记',q:'Journal'}));
  await page.waitForFunction(()=>document.querySelector('button[data-category="图形学基础"]')?.getAttribute('aria-pressed')==='true');
  assert.deepEqual(await visibleNotes(),[url('Journal/Deep/Journal.md')]);
  await page.locator('#note-query').fill('not-a-matching-title');
  assert.deepEqual(await visibleNotes(),[]);
  await page.locator('#note-query').fill('Journal');
  assert.deepEqual(await visibleNotes(),[url('Journal/Deep/Journal.md')]);
  assert.equal(new URL(page.url()).searchParams.get('category'),'图形学基础');
  assert.equal(new URL(page.url()).searchParams.get('tag'),'算法笔记');
  await page.goto(base+url('Journal/Deep/Journal.md'));
  await page.locator('.article-tags a').filter({hasText:'算法笔记'}).click();
  await page.waitForURL(u=>u.pathname==='/notes/'&&u.searchParams.get('category')==='图形学基础'&&u.searchParams.get('tag')==='算法笔记');
  assert.deepEqual(await visibleNotes(),[url('Journal/Deep/Journal.md')]);
  await page.goto(base+'/tutorials/?'+new URLSearchParams({category:'图形学基础',tag:'算法笔记'}));
  await page.waitForFunction(()=>document.querySelector('button[data-category="图形学基础"]')?.getAttribute('aria-pressed')==='true');
  assert.deepEqual(await visibleStudy(),[url('Lessons/Custom/First.md')]);
  await page.locator('button[data-category="渲染 实验"]').click();
  assert.deepEqual(await visibleStudy(),[url('Lessons/Custom/Second.md')]);
  assert.equal(new URL(page.url()).searchParams.get('category'),'渲染 实验');
  assert.equal(new URL(page.url()).searchParams.get('tag'),'算法笔记');
  assert.equal(await page.locator('[data-study-series]:not([hidden])').count(),1,'Category and series must remain independent');
  await page.reload();
  await page.waitForFunction(()=>document.querySelector('button[data-category="渲染 实验"]')?.getAttribute('aria-pressed')==='true');
  assert.deepEqual(await visibleStudy(),[url('Lessons/Custom/Second.md')]);
  await page.locator('[data-study-reset]').click();
  assert.equal(new URL(page.url()).searchParams.has('category'),false); assert.equal(new URL(page.url()).searchParams.has('tag'),false);
  assert.ok((await visibleStudy()).includes(url('Lessons/Standalone.md')),'Uncategorized entries remain visible');
  await page.goto(base + '/notes/?tag=Technical%20Art');
  await page.waitForFunction(() => document.querySelector('button[data-tag="Technical Art"]')?.getAttribute('aria-pressed') === 'true');
  assert.deepEqual(await page.locator('.note-item:not([hidden]) a').evaluateAll(nodes => nodes.map(n=>n.getAttribute('href'))), [url('Journal/Deep/Journal.md')]);
  await page.goto(base + '/tutorials/?tag=Technical%20Art');
  await page.waitForFunction(() => document.querySelector('[data-study-tag="Technical Art"]')?.getAttribute('aria-pressed') === 'true');
  assert.deepEqual(await page.locator('[data-study-entry]:not([hidden]) a').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('href'))), [url('Lessons/Custom/First.md')]);
  await page.goto(base + '/work/?engine=Unreal%20Engine&tech='+encodeURIComponent('算法笔记')+'&role=Technical%20Artist&category='+encodeURIComponent('图形学基础'));
  await page.waitForFunction(() => document.querySelector('button[data-term="Technical Artist"]')?.getAttribute('aria-pressed') === 'true');
  assert.deepEqual(await page.locator('.work-cell:not([hidden]) [data-artwork]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('href'))), [url('Portfolio/Project.md')]);
  await page.locator('.work-cell:not([hidden]) [data-artwork]').click();
  await page.waitForURL(base + url('Portfolio/Project.md'));
  await page.waitForFunction(() => document.querySelector('[data-work-return]')?.getAttribute('href')?.includes('role=Technical%20Artist'));
  await page.locator('[data-work-return]').click();
  await page.waitForURL(/\/work\/\?engine=/);
  assert.equal(new URL(page.url()).searchParams.get('category'),'图形学基础');
  assert.equal(new URL(page.url()).searchParams.get('tech'),'算法笔记');
  assert.deepEqual(await page.locator('.work-cell:not([hidden]) [data-artwork]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('href'))), [url('Portfolio/Project.md')]);
  for (const [name, body] of Object.entries(sources)) assert.equal(await fs.readFile(path.join(vault, name), 'utf8'), body);
  assert.deepEqual(await fs.readFile(path.join(vault, 'Portfolio/cover.png')), image);
  assert.equal(await fs.readFile(path.join(site, 'src/content/work/urp-pbr.md'), 'utf8'), await fs.readFile(path.join(project, 'src/content/work/urp-pbr.md'), 'utf8'));
  t.diagnostic('Verified isolated Publisher export, Astro build, legacy preservation, all section lists/details, cover conversion, sorting, exact tags, RSS/feed, Pagefind and filtered work return.');
});
