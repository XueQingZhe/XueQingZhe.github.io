import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import {TopicStore} from './topics.mjs';

async function fixture(t){
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'publisher-topic-'));
  t.after(()=>fs.rm(root,{recursive:true,force:true}));
  const site=path.join(root,'site'),state=path.join(root,'state');
  await fs.mkdir(path.join(site,'src/data'),{recursive:true});await fs.mkdir(state);
  const store=new TopicStore({site,state});
  const entries=[
    {key:'work:ue',id:'ue',collection:'work',title:'UE专题',section:'work',url:'/work/ue/',metadata:{summary:'三篇引擎笔记',notes:['sort','stencil','overlay']}},
    ...['sort','stencil','overlay'].map(id=>({key:'notes:'+id,id,collection:'notes',title:id,section:'notes',url:'/notes/'+id+'/',metadata:{work:'ue'}})),
    {key:'legacy:sort',id:'sort',collection:'legacy',title:'同名历史文章',section:'tutorials',url:'/blog/old-sort/',metadata:{}},
  ];
  return {root,site,state,store,entries};
}
test('topic inventory preserves original explicit order and accepts namespaced children',async t=>{
  const {store,entries}=await fixture(t);const scan=await store.scan(entries);
  assert.deepEqual(scan.topics[0].notes,['notes:sort','notes:stencil','notes:overlay']);
  const saved=await store.save({key:'ue',title:'UE引擎',summary:'重新排序',notes:['legacy:sort','notes:overlay','notes:sort']},entries);
  assert.equal(saved.pending,true);assert.deepEqual(saved.topics[0].notes,['legacy:sort','notes:overlay','notes:sort']);
  assert.equal(await fs.stat(store.file).catch(()=>null),null,'saving a draft must not write website');
});
test('explicit empty topic unlinks inherited reverse relations without deleting articles',async t=>{
  const {store,entries}=await fixture(t);
  await store.save({key:'ue',title:'UE',summary:'已完成',notes:[]},entries);
  const scan=await store.scan(entries);assert.deepEqual(scan.topics[0].notes,[]);assert.equal(scan.articles.length,4);assert.equal(scan.topics[0].workType,'collection');
});
test('topic plan detects external website edits and post-stage private changes',async t=>{
  const {root,store,entries}=await fixture(t);
  const input={key:'ue',title:'UE',summary:'引擎专题',notes:['notes:overlay']};
  await store.save(input,entries);const snapshot=await store.snapshot(entries);await store.verify(snapshot);
  const stage=path.join(root,'stage');await fs.mkdir(stage);await store.stage(snapshot,stage);
  await fs.copyFile(path.join(stage,'topics'),store.file);await store.verify(snapshot,{applied:true});
  await assert.rejects(store.verify(snapshot),/专题设置已改变/);
  await store.save({...input,title:'新标题'},entries);await assert.rejects(store.verify(snapshot,{applied:true}),/专题设置已改变/);
});
test('topic rejects unknown, duplicate and withdrawn child references',async t=>{
  const {store,entries}=await fixture(t);const input={key:'ue',title:'UE',summary:'引擎专题'};
  for(const notes of [['notes:missing'],['notes:sort','notes:sort'],['work:ue']])await assert.rejects(store.save({...input,notes},entries),/关联文章无效/);
  await store.save({...input,notes:['notes:sort']},entries);
  await assert.rejects(store.snapshot(entries.filter(e=>e.key!=='notes:sort')),/不再公开/);
});
test('successful topic write clears only the reviewed draft',async t=>{
  const {store,entries}=await fixture(t);
  const input={key:'ue',title:'UE',summary:'引擎专题',notes:['notes:sort']};
  await store.save(input,entries);const snapshot=await store.snapshot(entries);
  await store.save({...input,title:'更新'},entries);await store.finish(snapshot);
  assert.equal((await store.scan(entries)).pending,true);
  await store.finish(await store.snapshot(entries));assert.equal((await store.scan(entries)).pending,false);
});

test('topic child identity survives withdrawing a synchronized replacement',async t=>{
  const {store,entries}=await fixture(t);
  const updated=entries.map(entry=>entry.key==='notes:sort'?{...entry,replacedBy:'published:n-sort'}:entry);
  updated.push({key:'published:n-sort',id:'n-sort',collection:'published',title:'新排序文章',section:'notes',url:'/notes/sort/',metadata:{replaces:'notes:sort',work:'work:ue'}});
  const catalog=await store.scan(updated);
  assert.equal(catalog.articles.find(a=>a.title==='新排序文章').key,'notes:sort');
  assert.deepEqual(catalog.topics[0].notes,['notes:sort','notes:stencil','notes:overlay']);
  await store.save({key:'ue',title:'UE',summary:'固定顺序',notes:['notes:sort']},updated);
  assert.deepEqual((await store.scan(entries)).topics[0].notes,['notes:sort']);
  await store.snapshot(entries);
});

test('topic-only review detects changes to an existing source article before or during build',async t=>{
  const {site,store,entries}=await fixture(t),raw='---\ntitle: sort\n---\nPublic body';
  const file=path.join(site,'src/content/notes/sort.md');await fs.mkdir(path.dirname(file),{recursive:true});await fs.writeFile(file,raw);
  const article=entries.find(e=>e.key==='notes:sort');article.path='src/content/notes/sort.md';article.digest=crypto.createHash('sha256').update(raw).digest('hex');
  await store.save({key:'ue',title:'UE',summary:'专题',notes:['notes:sort']},entries);
  const plan=await store.snapshot(entries);await store.verify(plan);
  await fs.writeFile(file,raw.replace('title: sort','title: sort\ndraft: true'));
  await assert.rejects(store.verify(plan),/网站文章已改变/);
});

test('reordering alone does not freeze future work title and summary changes',async t=>{
  const {store,entries}=await fixture(t);
  await store.save({key:'ue',title:'UE专题',summary:'三篇引擎笔记',notes:['notes:overlay','notes:sort']},entries);
  const snapshot=await store.snapshot(entries);
  assert.equal(Object.hasOwn(snapshot.document.topics.ue,'title'),false);
  entries[0].title='UE新标题';entries[0].metadata.summary='新的摘要';
  const topic=(await store.scan(entries)).topics[0];assert.equal(topic.title,'UE新标题');assert.equal(topic.summary,'新的摘要');
});
