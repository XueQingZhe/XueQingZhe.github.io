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
const tempBase=process.platform==='win32'&&process.env.LOCALAPPDATA?path.join(process.env.LOCALAPPDATA,'Temp'):os.tmpdir();
test('withdrawal and restoration rebuild routes, indexes, search and collection membership without changing source articles',{timeout:300000},async t=>{
  const root=await fs.mkdtemp(path.join(tempBase,'publisher-visibility-site-')),site=path.join(root,'site'),junctions=[];
  let browser,server;
  t.after(async()=>{await browser?.close();if(server)await new Promise(resolve=>{server.close(resolve);server.closeAllConnections();});for(const link of junctions)await fs.unlink(link).catch(error=>{if(error.code!=='ENOENT')throw error;});assert.equal(path.dirname(root),tempBase);assert.ok(path.basename(root).startsWith('publisher-visibility-site-'));await fs.rm(root,{recursive:true,force:true,maxRetries:4,retryDelay:200});});
  await fs.mkdir(path.join(site,'public'),{recursive:true});
  // All content and publisher metadata below are synthetic. Real generated articles/media stay untouched.
  await fs.cp(path.join(project,'src'),path.join(site,'src'),{recursive:true});
  const fixtureContent=path.join(site,'src/content');assert.ok(fixtureContent.startsWith(root+path.sep));await fs.rm(fixtureContent,{recursive:true,force:true});
  for(const dir of ['src/content/notes','src/content/work','src/content/legacy','content/published/notes','docs'])await fs.mkdir(path.join(site,dir),{recursive:true});
  for(const name of ['astro.config.mjs','package.json'])await fs.copyFile(path.join(project,name),path.join(site,name));
  for(const name of ['node_modules','public/art','public/assets','public/covers','public/fonts']){const dest=path.join(site,name);await fs.symlink(path.join(project,name),dest,'junction');junctions.push(dest);}
  for(const name of ['favicon.svg','og.png','robots.txt','.nojekyll'])await fs.copyFile(path.join(project,'public',name),path.join(site,'public',name));
  const astroConfig=path.join(site,'astro.config.mjs');await fs.writeFile(astroConfig,(await fs.readFile(astroConfig,'utf8')).replace('export default defineConfig({','export default defineConfig({\n cacheDir:"./.astro-visibility-test",\n vite:{cacheDir:".vite-visibility-test"},').replace(/redirects:\s*\{[\s\S]*?\n\s*\},/,'redirects:{},'));
  await fs.writeFile(path.join(site,'public','visibility-cover.svg'),'<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400"><rect width="600" height="400" fill="#738b80"/></svg>');
  await fs.writeFile(path.join(site,'src/data/publisher-topics.json'),JSON.stringify({version:1,topics:{}}));
  const sourceFiles=new Map();
  const write=async(relative,data,body)=>{const bytes='---\n'+YAML.stringify(data)+'---\n\n'+body;sourceFiles.set(relative,bytes);await fs.writeFile(path.join(site,relative),bytes);};
  await write('src/content/notes/plain.md',{title:'A plain note',date:'2026-01-01',summary:'An unclassified public note'},'# Plain note\n\nplainwithdrawalsentinel');
  await write('src/content/notes/survivor.md',{title:'An unaffected note',date:'2026-01-02'},'# Survivor\n\nsurvivorvisibilitysentinel\n\n[Original cross-reference](/notes/plain/)');
  await write('content/published/notes/chapter.md',{title:'A Unity series chapter',date:'2026-01-03',section:'tutorials',series:'Unity visibility series',order:1},'# Series chapter\n\nchapterwithdrawalsentinel');
  await write('src/content/work/member.md',{title:'A standalone member work',summary:'One work inside the collection',year:2026,cover:'/visibility-cover.svg',workType:'single'},'# Work member\n\nmemberwithdrawalsentinel');
  const historicalUrl='/blog/2025/visibility-legacy/';
  await write('src/content/legacy/historic.md',{title:'Original historical article',date:'2025-01-01',legacyUrl:historicalUrl},'# Original article\n\noriginalvisibilitysentinel');
  await write('content/published/notes/replacement.md',{title:'Updated historical article',date:'2025-01-01',replaces:'legacy:historic',legacyUrl:historicalUrl,section:'notes'},'# Updated article\n\nreplacementvisibilitysentinel');
  await fs.writeFile(path.join(site,'docs/migration-manifest.json'),JSON.stringify({articles:[{id:'historic',url:historicalUrl,source:'synthetic-historic.md',kind:'article'}]}));
  const notes=['work:member','notes:plain','published:chapter','notes:survivor'],collectionUrl='/work/collection-visibility/';
  const config={version:1,entries:{},collections:{'collection-visibility':{title:'Collection collectionvisibilitysentinel',summary:'An ordered synthetic collection',year:2026,section:'work',workType:'collection',cover:'/visibility-cover.svg',notes}}};
  const configPath=path.join(site,'src/data/publisher-content.json'),dist=path.join(site,'dist');
  const env={...process.env,ASTRO_TELEMETRY_DISABLED:'1'};
  async function build(){
    await fs.writeFile(configPath,JSON.stringify(config));
    try{await run(process.execPath,[path.join(project,'node_modules/astro/astro.js'),'build','--force'],{cwd:site,env,windowsHide:true,timeout:180000,maxBuffer:8*1024*1024});await run(process.execPath,[path.join(project,'node_modules/pagefind/lib/runner/bin.cjs'),'--site','dist'],{cwd:site,env,windowsHide:true,timeout:60000,maxBuffer:4*1024*1024});}
    catch(error){throw Error('Visibility fixture build failed\n'+(error.stdout??'')+'\n'+(error.stderr??''),{cause:error});}
  }
  await build();
  const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.wasm':'application/wasm','.svg':'image/svg+xml','.woff2':'font/woff2'};
  server=http.createServer(async(req,res)=>{try{const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname),file=path.resolve(dist,'.'+pathname+(pathname.endsWith('/')?'index.html':''));if(!file.startsWith(dist+path.sep)){res.writeHead(403);res.end();return;}const bytes=await fs.readFile(file);res.writeHead(200,{'Content-Type':mime[path.extname(file)]??'application/octet-stream','Cache-Control':'no-store'});res.end(bytes);}catch{res.writeHead(404);res.end();}});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base='http://127.0.0.1:'+server.address().port;
  browser=await chromium.launch({headless:true,...process.env.PUBLISHER_TEST_BROWSER?{channel:process.env.PUBLISHER_TEST_BROWSER}:{}});
  const page=await browser.newPage({reducedMotion:'reduce'});
  const links=async(route,selector)=>{await page.goto(base+route);return page.locator(selector).evaluateAll(nodes=>nodes.map(node=>node.getAttribute('href')));};
  const members=()=>links(collectionUrl,'[data-collection-member] a');
  const search=async(term)=>{await page.goto(base+'/search/');return page.evaluate(async query=>{const results=await(await import('/pagefind/pagefind.js')).search(JSON.stringify(query));return Promise.all(results.results.map(async result=>(await result.data()).url));},term);};
  const exists=async(url)=>!!await fs.stat(path.join(dist,url,'index.html')).catch(()=>null);
  const hidden=[['notes:plain','/notes/plain/','plainwithdrawalsentinel'],['published:chapter','/notes/chapter/','chapterwithdrawalsentinel'],['work:member','/work/member/','memberwithdrawalsentinel'],['legacy:historic',historicalUrl,'replacementvisibilitysentinel']];
  const orderedUrls=['/work/member/','/notes/plain/','/notes/chapter/','/notes/survivor/'];
  assert.deepEqual(await members(),orderedUrls);
  assert.ok(!(await links('/work/','[data-artwork]')).includes('/work/member/'),'A member work begins inside its collection');
  for(const [,url,term]of hidden){assert.ok(await exists(url));assert.ok((await search(term)).includes(url));}
  assert.deepEqual(await search('originalvisibilitysentinel'),[],'The generated replacement masks the old source body');
  for(const [key]of hidden)config.entries[key]={withdrawn:true};
  await build();
  assert.deepEqual(await members(),['/notes/survivor/'],'Hidden members cannot leave dangling collection links');
  for(const [,url,term]of hidden){
    assert.ok(!(await exists(url)),'Withdrawn static route still exists: '+url);assert.equal((await fetch(base+url)).status,404);assert.deepEqual(await search(term),[]);
    for(const [route,selector]of [['/notes/','.note-item a'],['/tutorials/','[data-study-entry] a'],['/work/','[data-artwork]'],['/','a']])assert.ok(!(await links(route,selector)).includes(url),'Withdrawn link remains in '+route);
  }
  assert.deepEqual(await search('originalvisibilitysentinel'),[],'Withdrawing a generated replacement must not resurrect the original');
  assert.ok((await search('survivorvisibilitysentinel')).includes('/notes/survivor/'));
  const checked=await run(process.execPath,[path.join(project,'tools/check-site.mjs'),dist,'--no-report'],{cwd:site,env,windowsHide:true,timeout:60000,maxBuffer:2*1024*1024});
  const report=JSON.parse(checked.stdout);assert.deepEqual(report.withdrawnLegacyUrls,[historicalUrl]);assert.deepEqual(report.missingLegacyUrls,[]);assert.deepEqual(report.unexpectedWithdrawnLegacyUrls,[]);assert.ok(report.withdrawnReferences.some(reference=>reference.url==='/notes/plain/'&&reference.file.replaceAll('\\','/')==='notes/survivor/index.html'),'Written cross-references to withdrawn articles are reported without blocking publication');
  for(const [key]of hidden)config.entries[key]={withdrawn:false};
  config.collections['collection-visibility'].withdrawn=true;
  await build();
  assert.ok(!(await exists(collectionUrl)));assert.deepEqual(await search('collectionvisibilitysentinel'),[]);
  assert.ok((await links('/work/','[data-artwork]')).includes('/work/member/'),'Removing a collection releases its independent work to the gallery');
  assert.ok(!(await links('/notes/','.note-item a')).includes(collectionUrl));
  for(const url of orderedUrls){assert.ok(await exists(url));assert.equal((await links(url,'[data-parent-topic]')).length,0,'Hidden collections cannot remain as backlinks');}
  config.collections['collection-visibility'].withdrawn=false;
  await build();
  assert.deepEqual(await members(),orderedUrls,'Restoring the collection keeps the original member order');
  assert.ok(!(await links('/work/','[data-artwork]')).includes('/work/member/'));
  assert.ok((await search('collectionvisibilitysentinel')).includes(collectionUrl));
  for(const [,url,term]of hidden){assert.ok(await exists(url));assert.ok((await search(term)).includes(url));}
  assert.deepEqual(await search('originalvisibilitysentinel'),[]);
  assert.deepEqual(config.collections['collection-visibility'].notes,notes);
  for(const [relative,bytes]of sourceFiles)assert.equal(await fs.readFile(path.join(site,relative),'utf8'),bytes,'Source article changed: '+relative);
  t.diagnostic('Verified ordinary, series and work member withdrawal; collection withdrawal; legacy replacement masking; static routes, all indexes and Pagefind; restoration at original URLs and original member order; unchanged source bytes.');
});

