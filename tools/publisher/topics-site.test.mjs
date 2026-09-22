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
import YAML from 'yaml';

const run=promisify(execFile),project=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const attrs=node=>Object.fromEntries((node.attrs??[]).map(a=>[a.name,a.value]));
const text=node=>node.value??(node.childNodes??[]).map(text).join('');
function elements(html,predicate){const result=[];function walk(n){if(n.tagName&&predicate(attrs(n),n))result.push(n);for(const child of n.childNodes??[])walk(child);}walk(typeof html==='string'?parse(html):html);return result;}
const links=(html,marker)=>elements(html,a=>Object.hasOwn(a,marker)).flatMap(n=>elements(n,(a,el)=>el.tagName==='a').map(n=>attrs(n).href));

test('synchronized content keeps original URLs and topic ordering supports aliases and explicit detach', {timeout:300000}, async t=>{
  const tempBase=process.platform==='win32'&&process.env.LOCALAPPDATA?path.join(process.env.LOCALAPPDATA,'Temp'):os.tmpdir();
  const root=await fs.mkdtemp(path.join(tempBase,'publisher-topics-site-')),site=path.join(root,'site'),junctions=[];
  let server,browser;
  t.after(async()=>{
    await browser?.close();if(server)await new Promise(resolve=>{server.close(resolve);server.closeAllConnections();});
    for(const file of junctions)await fs.unlink(file).catch(e=>{if(e.code!=='ENOENT')throw e;});
    assert.equal(path.dirname(root),tempBase);assert.ok(path.basename(root).startsWith('publisher-topics-site-'));
    await fs.rm(root,{recursive:true,force:true,maxRetries:4,retryDelay:200});
  });
  await fs.mkdir(path.join(site,'public'),{recursive:true});await fs.mkdir(path.join(site,'content/published/notes'),{recursive:true});
  await fs.cp(path.join(project,'src'),path.join(site,'src'),{recursive:true});
  for(const name of ['astro.config.mjs','package.json'])await fs.copyFile(path.join(project,name),path.join(site,name));
  for(const name of ['node_modules','public/art','public/assets','public/covers','public/fonts']){const dest=path.join(site,name);await fs.symlink(path.join(project,name),dest,'junction');junctions.push(dest);}
  for(const name of ['favicon.svg','og.png','robots.txt','.nojekyll'])await fs.copyFile(path.join(project,'public',name),path.join(site,'public',name));
  const config=path.join(site,'astro.config.mjs');await fs.writeFile(config,(await fs.readFile(config,'utf8')).replace('export default defineConfig({','export default defineConfig({\n  cacheDir: "./.astro-topics-test",\n  vite: { cacheDir: ".vite-topics-test" },'));
  const originalLegacy='post-1fe77ef5201ef7b7';
  const legacySource=await fs.readFile(path.join(site,'src/content/legacy',originalLegacy+'.md'),'utf8');
  const legacyData=YAML.parse(legacySource.match(/^---\r?\n([\s\S]*?)\r?\n---/)[1]);
  const legacyUrl=legacyData.legacyUrl;
  assert.ok(legacyUrl&&!legacyUrl.startsWith('/notes/')&&!legacyUrl.startsWith('/work/'));
  // Sentinels are added only to fixture copies, so search can prove the replaced originals are absent.
  for(const [file,word] of [['notes/ue5-translucency-sort.md','oldsortsentinel'],['work/ue5-per-material.md','oldtopicsentinel'],['legacy/'+originalLegacy+'.md','oldlegacysentinel']])await fs.appendFile(path.join(site,'src/content',file),'\n\n'+word);
  const publish=async(id,data,body)=>fs.writeFile(path.join(site,'content/published/notes',id+'.md'),'---\n'+YAML.stringify({title:id,date:'2026-09-22',section:'notes',kind:'article',...data})+'---\n\n'+body);
  await publish('n-sync-sort',{title:'Synchronized UE Sorting',replaces:'notes:ue5-translucency-sort',legacyUrl:'/notes/ue5-translucency-sort/',tech:['Sync Test']},'# syncsortsentinel\n\nA synchronized sorting article.');
  await publish('n-sync-legacy',{title:'Synchronized Legacy Article',replaces:'legacy:'+originalLegacy,legacyUrl,tech:['Sync Test']},'# synclegacysentinel\n\nUpdated legacy content.');
  await publish('n-sync-topic',{title:'Synchronized UE Topic',section:'work',kind:'work',replaces:'work:ue5-per-material',legacyUrl:'/work/ue5-per-material/',summary:'The synchronized topic summary',cover:'/covers/placeholder.svg',year:2026},'# synctopicsentinel\n\nUpdated topic body.');
  await publish('n-new-child',{title:'New Assigned Topic Child',work:'work:ue5-per-material',tech:['Sync Test']},'# newtopicchildsentinel\n\nA newly assigned child.');
  // A newer unrelated legacy article with the same bare slug must not steal an old work.notes reference.
  await fs.writeFile(path.join(site,'src/content/legacy/ue5-translucency-sort.md'),'---\n'+YAML.stringify({title:'Unrelated Same Slug',date:'2027-01-01',legacyUrl:'/blog/unrelated-sort/'})+'---\n\nAn unrelated legacy article.');
  const topicFile=path.join(site,'src/data/publisher-topics.json');
  await fs.writeFile(topicFile,JSON.stringify({version:1,topics:{'work:urp-pbr':{title:'Configured PBR Topic',summary:'A topic metadata override'}}}));
  const dist=path.join(site,'dist'),env={...process.env,ASTRO_TELEMETRY_DISABLED:'1'};
  async function build(search=false){
    try{
      const result=await run(process.execPath,[path.join(project,'node_modules/astro/astro.js'),'build','--force'],{cwd:site,env,windowsHide:true,timeout:180000,maxBuffer:8*1024*1024});
      assert.doesNotMatch(result.stdout+result.stderr,/duplicate.*(?:route|path)|(?:route|path).*duplicate/i);
      if(search)await run(process.execPath,[path.join(project,'node_modules/pagefind/lib/runner/bin.cjs'),'--site','dist'],{cwd:site,env,windowsHide:true,timeout:60000,maxBuffer:4*1024*1024});
    }catch(e){throw Error('Isolated topic build failed:\n'+(e.stdout??'')+'\n'+(e.stderr??'')+'\n'+e.message,{cause:e});}
  }
  const html=url=>fs.readFile(path.join(dist,decodeURIComponent(url),'index.html'),'utf8');
  await build(true);
  const topic=await html('/work/ue5-per-material/'),journal=await html('/notes/'),portfolio=await html('/work/');
  assert.match(topic,/rel="stylesheet"/);assert.match(topic,/Synchronized UE Topic/);assert.match(topic,/synctopicsentinel/);assert.doesNotMatch(topic,/oldtopicsentinel/);
  const expectedOriginalChildren=['/notes/ue5-translucency-sort/','/notes/ue5-per-material-stencil/','/notes/ue5-overlay-material/'];
  assert.deepEqual(links(topic,'data-topic-articles'),[...expectedOriginalChildren,'/notes/n-new-child/'],'UE topic retains its three ordered children and appends assigned children');
  for(const url of expectedOriginalChildren){const page=await html(url);assert.equal(elements(page,a=>Object.hasOwn(a,'data-parent-topic')&&a.href==='/work/ue5-per-material/').length,1);}
  assert.ok(elements(await html('/notes/n-new-child/'),a=>Object.hasOwn(a,'data-parent-topic')&&a.href==='/work/ue5-per-material/').length);
  assert.equal(elements(portfolio,a=>Object.hasOwn(a,'data-artwork')&&a.href==='/work/ue5-per-material/').length,1);
  assert.match(portfolio,/Configured PBR Topic/);
  assert.equal(elements(journal,a=>a.href==='/notes/ue5-translucency-sort/').length,1);
  assert.equal(elements(journal,a=>a.href===legacyUrl).length,1);
  const sort=await html('/notes/ue5-translucency-sort/'),legacy=await html(legacyUrl);
  assert.match(sort,/syncsortsentinel/);assert.doesNotMatch(sort,/oldsortsentinel/);assert.match(legacy,/synclegacysentinel/);assert.doesNotMatch(legacy,/oldlegacysentinel/);
  for(const [id,url] of [['n-sync-sort','/notes/ue5-translucency-sort/'],['n-sync-topic','/work/ue5-per-material/'],['n-sync-legacy',legacyUrl]]){
    assert.equal(await fs.stat(path.join(dist,'notes',id)).catch(()=>null),null,'Generated replacement ID must not create a duplicate detail page');
    assert.ok(elements(await html(url),a=>a.rel==='canonical'&&a.href===new URL(url,'https://xueqingzhe.github.io').href).length);
  }
  const rss=await fs.readFile(path.join(dist,'rss.xml'),'utf8');assert.equal(rss.split('<link>https://xueqingzhe.github.io/notes/ue5-translucency-sort/</link>').length-1,1);
  const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.wasm':'application/wasm'};
  server=http.createServer(async(req,res)=>{try{const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname),file=path.resolve(dist,'.'+pathname+(pathname.endsWith('/')?'index.html':''));if(!file.startsWith(dist+path.sep)){res.writeHead(403);res.end();return;}const bytes=await fs.readFile(file);res.writeHead(200,{'Content-Type':mime[path.extname(file)]??'application/octet-stream'});res.end(bytes);}catch{res.writeHead(404);res.end();}});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base='http://127.0.0.1:'+server.address().port;
  await fs.writeFile(path.join(dist,'topic-search.html'),'<html><title>Search fixture</title></html>');
  browser=await chromium.launch({headless:true,...process.env.PUBLISHER_TEST_BROWSER?{channel:process.env.PUBLISHER_TEST_BROWSER}:{}});
  const page=await browser.newPage({reducedMotion:'reduce'});await page.goto(base+'/topic-search.html');
  const search=term=>page.evaluate(async query=>{const results=await(await import('/pagefind/pagefind.js')).search(JSON.stringify(query));return Promise.all(results.results.map(async result=>(await result.data()).url));},term);
  for(const [word,url] of [['syncsortsentinel','/notes/ue5-translucency-sort/'],['synctopicsentinel','/work/ue5-per-material/'],['synclegacysentinel',decodeURIComponent(new URL(legacyUrl,base).pathname)]])assert.deepEqual(await search(word),[url]);
  for(const word of ['oldsortsentinel','oldtopicsentinel','oldlegacysentinel'])assert.deepEqual(await search(word),[]);
  await page.goto(base+'/notes/n-new-child/');await page.locator('[data-parent-topic]').click();await page.waitForURL(base+'/work/ue5-per-material/');
  assert.deepEqual(await page.locator('[data-topic-articles] a').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('href'))),[...expectedOriginalChildren,'/notes/n-new-child/']);
  await page.close();

  // Configuration order is authoritative: alias references resolve the synchronized body and omitted children detach.
  await fs.writeFile(topicFile,JSON.stringify({version:1,topics:{'ue5-per-material':{title:'Ordered UE Topic',summary:'An explicitly ordered topic',notes:['published:n-new-child','notes:ue5-overlay-material','notes:ue5-translucency-sort']},'work:ue5-per-material':{title:'Stale Namespaced Topic',notes:[]},'published:n-sync-topic':{title:'Stale Generated Topic',notes:[]}}}));
  await build();
  const reordered=await html('/work/ue5-per-material/');
  assert.deepEqual(links(reordered,'data-topic-articles'),['/notes/n-new-child/','/notes/ue5-overlay-material/','/notes/ue5-translucency-sort/']);
  assert.match(reordered,/Ordered UE Topic/);assert.match(await html('/work/'),/Ordered UE Topic/);
  assert.equal(elements(await html('/notes/ue5-per-material-stencil/'),a=>Object.hasOwn(a,'data-parent-topic')&&a.href==='/work/ue5-per-material/').length,0,'Explicit omission overrides the article\'s old work backlink');
  assert.deepEqual(links(await html('/notes/ue5-overlay-material/'),'data-topic-siblings'),['/work/ue5-per-material/','/notes/n-new-child/','/notes/ue5-translucency-sort/']);
  const orderedPage=await browser.newPage({reducedMotion:'reduce'});await orderedPage.goto(base+'/notes/ue5-overlay-material/');
  await orderedPage.locator('[data-topic-siblings] nav a').first().click();await orderedPage.waitForURL(base+'/notes/n-new-child/');
  assert.match(await orderedPage.locator('[data-parent-topic]').innerText(),/第 1 \/ 3 篇/);await orderedPage.close();

  await fs.writeFile(topicFile,JSON.stringify({version:1,topics:{'work:ue5-per-material':{title:'Detached Stable Topic',notes:[]},'published:n-sync-topic':{title:'Stale Generated Topic',notes:['published:n-new-child']}}}));
  await build();assert.deepEqual(links(await html('/work/ue5-per-material/'),'data-topic-articles'),[]);assert.match(await html('/work/ue5-per-material/'),/Detached Stable Topic/);
  for(const url of [...expectedOriginalChildren,'/notes/n-new-child/'])assert.equal(elements(await html(url),a=>Object.hasOwn(a,'data-parent-topic')&&a.href==='/work/ue5-per-material/').length,0,'Explicit empty child list must detach both explicit and reverse relations');
  t.diagnostic('Verified replacement URL ownership, no duplicate pages/search/feed entries, UE three-child preservation, bare-note priority over a same-slug legacy article, inferred children, stable configuration precedence, ordered siblings and complete detach.');
});
