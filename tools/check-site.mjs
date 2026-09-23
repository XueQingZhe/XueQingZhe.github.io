import fs from 'node:fs/promises';
import path from 'node:path';
import { parse } from 'parse5';
import YAML from 'yaml';
import { readSiteContent } from './publisher/site-content.mjs';
const root=path.resolve(process.argv[2] || 'dist');
async function files(dir){const out=[];for(const f of await fs.readdir(dir,{withFileTypes:true})){const p=path.join(dir,f.name);if(f.isDirectory())out.push(...await files(p));else out.push(p)}return out}
const manifest=JSON.parse(await fs.readFile('docs/migration-manifest.json','utf8'));
const contentSettings=JSON.parse(await fs.readFile('src/data/publisher-content.json','utf8').catch(error=>{if(error.code==='ENOENT')return '{}';throw error;}));
const withdrawnUrls=new Set();
const remember=value=>{if(typeof value!=='string'||!value.startsWith('/')||value.startsWith('//')||!value.endsWith('/')||/[?#\\]/.test(value))return;try{const url=decodeURIComponent(value);if(!url.split('/').some(part=>part==='.'||part==='..'))withdrawnUrls.add(url);}catch{}};
for(const article of manifest.articles)if(contentSettings.entries?.[`legacy:${article.id}`]?.withdrawn===true)remember(article.url);
// Read only website source metadata. The report contains public URLs, never vault paths or article bodies.
const siteEntries=await readSiteContent(process.cwd(),raw=>{const normalized=raw.replace(/^\uFEFF/,'').replaceAll('\r\n','\n'),match=normalized.match(/^---\n([\s\S]*?)\n---(?:\n|$)/);return {data:match?YAML.parse(match[1],{maxAliasCount:20})??{}:{},body:match?normalized.slice(match[0].length):normalized};});
for(const entry of siteEntries){const settings=contentSettings.entries?.[entry.replaces||entry.key]??contentSettings.entries?.[entry.key];if(settings?.withdrawn===true)remember(entry.replaces?siteEntries.find(original=>original.key===entry.replaces)?.url||entry.url:entry.url);}
for(const [id,collection]of Object.entries(contentSettings.collections??{}))if((contentSettings.entries?.[`collections:${id}`]?.withdrawn??collection.withdrawn)===true)remember(`/work/${id}/`);
const problems=[],missing=new Set(),mathErrors=[],withdrawnReferences=[];
for(const file of (await files(root)).filter(p=>p.endsWith('.html')&&!p.includes(`${path.sep}assets${path.sep}html${path.sep}`))){
 const html=await fs.readFile(file,'utf8'),tree=parse(html),ids=new Set();
 async function walk(node){
  const attrs=Object.fromEntries((node.attrs||[]).map(a=>[a.name,a.value]));
  if(attrs.id){if(ids.has(attrs.id))problems.push({file:path.relative(root,file),duplicate:attrs.id});ids.add(attrs.id)}
  if(attrs.class?.includes('katex-error'))mathErrors.push({file:path.relative(root,file),formula:attrs.title});
  for(const key of ['src','href','poster']){const value=attrs[key];if(!value||!value.startsWith('/')||value.startsWith('//'))continue;
    let url;try{url=decodeURIComponent(value.split('#')[0].split('?')[0])}catch{continue}
    if(url.startsWith('/__visual-reference/'))continue;
    if(key==='href'&&withdrawnUrls.has(url)){withdrawnReferences.push({file:path.relative(root,file),url});continue;}
    if(!url)continue;let p=path.join(root,url);const stat=await fs.stat(p).catch(()=>null);if(stat?.isDirectory())p=path.join(p,'index.html');
    if(!await fs.stat(p).catch(()=>null))missing.add(url);
  }
  for(const child of node.childNodes||[])await walk(child);
 }
 await walk(tree);
 if(html.includes('F:\\我的笔记')||html.includes('private-publisher')||html.includes('publisher-asset:'))problems.push({file:path.relative(root,file),error:'private path or unresolved export'});
}
const oldUrls=[],withdrawnLegacyUrls=[],unexpectedWithdrawnLegacyUrls=[];
for(const n of manifest.articles){
 const exists=!!await fs.stat(path.join(root,decodeURIComponent(n.url),'index.html')).catch(()=>null);
 if(withdrawnUrls.has(decodeURIComponent(n.url))){withdrawnLegacyUrls.push(n.url);if(exists)unexpectedWithdrawnLegacyUrls.push(n.url);}
 else if(!exists)oldUrls.push(n.url);
}
const unexpectedWithdrawnUrls=[];for(const url of withdrawnUrls)if(await fs.stat(path.join(root,url,'index.html')).catch(()=>null))unexpectedWithdrawnUrls.push(url);
const report={checkedLegacyUrls:manifest.articles.length,missingLegacyUrls:oldUrls,withdrawnLegacyUrls,unexpectedWithdrawnLegacyUrls,withdrawnReferences,unexpectedWithdrawnUrls,missingLocalResources:[...missing],problems,mathErrors};
if(!process.argv.includes('--no-report'))await fs.writeFile('docs/site-check.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));if(oldUrls.length||unexpectedWithdrawnUrls.length||missing.size||problems.length||mathErrors.length)process.exitCode=1;