test('legacy route validation skips only explicit withdrawal and rejects stale withdrawn pages',{timeout:30000},async t=>{
  const root=await fs.mkdtemp(path.join(tempBase,'publisher-visibility-check-'));
  t.after(async()=>{assert.equal(path.dirname(root),tempBase);assert.ok(path.basename(root).startsWith('publisher-visibility-check-'));await fs.rm(root,{recursive:true,force:true,maxRetries:4,retryDelay:200});});
  for(const dir of ['dist/keep','src/data','docs'])await fs.mkdir(path.join(root,dir),{recursive:true});
  const keepFile=path.join(root,'dist/keep/index.html');
  await fs.writeFile(keepFile,'<!doctype html><html><body>Kept <a href="/gone/">Historical reference</a></body></html>');
  await fs.writeFile(path.join(root,'docs/migration-manifest.json'),JSON.stringify({articles:[{id:'keep',url:'/keep/'},{id:'gone',url:'/gone/'}]}));
  const settings=path.join(root,'src/data/publisher-content.json');await fs.writeFile(settings,JSON.stringify({entries:{'legacy:gone':{withdrawn:true}}}));
  const args=[path.join(project,'tools/check-site.mjs'),path.join(root,'dist'),'--no-report'];
  let result=await run(process.execPath,args,{cwd:root,windowsHide:true});assert.deepEqual(JSON.parse(result.stdout).withdrawnLegacyUrls,['/gone/']);assert.equal(JSON.parse(result.stdout).withdrawnReferences[0].url,'/gone/');
  await fs.writeFile(keepFile,'<!doctype html><html><body><a href="/unknown/">Broken</a><img src="/gone/"></body></html>');
  await assert.rejects(run(process.execPath,args,{cwd:root,windowsHide:true}),error=>{assert.deepEqual(JSON.parse(error.stdout).missingLocalResources.sort(),['/gone/','/unknown/']);return true;});
  await fs.writeFile(keepFile,'<!doctype html><html><body>Kept <a href="/gone/">Historical reference</a></body></html>');
  await fs.writeFile(settings,JSON.stringify({entries:{'legacy:gone':{withdrawn:false}}}));
  await assert.rejects(run(process.execPath,args,{cwd:root,windowsHide:true}),error=>{assert.deepEqual(JSON.parse(error.stdout).missingLegacyUrls,['/gone/']);return true;});
  await fs.writeFile(settings,JSON.stringify({entries:{'legacy:gone':{withdrawn:true}}}));await fs.mkdir(path.join(root,'dist/gone'));await fs.writeFile(path.join(root,'dist/gone/index.html'),'<!doctype html><html><body>Stale</body></html>');
  await assert.rejects(run(process.execPath,args,{cwd:root,windowsHide:true}),error=>{assert.deepEqual(JSON.parse(error.stdout).unexpectedWithdrawnLegacyUrls,['/gone/']);return true;});
});
