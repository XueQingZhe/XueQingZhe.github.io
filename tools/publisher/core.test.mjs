import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import sharp from 'sharp';
import { Publisher } from './core.mjs';
import { normalizeDisplayMath } from '../markdown-utils.mjs';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

async function fixture(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'publisher-test-'));
  t.after(() => fs.rm(root, { recursive: true, force: true, maxRetries: 4, retryDelay: 150 }));
  const vault = path.join(root, 'vault'), site = path.join(root, 'site'), state = path.join(root, 'private');
  await fs.mkdir(vault); await fs.mkdir(site);
  const p = new Publisher({ vault, site, state }); await p.init();
  const write = async (name, body) => { await fs.mkdir(path.dirname(path.join(vault, name)), { recursive: true }); await fs.writeFile(path.join(vault, name), body); };
  return { root, vault, site, state, p, write };
}
test('default private, explicit selection, candidate does not grant access, future files not selected', async t => {
  const { p, write } = await fixture(t);
  await write('A.md', '---\npublish: true\n---\nCandidate'); await p.scan(); assert.deepEqual(p.db.selected, []);
  await p.select(['A.md']); await write('B.md', 'New private note'); await p.scan(); assert.deepEqual(p.db.selected, ['A.md']);
  await write('A.md', '---\npublish: true\ndraft: true\n---\nDraft');
  await assert.rejects(p.analyze(), /草稿/);
});
test('private references, ambiguity, missing media and raw HTML stop export', async t => {
  const { p, write } = await fixture(t);
  await write('Secret.md', 'private'); await write('Public.md', '[[Secret]]'); await p.scan(); await p.select(['Public.md']);
  assert.match((await p.analyze()).errors[0].message, /未选中/);
  await write('x/Same.md', 'x'); await write('y/Same.md', 'y'); await write('Public.md', '[[Same]]');
  assert.match((await p.analyze()).errors[0].message, /歧义/);
  await write('Public.md', '![[missing.png]]'); assert.match((await p.analyze()).errors[0].message, /找不到/);
  await write('Public.md', '<script>alert(1)</script>'); assert.match((await p.analyze()).errors[0].message, /HTML/);
});
test('AST leaves fenced code, inline code and math unchanged', async t => {
  const { p, write } = await fixture(t);
  await write('A.md', '# 中文\n\n```cpp\n[[Secret]]; // %% private %%\n```\n\n`[[Secret]]`\n\n$$\nx_{[[a]]} = 1\n$$');
  await p.scan(); await p.select(['A.md']); const plan = await p.analyze(); assert.deepEqual(plan.errors, []);
  assert.match(plan.output[0].markdown, /\[\[Secret\]\]; \/\/ %% private %%/); assert.match(plan.output[0].markdown, /x_\{\[\[a\]\]\}/);
});
test('review gates, dedup, incremental cache, stable rename, withdrawal and source integrity', async t => {
  const { p, write, vault, site } = await fixture(t);
  const image = await sharp({ create: { width: 100, height: 100, channels: 3, background: 'red' } }).png().toBuffer();
  await fs.writeFile(path.join(vault, 'one.png'), image); await fs.writeFile(path.join(vault, 'two.png'), image);
  const raw = '---\ntitle: Public\ndate: 2026-01-02\n---\n![[one.png]]\n\n![[two.png]]';
  await write('A.md', raw); await p.scan(); await p.select(['A.md']); let plan = await p.analyze(); assert.deepEqual(plan.errors, []); assert.equal(plan.assets.length, 1);
  await assert.rejects(p.prepare(plan.id, []), /审核/);
  let stage = await p.prepare(plan.id, plan.assets.map(a => a.key)); await p.apply(stage.id);
  const slug = p.db.entries['A.md'].slug;
  assert.equal(await fs.readFile(path.join(vault, 'A.md'), 'utf8'), raw);
  assert.equal((await fs.readdir(path.join(site, 'public/published-assets'))).length, 1);
  plan = await p.analyze(); stage = await p.prepare(plan.id, plan.assets.map(a => a.key)); assert.equal(stage.assets[0].reused, true);
  await fs.rename(path.join(vault, 'A.md'), path.join(vault, 'Renamed.md')); await p.scan(); assert.equal(p.db.entries['Renamed.md'].slug, slug); assert.deepEqual(p.db.selected, ['Renamed.md']);
  await p.select([]); plan = await p.analyze(); assert.equal(plan.changes.removed.length, 1); stage = await p.prepare(plan.id, []); await p.apply(stage.id);
  assert.deepEqual(await fs.readdir(path.join(site, 'content/published/notes')), []);
  assert.deepEqual(await fs.readdir(path.join(site, 'public/published-assets')), []);
});
test('changed source invalidates reviewed stage and previous output survives', async t => {
  const { p, write, site } = await fixture(t);
  await write('A.md', 'Old'); await p.scan(); await p.select(['A.md']); const a = await p.analyze(); const s = await p.prepare(a.id, []); await p.apply(s.id);
  const old = await fs.readFile(path.join(site, 'content/published/notes', p.db.entries['A.md'].slug + '.md'), 'utf8');
  const next = await p.analyze(); const staged = await p.prepare(next.id, []); await write('A.md', 'Changed after review');
  await assert.rejects(p.apply(staged.id), /源文件已变化/);
  assert.equal(await fs.readFile(path.join(site, 'content/published/notes', p.db.entries['A.md'].slug + '.md'), 'utf8'), old);
});
test('published embeddings allowed, cycles blocked, secrets never expanded', async t => {
  const { p, write } = await fixture(t);
  await write('A.md', '![[B]]'); await write('B.md', '# Part\n\nhello'); await p.scan(); await p.select(['A.md', 'B.md']);
  let plan = await p.analyze(); assert.deepEqual(plan.errors, []); assert.match(plan.output[0].markdown, /> hello/);
  await write('B.md', '![[A]]'); plan = await p.analyze(); assert.ok(plan.errors.some(e => /循环/.test(e.message)));
});
test('boundary checks reject traversal and symlink references', async t => {
  const { p, root, vault } = await fixture(t);
  await fs.writeFile(path.join(root, 'secret.md'), 'secret'); await assert.rejects(p.bounded('../secret.md'), /越界/);
  try { await fs.symlink(root, path.join(vault, 'jump'), 'junction'); } catch { return; }
  await assert.rejects(p.bounded('jump/secret.md'), /符号链接/);
});
test('failed validation restores generated files and published manifest', async t => {
  const {p,write,site}=await fixture(t);await write('A.md','Before');await p.scan();await p.select(['A.md']);
  let plan=await p.analyze();let stage=await p.prepare(plan.id,[]);await p.apply(stage.id);const manifest=await p.manifest();
  await write('A.md','After');plan=await p.analyze();stage=await p.prepare(plan.id,[]);
  await assert.rejects(p.apply(stage.id,async()=>{throw Error('build failed')}),/build failed/);
  assert.deepEqual(await p.manifest(),manifest);assert.match(await fs.readFile(path.join(site,'content/published/notes',p.db.entries['A.md'].slug+'.md'),'utf8'),/Before/);
});
test('safe HTML images become reviewed attachments; event handlers are rejected',async t=>{
  const {p,write,vault}=await fixture(t);await fs.writeFile(path.join(vault,'pic.png'),await sharp({create:{width:16,height:16,channels:3,background:'blue'}}).png().toBuffer());
  await write('A.md','<img src="pic.png" alt="图">');await p.scan();await p.select(['A.md']);let plan=await p.analyze();assert.deepEqual(plan.errors,[]);assert.equal(plan.assets.length,1);
  await write('A.md','<img src="pic.png" onerror="alert(1)">');plan=await p.analyze();assert.match(plan.errors[0].message,/属性/);
});
test('manual relink preserves public URL after moving and editing together',async t=>{
  const {p,write,vault}=await fixture(t);await write('Old.md','Before');await p.scan();await p.select(['Old.md']);const slug=p.db.entries['Old.md'].slug;
  await fs.unlink(path.join(vault,'Old.md'));await write('folder/New.md','After');await p.scan();await p.relink('Old.md','folder/New.md');assert.equal(p.db.entries['folder/New.md'].slug,slug);assert.deepEqual(p.db.selected,['folder/New.md']);
});

