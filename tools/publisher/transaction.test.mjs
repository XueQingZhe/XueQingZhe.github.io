import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { Publisher } from './core.mjs';

async function setup(t) {
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'publisher-transaction-'));
  t.after(()=>fs.rm(root,{recursive:true,force:true,maxRetries:4,retryDelay:100}));
  const vault=path.join(root,'vault'),site=path.join(root,'site'),state=path.join(root,'private');
  await fs.mkdir(vault);await fs.mkdir(site);
  const publisher=new Publisher({vault,site,state});await publisher.init();
  const stage=async text=>{
    await fs.writeFile(path.join(vault,'Public.md'),text);await publisher.scan();await publisher.select(['Public.md']);
    const plan=await publisher.analyze();return publisher.prepare(plan.id,[]);
  };
  await publisher.apply((await stage('Original article')).id);
  await fs.mkdir(path.join(site,'dist'));await fs.writeFile(path.join(site,'dist/index.html'),'Original preview');
  return {publisher,site,state,vault,stage};
}

test('preview install failure rolls back article, assets, manifest and original preview together',async t=>{
  const {publisher,site,state,stage}=await setup(t);
  const previous=await fs.readFile(path.join(state,'current.json'),'utf8');
  const next=await stage('Updated article'),prepared=path.join(site,'.publisher-build-test');
  const rename=fs.rename;
  fs.rename=async(from,to)=>{if(from===prepared&&to===path.join(site,'dist'))throw Error('simulated preview rename failure');return rename(from,to)};
  try {
    await assert.rejects(publisher.apply(next.id,async()=>{
      await fs.mkdir(prepared);await fs.writeFile(path.join(prepared,'index.html'),'Updated preview');
    },{previewDirectory:prepared}),/simulated preview rename failure/);
  } finally {fs.rename=rename}
  assert.equal(await fs.readFile(path.join(site,'dist/index.html'),'utf8'),'Original preview');
  assert.equal(await fs.readFile(path.join(state,'current.json'),'utf8'),previous);
  const notes=path.join(site,'content/published/notes');
  assert.match(await fs.readFile(path.join(notes,(await fs.readdir(notes))[0]),'utf8'),/Original article/);
  assert.equal(await fs.stat(path.join(state,'transaction.json')).catch(()=>null),null);
});

test('startup recovers an interrupted content and preview replacement and is repeatable',async t=>{
  const {publisher,site,state,vault}=await setup(t),backup=path.join(state,'backups','crash');
  const previous=await fs.readFile(path.join(state,'current.json'),'utf8');
  await fs.mkdir(backup,{recursive:true});
  for(const [name,dest] of await publisher.managedTargets())await fs.cp(dest,path.join(backup,name),{recursive:true});
  const previewBackup=path.join(site,'.publisher-previous-test'),prepared=path.join(site,'.publisher-build-test');
  await fs.rename(path.join(site,'dist'),previewBackup);
  await fs.mkdir(path.join(site,'dist'));await fs.writeFile(path.join(site,'dist/index.html'),'Interrupted preview');
  await fs.writeFile(path.join(state,'current.json'),'{}');
  await fs.writeFile(path.join(state,'transaction.json'),JSON.stringify({backup,had:{notes:true,assets:true},previous,preview:{had:true,backup:previewBackup,prepared}}));
  const restarted=new Publisher({site,state,vault});await restarted.init();await restarted.init();
  assert.equal(await fs.readFile(path.join(site,'dist/index.html'),'utf8'),'Original preview');
  assert.equal(await fs.readFile(path.join(state,'current.json'),'utf8'),previous);
});

test('source edited during build invalidates publication and preserves preview',async t=>{
  const {publisher,site,vault,stage}=await setup(t),next=await stage('Reviewed article');
  const prepared=path.join(site,'.publisher-build-test');
  await assert.rejects(publisher.apply(next.id,async()=>{
    await fs.mkdir(prepared);await fs.writeFile(path.join(prepared,'index.html'),'Reviewed preview');
    await fs.writeFile(path.join(vault,'Public.md'),'Edited during build');
  },{previewDirectory:prepared}),/源文件已变化/);
  assert.equal(await fs.readFile(path.join(site,'dist/index.html'),'utf8'),'Original preview');
});
