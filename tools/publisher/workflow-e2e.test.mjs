import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import net from 'node:net';
import {execFile,spawn} from 'node:child_process';
import {promisify} from 'node:util';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
import sharp from 'sharp';

const run=promisify(execFile),project=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const git=async(cwd,...args)=>(await run('git',args,{cwd,windowsHide:true})).stdout.trim();
const idle=async page=>page.waitForFunction(()=>document.querySelector('main')?.getAttribute('aria-busy')!=='true');

test('real publisher: reconcile, edit existing content, create collection, import work, build, upload and rescan', {timeout:300000},async t=>{
  const tempBase=process.platform==='win32'&&process.env.LOCALAPPDATA?path.join(process.env.LOCALAPPDATA,'Temp'):os.tmpdir();
  const root=await fs.mkdtemp(path.join(tempBase,'publisher-workflow-')),site=path.join(root,'site'),vault=path.join(root,'vault'),state=path.join(root,'private'),remote=path.join(root,'origin.git');
  const junctions=[];let server,browser,log='';
  t.after(async()=>{await browser?.close();if(server&&server.exitCode===null){const stopped=new Promise(resolve=>server.once('exit',resolve));server.kill();await stopped;}for(const file of junctions)await fs.unlink(file).catch(()=>{});assert.equal(path.dirname(root),tempBase);await fs.rm(root,{recursive:true,force:true,maxRetries:5,retryDelay:200});});
  await fs.mkdir(site,{recursive:true});await fs.mkdir(vault);await fs.mkdir(path.join(site,'public'));
  await fs.cp(path.join(project,'src'),path.join(site,'src'),{recursive:true});
  for(const name of ['astro.config.mjs','package.json'])await fs.copyFile(path.join(project,name),path.join(site,name));
  for(const name of ['node_modules','public/art','public/assets','public/covers','public/fonts']){const dest=path.join(site,name);await fs.symlink(path.join(project,name),dest,'junction');junctions.push(dest);}
  // Public images must not be symlinked for the publisher's asset boundary; use a small real test cover.
  await sharp({create:{width:320,height:180,channels:3,background:'#468aab'}}).png().toFile(path.join(vault,'preview.png'));
  await fs.copyFile(path.join(vault,'preview.png'),path.join(site,'public/workflow-cover.png'));
  for(const name of ['favicon.svg','og.png','robots.txt','.nojekyll'])await fs.copyFile(path.join(project,'public',name),path.join(site,'public',name));
  const config=path.join(site,'astro.config.mjs');await fs.writeFile(config,(await fs.readFile(config,'utf8')).replace('export default defineConfig({','export default defineConfig({\n  cacheDir: "./.astro-workflow-test",\n  vite: { cacheDir: ".vite-workflow-test" },'));
  const body='# 已有文章\n\n这是一段足够长且唯一的文章正文，用于验证网站与笔记库自动核对，不依赖手动选择匹配。多段测试文字保留并检查原网址。\n';
  await fs.writeFile(path.join(site,'src/content/notes/workflow-existing.md'),'---\ntitle: 初始文章\ndate: 2026-09-22\ntech: [initial]\n---\n'+body);
  await fs.writeFile(path.join(vault,'已有文章.md'),body);
  await fs.writeFile(path.join(vault,'新作品.md'),'---\ntitle: 新作品\nsection: work\nsummary: 新作品的介绍\ncover: preview.png\nyear: 2026\n---\n\n# 新作品\n\n合成工作流演示。\n\n![[preview.png]]\n');
  await git(root,'init','--bare','--initial-branch=main',remote);await git(site,'init','--initial-branch=main');await git(site,'config','user.name','Workflow test');await git(site,'config','user.email','workflow@example.test');await git(site,'remote','add','origin',remote);
  await git(site,'add','src','package.json','astro.config.mjs');await git(site,'commit','-m','Initial website');await git(site,'push','origin','HEAD:main');
  const socket=net.createServer();await new Promise(resolve=>socket.listen(0,'127.0.0.1',resolve));const port=socket.address().port;await new Promise(resolve=>socket.close(resolve));
  const url=`http://127.0.0.1:${port}`;
  server=spawn(process.execPath,[path.join(project,'tools/publisher/server.mjs')],{cwd:project,windowsHide:true,env:{...process.env,PUBLISHER_SITE:site,PUBLISHER_VAULT:vault,PUBLISHER_STATE:state,PUBLISHER_PORT:String(port),PUBLISHER_PREVIEW_URL:'http://127.0.0.1:4325/'},stdio:['ignore','pipe','pipe']});
  for(const stream of [server.stdout,server.stderr])stream.on('data',value=>{log+=value});
  for(let n=0;n<100;n++){if(await fetch(url+'/api/health').then(r=>r.ok).catch(()=>false))break;if(server.exitCode!==null)throw Error(log);await new Promise(resolve=>setTimeout(resolve,100));}
  const html=await fetch(url).then(r=>r.text()),token=html.match(/const token='([^']+)'/)[1];
  const api=async(route,data)=>{const response=await fetch(url+'/api/'+route,{method:data?'POST':'GET',headers:{'X-Publisher-Token':token,...data?{'Content-Type':'application/json',Origin:url}:{}},...data?{body:JSON.stringify(data)}:{}});const body=await response.json();assert.equal(response.ok,true,JSON.stringify(body));return body;};
  browser=await chromium.launch({headless:true,channel:process.env.PUBLISHER_TEST_BROWSER||'chrome'});const page=await browser.newPage({bypassCSP:true,viewport:{width:1400,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(url);await page.locator('[data-edit-site="notes:workflow-existing"]').waitFor();await idle(page);
  const initial=await api('scan');assert.equal(initial.notes.find(n=>n.path==='已有文章.md').siteMatch.key,'notes:workflow-existing');assert.deepEqual(initial.selected,[]);
  await page.locator('[data-edit-site="notes:workflow-existing"]').click();assert.equal(await page.locator('#editTitle').inputValue(),'初始文章');assert.equal(await page.locator('#seriesField').isVisible(),false);
  await page.locator('#editSection').selectOption('tutorials');await page.locator('#editTitle').fill('实际流程：系列文章');await page.locator('#editSeriesSearch').fill('测试研习系列');await page.locator('#editSeriesCreate').click();await idle(page);await page.locator('#editOrder').fill('2');await page.locator('#editTagSearch').fill('workflow-tag');await page.locator('#editTagCreate').click();await idle(page);await page.locator('#noteMetaApply').click();await idle(page);
  assert.match(await page.locator('[data-site-key="notes:workflow-existing"]').innerText(),/workflow-tag/);await page.locator('#noteMetaClose').click();await page.locator('#rescan').click();await idle(page);await page.locator('[data-edit-site="notes:workflow-existing"]').click();assert.equal(await page.locator('#editSeries').inputValue(),'测试研习系列');await page.locator('#noteMetaClose').click();
  await page.locator('#newCollection').click();await page.locator('#collectionTitle').fill('测试作品合集');await page.locator('#collectionSummary').fill('组织已有文章与单篇作品。');await page.locator('#collectionCreate').click();await idle(page);await page.locator('#topicArticle').selectOption('notes:workflow-existing');await page.locator('#topicAdd').click();await page.locator('#topicSave').click();await idle(page);await page.locator('#topicCancel').click();
  await page.locator('#importNotes').click();await page.locator('#search').fill('新作品');await page.getByLabel('选择 新作品',{exact:true}).check();await page.getByLabel('编辑发布设置 新作品.md',{exact:true}).click();assert.equal(await page.locator('#seriesField').isVisible(),false);await page.locator('#noteMetaApply').click();await idle(page);await page.locator('#noteMetaClose').click();
  const scan=await api('scan'),work=scan.notes.find(n=>n.path==='新作品.md'),collection=scan.siteContent.find(e=>e.collection==='collections');
  await page.locator('#topicSelect').selectOption(collection.key);await page.locator('#topicArticle').selectOption('published:'+work.slug);await page.locator('#topicAdd').click();await page.locator('#topicSave').click();await idle(page);await page.locator('#topicCancel').click();
  for(const route of ['deploy/review','deploy/start']){const response=await fetch(url+'/api/'+route,{method:'POST',headers:{'X-Publisher-Token':token,'Content-Type':'application/json',Origin:url},body:'{}'});assert.equal(response.status,400);assert.match((await response.json()).error,/写入本地预览/);}
  await page.locator('#analyze').click();await idle(page);assert.match(await page.locator('#review').innerText(),/发布设置/);const approve=page.locator('#assetApprove');if(await approve.isVisible())await approve.click();
  await page.locator('#prepare').click();await idle(page);assert.equal(await page.locator('#apply').isEnabled(),true);await page.locator('#apply').click();await page.locator('#applyConfirm').click();await page.waitForFunction(()=>document.querySelector('#applyStatus').textContent.includes('已更新'),null,{timeout:120000});await idle(page);
  const read=rel=>fs.readFile(path.join(site,'dist',rel,'index.html'),'utf8');
  const index=await read('notes'),series=await read('tutorials'),works=await read('work'),article=await read('notes/workflow-existing'),group=await read('work/'+collection.id);
  for(const title of ['实际流程：系列文章','新作品','测试作品合集'])assert.ok(index.includes(title),'index missing '+title);
  assert.ok(series.includes('测试研习系列'));assert.ok(works.includes('测试作品合集'));assert.ok(works.includes('新作品'));assert.ok(article.includes('workflow-tag'));assert.ok(group.includes('/notes/workflow-existing/'));assert.ok(group.includes('/notes/'+work.slug+'/'));
  const pending=await api('publication-status?refresh=1');assert.equal(pending.entries['notes:workflow-existing'].state,'modified');assert.equal(pending.entries[collection.key].state,'local');
  await git(site,'add','src/data','content/published/notes','public/published-assets');await git(site,'commit','-m','Reviewed publication');await git(site,'push','origin','HEAD:main');
  const uploaded=await api('publication-status?refresh=1');assert.equal(uploaded.entries['notes:workflow-existing'].state,'uploaded');assert.equal(uploaded.entries[collection.key].state,'uploaded');
  await page.locator('#rescan').click();await idle(page);await page.locator('[data-edit-site="notes:workflow-existing"]').click();assert.equal(await page.locator('#editTitle').inputValue(),'实际流程：系列文章');assert.equal(await page.locator('#editSeries').inputValue(),'测试研习系列');
  assert.equal(await fs.readFile(path.join(vault,'已有文章.md'),'utf8'),body);assert.deepEqual(errors,[]);
});