test('ambiguous identical new notes stay private until a missing publication is explicitly relinked',async t=>{
 const {p,write,vault}=await fixture(t);await write('Old.md','Same content');await p.scan();await p.select(['Old.md']);
 const identity=p.db.entries['Old.md'].id;
 await fs.unlink(path.join(vault,'Old.md'));await write('One.md','Same content');await write('Two.md','Same content');
 const result=await p.scan();
 assert.deepEqual(result.missingSelected,['Old.md']);assert.equal(result.notes.some(n=>n.selected),false);
 assert.equal(result.notes.some(n=>n.id===identity),false);
 await p.relink('Old.md','Two.md');await p.scan();assert.equal(p.db.entries['Two.md'].id,identity);assert.deepEqual(p.db.selected,['Two.md']);
});

test('explicit relative and vault-root attachments resolve without false basename ambiguity',async t=>{
 const {p,write}=await fixture(t);
 await write('pic.pdf','%PDF root');await write('folder/pic.pdf','%PDF local');
 await write('folder/A.md','[Local](pic.pdf)\n\n[Root](/pic.pdf)');await p.scan();await p.select(['folder/A.md']);
 const plan=await p.analyze();assert.deepEqual(plan.errors,[]);
 assert.deepEqual(plan.assets.map(a=>a.path),['folder/pic.pdf','pic.pdf']);
});

