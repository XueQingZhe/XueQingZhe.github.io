import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { chromium } from 'playwright';
import sharp from 'sharp';
import YAML from 'yaml';

const run=promisify(execFile);
const project=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');

test('video work covers load on desktop intent, stop with visibility and motion, and remain playable in detail', {timeout:240000}, async t=>{
  // Vite's CSS graph requires one consistent Windows path spelling (TEMP may use a DOS 8.3 alias).
  const tempBase=process.platform==='win32'&&process.env.LOCALAPPDATA?path.join(process.env.LOCALAPPDATA,'Temp'):os.tmpdir();
  const root=await fs.mkdtemp(path.join(tempBase,'publisher-video-site-'));
  const site=path.join(root,'site'),junctions=[];
  let browser,server;
  t.after(async()=>{
    await browser?.close();
    if(server)await new Promise(resolve=>{server.close(resolve);server.closeAllConnections();});
    for(const junction of junctions)await fs.unlink(junction).catch(e=>{if(e.code!=='ENOENT')throw e;});
    assert.equal(path.dirname(root),tempBase);assert.ok(path.basename(root).startsWith('publisher-video-site-'));
    await fs.rm(root,{recursive:true,force:true,maxRetries:4,retryDelay:200});
  });
  await fs.mkdir(path.join(site,'public/published-assets'),{recursive:true});
  await fs.mkdir(path.join(site,'content/published/notes'),{recursive:true});
  await fs.cp(path.join(project,'src'),path.join(site,'src'),{recursive:true});
  await fs.writeFile(path.join(site,'src/data/publisher-content.json'),JSON.stringify({version:1,entries:{},collections:{}}));
  await fs.writeFile(path.join(site,'src/data/publisher-topics.json'),JSON.stringify({version:1,topics:{}}));
  for(const name of ['astro.config.mjs','package.json'])await fs.copyFile(path.join(project,name),path.join(site,name));
  // Explicit static-only allowlist: never read real content/ or public/published-assets/.
  for(const name of ['node_modules','public/art','public/assets','public/covers','public/fonts']){
    const dest=path.join(site,name);await fs.symlink(path.join(project,name),dest,'junction');junctions.push(dest);
  }
  for(const name of ['favicon.svg','og.png','robots.txt','.nojekyll'])await fs.copyFile(path.join(project,'public',name),path.join(site,'public',name));
  const config=path.join(site,'astro.config.mjs');
  await fs.writeFile(config,(await fs.readFile(config,'utf8')).replace('export default defineConfig({','export default defineConfig({\n  cacheDir: "./.astro-video-test",\n  vite: { cacheDir: ".vite-video-test" },'));
  const cover='/published-assets/video-test-cover.webp',clip='/published-assets/video-test-clip.webm';
  await sharp({create:{width:320,height:180,channels:3,background:'#446f97'}}).webp().toFile(path.join(site,'public',cover));
  browser=await chromium.launch({headless:true,...process.env.PUBLISHER_TEST_BROWSER?{channel:process.env.PUBLISHER_TEST_BROWSER}:{}});
  const maker=await browser.newPage();
  // Generate a real, decodable clip entirely inside this test, without ffmpeg or user media.
  const bytes=await maker.evaluate(async()=>{
    const canvas=document.createElement('canvas');canvas.width=320;canvas.height=180;
    const context=canvas.getContext('2d'),stream=canvas.captureStream(20),parts=[];
    const recorder=new MediaRecorder(stream,{mimeType:'video/webm;codecs=vp8'});
    recorder.ondataavailable=e=>{if(e.data.size)parts.push(e.data);};
    const done=new Promise(resolve=>{recorder.onstop=async()=>resolve([...new Uint8Array(await new Blob(parts).arrayBuffer())]);});
    let frame=0;const draw=setInterval(()=>{context.fillStyle='#446f97';context.fillRect(0,0,320,180);context.fillStyle='#f2dea1';context.fillRect((frame++*8)%260,60,60,60);},30);
    recorder.start();await new Promise(resolve=>setTimeout(resolve,1200));recorder.stop();clearInterval(draw);stream.getTracks().forEach(track=>track.stop());return done;
  });
  await maker.close();assert.ok(bytes.length>1000);await fs.writeFile(path.join(site,'public',clip),Buffer.from(bytes));
  for(const [id,extra] of [
    ['video-fixture',{title:'Synthetic Video Work',coverVideo:clip,order:1}],
    ['video-second',{title:'Second Video Work',coverVideo:clip+'?second',order:2}],
    ['video-failure',{title:'Unavailable Video Work',coverVideo:'/published-assets/unavailable-video.webm',order:3}],
    ['image-fixture',{title:'Synthetic Image Work',category:'静态测试',order:4}],
    ['video-member',{title:'Collection Video Member',coverVideo:clip,order:5}],
    ['video-member-conflict',{title:'Conflicting Video Member',coverVideo:clip+'?different',order:6}],
  ]){
    const metadata={section:'work',kind:'work',category:'动态测试',title:id,date:'2026-09-22',summary:'A synthetic work fixture',cover,year:2099,tech:['Video Test','shader','SHADER','Custom Tag','custom tag'],engine:['unity','UNITY'],role:['shader','SHADER'],...extra};
    await fs.writeFile(path.join(site,'content/published/notes',id+'.md'),'---\n'+YAML.stringify(metadata)+'---\n\n## Implementation\n\nSynthetic work body.');
  }
  const collections={};
  for(const [id,extra] of [
    ['legacy-video-collection',{}],
    ['explicit-video-collection',{coverVideo:clip}],
    ['static-collection',{coverVideo:''}],
    ['unrelated-collection',{cover:'/covers/placeholder.svg'}],
    ['ambiguous-collection',{notes:['published:video-member','published:video-member-conflict']}],
  ])collections[id]={title:id,summary:'Video collection regression',section:'work',workType:'collection',year:2099,cover,notes:['published:video-member'],...extra};
  await fs.writeFile(path.join(site,'src/data/publisher-content.json'),JSON.stringify({version:1,entries:{},collections}));
  try{await run(process.execPath,[path.join(project,'node_modules/astro/astro.js'),'build','--force'],{cwd:site,env:{...process.env,ASTRO_TELEMETRY_DISABLED:'1'},windowsHide:true,timeout:180000,maxBuffer:8*1024*1024});}
  catch(e){throw new Error('Isolated video-site build failed:\n'+(e.stdout??'')+'\n'+(e.stderr??''),{cause:e});}
  const dist=path.join(site,'dist');
  for(const route of ['notes/video-fixture','notes/image-fixture','notes/urp-bloom','work/urp-pbr']){
    const source=await fs.readFile(path.join(dist,route,'index.html'),'utf8');
    assert.match(source,/rel="stylesheet"/,route+' must retain its production styles');
  }
  const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.webm':'video/webm','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml'};
  server=http.createServer(async(req,res)=>{
    try{
      const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
      const file=path.resolve(dist,'.'+pathname+(pathname.endsWith('/')?'index.html':''));
      if(!file.startsWith(dist+path.sep)){res.writeHead(403);res.end();return;}
      const body=await fs.readFile(file);res.writeHead(200,{'Content-Type':mime[path.extname(file)]??'application/octet-stream','Content-Length':body.length});res.end(body);
    }catch{res.writeHead(404);res.end();}
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base='http://127.0.0.1:'+server.address().port;
  const context=await browser.newContext({viewport:{width:1280,height:900},reducedMotion:'no-preference'});
  const page=await context.newPage(),requests=[];
  page.on('request',r=>{if(/video-test-clip|unavailable-video/.test(r.url()))requests.push(r.url());});
  await page.goto(base+'/work/');
  const tile=page.locator('[data-artwork][data-work-key="published:video-fixture"]');
  const preview=tile.locator('video[data-work-preview]');
  const playing=async()=>{await page.waitForFunction(()=>{const tile=document.querySelector('[data-work-key="published:video-fixture"][data-artwork]'),video=tile?.querySelector('video');return tile?.hasAttribute('data-video-playing')&&!video.paused&&video.currentTime>.05;});};
  const stopped=async()=>{await page.waitForFunction(()=>{const tile=document.querySelector('[data-work-key="published:video-fixture"][data-artwork]'),video=tile?.querySelector('video');return !tile?.hasAttribute('data-video-playing')&&video.paused&&!video.hasAttribute('src');});};
  assert.equal(await page.locator('video[data-work-preview]').count(),5);
  assert.equal(await page.locator('video[data-work-preview][src]').count(),0);
  assert.equal(await page.locator('[data-artwork][data-work-key="published:video-member"]').count(),0,'A collection member is accessed through its collection');
  for(const id of ['static-collection','unrelated-collection','ambiguous-collection'])assert.equal(await page.locator(`[data-work-key="collections:${id}"] video`).count(),0,`${id} must remain static`);
  // Case-only variants must produce one facet and one count per card.
  const shaders=page.locator('button[data-facet="tech"][data-term="Shader"]');
  assert.equal(await shaders.count(),1);
  assert.equal(await page.locator('button[data-facet="tech"][data-term="shader"]').count(),0);
  assert.equal(await page.locator('button[data-facet="tech"][data-term="Custom Tag"]').count(),1);
  assert.equal(await page.locator('button[data-facet="tech"][data-term="custom tag"]').count(),0);
  const shaderCount=await page.locator('.work-cell').evaluateAll(cells=>cells.filter(cell=>JSON.parse(cell.dataset.tech).includes('Shader')).length);
  assert.equal(Number(await shaders.locator('b').innerText()),shaderCount);
  for(const facet of ['tech','engine','role'])assert.equal(await tile.evaluate((el,facet)=>{const values=JSON.parse(el.closest('.work-cell').dataset[facet]);return values.length===new Set(values.map(value=>value.toLowerCase())).size;},facet),true);
  await tile.scrollIntoViewIfNeeded();assert.deepEqual(requests,[],'Scrolling a cover into view must not fetch its video');
  assert.equal(await tile.locator('img[data-work-cover]').getAttribute('src'),cover);
  await tile.hover();await playing();
  assert.equal(await preview.evaluate(v=>v.muted&&v.loop&&v.playsInline&&!v.controls),true);
  assert.equal(requests.some(u=>u.includes('?second')),false,'Adjacent video remains unloaded');
  await page.mouse.move(0,0);await stopped();
  await page.keyboard.press('Tab');await tile.focus();await playing();
  await page.evaluate(()=>document.activeElement.blur());await stopped();
  await tile.hover();await playing();
  await page.evaluate(()=>document.documentElement.dataset.motion='paused');await stopped();
  await page.evaluate(()=>document.documentElement.dataset.motion='running');await playing();
  await page.emulateMedia({reducedMotion:'reduce'});await stopped();
  await page.emulateMedia({reducedMotion:'no-preference'});await playing();
  await page.evaluate(()=>scrollTo(0,0));await stopped();
  await tile.hover();await playing();
  // The browser visibility event is deterministic here; no unrelated browser window is touched.
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});await stopped();
  await page.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});await playing();
  // Hiding a focused card is covered independently from the pointerleave caused by clicking a filter.
  await page.keyboard.press('Tab');await tile.focus();
  await tile.evaluate(el=>el.closest('.work-cell').hidden=true);await stopped();
  await tile.evaluate(el=>el.closest('.work-cell').hidden=false);
  await page.evaluate(()=>document.activeElement.blur());await page.mouse.move(0,0);
  const failure=page.locator('[data-artwork][data-work-key="published:video-failure"]');
  await failure.hover();
  await page.waitForFunction(()=>{const video=document.querySelector('[data-work-key="published:video-failure"][data-artwork] video');return video&&!video.hasAttribute('src')&&video.paused;});
  assert.equal(await failure.getAttribute('data-video-playing'),null);
  assert.equal(await failure.locator('img[data-work-cover]').isVisible(),true);
  assert.ok(requests.some(u=>u.includes('unavailable-video')),'Fallback test must attempt the unavailable preview');
  await page.mouse.move(0,0);
  for(const id of ['legacy-video-collection','explicit-video-collection']){
    const key='collections:'+id,collectionTile=page.locator(`[data-artwork][data-work-key="${key}"]`);
    await collectionTile.hover();
    await page.waitForFunction(key=>{const tile=document.querySelector(`[data-artwork][data-work-key="${key}"]`),video=tile?.querySelector('video');return tile?.hasAttribute('data-video-playing')&&video&&!video.paused&&video.currentTime>.05;},key);
    await page.mouse.move(0,0);
    await page.waitForFunction(key=>{const tile=document.querySelector(`[data-artwork][data-work-key="${key}"]`),video=tile?.querySelector('video');return !tile?.hasAttribute('data-video-playing')&&video?.paused&&!video.hasAttribute('src');},key);
  }
  await page.goto(base+'/work/legacy-video-collection/');
  const collectionPlayer=page.locator('video[data-collection-cover]');
  assert.equal(await collectionPlayer.getAttribute('poster'),cover);
  assert.equal(await collectionPlayer.getAttribute('src'),clip);
  assert.equal(await collectionPlayer.evaluate(v=>v.controls&&v.playsInline&&v.preload==='none'&&!v.autoplay&&v.paused),true);
  await collectionPlayer.evaluate(v=>v.play());await page.waitForFunction(()=>document.querySelector('video[data-collection-cover]').currentTime>.05);
  await page.goto(base+'/work/?tech=shader');
  assert.equal(await shaders.getAttribute('aria-pressed'),'true','Old lowercase filter links select the canonical tag');
  assert.equal(await page.locator('.work-cell:not([hidden])').count(),shaderCount);
  await page.goto(base+'/work/?category='+encodeURIComponent('动态测试'));
  await tile.hover();await playing();await tile.click();
  await page.waitForURL(base+'/notes/video-fixture/');
  const player=page.locator('video[data-work-video]');
  assert.equal(await player.count(),1);
  assert.equal(await player.getAttribute('poster'),cover);
  assert.equal(await player.getAttribute('src'),clip);
  assert.equal(await player.evaluate(v=>v.controls&&v.playsInline&&v.preload==='none'&&!v.autoplay&&v.paused&&!v.closest('a')),true);
  assert.equal(await player.getAttribute('data-zoom'),null);
  assert.equal(await page.locator('meta[property="og:image"]').getAttribute('content'),'https://xueqingzhe.github.io'+cover);
  assert.equal(await page.locator('[data-work-cover]').count(),1,'Only the detail player participates in cover transition');
  await page.waitForFunction(()=>document.querySelector('[data-work-return]').getAttribute('href').includes('category='));
  await player.evaluate(v=>v.play());await page.waitForFunction(()=>document.querySelector('[data-work-video]').currentTime>.05);
  await page.locator('[data-work-return]').click();await page.waitForURL(/\/work\/\?category=/);
  assert.equal(new URL(page.url()).searchParams.get('category'),'动态测试');
  await page.goto(base+'/notes/image-fixture/');
  assert.equal(await page.locator('video[data-work-video]').count(),0);
  assert.equal(await page.locator('img[data-work-cover][data-zoom]').count(),1);
  await page.locator('img[data-work-cover]').click();
  assert.equal(await page.locator('#lb').evaluate(el=>el.open||!el.hidden&&getComputedStyle(el).display!=='none'),true);

  const reducedPage=await context.newPage();await reducedPage.emulateMedia({reducedMotion:'reduce'});
  await reducedPage.goto(base+'/work/');
  await reducedPage.locator('[data-artwork][data-work-key="published:video-fixture"]').hover();
  assert.equal(await reducedPage.locator('video[data-work-preview][src]').count(),0);
  const mobile=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'no-preference'});
  const mobilePage=await mobile.newPage(),mobileRequests=[];mobilePage.on('request',r=>{if(/video-test-clip/.test(r.url()))mobileRequests.push(r.url());});
  await mobilePage.goto(base+'/work/');
  const mobileTile=mobilePage.locator('[data-artwork][data-work-key="published:video-fixture"]');
  await mobileTile.scrollIntoViewIfNeeded();await mobileTile.focus();
  assert.equal(await mobilePage.locator('video[data-work-preview][src]').count(),0);assert.deepEqual(mobileRequests,[]);
  await mobileTile.tap();await mobilePage.waitForURL(base+'/notes/video-fixture/');
  assert.equal(await mobilePage.locator('video[data-work-video]').evaluate(v=>v.controls&&v.paused&&!v.autoplay),true);
  await mobilePage.waitForFunction(()=>getComputedStyle(document.querySelector('[data-work-video]')).maxWidth==='100%');
  const mobileLayout=await mobilePage.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));
  assert.ok(mobileLayout.scroll<=mobileLayout.width,JSON.stringify(mobileLayout));
  t.diagnostic('Verified real WebM standalone/collection hover playback, exact-poster legacy recovery, explicit static and ambiguous-poster fallbacks, case-insensitive tag facets/counts/old links, no eager downloads, keyboard/motion/visibility/filter lifecycle, detail controls, image lightbox, filtered return and mobile covers.');
});
