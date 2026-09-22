import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import {fileURLToPath} from 'node:url';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {chromium} from 'playwright';
import YAML from 'yaml';

const project=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..'),run=promisify(execFile);
test('collection landing pages lead with ordered members and the study atlas scales through zero, one and seven series',{timeout:300000},async t=>{
  const tempBase=process.platform==='win32'&&process.env.LOCALAPPDATA?path.join(process.env.LOCALAPPDATA,'Temp'):os.tmpdir();
  const root=await fs.mkdtemp(path.join(tempBase,'publisher-collection-pages-')),site=path.join(root,'site'),junctions=[];
  let browser,server;
  t.after(async()=>{await browser?.close();if(server)await new Promise(resolve=>{server.close(resolve);server.closeAllConnections();});for(const link of junctions)await fs.unlink(link).catch(error=>{if(error.code!=='ENOENT')throw error;});assert.equal(path.dirname(root),tempBase);assert.ok(path.basename(root).startsWith('publisher-collection-pages-'));await fs.rm(root,{recursive:true,force:true,maxRetries:4,retryDelay:200});});
  await fs.mkdir(path.join(site,'public'),{recursive:true});
  // Copy application code, then replace fixture content/config only. Never read real content/ or published-assets/.
  await fs.cp(path.join(project,'src'),path.join(site,'src'),{recursive:true});
  const fixtureContent=path.join(site,'src/content');assert.ok(fixtureContent.startsWith(root+path.sep));await fs.rm(fixtureContent,{recursive:true,force:true});
  for(const dir of ['src/content/notes','src/content/work','src/content/legacy','content/published/notes'])await fs.mkdir(path.join(site,dir),{recursive:true});
  for(const name of ['astro.config.mjs','package.json'])await fs.copyFile(path.join(project,name),path.join(site,name));
  for(const name of ['node_modules','public/art','public/assets','public/covers','public/fonts']){const dest=path.join(site,name);await fs.symlink(path.join(project,name),dest,'junction');junctions.push(dest);}
  for(const name of ['favicon.svg','og.png','robots.txt','.nojekyll'])await fs.copyFile(path.join(project,'public',name),path.join(site,'public',name));
  const astroConfig=path.join(site,'astro.config.mjs');await fs.writeFile(astroConfig,(await fs.readFile(astroConfig,'utf8')).replace('export default defineConfig({','export default defineConfig({\n cacheDir:"./.astro-collection-test",\n vite:{cacheDir:".vite-collection-test"},'));
  await fs.writeFile(path.join(site,'src/data/publisher-topics.json'),JSON.stringify({version:1,topics:{}}));
  for(const [file,color]of [['collection-cover.svg','#738b80'],['collection-cover-revised.svg','#ab8764'],['member-cover.svg','#536c8a']])await fs.writeFile(path.join(site,'public',file),`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900"><rect width="1200" height="900" fill="${color}"/><circle cx="760" cy="300" r="180" fill="#e9dfb9"/></svg>`);
  const write=async(relative,data,body)=>fs.writeFile(path.join(site,relative),'---\n'+YAML.stringify(data)+'---\n\n'+body);
  const longTitle='完整保留的云层散射与多重光照实现记录，不在合集目录里省略这段标题';
  await write('src/content/notes/first.md',{title:longTitle,date:'2026-01-01',summary:'First member summary',tech:['Cloud']},'# First member\n\nfirstmemberbody');
  await write('src/content/notes/second.md',{title:'Second member',date:'2026-01-02',summary:'Second member summary'},'# Second member\n\nsecondmemberbody');
  await write('src/content/work/solo.md',{title:'Independent member work',summary:'A standalone work inside a collection',year:2026,cover:'/member-cover.svg',workType:'single'},'# Standalone work\n\nsolomemberbody');
  for(const [id,work]of [['ungrouped',undefined],['orphan','missing-collection'],['draft-member','collections:draft-collection']])await write('src/content/work/'+id+'.md',{title:id,summary:'A publicly visible standalone work',year:2026,cover:'/member-cover.svg',workType:'single',work},'# '+id+'\n\nStandalone work body.');
  await write('src/content/work/source-collection.md',{title:'Original project collection',summary:'Original project summary',year:2026,cover:'/member-cover.svg',coverVideo:'/member-video.mp4',notes:['notes:second','notes:first']},'# Preserved original introduction\n\n'+('originalcollectionsentinel A long original account that remains available.\n\n'.repeat(70)));
  const config={version:1,entries:{'work:source-collection':{cover:'/collection-cover.svg',workType:'collection'}},collections:{'collection-fixture':{title:'Independent collection title',summary:'A separately edited collection summary',year:2026,section:'work',workType:'collection',cover:'/collection-cover.svg',notes:['work:solo','notes:second','notes:first']}}};
  config.collections['draft-collection']={title:'Unpublished collection',year:2026,draft:true,notes:['work:draft-member']};
  const configPath=path.join(site,'src/data/publisher-content.json');await fs.writeFile(configPath,JSON.stringify(config));
  async function build(){try{await run(process.execPath,[path.join(project,'node_modules/astro/astro.js'),'build','--force'],{cwd:site,env:{...process.env,ASTRO_TELEMETRY_DISABLED:'1'},windowsHide:true,timeout:180000,maxBuffer:8*1024*1024});}catch(error){throw Error('Collection fixture build failed\n'+(error.stdout??'')+'\n'+(error.stderr??''),{cause:error});}}
  const dist=path.join(site,'dist');await build();
  const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.woff2':'font/woff2'};
  server=http.createServer(async(req,res)=>{try{const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname),file=path.resolve(dist,'.'+pathname+(pathname.endsWith('/')?'index.html':''));if(!file.startsWith(dist+path.sep)){res.writeHead(403);res.end();return;}const bytes=await fs.readFile(file);res.writeHead(200,{'Content-Type':mime[path.extname(file)]??'application/octet-stream'});res.end(bytes);}catch{res.writeHead(404);res.end();}});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base='http://127.0.0.1:'+server.address().port;
  browser=await chromium.launch({headless:true,...process.env.PUBLISHER_TEST_BROWSER?{channel:process.env.PUBLISHER_TEST_BROWSER}:{}});
  const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
  const members=()=>page.locator('[data-collection-member] a').evaluateAll(nodes=>nodes.map(node=>node.getAttribute('href')));
  await page.goto(base+'/work/');assert.deepEqual((await page.locator('[data-artwork]').evaluateAll(nodes=>nodes.map(node=>node.getAttribute('href')))).sort(),['/work/collection-fixture/','/work/source-collection/','/work/ungrouped/','/work/orphan/','/work/draft-member/'].sort(),'Gallery lists collections and ungrouped works; missing or draft collection relationships do not hide public works');
  await page.goto(base+'/');assert.match(await page.locator('[data-room="work"] .room-count').innerText(),/05 件作品/);
  await page.goto(base+'/notes/');assert.equal(await page.locator('.note-item a[href="/work/solo/"]').count(),1,'Grouped work remains in the complete notes index');
  await page.goto(base+'/work/solo/');assert.ok(await page.locator('[data-work-detail]').isVisible());assert.equal(await page.locator('[data-parent-topic][href="/work/collection-fixture/"]').count(),1);
  await page.goto(base+'/work/collection-fixture/');assert.equal(await page.locator('[data-collection-cover]').getAttribute('src'),'/collection-cover.svg');assert.deepEqual(await members(),['/work/solo/','/notes/second/','/notes/first/']);assert.equal(await page.locator('[data-collection-member] h3').last().innerText(),longTitle);assert.equal(await page.locator('[data-collection-context]').count(),0);
  await page.goto(base+'/work/source-collection/');assert.equal(await page.locator('[data-collection-cover]').getAttribute('src'),'/collection-cover.svg');assert.equal(await page.locator('video').count(),0,'An independent image cover cannot inherit the first article video');assert.deepEqual(await members(),['/notes/second/','/notes/first/']);
  assert.equal(await page.locator('[data-collection-context]').getAttribute('open'),null);assert.ok(await page.locator('[data-collection-context]').textContent().then(text=>text.includes('originalcollectionsentinel')));
  assert.ok(await page.locator('[data-topic-articles]').evaluate(node=>Boolean(node.compareDocumentPosition(document.querySelector('[data-collection-context]'))&Node.DOCUMENT_POSITION_FOLLOWING)),'Directory must precede the full original writing');
  assert.ok((await page.locator('[data-collection-member]').first().boundingBox()).y<1000,'First entry is reachable before a long source body');
  await page.locator('[data-collection-context] summary').click();assert.ok(await page.locator('.collection-context-body').isVisible());
  await page.goto(base+'/tutorials/');assert.equal(await page.locator('[data-series-portal]').count(),0);assert.ok(await page.locator('[data-series-empty]').isVisible());assert.match(await page.locator('[data-series-totals]').innerText(),/00 个系列/);
  const names=['Unity 只是系列名称，实际引擎与完整超长标题都应来自真实文章数据','Shader Practice','Blender Notes','UE Lighting','Mathematics','Rendering Tools','Seventh Series Beyond The Old Four Satellites'];
  const chapter=async(id,name,order,extra={})=>write('content/published/notes/'+id+'.md',{title:id,date:'2026-02-01',section:'tutorials',kind:'tutorial',series:name,order,engine:['Blender'],tech:['Actual Topic'],...extra},'# '+id+'\n\nSynthetic learning chapter.');
  await chapter('single-series',names[0],10);await build();await page.goto(base+'/tutorials/');assert.equal(await page.locator('[data-series-portal]').count(),1);assert.equal(await page.locator('[data-series-portal] h2').innerText(),names[0]);assert.match(await page.locator('[data-series-portal] p').innerText(),/Blender/i);assert.doesNotMatch(await page.locator('[data-series-portal] p').innerText(),/UNITY|URP/);
  await chapter('series-first-chapter',names[0],1);
  for(let i=1;i<names.length;i++)await chapter('series-'+i,names[i],i+1);
  config.collections['collection-fixture'].cover='/collection-cover-revised.svg';config.collections['collection-fixture'].notes=['notes:second','work:solo','notes:first'];await fs.writeFile(configPath,JSON.stringify(config));await build();
  for(const viewport of [{width:1440,height:1000},{width:390,height:844}]){
    await page.setViewportSize(viewport);await page.goto(base+'/tutorials/');assert.equal(await page.locator('[data-series-portal]').count(),7);assert.deepEqual(await page.locator('[data-series-portal] h2').allTextContents(),names);assert.match(await page.locator('[data-series-totals]').innerText(),/07 个系列/);assert.match(await page.locator('[data-series-totals]').innerText(),/08 篇记录/);
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Series page must not overflow horizontally');
    assert.ok(await page.locator('[data-series-portal] h2').evaluateAll(nodes=>nodes.every(node=>node.scrollWidth<=node.clientWidth+1&&getComputedStyle(node).textOverflow!=='ellipsis')),'Long series names must wrap in full');
    if(process.env.PUBLISHER_TEST_SCREENSHOTS){await fs.mkdir(process.env.PUBLISHER_TEST_SCREENSHOTS,{recursive:true});await page.screenshot({path:path.join(process.env.PUBLISHER_TEST_SCREENSHOTS,'study-'+viewport.width+'.png'),fullPage:false});}
    await page.locator('[data-series-portal]').last().click();assert.equal(decodeURIComponent(new URL(page.url()).hash),'#series-'+names[6]);assert.ok(await page.locator('[data-study-series]').last().isVisible());
    await page.goto(base+'/work/collection-fixture/');assert.equal(await page.locator('[data-collection-cover]').getAttribute('src'),'/collection-cover-revised.svg');assert.deepEqual(await members(),['/notes/second/','/work/solo/','/notes/first/']);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Collection page must not overflow horizontally');
    if(process.env.PUBLISHER_TEST_SCREENSHOTS)await page.screenshot({path:path.join(process.env.PUBLISHER_TEST_SCREENSHOTS,'collection-'+viewport.width+'.png'),fullPage:false});
    await page.locator('[data-collection-member] a').first().click();await page.waitForURL(base+'/notes/second/');await page.locator('[data-parent-topic]').filter({hasText:'Independent collection title'}).click();await page.waitForURL(base+'/work/collection-fixture/');
  }
  t.diagnostic('Verified 0/1/7 complete series navigation, actual engine metadata, full titles at desktop/mobile sizes, ordered collection directory before preserved prose, independent revised covers, member backlinks and gallery hierarchy without duplicate member tiles.');
});