test('relink invalidates an already reviewed identity even when selected paths are unchanged',async t=>{
 const {p,write,vault,site}=await fixture(t);await write('Old.md','Original');await p.scan();await p.select(['Old.md']);
 let plan=await p.analyze(),stage=await p.prepare(plan.id,[]);await p.apply(stage.id);const slug=p.db.entries['Old.md'].slug;
 await fs.unlink(path.join(vault,'Old.md'));await write('New.md','Edited and moved');await p.scan();await p.select(['New.md']);
 plan=await p.analyze();stage=await p.prepare(plan.id,[]);await p.relink('Old.md','New.md');
 await assert.rejects(p.apply(stage.id),/身份|重新分析/);
 assert.deepEqual(await fs.readdir(path.join(site,'content/published/notes')),[slug+'.md']);
 plan=await p.analyze();stage=await p.prepare(plan.id,[]);await p.apply(stage.id);
 assert.deepEqual(await fs.readdir(path.join(site,'content/published/notes')),[slug+'.md']);
});

test('block references must identify rendered paragraph anchors, never code or an id prefix',async t=>{
 const {p,write}=await fixture(t);await write('A.md','[[B#^valid]]');await write('B.md','```text\nOnly code ^valid\n```\n\nVisible ^valid-long');
 await p.scan();await p.select(['A.md','B.md']);let plan=await p.analyze();assert.match(plan.errors.find(e=>e.path==='A.md').message,/找不到块/);
 await write('B.md','Visible paragraph ^valid');plan=await p.analyze();assert.deepEqual(plan.errors,[]);assert.match(plan.output.find(n=>n.title==='A').markdown,/#block-valid/);
});

test('nested and slug headings resolve and percent-encoded attachment names preserve literal hash characters',async t=>{
 const {p,write}=await fixture(t);await write('A.md','[[B#hello-1]]\n\n![[B#hello-world]]\n\n[PDF](manual%23one.pdf)');
 await write('B.md','# Hello\n\n> # Hello\n\n# Hello World\n\nSelected section.\n\n# Next\n\nExcluded section.');
 await write('manual#one.pdf','%PDF synthetic');await p.scan();await p.select(['A.md','B.md']);
 const plan=await p.analyze();assert.deepEqual(plan.errors,[]);const output=plan.output.find(n=>n.title==='A').markdown;
 assert.match(output,/#hello-1/);assert.match(output,/> Selected section/);assert.doesNotMatch(output,/Excluded section/);assert.equal(plan.assets[0].path,'manual#one.pdf');
});

test('block embeddings match the full rendered block identifier',async t=>{
 const {p,write}=await fixture(t);await write('A.md','![[B#^keep]]');
 await write('B.md','First visible block ^keep-long\n\nRequested block ^keep\n\n```text\nNot a rendered anchor ^keep\n```');
 await p.scan();await p.select(['A.md','B.md']);const plan=await p.analyze();assert.deepEqual(plan.errors,[]);
 const result=plan.output.find(n=>n.title==='A').markdown;
 assert.match(result,/> Requested block/);assert.doesNotMatch(result,/First visible block|Not a rendered anchor/);
});

test('stale explicit attachment paths cannot silently publish a different basename',async t=>{
 const {p,write}=await fixture(t);await write('A.md','[Intended attachment](missing/report.pdf)');await write('private/report.pdf','%PDF another document');
 await p.scan();await p.select(['A.md']);let plan=await p.analyze();assert.match(plan.errors[0]?.message||'',/找不到/);assert.deepEqual(plan.assets,[]);
 await write('A.md','[Named subfolder](images/report.pdf)');await write('media/images/report.pdf','%PDF intended nested suffix');
 plan=await p.analyze();assert.deepEqual(plan.errors,[]);assert.equal(plan.assets[0].path,'media/images/report.pdf');
});
test('display math normalization handles indented closing lines without touching code',()=>{
 const source='$$x =\n\t\t y$$\n\n## Section\n\n$$z$$\n\n```js\nconst a="$$";\n```';
 const out=normalizeDisplayMath(source);assert.match(out,/y\n\$\$/);assert.match(out,/const a="\$\$";/);assert.equal((out.match(/^\$\$$/gm)||[]).length,4);
});
test('initial failed build leaves no publication and PDF embeddings become links',async t=>{
 const {p,write,vault,site}=await fixture(t);await fs.writeFile(path.join(vault,'guide.pdf'),'%PDF-1.4 synthetic fixture');
 await write('A.md','![[guide.pdf]]\n\n![手册](guide.pdf)');await p.scan();await p.select(['A.md']);
 const plan=await p.analyze();assert.deepEqual(plan.errors,[]);assert.doesNotMatch(plan.output[0].markdown,/!\[/);
 const stage=await p.prepare(plan.id,plan.assets.map(a=>a.key));
 await assert.rejects(p.apply(stage.id,async()=>{throw Error('first build failed')}),/first build failed/);
 assert.deepEqual(await p.manifest(),{notes:{},assets:[]});
 assert.equal(await fs.stat(path.join(site,'content/published/notes')).catch(()=>null),null);
});
test('optimized transparent image keeps alpha and bounds without requiring a video codec',async t=>{
 const {p,write,vault}=await fixture(t);
 const rgba=Buffer.alloc(2100*100*4);for(let i=0;i<rgba.length;i+=4){rgba[i]=i%251;rgba[i+1]=100;rgba[i+2]=180;rgba[i+3]=i%256;}
 await fs.writeFile(path.join(vault,'wide.png'),await sharp(rgba,{raw:{width:2100,height:100,channels:4}}).png({compressionLevel:0}).toBuffer());
 await write('A.md','![[wide.png]]');await p.scan();await p.select(['A.md'],{'wide.png':'optimized'});
 const plan=await p.analyze(),stage=await p.prepare(plan.id,plan.assets.map(a=>a.key));
 const image=stage.assets[0],files=p.stages.get(stage.id).dir;
 const meta=await sharp(await fs.readFile(path.join(files,'assets',image.filename))).metadata();assert.equal(meta.hasAlpha,true);assert.ok(meta.width<=1920);assert.ok(image.bytes<image.originalBytes);
});

test('video encoding keeps audio and poster',async t=>{
 const {p,write,vault}=await fixture(t);
 const exe=process.env.PUBLISHER_TEST_FFMPEG;
 if(!exe){t.skip('Set PUBLISHER_TEST_FFMPEG to exercise the installed codec');return}
 p.ffmpeg=async()=>exe;
 await promisify(execFile)(exe,['-nostdin','-y','-f','lavfi','-i','testsrc2=size=160x90:rate=10','-f','lavfi','-i','sine=frequency=440:sample_rate=44100','-t','1','-c:v','libx264','-c:a','aac',path.join(vault,'clip.mp4')],{windowsHide:true});
 await write('A.md','![[clip.mp4]]');await p.scan();await p.select(['A.md'],{'clip.mp4':'video'});
 const plan=await p.analyze(),stage=await p.prepare(plan.id,plan.assets.map(a=>a.key));
 const video=stage.assets.find(a=>a.ext==='.mp4'),files=p.stages.get(stage.id).dir;
 assert.ok(video.video);assert.ok(await fs.stat(path.join(files,'assets',video.poster)));
 await promisify(execFile)(exe,['-nostdin','-v','error','-i',path.join(files,'assets',video.filename),'-map','0:a:0','-f','null','-'],{windowsHide:true});
});
