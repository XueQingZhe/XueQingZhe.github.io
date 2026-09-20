import fs from 'node:fs/promises';
import path from 'node:path';
import { parse } from 'parse5';
const root=path.resolve('dist');
async function files(dir){const out=[];for(const f of await fs.readdir(dir,{withFileTypes:true})){const p=path.join(dir,f.name);if(f.isDirectory())out.push(...await files(p));else out.push(p)}return out}
const problems=[],missing=new Set(),mathErrors=[];
for(const file of (await files(root)).filter(p=>p.endsWith('.html')&&!p.includes(`${path.sep}assets${path.sep}html${path.sep}`))){
 const html=await fs.readFile(file,'utf8'),tree=parse(html),ids=new Set();
 async function walk(node){
  const attrs=Object.fromEntries((node.attrs||[]).map(a=>[a.name,a.value]));
  if(attrs.id){if(ids.has(attrs.id))problems.push({file:path.relative(root,file),duplicate:attrs.id});ids.add(attrs.id)}
  if(attrs.class?.includes('katex-error'))mathErrors.push({file:path.relative(root,file),formula:attrs.title});
  for(const key of ['src','href','poster']){const value=attrs[key];if(!value||!value.startsWith('/')||value.startsWith('//'))continue;
    let url;try{url=decodeURIComponent(value.split('#')[0].split('?')[0])}catch{continue}
    if(url.startsWith('/__visual-reference/'))continue;
    if(!url)continue;let p=path.join(root,url);const stat=await fs.stat(p).catch(()=>null);if(stat?.isDirectory())p=path.join(p,'index.html');
    if(!await fs.stat(p).catch(()=>null))missing.add(url);
  }
  for(const child of node.childNodes||[])await walk(child);
 }
 await walk(tree);
 if(html.includes('F:\\我的笔记')||html.includes('private-publisher')||html.includes('publisher-asset:'))problems.push({file:path.relative(root,file),error:'private path or unresolved export'});
}
const manifest=JSON.parse(await fs.readFile('docs/migration-manifest.json','utf8'));
const oldUrls=[];for(const n of manifest.articles)if(!await fs.stat(path.join(root,decodeURIComponent(n.url),'index.html')).catch(()=>null))oldUrls.push(n.url);
const report={checkedLegacyUrls:manifest.articles.length,missingLegacyUrls:oldUrls,missingLocalResources:[...missing],problems,mathErrors};
await fs.writeFile('docs/site-check.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));if(oldUrls.length||missing.size||problems.length||mathErrors.length)process.exitCode=1;
