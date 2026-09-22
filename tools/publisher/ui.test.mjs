import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import { once } from 'node:events';
import { chromium } from 'playwright';

test('publisher UI preserves pending choices, filters root notes, locks review, and clears applied plans',async t=>{
  let selected=[],releaseAnalysis;
  const source=(await fs.readFile(new URL('./index.html',import.meta.url),'utf8')).replace('__TOKEN__','a'.repeat(64)).replace('__PREVIEW_URL__','http://127.0.0.1:4325/');
  const notes=[{path:'Root.md',id:'root',title:'Root note',status:'未生成',blocked:false},{path:'Folder/Nested.md',id:'nested',title:'Nested note',status:'未生成',blocked:false}];
  const server=http.createServer(async(req,res)=>{
    res.setHeader('Content-Type','application/json');
    const send=body=>res.end(JSON.stringify(body));
    if(req.url==='/'){res.setHeader('Content-Type','text/html');return res.end(source)}
    if(req.url==='/publisher.css'){res.setHeader('Content-Type','text/css');return res.end(await fs.readFile(new URL('./publisher.css',import.meta.url),'utf8'))}
    if(req.url==='/api/scan')return send({sections:[{value:'notes'},{value:'tutorials'},{value:'work'}],catalog:{tags:[],categories:[],series:[],engine:[],role:[]},metadata:{},notes,selected,assets:{},missingSelected:[],ffmpeg:false});
    if(req.url==='/api/deploy/status')return send({busy:false,phase:'idle',message:'等待发布'});
    let raw='';for await(const data of req)raw+=data;const data=JSON.parse(raw||'{}');
    if(req.url==='/api/select'){selected=data.selected;return send({ok:true})}
    if(req.url==='/api/analyze'){await new Promise(resolve=>{releaseAnalysis=resolve});return send({id:'plan',errors:[],warnings:[],assets:[],changes:{added:['Root note'],updated:[],removed:[]}})}
    if(req.url==='/api/prepare')return send({id:'stage',notes:[{title:'Root note',slug:'root'}],assets:[],changes:{removed:[]}});
    if(req.url.startsWith('/api/stage?'))return send({markdown:'# Public review'});
    if(req.url==='/api/apply')return send({message:'网站副本与搜索索引已更新。'});
    res.writeHead(404);res.end('{}');
  });
  server.listen(0,'127.0.0.1');await once(server,'listening');t.after(()=>new Promise(resolve=>server.close(resolve)));
  const browser=await chromium.launch({headless:true,...(process.env.PUBLISHER_TEST_BROWSER?{channel:process.env.PUBLISHER_TEST_BROWSER}:{})});t.after(()=>browser.close());const page=await browser.newPage();
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto(`http://127.0.0.1:${server.address().port}`);await page.locator('#vaultPanel > summary').click();await page.locator('#notes .note').first().waitFor();
  await page.locator('#folder').selectOption('__root__');assert.equal(await page.locator('#notes .note').count(),1);
  await page.getByLabel('选择 Root note',{exact:true}).check();await page.locator('#rescan').click();
  await page.waitForFunction(()=>document.querySelector('#message').textContent.includes('未保存的选择已保留'));
  assert.equal(await page.getByLabel('选择 Root note',{exact:true}).isChecked(),true);
  await page.locator('#analyze').click();await page.waitForFunction(()=>document.querySelector('#message').textContent.includes('正在检查正文'));
  assert.equal(await page.getByLabel('选择 Root note',{exact:true}).isDisabled(),true);assert.equal(await page.locator('#folder').isDisabled(),true);
  releaseAnalysis();await page.waitForFunction(()=>!document.querySelector('#prepare').disabled);
  await page.locator('#prepare').click();await page.waitForFunction(()=>!document.querySelector('#apply').disabled);
  assert.match(await page.locator('#preview').innerText(),/Public review/);
  await page.locator('#apply').click();await page.locator('#applyReview').waitFor({state:'visible'});await page.locator('#applyConfirm').click();
  await page.waitForFunction(()=>document.querySelector('#message').textContent.includes('网站副本与搜索索引已更新'));
  assert.equal(await page.locator('#apply').isDisabled(),true);assert.equal(await page.locator('#prepare').isDisabled(),true);
  assert.match(await page.locator('#review').innerText(),/本地网站已更新/);assert.deepEqual(errors,[]);
});
